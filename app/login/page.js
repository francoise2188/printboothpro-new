'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import styles from './login.module.css';
import emailjs from '@emailjs/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Generate reset link
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      // Send email using EmailJS
      const templateParams = {
        to_email: email,
        resetLink: resetData?.resetLink || `${window.location.origin}/reset-password`,
        siteUrl: window.location.origin,
        logoUrl: `${window.location.origin}/logo.png`
      };

      await emailjs.send(
        'service_763qumt', // Your Gmail service ID
        'template_vlk9pqy', // Your password reset template ID
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY // We'll add this to your .env file
      );

      setResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email');
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
          {resetSent && (
            <div className={styles.success}>
              Password reset email sent! Please check your inbox.
            </div>
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

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading || !email}
            className={styles.forgotPasswordButton}
          >
            Forgot Password?
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