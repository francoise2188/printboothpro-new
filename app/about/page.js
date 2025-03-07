'use client';

import Head from 'next/head';
import styles from '../subscription/subscription.module.css';
import { LightBulbIcon, SparklesIcon, HeartIcon } from '@heroicons/react/24/outline';
import Script from 'next/script';

export default function AboutPage() {
  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PrintBooth Pro",
    "description": "Innovative automated photo magnet solution for events and markets",
    "url": "https://printboothpro.com/about",
    "foundingDate": "2024",
    "image": "https://printboothpro.com/logo.png",
    "sameAs": [
      "https://www.linkedin.com/company/printboothpro",
      "https://www.instagram.com/printboothpro"
    ]
  };

  return (
    <>
      <Head>
        <title>About PrintBooth Pro | Automated Photo Magnet Solution for Events</title>
        <meta name="description" content="Discover PrintBooth Pro's innovative automated photo magnet solution for events. Transform your event photography business with our revolutionary technology." />
        <meta name="keywords" content="photo magnets, event photography, automated photo booth, photo magnet business, event technology, photo magnet printing, event photography automation" />
        
        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="About PrintBooth Pro | Automated Photo Magnet Solution" />
        <meta property="og:description" content="Revolutionary automated photo magnet solution transforming event photography. Perfect for events, markets, and entrepreneurial opportunities." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://printboothpro.com/about" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About PrintBooth Pro" />
        <meta name="twitter:description" content="Revolutionary automated photo magnet solution transforming event photography." />
      </Head>

      {/* Inject structured data */}
      <Script id="structured-data" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Our Story</h1>
            <p className={styles.subtitle}>
              Revolutionizing Event Photography with Automated Photo Magnets
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={styles.featuresGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.featureCard}>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: '#1a1a1a' }}>The Spark of Innovation</h2>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563', marginBottom: '1.5rem' }}>
                    PrintBooth Pro emerged from a groundbreaking observation in the events industry. With extensive experience in events 
                    and hospitality, our founder identified a significant market opportunity: while photo magnets were thriving in retail 
                    settings, no one had successfully adapted them for events. The traditional process was simply too time-consuming and 
                    labor-intensive to be practical for live events.
                  </p>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563' }}>
                    Through intensive research and innovative development, we created a revolutionary solution: the first fully automated 
                    photo magnet system specifically engineered for events and markets. Our technology streamlines what was once a complex, 
                    manual process into a seamless, automated experience.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.featuresShowcase}>
            <h2 className={styles.sectionTitle}>What Makes Us Different</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <SparklesIcon />
                </div>
                <h3 className={styles.featureTitle}>Fully Automated Solution</h3>
                <p>Experience the future of event photography with our innovative automated system. From photo capture to magnet printing, 
                every step is seamlessly integrated. Guests simply scan a QR code to start creating lasting memories.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <LightBulbIcon />
                </div>
                <h3 className={styles.featureTitle}>Specialized Technology</h3>
                <p>Unlike traditional photo booths, PrintBooth Pro is engineered specifically for creating photo magnets. Every feature 
                is optimized for producing high-quality, instant photo magnets that your guests will treasure.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <HeartIcon />
                </div>
                <h3 className={styles.featureTitle}>Event Industry Expertise</h3>
                <p>Built by event industry professionals, our solution is crafted with deep understanding of what makes events successful. 
                We've created a system that enhances guest experiences while maximizing efficiency for operators.</p>
              </div>
            </div>
          </section>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={styles.featuresGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.featureCard}>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: '#1a1a1a' }}>Our Vision</h2>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563', marginBottom: '1.5rem' }}>
                    As we enter our beta testing phase, we're poised to transform the landscape of event photography. Our vision extends 
                    beyond providing a service - we're creating opportunities for entrepreneurs to build thriving businesses with our 
                    innovative platform.
                  </p>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563' }}>
                    Looking ahead, we're committed to continuous innovation - developing new magnet sizes, expanding template options, 
                    and enhancing our platform based on user feedback. We believe in creating technology that not only makes events more 
                    memorable but also empowers entrepreneurs to achieve their business goals.
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