'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './success.module.css';

function SuccessContent() {
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.push('/subscription');
      return;
    }

    // Verify the payment and create account
    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setMessage('Payment successful! Redirecting to create your account...');
          // Redirect to create password page
          router.push(`/create-password?session_id=${sessionId}`);
        } else {
          setMessage(data.error || 'Something went wrong. Please try again.');
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage('An error occurred. Please try again.');
      }
    };

    verifyPayment();
  }, [sessionId, router]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.successIcon}>
          <svg
            className={styles.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className={styles.title}>Processing Your Payment</h1>
        <p className={styles.message}>{message || 'Please wait...'}</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
} 