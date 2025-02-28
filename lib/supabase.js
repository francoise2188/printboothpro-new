'use client';

import { createClient } from '@supabase/supabase-js';

// Log environment variables status
console.log('🔧 Initializing Supabase with:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test database connection
console.log('🔄 Testing Supabase connection...');

// Test both connection and table access
Promise.all([
  // Test basic connection
  supabase.from('photos').select('count').single(),
  // Test actual data retrieval
  supabase.from('photos').select('*').limit(1)
])
.then(([countResponse, dataResponse]) => {
  console.log('✅ Supabase connection status:', {
    connectionWorking: !countResponse.error,
    photoCount: countResponse.data?.count,
    hasData: dataResponse.data?.length > 0,
    error: countResponse.error || dataResponse.error
  });
})
.catch(error => {
  console.error('❌ Supabase connection failed:', {
    message: error.message,
    details: error
  });
});
