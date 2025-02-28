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
  const [loading, setLoading] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    printnode_api_key: '',
    printnode_printer_id: ''
  });

  // Fetch existing settings
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // First check if we have a user
        if (!user) {
          console.log('DEBUG: No user found - not authenticated');
          return;
        }

        console.log('DEBUG: User authenticated with ID:', user.id);

        // Try to get existing settings from localStorage first
        const localSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');

        // Try to get existing settings from database
        const { data: existingData, error: fetchError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        console.log('DEBUG: Fetch attempt result:', { existingData, fetchError });

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.log('DEBUG: Fetch error occurred:', fetchError);
          throw new Error(`Failed to fetch settings: ${fetchError.message}`);
        }

        if (!existingData) {
          console.log('DEBUG: No existing settings found, attempting to create new settings...');
          
          // Create new settings using upsert instead of insert
          const { data: newData, error: upsertError } = await supabase
            .from('user_settings')
            .upsert({
              user_id: user.id,
              printnode_api_key: localSettings.printnode_api_key || '',
              printnode_printer_id: localSettings.printnode_printer_id || ''
            })
            .select()
            .single();

          console.log('DEBUG: Upsert attempt result:', { newData, upsertError });

          if (upsertError) {
            console.error('DEBUG: Upsert error:', upsertError);
            throw new Error(`Failed to create settings: ${upsertError.message}`);
          }

          console.log('DEBUG: New settings created successfully:', newData);
          setSettings(newData);
          
          // Update localStorage with the new settings
          localStorage.setItem('userSettings', JSON.stringify({
            printnode_api_key: newData.printnode_api_key || '',
            printnode_printer_id: newData.printnode_printer_id || ''
          }));
          
          setMessage('Settings initialized successfully');
          return;
        }

        console.log('DEBUG: Existing settings loaded:', existingData);
        
        // Merge database settings with localStorage settings
        const mergedSettings = {
          ...existingData,
          printnode_api_key: localSettings.printnode_api_key || existingData.printnode_api_key || '',
          printnode_printer_id: localSettings.printnode_printer_id || existingData.printnode_printer_id || ''
        };
        
        setSettings(mergedSettings);
        
        // Update localStorage with the merged settings
        localStorage.setItem('userSettings', JSON.stringify({
          printnode_api_key: mergedSettings.printnode_api_key,
          printnode_printer_id: mergedSettings.printnode_printer_id
        }));
        
        setMessage('');

      } catch (error) {
        console.error('DEBUG: Critical error in initializeSettings:', error);
        setMessage(error.message);
      }
    };

    initializeSettings();
  }, [user]);

  const testPrintNodeConnection = async () => {
    try {
      setLoadingPrinters(true);
      console.log('Testing PrintNode connection with API key:', settings.printnode_api_key ? 'Key provided' : 'No key');
      
      const response = await fetch('/api/print', {
        method: 'GET',
        headers: {
          'X-PrintNode-API-Key': settings.printnode_api_key,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('PrintNode API response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('PrintNode API response data:', data);
      
      if (data.success && data.printers) {
        setPrinters(data.printers);
        setMessage('Successfully connected to PrintNode!');
      } else {
        throw new Error(data.message || 'Failed to get printers');
      }
    } catch (error) {
      console.error('PrintNode connection error:', error);
      setMessage('Failed to connect to PrintNode. Please check your API key.');
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: user.id,
          printnode_api_key: settings.printnode_api_key || '',
          printnode_printer_id: settings.printnode_printer_id || ''
        }], {
          onConflict: 'user_id'
        });

      if (error) {
        throw new Error(`Failed to save settings: ${error.message}`);
      }

      // Also save to localStorage for immediate access
      localStorage.setItem('userSettings', JSON.stringify({
        printnode_api_key: settings.printnode_api_key || '',
        printnode_printer_id: settings.printnode_printer_id || ''
      }));

      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(error.message || 'Error saving settings');
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

  // If no user is present, show loading state
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading...</h1>
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
        <div className={`${styles.message} ${message.includes('Error') ? styles.error : styles.success}`}>
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
        <h2 className={styles.sectionTitle}>Printer Settings</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>PrintNode API Key</label>
          <input
            type="password"
            value={settings.printnode_api_key}
            onChange={(e) => setSettings({...settings, printnode_api_key: e.target.value})}
            className={styles.input}
            placeholder="Enter PrintNode API Key"
          />
        </div>
        
        <button
          onClick={testPrintNodeConnection}
          disabled={!settings.printnode_api_key || loadingPrinters}
          className={`${styles.button} ${styles.testButton}`}
        >
          {loadingPrinters ? 'Testing Connection...' : 'Test Connection'}
        </button>

        {printers.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Default Printer</label>
            <select
              value={settings.printnode_printer_id}
              onChange={(e) => setSettings({...settings, printnode_printer_id: e.target.value})}
              className={styles.input}
            >
              <option value="">Select a printer</option>
              {printers.map(printer => (
                <option key={printer.id} value={printer.id}>
                  {printer.name} - {printer.description}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSave}
          className={`${styles.button} ${styles.saveButton}`}
        >
          Save Printer Settings
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className={styles.signOutButton}
        >
          {loading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
} 