'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function LandingPageDesign({ eventId }) {
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);

  useEffect(() => {
    async function fetchCurrentBackground() {
      try {
        const { data, error } = await supabase
          .from('design_settings')
          .select('landing_background')
          .eq('event_id', eventId)
          .single();

        if (error) throw error;
        
        if (data && data.landing_background) {
          setCurrentBackground(data.landing_background);
          setPreview(data.landing_background);
        }
      } catch (error) {
        console.error('Error fetching background:', error);
      }
    }

    if (eventId) {
      fetchCurrentBackground();
    }
  }, [eventId]);

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      console.log('Starting upload process...');

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `landing_${eventId}_${Date.now()}.${fileExt}`;
      
      console.log('Uploading to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('designs')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      // Upsert into design_settings
      console.log('Updating database...');
      const { data: dbData, error: dbError } = await supabase
        .from('design_settings')
        .upsert({
          event_id: eventId,
          landing_background: publicUrl,
          updated_at: new Date().toISOString()
        })
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Database updated successfully:', dbData);
      setMessage('✅ Upload successful!');
      setCurrentBackground(publicUrl);
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error: ' + (error.message || 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = async () => {
    try {
      setMessage('');
      
      // Update design_settings to remove background
      const { error } = await supabase
        .from('design_settings')
        .update({ landing_background: null })
        .eq('event_id', eventId);

      if (error) throw error;

      // Clear the preview
      setPreview(null);
      setCurrentBackground(null);
      setMessage('✅ Background removed successfully!');
    } catch (error) {
      console.error('Error removing background:', error);
      setMessage('❌ Error removing background: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Landing Page Background</h2>
      
      {/* Current Background Display */}
      {currentBackground && (
        <div className="mt-4 space-y-4">
          <h3 className="font-semibold">Current Background:</h3>
          <div className="relative">
            <img 
              src={currentBackground} 
              alt="Current background" 
              style={{ maxHeight: '150px', maxWidth: '150px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
            <button
              onClick={removeBackground}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors w-full"
            >
              Remove Current Background
            </button>
          </div>
        </div>
      )}
      
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <label className="block text-center cursor-pointer">
          <span className="text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload new background image'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded ${message.includes('✅') ? 'bg-green-50' : 'bg-red-50'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
