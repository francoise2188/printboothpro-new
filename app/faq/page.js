'use client';

import { useState } from 'react';
import Head from 'next/head';
import styles from '../subscription/subscription.module.css';
import faqStyles from './faq.module.css';

export default function FAQPage() {
  const [openQuestion, setOpenQuestion] = useState(null);

  const faqs = [
    {
      question: "What equipment do I need to use PrintBooth Pro?",
      answer: "You'll need a laptop with WiFi connection, a compatible printer, and 2x2 magnet printing equipment. Mobile and tablet support is coming soon."
    },
    {
      question: "How long does it take to print a photo magnet?",
      answer: "The entire process from photo capture to printed magnet typically takes 1-2 minutes, depending on your printer speed."
    },
    {
      question: "Can I customize the photo templates?",
      answer: "Yes! PrintBooth Pro offers full template customization, allowing you to add your branding, custom designs, and various layouts."
    },
    {
      question: "Is there a limit to how many photos I can print?",
      answer: "No, there are no limits on the number of photos you can print. Our subscription includes unlimited template usage."
    },
    {
      question: "Do you offer technical support?",
      answer: "Yes, we provide priority technical support to all our subscribers, helping you with setup, troubleshooting, and optimization."
    },
    {
      question: "Can I use PrintBooth Pro for different types of events?",
      answer: "Absolutely! PrintBooth Pro is perfect for weddings, corporate events, markets, festivals, and any other event where you want to offer instant photo magnets."
    }
  ];

  return (
    <>
      <Head>
        <title>FAQ - PrintBooth Pro</title>
        <meta name="description" content="Find answers to common questions about PrintBooth Pro's photo magnet solution for events and markets." />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Frequently Asked Questions</h1>
            <p className={styles.subtitle}>
              Find answers to common questions about PrintBooth Pro
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
                  Can't find the answer you're looking for? We're here to help!
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