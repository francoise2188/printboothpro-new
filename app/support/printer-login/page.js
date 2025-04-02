'use client';

import React from 'react';
import styles from './page.module.css';

export default function PrinterLoginPage() {
  return (
    <div className={styles.container}>
      <h1>PrintBooth Sync Login Recovery</h1>
      
      <section className={styles.section}>
        <h2>Forgot Your PrintBooth Sync Login?</h2>
        <p>If you've forgotten your PrintBooth Sync login credentials, please follow these steps:</p>
        
        <div className={styles.steps}>
          <div className={styles.step}>
            <h3>Step 1: Contact Support</h3>
            <p>Send an email to our support team at support@printboothpro.com with the following information:</p>
            <ul>
              <li>Your business name</li>
              <li>Your email address</li>
              <li>Your phone number</li>
              <li>Best time to contact you</li>
            </ul>
          </div>

          <div className={styles.step}>
            <h3>Step 2: Verification</h3>
            <p>Our support team will verify your identity and reset your PrintBooth Sync credentials.</p>
          </div>

          <div className={styles.step}>
            <h3>Step 3: New Credentials</h3>
            <p>Once verified, you'll receive your new PrintBooth Sync login credentials via email.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Important Notes</h2>
        <div className={styles.notes}>
          <ul>
            <li>For security reasons, we cannot reset credentials over the phone</li>
            <li>Please allow up to 24 hours for credential reset during business days</li>
            <li>Make sure to save your new credentials in a secure location</li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Need Immediate Help?</h2>
        <p>If you need immediate assistance, please:</p>
        <ul>
          <li>Email us at support@printboothpro.com</li>
          <li>Visit our <a href="/contact">contact page</a> for more options</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Prevent Future Issues</h2>
        <div className={styles.tips}>
          <h3>Tips for Managing Your PrintBooth Sync Login</h3>
          <ul>
            <li>Use a password manager to securely store your credentials</li>
            <li>Keep your email address up to date in your account</li>
            <li>Regularly update your password for security</li>
            <li>Make sure to log out when using shared computers</li>
          </ul>
        </div>
      </section>
    </div>
  );
} 