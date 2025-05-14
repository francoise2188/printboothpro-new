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
import { loadStripe } from '@stripe/stripe-js';

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      // Get the user's email (you might want to add a form for this)
      const email = prompt('Please enter your email to start your free trial:');
      
      if (!email) {
        setError('Email is required to start your trial');
        return;
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Initialize Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({ 
        sessionId: data.sessionId 
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>PrintBooth Pro - The Tech Behind Tomorrow's Keepsakes</title>
        <meta name="description" content="PrintBooth Pro - The tech behind tomorrow's keepsakes. Transform your events with instant 2x2 photo magnets, perfect for creating lasting memories at events and markets." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="photo booth, photo magnets, event photography, market photography, professional photo booth, instant photo magnets, keepsakes" />
        <meta property="og:title" content="PrintBooth Pro - The Tech Behind Tomorrow's Keepsakes" />
        <meta property="og:description" content="Transform your events with instant photo magnets. Create lasting memories with our professional-grade 2x2 photo magnet solution." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PrintBooth Pro" />
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

          {/* Video Section */}
          <section className={styles.videoSection}>
            <div className={styles.videoWrapper}>
              <div style={{
                position: 'relative',
                width: '100%',
                height: '0',
                paddingTop: '56.25%',
                overflow: 'hidden',
                borderRadius: '8px',
                boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
                marginBottom: '1rem'
              }}>
                <iframe
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: 0,
                    left: 0,
                    border: 'none',
                    padding: 0,
                    margin: 0
                  }}
                  src="https://www.canva.com/design/DAGhieH7L2E/S18rpbJtBThaKaBsacHGkw/watch?embed"
                  allowFullScreen
                  allow="fullscreen"
                />
              </div>
            </div>
          </section>

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
                <p className={styles.trialText}>Start with a 3-day free trial</p>
              </div>

              <ul className={styles.featureDetails}>
                <li>✓ Unlimited 2x2 Magnet Templates</li>
                <li>✓ Event and Market Support</li>
                <li>✓ Online Order Management</li>
                <li>✓ Business Analytics</li>
                <li>✓ Priority Support</li>
                <li>✓ Cancel Anytime</li>
                <li>✓ 3-Day Free Trial</li>
              </ul>

              {error && (
                <p className={styles.error}>{error}</p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className={`${styles.subscribeButton} ${loading ? styles.disabled : ''}`}
              >
                {loading ? 'Starting Trial...' : 'Start Free Trial'}
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