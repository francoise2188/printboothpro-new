'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './settings.module.css';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [settings, setSettings] = useState({
    paypal_username: '',
    venmo_username: '',
    single_magnet_price: '0',
    three_magnets_price: '0',
    six_magnets_price: '0',
    nine_magnets_price: '0',
    enable_tax: false,
    tax_rate: '0',
    coupons: [],
    square_location_id: ''
  });

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // State for the new coupon input fields
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState('percentage'); // 'percentage' or 'fixed'
  const [newCouponValue, setNewCouponValue] = useState('');

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      if (!user) {
        console.log('⚠️ No user logged in');
        return;
      }

      console.log('🎯 Attempting to fetch settings for user:', user.id);

      // Get the most recent settings for this user
      const { data: settingsData, error: fetchError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Database error:', fetchError);
        throw new Error('Unable to access payment settings. The system will be available soon.');
      }

      // If we found settings, use them
      if (settingsData) {
        console.log('✅ Found existing settings:', settingsData);
        setSettings({
          paypal_username: settingsData.paypal_username || '',
          venmo_username: settingsData.venmo_username || '',
          single_magnet_price: settingsData.single_magnet_price || '0',
          three_magnets_price: settingsData.three_magnets_price || '0',
          six_magnets_price: settingsData.six_magnets_price || '0',
          nine_magnets_price: settingsData.nine_magnets_price || '0',
          enable_tax: settingsData.enable_tax || false,
          tax_rate: settingsData.tax_rate || '0',
          coupons: settingsData.coupons || [],
          square_location_id: settingsData.square_location_id || ''
        });
        return;
      }

      // If no settings found, create new ones
      console.log('⚠️ No settings found, creating default settings...');
      const defaultSettings = {
        user_id: user.id,
        paypal_username: '',
        venmo_username: '',
        single_magnet_price: '0',
        three_magnets_price: '0',
        six_magnets_price: '0',
        nine_magnets_price: '0',
        enable_tax: false,
        tax_rate: '0',
        coupons: [],
        square_location_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('payment_settings')
        .insert([defaultSettings]);

      if (insertError) {
        console.error('❌ Error creating settings:', insertError);
        throw new Error('Unable to create payment settings. Please try again later.');
      }

      // Set the default values in the form
      setSettings({
        paypal_username: '',
        venmo_username: '',
        single_magnet_price: '0',
        three_magnets_price: '0',
        six_magnets_price: '0',
        nine_magnets_price: '0',
        enable_tax: false,
        tax_rate: '0',
        coupons: [],
        square_location_id: ''
      });
      
      console.log('✅ Created default settings successfully');
      setMessage('');
    } catch (error) {
      console.error('❌ Error in fetchSettings:', error);
      setMessage(error.message || 'An error occurred while loading settings');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      // Prepare settings for database
      const sanitizedSettings = {
        user_id: user.id,
        paypal_username: settings.paypal_username.trim(),
        venmo_username: settings.venmo_username.trim(),
        single_magnet_price: Number(settings.single_magnet_price || 0).toString(),
        three_magnets_price: Number(settings.three_magnets_price || 0).toString(),
        six_magnets_price: Number(settings.six_magnets_price || 0).toString(),
        nine_magnets_price: Number(settings.nine_magnets_price || 0).toString(),
        enable_tax: Boolean(settings.enable_tax),
        tax_rate: Number(settings.tax_rate || 0).toString(),
        coupons: settings.coupons || [],
        square_location_id: settings.square_location_id || '',
        updated_at: new Date().toISOString()
      };

      console.log('📝 Saving settings data:', sanitizedSettings);

      // Get the most recent settings record
      const { data: existingData } = await supabase
        .from('payment_settings')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let saveResult;
      if (!existingData) {
        console.log('➕ No existing record, inserting new settings...');
        saveResult = await supabase
          .from('payment_settings')
          .insert([sanitizedSettings])
          .select('*')
          .single();
      } else {
        console.log('🔄 Updating existing settings with ID:', existingData.id);
        saveResult = await supabase
          .from('payment_settings')
          .update(sanitizedSettings)
          .eq('id', existingData.id)
          .select('*')
          .single();
      }

      if (saveResult.error) {
        throw saveResult.error;
      }

      console.log('✅ Settings saved successfully:', saveResult.data);
      
      // Update local state with saved data
      setSettings({
        paypal_username: saveResult.data.paypal_username || '',
        venmo_username: saveResult.data.venmo_username || '',
        single_magnet_price: saveResult.data.single_magnet_price || '0',
        three_magnets_price: saveResult.data.three_magnets_price || '0',
        six_magnets_price: saveResult.data.six_magnets_price || '0',
        nine_magnets_price: saveResult.data.nine_magnets_price || '0',
        enable_tax: saveResult.data.enable_tax || false,
        tax_rate: saveResult.data.tax_rate || '0',
        coupons: saveResult.data.coupons || [],
        square_location_id: saveResult.data.square_location_id || ''
      });
      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Coupon Management Functions ---
  const handleAddCoupon = () => {
    const code = newCouponCode.trim().toUpperCase();
    const value = parseFloat(newCouponValue);

    if (!code) {
      setMessage('Coupon code cannot be empty.');
      return;
    }
    if (isNaN(value) || value <= 0) {
      setMessage('Coupon value must be a positive number.');
      return;
    }
    // Check if coupon code already exists
    if (settings.coupons.some(coupon => coupon.code === code)) {
      setMessage(`Coupon code '${code}' already exists.`);
      return;
    }

    const newCoupon = {
      code,
      type: newCouponType,
      value,
    };

    setSettings(prevSettings => ({
      ...prevSettings,
      coupons: [...prevSettings.coupons, newCoupon]
    }));

    // Clear input fields
    setNewCouponCode('');
    setNewCouponType('percentage');
    setNewCouponValue('');
    setMessage('Coupon added. Remember to save settings.'); // Inform user to save
  };

  const handleDeleteCoupon = (codeToDelete) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      coupons: prevSettings.coupons.filter(coupon => coupon.code !== codeToDelete)
    }));
    setMessage('Coupon removed. Remember to save settings.'); // Inform user to save
  };
  // --- End Coupon Management Functions ---

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Payment Settings</h1>
      </div>
      
      {message && (
        <div className={`${styles.message} ${message.includes('Error') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Payment Methods Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment Methods</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>PayPal Username</label>
              <input
                type="text"
                value={settings.paypal_username}
                onChange={(e) => setSettings({...settings, paypal_username: e.target.value})}
                className={styles.input}
                placeholder="Enter PayPal username"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Venmo Username</label>
              <input
                type="text"
                value={settings.venmo_username}
                onChange={(e) => setSettings({...settings, venmo_username: e.target.value})}
                className={styles.input}
                placeholder="Enter Venmo username"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Square Location ID</label>
              <input
                type="text"
                value={settings.square_location_id}
                onChange={(e) => setSettings({...settings, square_location_id: e.target.value})}
                className={styles.input}
                placeholder="Enter Square Location ID (optional)"
              />
              <p className={styles.helpText}>Find this in your Square Dashboard under Business Settings {'>'} Locations</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className={styles.section}>
          {/* Add Info Box */}
          <div className={styles.infoBox} style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
              How Pricing Works
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '8px' }}>
              The system automatically calculates the best price for customers based on the package sizes you set:
            </p>
            <ul style={{ fontSize: '0.875rem', color: '#4b5563', paddingLeft: '20px', listStyle: 'disc' }}>
              <li>When customers order magnets, they'll get the most cost-effective combination of packages</li>
              <li>Example: For 5 magnets, they'll be charged for one 3-magnet package plus two single magnets</li>
              <li>This ensures customers get the best possible price while maximizing your revenue</li>
            </ul>
          </div>

          <h2 className={styles.sectionTitle}>Pricing</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Single Magnet Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.single_magnet_price}
                onChange={(e) => setSettings({...settings, single_magnet_price: e.target.value})}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>3 Magnets Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.three_magnets_price}
                onChange={(e) => setSettings({...settings, three_magnets_price: e.target.value})}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>6 Magnets Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.six_magnets_price}
                onChange={(e) => setSettings({...settings, six_magnets_price: e.target.value})}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>9 Magnets Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.nine_magnets_price}
                onChange={(e) => setSettings({...settings, nine_magnets_price: e.target.value})}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* --- Coupon Management Section --- */} 
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Manage Coupons</h2>
          
          {/* Form to add a new coupon */}
          <div className={`${styles.grid} ${styles.addCouponForm}`}>
            <div className={styles.formGroup}>
              <label htmlFor="couponCode" className={styles.label}>Coupon Code</label>
              <input
                id="couponCode"
                type="text"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value)}
                className={styles.input}
                placeholder="e.g., SUMMER10"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="couponType" className={styles.label}>Discount Type</label>
              <select 
                id="couponType"
                value={newCouponType}
                onChange={(e) => setNewCouponType(e.target.value)}
                className={styles.input}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="couponValue" className={styles.label}>Value</label>
              <input
                id="couponValue"
                type="number"
                step={newCouponType === 'percentage' ? '1' : '0.01'} // Adjust step based on type
                min="0"
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
                className={styles.input}
                placeholder={newCouponType === 'percentage' ? 'e.g., 10' : 'e.g., 5.00'}
              />
            </div>
            <div className={styles.formGroup} style={{ alignSelf: 'flex-end' }}>
              <button 
                type="button" // Prevent form submission
                onClick={handleAddCoupon}
                className={styles.buttonSecondary} // Use a secondary button style if available
              >
                Add Coupon
              </button>
            </div>
          </div>

          {/* List of existing coupons */}
          <div className={styles.couponListContainer}>
            <h3 className={styles.subSectionTitle}>Existing Coupons</h3>
            {settings.coupons && settings.coupons.length > 0 ? (
              <ul className={styles.couponList}>
                {settings.coupons.map((coupon) => (
                  <li key={coupon.code} className={styles.couponListItem}>
                    <span>
                      <strong>{coupon.code}</strong>: {
                        coupon.type === 'percentage' 
                          ? `${coupon.value}% off` 
                          : `$${Number(coupon.value).toFixed(2)} off`
                      }
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteCoupon(coupon.code)}
                      className={styles.deleteButton} // Add specific styling for delete
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noItems}>No coupons added yet.</p>
            )}
          </div>
        </div>
        {/* --- End Coupon Management Section --- */}

        {/* Tax Settings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Tax Settings</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <div className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={settings.enable_tax}
                  onChange={(e) => setSettings({...settings, enable_tax: e.target.checked})}
                  className={styles.checkboxInput}
                />
                <label className={styles.checkboxLabel}>Enable Tax</label>
              </div>
            </div>
            {settings.enable_tax && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({...settings, tax_rate: e.target.value})}
                  className={styles.input}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            disabled={saving}
            className={styles.primaryButton}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
} 