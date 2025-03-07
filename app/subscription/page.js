'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import styles from './subscription.module.css';
import {
  SparklesIcon,
  BoltIcon,
  CheckBadgeIcon,
  BriefcaseIcon,
  ArrowPathIcon,
  HeartIcon,
  CpuChipIcon,
  ChartBarIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

export default function SubscriptionPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>PrintBooth Pro - Transform Your Events with Photo Magnets</title>
        <meta name="description" content="PrintBooth Pro - The ultimate 2x2 photo magnet solution for events and markets. Create lasting memories with our professional-grade photo booth software." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="photo booth, photo magnets, event photography, market photography, professional photo booth" />
        <meta property="og:title" content="PrintBooth Pro - Transform Your Events with Photo Magnets" />
        <meta property="og:description" content="Create lasting memories with our professional-grade 2x2 photo magnet solution for events and markets." />
        <meta property="og:type" content="website" />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Transform Events with Instant Photo Magnets</h1>
            <p className={styles.subtitle}>
              A precision-focused solution built specifically for 2x2 square photo magnets, perfect for events, markets, and online orders.
            </p>
            <div className={styles.userBadge}>Beta Testing in Progress</div>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <h2 className={styles.sectionTitle}>Why Choose PrintBooth Pro?</h2>
              <div className={styles.whyGrid}>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <SparklesIcon />
                  </div>
                  <h3>Perfect Size</h3>
                  <p>2x2 square magnets - the ideal format for memorable moments</p>
                </div>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <BoltIcon />
                  </div>
                  <h3>Lightning Fast</h3>
                  <p>Instant printing and processing for quick turnaround</p>
                </div>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <CheckBadgeIcon />
                  </div>
                  <h3>Professional Quality</h3>
                  <p>High-resolution output with perfect color accuracy</p>
                </div>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <BriefcaseIcon />
                  </div>
                  <h3>Business Ready</h3>
                  <p>Complete solution for events and market operations</p>
                </div>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <ArrowPathIcon />
                  </div>
                  <h3>Easy Integration</h3>
                  <p>Seamless setup with your existing equipment and workflow</p>
                </div>
                <div className={styles.whyCard}>
                  <div className={styles.featureIcon}>
                    <HeartIcon />
                  </div>
                  <h3>Customer Love</h3>
                  <p>Create lasting memories that clients cherish forever</p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.featuresShowcase}>
            <h2 className={styles.sectionTitle}>Powerful Features</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <CpuChipIcon />
                </div>
                <h3 className={styles.featureTitle}>Smart Automation</h3>
                <ul className={styles.featureDetails}>
                  <li>Automatic template filling</li>
                  <li>Zero-touch printing process</li>
                  <li>Streamlined workflow</li>
                </ul>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <ChartBarIcon />
                </div>
                <h3 className={styles.featureTitle}>Business Tools</h3>
                <ul className={styles.featureDetails}>
                  <li>Event management dashboard</li>
                  <li>Sales tracking & analytics</li>
                  <li>Customer database</li>
                </ul>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <SwatchIcon />
                </div>
                <h3 className={styles.featureTitle}>Design Freedom</h3>
                <ul className={styles.featureDetails}>
                  <li>Custom templates</li>
                  <li>Brand integration</li>
                  <li>Multiple layouts</li>
                </ul>
              </div>
            </div>
          </section>

          <section className={styles.pricingCard}>
            <div className={styles.cardContent}>
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>Launch Special</h3>
                <div className={styles.priceContainer}>
                  <span className={styles.price}>$59</span>
                  <span className={styles.interval}>/month</span>
                </div>
              </div>

              <ul className={styles.featureDetails}>
                <li>✓ Unlimited 2x2 Magnet Templates</li>
                <li>✓ Event and Market Support</li>
                <li>✓ Online Order Management</li>
                <li>✓ Business Analytics</li>
                <li>✓ Priority Support</li>
                <li>✓ Cancel Anytime</li>
              </ul>

              <button
                disabled
                className={`${styles.subscribeButton} ${styles.disabled}`}
              >
                Coming Soon
              </button>

              <div className={styles.loginSection}>
                <p className={styles.loginText}>Already a beta tester?</p>
                <Link href="/login" className={styles.loginButton}>
                  Log In
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 