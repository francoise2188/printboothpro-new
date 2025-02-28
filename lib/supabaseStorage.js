import { createClient } from '@supabase/supabase-js';

// Create a separate client just for storage operations
const supabaseStorage = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export async function uploadPhoto(file, marketId) {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filePath = `market_uploads/${marketId}/${timestamp}_${randomString}.jpg`;

    // Upload file
    const { data, error: uploadError } = await supabaseStorage.storage
      .from('market_photos')
      .upload(filePath, file, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Get URL
    const { data: { publicUrl } } = supabaseStorage.storage
      .from('market_photos')
      .getPublicUrl(filePath);

    return { publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
