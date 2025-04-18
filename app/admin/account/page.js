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
  const [message, setMessage] = useState('');

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

  if (!user) { 
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