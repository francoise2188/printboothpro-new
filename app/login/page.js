'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Initialize EmailJS with your public key
    emailjs.init('-zdSrFA-DDgNeXp82');
  }, []);

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

      // First, check if the email exists in Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('No account found with this email address');
      }

      // Generate reset link with the correct redirect URL
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      // Send email using EmailJS
      const templateParams = {
        from_name: 'PrintBooth Pro',
        from_email: 'noreply@printboothpro.com',
        to_name: email.split('@')[0],
        to_email: email,
        subject: 'Reset Your PrintBooth Pro Password',
        message: `Click the link below to reset your password: ${window.location.origin}/reset-password`,
        reply_to: 'support@printboothpro.com'
      };

      await emailjs.send(
        'service_763qumt',
        'template_daiienw', // Using the same template as contact form
        templateParams,
        '-zdSrFA-DDgNeXp82'
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