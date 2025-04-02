'use client';

import React from 'react';
import styles from './page.module.css';

export default function SupportPage() {
  return (
    <div className={styles.container}>
      <h1>PrintBooth Sync Support</h1>
      
      <section className={styles.section}>
        <h2>Need Help with PrintBooth Sync?</h2>
        <p>Welcome to the PrintBooth Sync support center. Here you can find help for setting up and using the PrintBooth Sync printer connector software.</p>
        
        <div className={styles.supportOptions}>
          <div className={styles.option}>
            <h3>General Support</h3>
            <p>Get help with using PrintBooth Sync and connecting your printer.</p>
            <a href="/contact" className={styles.button}>Contact Support</a>
          </div>

          <div className={styles.option}>
            <h3>Printing Setup</h3>
            <p>Need help installing or setting up PrintBooth Sync?</p>
            <a href="/support/printing-setup" className={styles.button}>Setup Guide</a>
          </div>

          <div className={styles.option}>
            <h3>Printer Login Issues</h3>
            <p>Forgot your PrintBooth Sync login?</p>
            <a href="/support/printer-login" className={styles.button}>Reset Login</a>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Common Questions</h2>
        <div className={styles.faq}>
          <h3>What is PrintBooth Sync?</h3>
          <p>PrintBooth Sync is our printer connector software that allows your photo booth to automatically print photos. It's a small program that runs on your computer to handle the printing process.</p>
          
          <h3>How do I set up PrintBooth Sync?</h3>
          <p>Visit our <a href="/support/printing-setup">PrintBooth Sync Setup Guide</a> for step-by-step instructions on installing and configuring the software.</p>
          
          <h3>I forgot my PrintBooth Sync login</h3>
          <p>Use our <a href="/support/printer-login">PrintBooth Sync Login Recovery</a> page to reset your credentials.</p>
          
          <h3>Need more help?</h3>
          <p>Contact our support team through our <a href="/contact">Contact Page</a>.</p>
        </div>
      </section>
    </div>
  );
} 