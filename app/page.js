'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

function HomeContent() {
  const [email, setEmail] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const error = searchParams.get('error');

  useEffect(() => {
    // If there's no event ID, redirect to subscription page
    if (!eventId) {
      router.push('/subscription');
      return;
    }

    async function checkEventStatus() {
      const { data, error } = await supabase
        .from('events')
        .select('*, design_settings(*)')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error checking event status:', error);
        return;
      }

      // If event is not active, redirect to ended page
      if (!data.is_active) {
        router.push('/event-ended');
        return;
      }

      // Set background URL from design settings
      if (data.design_settings?.[0]?.landing_background) {
        console.log('Setting background URL:', data.design_settings[0].landing_background);
        setBackgroundUrl(data.design_settings[0].landing_background);
      }
    }

    checkEventStatus();
  }, [eventId, router]);

  // If this is an event page, show the event-specific layout
  if (eventId) {
    return (
      <div style={{ 
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Background Image Container */}
        {backgroundUrl && (
          <div style={{
            position: 'absolute',
            height: '102vh',
            width: '100vw',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            padding: 0,
          }}>
            <Image
              src={backgroundUrl}
              alt="Event Background"
              fill
              style={{
                objectFit: 'contain',
                objectPosition: 'center'
              }}
              onError={(e) => {
                console.error('Error loading background image:', e);
                console.log('Attempted URL:', backgroundUrl);
              }}
              onLoad={() => {
                console.log('Background image loaded successfully');
              }}
              priority
              unoptimized
            />
          </div>
        )}

        {/* Email Form */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '15px',
          borderRadius: '12px',
          width: '80%',
          maxWidth: '350px',
          zIndex: 2
        }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (email) {
              localStorage.setItem('userEmail', email);
              const targetUrl = `/camera/${eventId}`;
              console.log('Redirecting to:', targetUrl);
              router.push(targetUrl);
            }
          }}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Start Photo Booth
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If no eventId, show the main homepage
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          PrintBooth Pro
        </h1>
        <p className={styles.description}>
          Your All-in-One Photo Magnet Solution for Events & Markets
        </p>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.buttonContainer}>
          <Link href="/subscription" className={styles.subscribeButton}>
            Subscribe Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
