'use client';

import React from 'react';
import styles from './page.module.css';

export default function PrintingSetupPage() {
  return (
    <div className={styles.container}>
      <h1>PrintBooth Sync Setup Guide</h1>
      
      <section className={styles.section}>
        <h2>Installation Steps</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <h3>Step 1: Download PrintBooth Sync</h3>
            <p>Click the download button provided in your account dashboard to get the PrintBooth Sync installer.</p>
          </div>

          <div className={styles.step}>
            <h3>Step 2: Run the Installer</h3>
            <p>Locate the downloaded file and double-click to run the installer. Follow the installation wizard's instructions.</p>
          </div>

          <div className={styles.step}>
            <h3>Step 3: Launch PrintBooth Sync</h3>
            <p>After installation, PrintBooth Sync will start automatically. You'll see the PrintBooth Sync icon in your system tray.</p>
          </div>

          <div className={styles.step}>
            <h3>Step 4: Log In</h3>
            <p>Enter your PrintBooth Sync credentials when prompted. These were provided to you when your account was set up.</p>
          </div>

          <div className={styles.step}>
            <h3>Step 5: Select Your Printer</h3>
            <p>Choose your printer from the list of available printers. Make sure your printer is turned on and connected to your computer.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Verification</h2>
        <p>To verify that PrintBooth Sync is working correctly:</p>
        <ul className={styles.verificationList}>
          <li>Check that the PrintBooth Sync icon is visible in your system tray</li>
          <li>Right-click the icon to see the status menu</li>
          <li>Your printer should be listed as "Connected"</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Troubleshooting</h2>
        <div className={styles.troubleshooting}>
          <h3>Common Issues</h3>
          <ul>
            <li><strong>Printer not showing up?</strong> Make sure your printer is turned on and properly connected.</li>
            <li><strong>Can't log in?</strong> Check that you're using the correct PrintBooth Sync credentials.</li>
            <li><strong>Software won't start?</strong> Try restarting your computer and running the installer again.</li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Need More Help?</h2>
        <p>If you're still having issues after following these steps, please:</p>
        <ul>
          <li>Check our <a href="/support">general support page</a> for more resources</li>
          <li>Contact our support team through our <a href="/contact">contact page</a></li>
        </ul>
      </section>
    </div>
  );
} 