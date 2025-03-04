'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './subscription.module.css';

export default function SubscriptionPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={`${styles.content} ${styles.gradientBg}`}>
        {/* Program Name */}
        <div className={styles.programName}>
          PrintBooth Pro
        </div>

        {/* Hero Section */}
        <div className={styles.header}>
          <h1 className={styles.title}>The Event-Based Photo Magnet Specialists</h1>
          <p className={styles.subtitle}>
            A precision-focused solution built specifically for 2x2 square magnets, perfect for events, markets, and online orders.
          </p>
          <div className={styles.userBadge}>Beta Testing in Progress</div>
        </div>

        {/* Why 2x2 Section */}
        <div className={styles.whySection}>
          <div className={styles.whyContent}>
            <h2 className={styles.whyTitle}>Why 2x2 Square Magnets?</h2>
            <div className={styles.whyGrid}>
              <div className={styles.whyCard}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>💫</span>
                </div>
                <h3>Compact and Versatile</h3>
                <p>Perfect size for memorable moments</p>
              </div>
              <div className={styles.whyCard}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>🎯</span>
                </div>
                <h3>Easy to Display</h3>
                <p>Ideal for any magnetic surface</p>
              </div>
              <div className={styles.whyCard}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>✨</span>
                </div>
                <h3>Professional Finish</h3>
                <p>High-quality keepsake that lasts</p>
              </div>
              <div className={styles.whyCard}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon}>📸</span>
                </div>
                <h3>Perfect Framing</h3>
                <p>Optimal size for portrait shots</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className={`${styles.featuresShowcase} ${styles.accentBg}`}>
          <h2 className={styles.sectionTitle}>The PrintBooth Pro Advantage</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🤖</div>
              <h3 className={styles.featureTitle}>Smart Automation</h3>
              <ul className={styles.featureDetails}>
                <li>Automatic Template Filling</li>
                <li>Zero-Touch Printing</li>
                <li>Streamlined Workflow</li>
              </ul>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💼</div>
              <h3 className={styles.featureTitle}>Business Management</h3>
              <ul className={styles.featureDetails}>
                <li>Event Planning Tools</li>
                <li>Market Integration</li>
                <li>Order Management</li>
              </ul>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎨</div>
              <h3 className={styles.featureTitle}>Versatile Applications</h3>
              <ul className={styles.featureDetails}>
                <li>Event Commemorations</li>
                <li>Corporate Branding</li>
                <li>Personal Celebrations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Equipment Section */}
        <div className={styles.equipmentSection}>
          <h2 className={styles.sectionTitle}>Simple Setup Requirements</h2>
          <div className={styles.equipmentCard}>
            <div className={styles.equipmentIcon}>⚡</div>
            <ul className={styles.equipmentList}>
              <li><strong>Basic Needs:</strong>
                <ul>
                  <li>WiFi Connection</li>
                  <li>Laptop (Mobile/Tablet Support Coming Soon)</li>
                  <li>Compatible Printer</li>
                  <li>2x2 Magnet Printing Equipment</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing Section */}
        <div className={styles.pricingCard}>
          <div className={styles.cardContent}>
            <div className={styles.planHeader}>
              <h3 className={styles.planName}>Launch Special</h3>
              <div className={styles.priceContainer}>
                <span className={styles.price}>$59</span>
                <span className={styles.interval}>/month</span>
              </div>
            </div>

            <ul className={styles.featuresList}>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited 2x2 Magnet Templates</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Event and Market Support</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Online Order Management</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>No Hidden Fees</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel Anytime</span>
              </li>
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
        </div>

        {/* Future Roadmap */}
        <div className={styles.roadmapSection}>
          <h2 className={styles.sectionTitle}>Future Roadmap</h2>
          <div className={styles.roadmapGrid}>
            <div className={styles.roadmapCard}>
              <ul className={styles.roadmapList}>
                <li>Exploring Additional Magnet Sizes</li>
                <li>Mobile & Tablet Support</li>
                <li>Enhanced Feature Development</li>
                <li>User-Driven Improvements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 