'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Import the client component helper
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// Remove useAuth import if signUp is handled directly by supabase client
// import { useAuth } from '../../lib/AuthContext'; 
import Link from 'next/link';
// Import the new CSS module
import styles from './register.module.css'; 

// Remove hardcoded validation codes
// const VALID_INVITATION_CODES = ['PRINTBOOTH2024'];

export default function RegisterPage() {
  // Create the Supabase client instance
  const supabase = createClientComponentClient(); 
  const router = useRouter();
  // Remove useAuth hook if not used elsewhere
  // const { signUp } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true); // Start loading early

    let validCodeData = null;

    try {
      // 1. Validate invitation code against the database
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .select('id, used_by') // Select id to use for update later
        .eq('code', invitationCode)
        .is('used_by', null) // Check if it's not used
        .maybeSingle(); // Expect one or zero results

      if (codeError) {
        console.error('Error checking invitation code:', codeError);
        throw new Error('Failed to validate invitation code. Please try again.');
      }

      if (!codeData) {
        throw new Error('Invalid or already used invitation code.');
      }
      
      // Store the valid code's ID for later update
      validCodeData = codeData;

      // 2. Check if passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // 3. Sign up the user using Supabase Auth directly
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        // You might need options here if email verification is enabled
        // options: {
        //   emailRedirectTo: `${location.origin}/auth/callback`,
        // }
      });

      if (signUpError) {
        // Handle specific errors if needed (e.g., user already exists)
        console.error('Sign up error:', signUpError);
        throw signUpError; // Rethrow to be caught below
      }
      
      if (!signUpData.user) {
        // Should not happen if no error, but good to check
        throw new Error('Registration completed but no user data returned.');
      }

      // 4. Mark the invitation code as used (best effort)
      const newUserId = signUpData.user.id;
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({ used_by: newUserId })
        .eq('id', validCodeData.id); // Use the ID fetched earlier
        
      if (updateError) {
          console.error('Failed to mark invitation code as used:', updateError);
          // Decide if you want to inform the user or just log this
      }

      // Comment out the alert message
      // alert('Registration successful! Please check your email to verify your account if required, then log in.');
      router.push('/login');

    } catch (err) {
      console.error('Registration process error:', err);
      // Use err.message which might come from Supabase errors or our specific throws
      setError(err.message || 'Failed to register. Please check your details and try again.'); 
    } finally {
      setLoading(false);
    }
  };

  return (
    // Apply styles from the CSS module
    <div className={styles.container}>
      <div className={styles.card}>
        <div>
          <h2 className={styles.title}>
            Create your account
          </h2>
          <p className={styles.subtitle}>
            Or{' '}
            <Link href="/login" className={styles.link}>
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className={styles.form} onSubmit={handleRegister}>
          {error && (
            <div className={styles.error}>{error}</div>
          )}
          <div>
            <label htmlFor="invitation-code" className="sr-only">Invitation Code</label>
            <input
              id="invitation-code"
              name="invitation-code"
              type="text"
              required
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className={styles.input}
              placeholder="Invitation Code"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Email address"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Password"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              autoComplete='new-password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Confirm Password"
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 