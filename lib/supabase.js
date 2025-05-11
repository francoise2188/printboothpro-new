'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Log environment variables status
console.log('🔧 Initializing Supabase with (auth-helpers):', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables (auth-helpers):', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables for auth-helpers');
}

// Use createClientComponentClient for the global client-side instance
export const supabase = createClientComponentClient({
  supabaseUrl,
  supabaseKey: supabaseAnonKey,
});

// Test database connection
console.log('🔄 Testing Supabase connection (auth-helpers)...');

// Test both connection and table access
Promise.all([
  supabase.from('photos').select('count', { count: 'exact' }).single(),
  supabase.from('photos').select('*').limit(1)
])
.then(([countResponse, dataResponse]) => {
  let photoCount = null;
  if (countResponse.data) {
    // The count might be directly in data or in data.count depending on exact client version and query
    photoCount = typeof countResponse.data.count === 'number' ? countResponse.data.count : countResponse.count;
  } else if (typeof countResponse.count === 'number') {
     photoCount = countResponse.count;
  }

  console.log('✅ Supabase connection status (auth-helpers):', {
    connectionWorking: !countResponse.error,
    photoCount: photoCount,
    hasData: dataResponse.data?.length > 0,
    error: countResponse.error || dataResponse.error
  });
})
.catch(error => {
  console.error('❌ Supabase connection failed (auth-helpers):', {
    message: error.message,
    details: error
  });
});

// Export a function to get the same instance
export const getSupabase = () => supabase;
