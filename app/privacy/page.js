'use client';

import Head from 'next/head';
import styles from '../subscription/subscription.module.css';
import privacyStyles from './privacy.module.css';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - PrintBooth Pro</title>
        <meta name="description" content="PrintBooth Pro's privacy policy - Learn how we protect your data and respect your privacy." />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.subtitle}>
              How we protect your data and respect your privacy
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={privacyStyles.privacyContent}>
                <div className={privacyStyles.section}>
                  <h2>Information We Collect</h2>
                  <p>We collect information that you provide directly to us, including:</p>
                  <ul>
                    <li>Name and contact information</li>
                    <li>Event details and preferences</li>
                    <li>Photos taken through our platform</li>
                    <li>Payment information</li>
                  </ul>
                </div>

                <div className={privacyStyles.section}>
                  <h2>How We Use Your Information</h2>
                  <p>We use the information we collect to:</p>
                  <ul>
                    <li>Provide and improve our services</li>
                    <li>Process your payments</li>
                    <li>Send you important updates</li>
                    <li>Customize your experience</li>
                  </ul>
                </div>

                <div className={privacyStyles.section}>
                  <h2>Data Storage and Security</h2>
                  <p>
                    We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.
                  </p>
                </div>

                <div className={privacyStyles.section}>
                  <h2>Your Rights</h2>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                </div>

                <div className={privacyStyles.section}>
                  <h2>Contact Us</h2>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at{' '}
                    <a href="mailto:info@printboothpro.com">info@printboothpro.com</a>
                  </p>
                </div>

                <div className={privacyStyles.updateInfo}>
                  <p>Last updated: March 2024</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 