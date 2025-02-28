'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

// Add the CountdownOverlay component back
const CountdownOverlay = ({ number }) => {
  if (!number) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 9999
    }}>
      <div style={{
        fontSize: '200px',
        color: 'white',
        fontWeight: 'bold'
      }}>
        {number}
      </div>
    </div>
  );
};

// Add this helper function at the top of your file
const urlToFile = async (dataUrl) => {
  try {
    // Convert base64 to blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    
    // Create File object
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch (error) {
    console.error('Error converting URL to File:', error);
    throw error;
  }
};

// Add this constant at the top of the file, after the imports
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';  // Default guest user ID

export default function MarketCameraPage({ params }) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const resolvedParams = use(params);
  const marketId = resolvedParams.marketId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [photo, setPhoto] = useState(null);
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Add this function to handle quantity changes
  const handleQuantityChange = (change) => {
    setQuantity(prev => Math.max(1, prev + change)); // Prevent going below 1
  };

  // Modified to fetch frame without user
  useEffect(() => {
    async function fetchFrame() {
      try {
        if (!marketId) {
          console.log('⚠️ Missing marketId:', { marketId });
          return;
        }

        console.log('🎯 Fetching frame for market ID:', marketId);
        
        const { data, error } = await supabase
          .from('market_camera_settings')
          .select('border_url')
          .eq('market_id', marketId)
          .maybeSingle();

        if (error) {
          console.error('❌ Settings fetch error:', error.message);
          return;
        }

        if (data?.border_url) {
          console.log('🖼️ Found border URL:', data.border_url);
          setOverlayUrl(data.border_url);
        } else {
          console.log('⚠️ No border_url found for market:', marketId);
        }
      } catch (error) {
        console.error('💥 Error:', error.message);
      }
    }

    if (marketId) {
      fetchFrame();
    }
  }, [marketId]);

  // Create an array of photo records based on quantity
  const createPhotoRecords = (filename, quantity) => {
    const orderCode = `MKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    return Array(quantity).fill().map(() => ({
      market_id: marketId,
      photo_url: filename,
      status: 'in_template',
      column_source: 'photobooth',
      created_at: new Date().toISOString(),
      quantity: 1,  // Each record represents one copy
      order_code: orderCode  // Add the same order code to all copies
    }));
  };

  // Update savePhoto function to just handle photo saving and quantity
  const savePhoto = async () => {
    try {
      setLoading(true);
      console.log('🎯 Starting save process with quantity:', quantity);

      if (!photo) {
        throw new Error('No photo to save');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `market_camera/${marketId}/${timestamp}.jpg`;
      console.log('📁 Generated filename:', filename);

      try {
        // Convert base64 to blob
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
        const photoBlob = Buffer.from(base64Data, 'base64');
        console.log('🖼️ Converted photo to blob');

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('market_photos')
          .upload(filename, photoBlob, {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          console.error('❌ Upload error:', JSON.stringify(uploadError, null, 2));
          throw uploadError;
        }
        console.log('✅ Photo uploaded successfully');

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('market_photos')
          .getPublicUrl(filename);

        console.log('🔗 Got public URL:', publicUrl);

        // Create photo records
        const photoDataArray = createPhotoRecords(filename, quantity);
        console.log('📝 Photo records to save:', JSON.stringify(photoDataArray, null, 2));

        // Save multiple records to database
        const { data: savedPhotos, error: dbError } = await supabase
          .from('market_photos')
          .insert(photoDataArray)
          .select()
          .order('created_at', { ascending: true });

        if (dbError) {
          console.error('❌ Database error:', JSON.stringify(dbError, null, 2));
          throw dbError;
        }
        console.log('✅ Photo records saved:', JSON.stringify(savedPhotos, null, 2));

        // Use the first photo record ID for checkout
        const firstPhotoId = savedPhotos[0]?.id;

        // Redirect to checkout with just photo ID and quantity
        console.log('🛒 Redirecting to checkout...');
        router.push(`/market/${marketId}/checkout?photoId=${firstPhotoId}&quantity=${quantity}`);

      } catch (innerError) {
        console.error('❌ Detailed error:', JSON.stringify({
          message: innerError.message,
          details: innerError.details,
          hint: innerError.hint,
          code: innerError.code,
          fullError: innerError
        }, null, 2));
        throw innerError;
      }

    } catch (error) {
      console.error('❌ Error saving photo:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      alert(`Failed to save photo: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.error('Camera error:', err);
      }
    }

    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const takePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      
      const ctx = canvas.getContext('2d');
      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      
      ctx.drawImage(
        video,
        startX, startY, size, size,
        0, 0, canvas.width, canvas.height
      );

      setPhoto(canvas.toDataURL('image/jpeg', 0.95));
    }
  };

  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        // Stop existing tracks before starting new ones
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to start camera');
    }
  };

  const switchCamera = async () => {
    // Toggle between front and back cameras
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    console.log('🎥 Switching camera to:', newMode);
    setFacingMode(newMode);
    
    // Restart camera with new facing mode
    await startCamera();
  };

  const handleRetake = async () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setPhoto(null);
    await startCamera();
  };

  const startCountdown = () => {
    let count = 3;
    setCountdownNumber(count);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNumber(count);
      } else {
        clearInterval(timer);
        setCountdownNumber(null);
        takePhoto();
      }
    }, 1000);
  };

  return (
    <div style={{ 
      height: '100svh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Video/Photo Display */}
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        maxWidth: '800px',
        margin: '0 auto',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '100%',
          backgroundColor: 'black'
        }}>
          {photo ? (
            <img
              src={photo}
              alt="Captured photo"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} 
            />
          )}
          
          {/* Frame Overlay */}
          {overlayUrl && (
            <div style={{
              position: 'absolute',
              top: '0%',
              left: '-2.5%',
              right: '-2.5%',
              bottom: '0%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <img
                src={overlayUrl}
                alt="Frame overlay"
                style={{
                  width: '105%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                onError={(e) => console.error('🖼️ Image failed to load:', e)}
                onLoad={() => console.log('🖼️ Image loaded successfully')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls Section */}
      <div style={{
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px',
        margin: '0 auto',
        width: '100%'
      }}>
        {photo ? (
          <>
            {/* Add quantity selector */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                <button 
                  onClick={() => handleQuantityChange(-1)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  -
                </button>
                <div style={{
                  fontSize: '20px',
                  color: 'white',
                  minWidth: '60px',
                  textAlign: 'center'
                }}>
                  <div>Quantity</div>
                  <div>{quantity}</div>
                </div>
                <button 
                  onClick={() => handleQuantityChange(1)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <button 
              onClick={handleRetake}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#3B82F6',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '10px'
              }}
            >
              Retake Photo
            </button>

            <button 
              onClick={savePhoto}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#22C55E',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Print My Photo!
            </button>
          </>
        ) : (
          <button 
            onClick={startCountdown}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Take Photo
          </button>
        )}
        
        <button 
          onClick={switchCamera}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#6B7280',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Switch Camera
        </button>
        
        <button 
          onClick={() => router.push(`/market/${marketId}`)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#4B5563',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Back to Home
        </button>
      </div>

      <CountdownOverlay number={countdownNumber} />
    </div>
  );
} 