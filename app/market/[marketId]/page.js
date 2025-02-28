'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';

export default function MarketLanding({ params }) {
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [marketName, setMarketName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const router = useRouter();
  const resolvedParams = use(params);
  const marketId = resolvedParams.marketId;
  const { user } = useAuth();

  useEffect(() => {
    if (!marketId) return;

    async function fetchMarketData() {
      try {
        setLoading(true);
        // Fetch market name
        const { data: marketData, error: marketError } = await supabase
          .from('markets')
          .select('name')
          .eq('id', marketId)
          .single();

        if (marketData) {
          setMarketName(marketData.name);
        }

        // Fetch background
        const { data: settingsData, error: settingsError } = await supabase
          .from('market_camera_settings')
          .select('landing_page_url')
          .eq('market_id', marketId)
          .single();

        if (settingsData?.landing_page_url) {
          setBackgroundUrl(settingsData.landing_page_url);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMarketData();
  }, [marketId]);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      console.error('❌ No files selected');
      return;
    }
    
    console.log('📂 Files selected:', files.length);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Please select photos to upload');
      return;
    }

    try {
      setUploading(true);
      console.log('📤 Starting upload process for', selectedFiles.length, 'photos');

      if (!marketId) {
        throw new Error('No market ID available');
      }

      // Generate timestamp and order code
      const timestamp = Date.now();
      const orderCode = `UPL-${timestamp.toString().slice(-6)}`;
      console.log('🎫 Generated order code:', orderCode);

      // Determine quantity tier based on number of photos
      let quantity = 1;
      if (selectedFiles.length >= 9) quantity = 9;
      else if (selectedFiles.length >= 6) quantity = 6;
      else if (selectedFiles.length >= 3) quantity = 3;

      // Upload all photos and create database records
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const filename = `market_uploads/${marketId}/${timestamp}_${index}.jpg`;
        console.log('📝 Upload path:', filename);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('market_photos')
          .upload(filename, file);

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          throw uploadError;
        }

        // Create database record for each photo
        const photoData = {
          market_id: marketId,
          photo_url: filename,
          status: 'in_template',
          column_source: 'upload',
          order_code: orderCode,
          created_at: new Date().toISOString(),
          user_id: user?.id || null,
          quantity: quantity
        };

        const { data: photoRecord, error: dbError } = await supabase
          .from('market_photos')
          .insert([photoData])
          .select()
          .single();

        if (dbError) {
          console.error('❌ Database error:', dbError);
          throw dbError;
        }

        return photoRecord;
      });

      const photoRecords = await Promise.all(uploadPromises);
      console.log('✅ All photos uploaded and saved:', photoRecords);

      // Redirect to checkout with first photo's ID and total quantity
      if (photoRecords.length > 0) {
        router.push(`/market/${marketId}/checkout?photoId=${photoRecords[0].id}&quantity=${quantity}`);
      } else {
        throw new Error('No photos were saved');
      }

    } catch (error) {
      console.error('Error uploading photos:', error);
      setMessage('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      setSelectedFiles([]);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ 
      height: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Background Image Container */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt="Background"
          style={{
            position: 'absolute',
            height: '102vh',
            width: 'auto',
            maxWidth: 'none',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            padding: 0,
            objectFit: 'contain',
            objectPosition: 'center'
          }}
        />
      )}

      {/* Updated Button Container */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '20px',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '400px',
        zIndex: 2
      }}>
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => router.push(`/market/${marketId}/camera`)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2C3639',
              color: '#F5F5F5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '12px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            Start Photo Booth
          </button>

          {/* Hidden file input */}
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Upload button */}
          <button
            onClick={() => {
              if (!uploading) {
                document.getElementById('fileInput').click();
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#A27B5C',
              color: '#F5F5F5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: uploading ? '0.5' : '1',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            {uploading ? 'Uploading...' : 'Select Photos'}
          </button>

          {/* Show selected files and upload button */}
          {selectedFiles.length > 0 && (
            <div style={{ 
              marginTop: '15px',
              textAlign: 'center'
            }}>
              <p style={{
                color: '#2C3639',
                marginBottom: '10px',
                fontSize: '0.9rem'
              }}>
                {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleUpload}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2C3639',
                  color: '#F5F5F5',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Upload & Continue
              </button>
            </div>
          )}

          {message && (
            <p style={{
              marginTop: '10px',
              color: message.includes('Failed') ? '#dc2626' : '#059669',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
