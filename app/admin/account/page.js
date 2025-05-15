'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './account.module.css';

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [businessSettings, setBusinessSettings] = useState({
    business_name: '',
    business_address_line1: '',
    business_address_line2: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    tax_rate: ''
  });
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    plan: 'Loading...',
    status: 'Loading...',
    nextBillingDate: 'Loading...'
  });

  useEffect(() => {
    const initializeSettings = async () => {
      setMessage('');
      setLoading(true); 
      try {
        if (!user) return;
        
        // Fetch business settings
        const { data: settingsData, error: fetchError } = await supabase
          .from('user_settings')
          .select('business_name, business_address_line1, business_address_line2, business_phone, business_email, business_website, tax_rate')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (settingsData) {
          setBusinessSettings({
            business_name: settingsData.business_name || '',
            business_address_line1: settingsData.business_address_line1 || '',
            business_address_line2: settingsData.business_address_line2 || '',
            business_phone: settingsData.business_phone || '',
            business_email: settingsData.business_email || '',
            business_website: settingsData.business_website || '',
            tax_rate: settingsData.tax_rate ? (parseFloat(settingsData.tax_rate) * 100).toString() : ''
          });
        }

        // Fetch subscription details
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Subscription fetch error:', subscriptionError);
          throw subscriptionError;
        }

        if (subscriptionData) {
          const isActive = subscriptionData.status === 'active' || 
                          (subscriptionData.current_period_end && 
                           new Date(subscriptionData.current_period_end) > new Date());

          setSubscriptionInfo({
            plan: 'PrintBooth Pro',
            status: isActive ? 'Active' : 'Inactive',
            nextBillingDate: subscriptionData.current_period_end 
              ? new Date(subscriptionData.current_period_end).toLocaleDateString()
              : 'No active subscription'
          });
        } else {
          setSubscriptionInfo({
            plan: 'No Active Plan',
            status: 'Inactive',
            nextBillingDate: 'No active subscription'
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setMessage('Error loading settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializeSettings();
    }
  }, [user, supabase]);

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setBusinessSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setMessage(''); 
    setSaving(true);
    try {
      if (!user || !user.id) throw new Error('User not authenticated');

      const taxRateDecimal = businessSettings.tax_rate ? (parseFloat(businessSettings.tax_rate) / 100) : null;

      console.log('Saving business settings for user:', user.id, 'with data:', businessSettings, 'Tax Rate Decimal:', taxRateDecimal);

      const { error } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: user.id,
          business_name: businessSettings.business_name || null,
          business_address_line1: businessSettings.business_address_line1 || null,
          business_address_line2: businessSettings.business_address_line2 || null,
          business_phone: businessSettings.business_phone || null,
          business_email: businessSettings.business_email || null,
          business_website: businessSettings.business_website || null,
          tax_rate: taxRateDecimal
        }], { onConflict: 'user_id' });

      if (error) throw error;

      console.log('Business settings saved successfully to DB');
      setMessage('Business settings saved successfully!');

    } catch (error) {
      console.error('Error saving business settings:', error);
      setMessage(error.message || 'Error saving business settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Please Log In</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <a href="/admin/account/guide" className={styles.guideLink}>
          View Admin Guide
        </a>
      </div>
      
      {message && (
        <div className={`${styles.message} ${message.includes('Error') || message.includes('Failed') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Details</h2>
        
        <div className={styles.infoGroup}>
          <div className={styles.label}>Email</div>
          <div className={styles.value}>{user.email}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Subscription Management</h2>
        <div className={styles.subscriptionInfo}>
          <div className={styles.buttonGroup}>
            <a
              href="https://billing.stripe.com/p/login/4gM8wP9qq9f2cWh8Bb3gk00"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.button}
            >
              Manage Subscription
            </a>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Business Information (for Invoices)</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Business Name</label>
            <input type="text" name="business_name" value={businessSettings.business_name} onChange={handleSettingChange} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input type="tel" name="business_phone" value={businessSettings.business_phone} onChange={handleSettingChange} className={styles.input} />
          </div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}> 
            <label className={styles.label}>Address Line 1</label>
            <input type="text" name="business_address_line1" value={businessSettings.business_address_line1} onChange={handleSettingChange} className={styles.input} />
          </div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}> 
            <label className={styles.label}>Address Line 2 (City, State, Zip)</label>
            <input type="text" name="business_address_line2" value={businessSettings.business_address_line2} onChange={handleSettingChange} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Contact/Billing Email</label>
            <input type="email" name="business_email" value={businessSettings.business_email} onChange={handleSettingChange} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Website</label>
            <input 
              type="text" 
              name="business_website" 
              value={businessSettings.business_website} 
              onChange={handleSettingChange} 
              className={styles.input} 
              placeholder="https://www.yourwebsite.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Sales Tax Rate (%)</label>
            <input 
              type="number" 
              name="tax_rate" 
              value={businessSettings.tax_rate}
              onChange={handleSettingChange} 
              className={styles.input} 
              placeholder="e.g., 8.25"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`${styles.button} ${styles.saveButton}`} 
          style={{ marginTop: '15px' }}
        >
          {saving ? 'Saving...' : 'Save Business Info'}
        </button>
      </div>

      <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Print Booth Helper Application</h2>
          <div style={{ border: '1px solid #ddd', padding: '15px', margin: '0 0 20px 0', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <h4>Download Print Booth Helper (Windows)</h4>
              <p>To enable direct, silent printing from this website, please download and install the Print Booth Helper application on the computer connected to your printer.</p>
              
              <a 
                  href="/downloads/print-booth-helper-setup-1.0.0.exe"
                  download="print-booth-helper-setup-1.0.0.exe"
                  style={{
                      display: 'inline-block', 
                      padding: '10px 15px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      margin: '10px 0'
                  }}
              >
                  Download Print Booth Helper v1.0.0
              </a>
              
              <div style={{ marginTop: '15px', fontSize: '0.9em' }}>
                  <strong>Installation Steps:</strong>
                  <ol style={{ paddingLeft: '20px' }}>
                      <li>Click the download button above.</li>
                      <li>Open the downloaded `.exe` file (usually in your Downloads folder).</li>
                      <li>Windows Defender SmartScreen might appear ("Windows protected your PC"). If it does, click "More info" and then click the "Run anyway" button.</li>
                      <li>Follow the steps in the installation wizard.</li>
                      <li>After installation, run "Print Booth Helper" from your Windows Start Menu.</li>
                      <li>Keep the helper app running when you need direct printing. The connection status on the Template page should indicate "Connected".</li>
                  </ol>
              </div>
            </div>
      </div>

      <div className={styles.section}>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className={`${styles.button} ${styles.signOutButton}`}
        >
          {loading ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
} 