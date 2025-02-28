'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function OverlayEditor() {
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentOverlay, setCurrentOverlay] = useState(null);

  // Fetch current overlay on load
  useEffect(() => {
    async function fetchCurrentOverlay() {
      try {
        const { data, error } = await supabase
          .from('design_settings')
          .select('url')
          .eq('type', 'frame_overlay')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setCurrentOverlay(data[0].url);
          setPreview(data[0].url);
        }
      } catch (error) {
        console.error('Error fetching overlay:', error);
      }
    }

    fetchCurrentOverlay();
  }, []);

  const handleUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      // Create a new image element
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Set preview with resized image
        setPreview(canvas.toDataURL('image/png'));
      };
      
      // Load image from file
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `overlay_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('designs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      // Insert into design_settings
      const { error: dbError } = await supabase
        .from('design_settings')
        .insert({
          type: 'frame_overlay',
          url: publicUrl,
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setCurrentOverlay(publicUrl);
      setMessage('✅ Upload successful!');
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Overlay Display */}
      {currentOverlay && (
        <div className="mt-4 space-y-4">
          <h3 className="font-semibold">Current Overlay:</h3>
          <div className="relative">
            <img 
              src={currentOverlay} 
              alt="Current overlay" 
              style={{ maxHeight: '48px', maxWidth: '48px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
          </div>
        </div>
      )}
      
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <label className="block text-center cursor-pointer">
          <span className="text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload new overlay'}
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
