'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Check if user is subscribed
  const checkSubscription = (userData) => {
    return userData?.user_metadata?.is_subscribed === true;
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔒 Auth Check:', {
          path: pathname,
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          // Only redirect if we're trying to access admin pages and we're not already on the login page
          if (pathname?.startsWith('/admin') && pathname !== '/login') {
            console.log('🚫 No session, redirecting to login from:', pathname);
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('❌ Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', {
        event,
        path: pathname,
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      if (session?.user) {
        setUser(session.user);
        // If we just signed in and we're on the login page, redirect to admin
        if (event === 'SIGNED_IN' && pathname === '/login') {
          router.push('/admin');
        }
      } else {
        setUser(null);
        // Only redirect if we're on an admin page and not on the login page
        if (pathname?.startsWith('/admin') && pathname !== '/login') {
          console.log('🚫 No session, redirecting to login from:', pathname);
          router.push('/login');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isSubscribed = () => {
    return !!user;
  };

  const value = {
    user,
    loading,
    isSubscribed,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, metadata = {}) => 
      supabase.auth.signUp({ 
        email, 
        password,
        options: { data: metadata }
      }),
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 