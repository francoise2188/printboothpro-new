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
    coupons: []
  });

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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

      console.log('🎯 Fetching settings for user:', user.id);

      // First, try to get existing settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('payment_settings')
        .select('id, user_id, paypal_username, venmo_username, single_magnet_price, three_magnets_price, six_magnets_price, nine_magnets_price, enable_tax, tax_rate, coupons')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching settings:', fetchError);
        throw fetchError;
      }

      // If we found existing settings, use them
      if (existingSettings) {
        console.log('✅ Found existing settings:', existingSettings);
        setSettings({
          paypal_username: existingSettings.paypal_username || '',
          venmo_username: existingSettings.venmo_username || '',
          single_magnet_price: existingSettings.single_magnet_price || '0',
          three_magnets_price: existingSettings.three_magnets_price || '0',
          six_magnets_price: existingSettings.six_magnets_price || '0',
          nine_magnets_price: existingSettings.nine_magnets_price || '0',
          enable_tax: existingSettings.enable_tax || false,
          tax_rate: existingSettings.tax_rate || '0',
          coupons: existingSettings.coupons || []
        });
        return;
      }

      // If no settings found, create new ones
      console.log('⚠️ No settings found, creating new ones');
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
        coupons: []
      };

      const { data: newData, error: insertError } = await supabase
        .from('payment_settings')
        .insert([defaultSettings])
        .select('id, user_id, paypal_username, venmo_username, single_magnet_price, three_magnets_price, six_magnets_price, nine_magnets_price, enable_tax, tax_rate, coupons')
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Created new settings:', newData);
      setSettings({
        paypal_username: newData.paypal_username || '',
        venmo_username: newData.venmo_username || '',
        single_magnet_price: newData.single_magnet_price || '0',
        three_magnets_price: newData.three_magnets_price || '0',
        six_magnets_price: newData.six_magnets_price || '0',
        nine_magnets_price: newData.nine_magnets_price || '0',
        enable_tax: newData.enable_tax || false,
        tax_rate: newData.tax_rate || '0',
        coupons: newData.coupons || []
      });
      setMessage('');
    } catch (error) {
      console.error('❌ Error in fetchSettings:', error);
      setMessage(`Error: ${error.message}`);
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
          .select('id, user_id, paypal_username, venmo_username, single_magnet_price, three_magnets_price, six_magnets_price, nine_magnets_price, enable_tax, tax_rate, coupons')
          .single();
      } else {
        console.log('🔄 Updating existing settings with ID:', existingData.id);
        saveResult = await supabase
          .from('payment_settings')
          .update(sanitizedSettings)
          .eq('id', existingData.id)  // Use the specific record ID
          .select('id, user_id, paypal_username, venmo_username, single_magnet_price, three_magnets_price, six_magnets_price, nine_magnets_price, enable_tax, tax_rate, coupons')
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
        coupons: saveResult.data.coupons || []
      });
      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

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
          </div>
        </div>

        {/* Pricing Section */}
        <div className={styles.section}>
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