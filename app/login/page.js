'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If login successful, redirect to admin
      router.push('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Sign in to PrintBooth Pro</h2>
          <p className={styles.subtitle}>
            Or{' '}
            <Link href="/subscription" className={styles.subscribeLink}>
              subscribe to get started
            </Link>
          </p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.inputGroup}>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Email address"
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={styles.subscribeLink}>
          New to PrintBooth Pro?
          <Link href="/subscription">Subscribe here</Link>
        </div>
      </div>
    </div>
  );
} 