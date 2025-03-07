'use client';

import { useState } from 'react';
import Head from 'next/head';
import styles from '../subscription/subscription.module.css';
import faqStyles from './faq.module.css';
import Script from 'next/script';

export default function FAQPage() {
  const [openQuestion, setOpenQuestion] = useState(null);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What equipment do I need to use PrintBooth Pro?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You'll need a laptop with WiFi connection and a photo magnet printer. Mobile and tablet support is coming soon. We recommend the Epson EcoTank series for optimal print quality."
        }
      },
      {
        "@type": "Question",
        "name": "What types of events is PrintBooth Pro suitable for?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PrintBooth Pro works for any event with WiFi access, including weddings, corporate events, festivals, markets, pet events, holiday celebrations, pub crawls, product launches, and birthdays."
        }
      },
      {
        "@type": "Question",
        "name": "How does the photo-taking process work at events?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each event gets a unique QR code that guests can scan to access a custom-branded photo experience. No downloads needed - it's all web-based for instant access."
        }
      },
      {
        "@type": "Question",
        "name": "Can guests preview and retake their photos?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Guests can see exactly how their photo will look and can retake it if they're not satisfied. What they see is exactly what will be printed."
        }
      }
    ]
  };

  const faqs = [
    {
      question: "What equipment do I need to use PrintBooth Pro?",
      answer: "Currently, you'll need a laptop with WiFi connection and a photo magnet printer. For best results, we recommend the Epson EcoTank series. Mobile and tablet support is coming soon!"
    },
    {
      question: "What types of events is PrintBooth Pro suitable for?",
      answer: "PrintBooth Pro is versatile and works for any event with WiFi access, including: weddings, corporate events, festivals, markets, pet events, holiday celebrations, pub crawls, product launches, birthdays, and more!"
    },
    {
      question: "What are the setup requirements?",
      answer: "You'll need: WiFi connection, 2-3 6ft tables for your workspace, and electrical power outlets for your printer and laptop. The setup process is straightforward and designed for quick deployment."
    },
    {
      question: "What size photo magnets can I create?",
      answer: "We currently specialize in 2x2 square photo magnets, which is the most popular size for events and provides the perfect balance of quality and efficiency."
    },
    {
      question: "How is the print quality?",
      answer: "PrintBooth Pro delivers professional-grade print quality, comparable to professional printing services. The final output quality will also depend on your printer specifications, which is why we recommend high-quality printers like the Epson EcoTank series."
    },
    {
      question: "What's your subscription policy?",
      answer: "We offer a flexible monthly subscription model. You can cancel at any time. As our software is a digital product, we do not offer refunds on subscription payments."
    },
    {
      question: "How do you handle technical support?",
      answer: "We strive to provide prompt assistance for any technical issues. Response times may vary based on the nature of the issue. Some technical aspects, such as WiFi connectivity at your event, will be dependent on the venue's infrastructure."
    },
    {
      question: "Is internet connection required?",
      answer: "Yes, a WiFi connection is required for optimal performance. We recommend confirming internet availability with your venue before the event."
    },
    {
      question: "How do guests take photos at events?",
      answer: "We've made it incredibly simple! Each event has a unique QR code that guests scan to access a custom-branded photo experience. No apps to download - it's all web-based for instant access. The process is fully automated, making it easy for guests to capture and receive their photo magnets."
    },
    {
      question: "Can events have custom branding?",
      answer: "Absolutely! You can customize the entire experience with your event branding, including custom frames, logos, and text. Design your templates easily in Canva and upload them to the program. Each event can have its own unique look and feel."
    },
    {
      question: "Is there a limit to how many photos guests can take?",
      answer: "By default, there's no limit to the number of photos guests can take. However, hosts can set limits if desired for their specific event."
    },
    {
      question: "Can guests preview their photos before printing?",
      answer: "Yes! What you see is what you get - guests can preview their photo exactly as it will appear on the magnet. Don't like the shot? Simply retake it until you're happy with the result."
    },
    {
      question: "Can you take group photos?",
      answer: "Definitely! The system works with both front and back cameras, perfect for both selfies and group shots. You can easily switch between cameras to capture any moment."
    },
    {
      question: "Do guests get to keep their digital photos?",
      answer: "Yes! Guests can save their photos to their devices. Plus, event hosts receive a master list of all photos taken during the event, which they can export afterward."
    }
  ];

  return (
    <>
      <Head>
        <title>FAQ - PrintBooth Pro | Photo Magnet Solution for Events</title>
        <meta name="description" content="Find answers to common questions about PrintBooth Pro's automated photo magnet solution. Learn about equipment needs, event types, setup requirements, and more." />
        <meta name="keywords" content="photo magnet FAQ, event photography questions, photo booth requirements, photo magnet printing, event photography equipment, photo booth setup" />
        
        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="FAQ - PrintBooth Pro | Photo Magnet Solution" />
        <meta property="og:description" content="Everything you need to know about PrintBooth Pro's automated photo magnet solution for events." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://printboothpro.com/faq" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PrintBooth Pro FAQ" />
        <meta name="twitter:description" content="Common questions about our automated photo magnet solution." />
      </Head>

      {/* Inject structured data */}
      <Script id="structured-data" type="application/ld+json">
        {JSON.stringify(structuredData)}
      </Script>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Frequently Asked Questions</h1>
            <p className={styles.subtitle}>
              Everything you need to know about getting started with PrintBooth Pro
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={faqStyles.faqGrid}>
                {faqs.map((faq, index) => (
                  <div 
                    key={index}
                    className={faqStyles.faqItem}
                    onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                  >
                    <div className={faqStyles.question}>
                      <h3>{faq.question}</h3>
                      <span className={`${faqStyles.icon} ${openQuestion === index ? faqStyles.open : ''}`}>
                        +
                      </span>
                    </div>
                    <div className={`${faqStyles.answer} ${openQuestion === index ? faqStyles.show : ''}`}>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.featuresShowcase}>
            <h2 className={styles.sectionTitle}>Still Have Questions?</h2>
            <div className={styles.featuresGrid} style={{ gridTemplateColumns: '1fr' }}>
              <div className={styles.featureCard} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#4b5563', marginBottom: '1.5rem' }}>
                  We're here to help you get started with PrintBooth Pro.
                </p>
                <a href="/contact" className={styles.subscribeButton} style={{ display: 'inline-block', maxWidth: '200px' }}>
                  Contact Us
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 