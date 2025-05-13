'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './WelcomePopup.module.css';

export default function WelcomePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setIsVisible(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <h2>Welcome to PrintBooth Pro! 🎉</h2>
        <p>Thank you for choosing PrintBooth Pro for your photo magnet business!</p>
        <p>To help you get started, we've created a comprehensive guide that covers everything you need to know.</p>
        <div className={styles.buttons}>
          <button 
            onClick={() => {
              router.push('/admin/account/guide');
              setIsVisible(false);
            }}
            className={styles.primaryButton}
          >
            View Guide
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className={styles.secondaryButton}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
} 