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

  // Fetch existing settings from database only
  useEffect(() => {
    const initializeSettings = async () => {
      setLoading(true); // Indicate loading state
      setMessage(''); // Clear previous messages
      try {
        if (!user) {
          console.log('DEBUG: No user found - cannot initialize settings');
          return; // Exit if no user
        }

        console.log('DEBUG: Initializing settings for user:', user.id);

        // Fetch settings directly from database based on user_id
        const { data: dbSettings, error: fetchError } = await supabase
          .from('user_settings')
          .select('printnode_api_key, printnode_printer_id')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle to handle no settings gracefully

        console.log('DEBUG: Database fetch result:', { dbSettings, fetchError });

        if (fetchError) {
          // Handle potential errors, but maybeSingle handles "no rows" gracefully
          console.error('DEBUG: Error fetching settings:', fetchError);
          throw new Error(`Failed to fetch settings: ${fetchError.message}`);
        }

        // If settings exist in DB, use them. Otherwise, use initial empty state.
        if (dbSettings) {
          console.log('DEBUG: Found existing settings in DB:', dbSettings);
          setSettings({
            printnode_api_key: dbSettings.printnode_api_key || '',
            printnode_printer_id: dbSettings.printnode_printer_id || ''
          });
        } else {
          console.log('DEBUG: No existing settings found in DB for user. Using defaults.');
          // Keep the initial empty settings state
          setSettings({
            printnode_api_key: '',
            printnode_printer_id: ''
          });
          // Note: We no longer automatically create settings here. 
          // The first save action will create them via upsert.
        }

      } catch (error) {
        console.error('DEBUG: Error in initializeSettings:', error);
        setMessage(`Error loading settings: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (user) { // Only run if user object is available
      initializeSettings();
    }
  }, [user]); // Rerun when user object changes

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
    setMessage(''); // Clear message on new save attempt
    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      console.log('DEBUG: Saving settings for user:', user.id, 'with data:', settings);

      // Upsert directly to database
      const { error } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: user.id,
          printnode_api_key: settings.printnode_api_key || null, // Use null for empty strings
          printnode_printer_id: settings.printnode_printer_id || null // Use null for empty strings
        }], {
          onConflict: 'user_id' // Ensure it updates if exists, inserts if not
        });

      if (error) {
        console.error('DEBUG: Error saving settings to DB:', error);
        throw new Error(`Failed to save settings: ${error.message}`);
      }

      // Remove localStorage saving
      // localStorage.setItem('userSettings', JSON.stringify({...}));

      console.log('DEBUG: Settings saved successfully to DB');
      setMessage('Settings saved successfully!');

    } catch (error) {
      console.error('DEBUG: Error in handleSave:', error);
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

  // Show loading state while fetching settings or if no user yet
  if (loading || !user) { 
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading Account...</h1>
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
        <h2 className={styles.sectionTitle}>Printer Settings</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>PrintNode API Key</label>
          <input
            type="password"
            value={settings.printnode_api_key || ''} // Ensure value is controlled
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
              value={settings.printnode_printer_id || ''} // Ensure value is controlled
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