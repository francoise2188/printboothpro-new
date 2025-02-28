'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './subscription.module.css';

export default function SubscriptionPage() {
  const router = useRouter();

  const handleSubscribe = async () => {
    // Temporarily redirect to admin page
    router.push('/admin');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Program Name */}
        <div className={styles.programName}>
          PrintBooth Pro
        </div>

        {/* Hero Section */}
        <div className={styles.header}>
          <h1 className={styles.title}>Streamline Your Event-Based Photo Magnet Business</h1>
          <p className={styles.subtitle}>
            The first all-in-one platform built specifically for event-based photo magnets - from weddings to markets, festivals to corporate events. Manage your entire business from one place.
          </p>
        </div>

        {/* Pricing Section */}
        <div className={styles.pricingCard}>
          <div className={styles.cardContent}>
            <div className={styles.planHeader}>
              <h3 className={styles.planName}>Professional Plan</h3>
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
                <span>No setup fees</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>No transaction fees</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited events & markets</span>
              </li>
              <li className={styles.featureItem}>
                <svg className={styles.featureIcon} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited photos & orders</span>
              </li>
            </ul>

            <button
              onClick={handleSubscribe}
              className={styles.subscribeButton}
            >
              Try Demo Version
            </button>

            <div className={styles.loginSection}>
              <p className={styles.loginText}>Already have an account?</p>
              <Link href="/login" className={styles.loginButton}>
                Log In
              </Link>
            </div>

            <p className={styles.guarantee}>
              Online payments coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 