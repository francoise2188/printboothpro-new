'use client';

import Head from 'next/head';
import styles from '../subscription/subscription.module.css';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us - PrintBooth Pro</title>
        <meta name="description" content="Learn about PrintBooth Pro's mission to transform event photography with innovative photo magnet solutions." />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>About PrintBooth Pro</h1>
            <p className={styles.subtitle}>
              Transforming event photography with innovative photo magnet solutions
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={styles.featuresGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.featureCard}>
                  <h2 className={styles.sectionTitle}>Our Story</h2>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563' }}>
                    PrintBooth Pro was born from a simple observation: event photography needed a fresh approach. 
                    We saw the joy that instant photo magnets brought to people at events, but we also saw the 
                    challenges that photographers and event organizers faced in delivering them efficiently.
                  </p>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563', marginTop: '1.5rem' }}>
                    Our team of photographers and software developers came together to create a solution that 
                    would make the process seamless, efficient, and more enjoyable for everyone involved.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.featuresShowcase}>
            <h2 className={styles.sectionTitle}>Our Values</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <h3 className={styles.featureTitle}>Quality First</h3>
                <p>We believe in delivering exceptional quality in every photo magnet, ensuring memories last a lifetime.</p>
              </div>
              <div className={styles.featureCard}>
                <h3 className={styles.featureTitle}>Innovation</h3>
                <p>Constantly improving our technology to provide the best possible experience for photographers and clients.</p>
              </div>
              <div className={styles.featureCard}>
                <h3 className={styles.featureTitle}>Customer Success</h3>
                <p>Your success is our success. We're committed to supporting your photography business growth.</p>
              </div>
            </div>
          </section>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <h2 className={styles.sectionTitle}>Join Our Journey</h2>
              <div className={styles.featuresGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.featureCard}>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563', textAlign: 'center' }}>
                    We're excited to have you join us in revolutionizing event photography. 
                    Whether you're a professional photographer, event organizer, or business owner, 
                    PrintBooth Pro is here to help you create lasting memories for your clients.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 