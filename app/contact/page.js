'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import styles from '../subscription/subscription.module.css';
import contactStyles from './contact.module.css';
import emailjs from '@emailjs/browser';

export default function ContactPage() {
  useEffect(() => {
    emailjs.init('-zdSrFA-DDgNeXp82');
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');

    try {
      await emailjs.send(
        'service_763qumt',
        'template_daiienw',
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          to_name: 'PrintBooth Pro Team',
          to_email: 'info@printboothpro.com',
          reply_to: formData.email
        }
      );

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setStatus('error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <Head>
        <title>Contact Us - PrintBooth Pro</title>
        <meta name="description" content="Get in touch with PrintBooth Pro for any questions about our photo magnet solution for events and markets." />
      </Head>

      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.title}>Contact Us</h1>
            <p className={styles.subtitle}>
              Have questions? We're here to help!
            </p>
          </header>

          <section className={styles.whySection}>
            <div className={styles.whyContent}>
              <div className={contactStyles.contactGrid}>
                <div className={contactStyles.contactInfo}>
                  <div className={contactStyles.infoCard}>
                    <h3>Email Us</h3>
                    <p>info@printboothpro.com</p>
                  </div>
                  <div className={contactStyles.infoCard}>
                    <h3>Business Hours</h3>
                    <p>Monday - Friday<br />9:00 AM - 5:00 PM EST</p>
                  </div>
                  <div className={contactStyles.infoCard}>
                    <h3>Response Time</h3>
                    <p>We typically respond within 24 hours during business days.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className={contactStyles.contactForm}>
                  <div className={contactStyles.formGroup}>
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={contactStyles.formGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={contactStyles.formGroup}>
                    <label htmlFor="subject">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={contactStyles.formGroup}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={`${styles.subscribeButton} ${status === 'sending' ? contactStyles.sending : ''}`}
                    disabled={status === 'sending'}
                  >
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                  </button>

                  {status === 'success' && (
                    <p className={contactStyles.successMessage}>
                      Thank you! Your message has been sent successfully.
                    </p>
                  )}
                  
                  {status === 'error' && (
                    <p className={contactStyles.errorMessage}>
                      Sorry, there was an error sending your message. Please try again.
                    </p>
                  )}
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
} 