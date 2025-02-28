'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from './create-password.module.css';

const supabase = createClientComponentClient();

function CreatePasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!sessionId) {
      router.push('/subscription');
      return;
    }

    // Fetch the customer email from Stripe session
    const fetchEmail = async () => {
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
        if (data.customerEmail) {
          setEmail(data.customerEmail);
        } else {
          throw new Error('No email found in session');
        }
      } catch (err) {
        console.error('Error fetching email:', err);
        setError('Unable to verify your payment. Please contact support.');
      }
    };

    fetchEmail();
  }, [sessionId, router]);

  // Function to check password strength
  const checkPasswordStrength = (pass) => {
    setPasswordStrength({
      hasMinLength: pass.length >= 8,
      hasUpperCase: /[A-Z]/.test(pass),
      hasLowerCase: /[a-z]/.test(pass),
      hasNumber: /[0-9]/.test(pass),
      hasSpecial: /[!@#$%^&*]/.test(pass)
    });
  };

  // Update password check when password changes
  useEffect(() => {
    checkPasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate passwords
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Check all password requirements
      if (!passwordStrength.hasMinLength) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!passwordStrength.hasUpperCase) {
        throw new Error('Password must include at least one uppercase letter');
      }
      if (!passwordStrength.hasLowerCase) {
        throw new Error('Password must include at least one lowercase letter');
      }
      if (!passwordStrength.hasNumber) {
        throw new Error('Password must include at least one number');
      }
      if (!passwordStrength.hasSpecial) {
        throw new Error('Password must include at least one special character (!@#$%^&*)');
      }

      // Verify payment
      console.log('Verifying payment...');
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          email,
        }),
      });

      const data = await response.json();
      console.log('Payment verification response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      // Create user account
      console.log('Creating user account...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_subscribed: true,
            stripe_customer_id: data.customerId,
            stripe_subscription_id: data.subscriptionId
          }
        }
      });

      console.log('Sign up response:', { 
        user: authData?.user,
        session: authData?.session,
        error: signUpError
      });

      if (signUpError) throw signUpError;
      if (!authData?.user?.id) throw new Error('No user ID returned from sign up');

      // Sign in immediately after signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      // Send confirmation email
      const emailResponse = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email');
      }

      setSuccess(true);
      setMessage('Account created successfully! Check your email for confirmation and redirecting to Printbooth Pro...');
      
      // Wait a moment for the session to be established
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error creating account:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !sessionId) return null;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to Printbooth Pro</h1>
          <p className={styles.subtitle}>
            Create your password to access your account
          </p>
        </div>

        <div className={styles.formCard}>
          {success ? (
            <div className={styles.successMessage}>
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
              <h3 className={styles.successTitle}>Account Created!</h3>
              <p className={styles.successText}>
                Redirecting you to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className={styles.inputDisabled}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter your password"
                  />
                </div>
                <div className={styles.passwordRequirements}>
                  <p className={passwordStrength.hasMinLength ? styles.requirementMet : styles.requirement}>
                    ✓ At least 8 characters
                  </p>
                  <p className={passwordStrength.hasUpperCase ? styles.requirementMet : styles.requirement}>
                    ✓ One uppercase letter
                  </p>
                  <p className={passwordStrength.hasLowerCase ? styles.requirementMet : styles.requirement}>
                    ✓ One lowercase letter
                  </p>
                  <p className={passwordStrength.hasNumber ? styles.requirementMet : styles.requirement}>
                    ✓ One number
                  </p>
                  <p className={passwordStrength.hasSpecial ? styles.requirementMet : styles.requirement}>
                    ✓ One special character (!@#$%^&*)
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? 'Creating Your Account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <CreatePasswordContent />
    </Suspense>
  );
} 