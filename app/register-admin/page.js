'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Link from 'next/link';
import styles from './register-admin.module.css';

// This should ideally come from a secure place, not hardcoded
const VALID_INVITATION_CODES = ['ADMIN123', 'SUPERADMIN'];

export default function RegisterAdminPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!VALID_INVITATION_CODES.includes(invitationCode)) {
      setError('Invalid invitation code');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) throw error;

      alert('Registration successful! Please check your email to verify your account.');
      router.push('/admin/login');
    } catch (error) {
      console.error('Error registering:', error);
      setError(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create Admin Account</h2>
          <p className={styles.subtitle}>
            Use a valid invitation code to register.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleRegister}>
          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.inputGroup}>
            <input
              id="invitation-code"
              name="invitation-code"
              type="text"
              required
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className={styles.input}
              placeholder="Invitation Code"
            />
          </div>
          
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

          <div className={styles.inputGroup}>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Confirm Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>

        <div className={styles.subscribeLink}>
          Already have an admin account?
          <Link href="/admin/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
} 