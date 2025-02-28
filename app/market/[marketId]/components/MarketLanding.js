"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function MarketLanding({ marketId, marketName }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handlePhotoBoothClick = () => {
    router.push(`/market/${marketId}/camera`);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 9) {
      setMessage('You can only upload up to 9 photos at a time');
      return;
    }
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Please select files to upload');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      for (const file of selectedFiles) {
        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `market_uploads/${marketId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('market_photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('market_photos')
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase
          .from('market_photos')
          .insert({
            market_id: marketId,
            user_id: user.id,
            photo_url: urlData.publicUrl,
            created_at: new Date().toISOString(),
            type: 'upload',
            status: 'pending',
            order_code: `UPL-${Date.now().toString().slice(-6)}`,
            column_source: 'upload'
          });

        if (dbError) throw dbError;
      }

      setMessage('Photos uploaded successfully!');
      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.getElementById('photo-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Error uploading photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">{marketName}</h1>
        
        {/* Buttons Container */}
        <div className="space-y-4">
          <button
            onClick={handlePhotoBoothClick}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition"
          >
            Start Photo Booth
          </button>

          {/* Upload Section */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold mb-3">Or Upload Your Photos</h2>
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full mb-3"
            />
            <p className="text-sm text-gray-500 mb-3">Upload up to 9 photos</p>
            {selectedFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  Selected: {selectedFiles.length} photo(s)
                </p>
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-4 p-3 rounded ${
            message.includes('successfully') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
