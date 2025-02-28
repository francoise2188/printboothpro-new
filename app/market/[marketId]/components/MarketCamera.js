'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../lib/AuthContext';

// Sharing functions
const shareToInstagram = async (photoUrl) => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'My Photo Booth Picture',
        text: 'Check out my photo booth picture!',
        url: photoUrl
      });
    } else {
      window.open('https://instagram.com', '_blank');
    }
  } catch (error) {
    console.error('Error sharing:', error);
  }
};

const shareToFacebook = async (photoUrl) => {
  try {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}`, '_blank');
  } catch (error) {
    console.error('Error sharing:', error);
  }
};

const saveToDevice = async (photoUrl) => {
  try {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = 'photobooth-picture.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error saving:', error);
  }
};

// Countdown overlay styles
const overlayStyles = {
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
};

const numberStyles = {
  fontSize: '200px',
  color: 'white',
  fontWeight: 'bold'
};

const Countdown = ({ number }) => {
  if (number === null) return null;
  
  return (
    <div style={overlayStyles}>
      <div style={numberStyles}>
        {number}
      </div>
    </div>
  );
};

export default function MarketCamera({ userEmail, maxPhotos, marketId, marketName }) {
  console.log('MarketCamera mounted with props:', { marketId, marketName });

  const videoRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [photosTaken, setPhotosTaken] = useState(0);
  const [borderUrl, setBorderUrl] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchSettings() {
      if (!marketId) return;
      
      try {
        // Get camera settings
        const { data: cameraData, error: cameraError } = await supabase
          .from('market_camera_settings')
          .select('border_url')
          .eq('market_id', marketId)
          .single();

        if (cameraError) {
          console.error('Error fetching camera settings:', cameraError);
          return;
        }

        if (cameraData?.border_url) {
          setBorderUrl(cameraData.border_url);
        }

      } catch (err) {
        console.error('Error in fetchSettings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [marketId]);

  // Debug render
  useEffect(() => {
    console.log('Component rendered with:', {
      marketId,
      borderUrl,
      hasVideoRef: !!videoRef.current
    });
  }, [marketId, borderUrl]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const handleRetake = async () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setPhoto(null);
    await startCamera();
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startCountdown = () => {
    if (photosTaken >= maxPhotos) {
      alert(`You've reached the maximum limit of ${maxPhotos} photos`);
      return;
    }
    setCountdownNumber(3);
    const interval = setInterval(() => {
      setCountdownNumber(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to high quality JPEG
      const photoUrl = canvas.toDataURL('image/jpeg', 1.0);
      console.log('Photo captured, size:', Math.round(photoUrl.length / 1024), 'KB');
      
      setPhoto(photoUrl);
      setCountdownNumber(null);
      setPhotosTaken(prev => prev + 1);
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Failed to capture photo. Please try again.');
    }
  };

  const handleQuantityChange = (change) => {
    setQuantity(prev => Math.max(1, prev + change));
  };

  const savePhoto = async () => {
    if (!photo || !user) return;

    try {
      console.log('Starting save process');

      // Convert base64 to blob
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const photoBlob = Buffer.from(base64Data, 'base64');

      // Generate unique filename with market_camera path
      const timestamp = Date.now();
      const filename = `market_camera/${marketId}/${timestamp}.jpg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('market_photos')
        .upload(filename, photoBlob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('market_photos')
        .getPublicUrl(filename);

      // Prepare database record with quantity
      const photoData = {
        market_id: marketId,
        user_id: user.id,
        photo_url: filename,
        status: 'pending',
        column_source: 'photobooth',
        quantity: quantity,
        created_at: new Date().toISOString()
      };

      console.log('Saving photo data with quantity:', photoData);

      // Save to database
      const { data: photoRecord, error: dbError } = await supabase
        .from('market_photos')
        .insert([photoData])
        .select()
        .single();

      if (dbError) throw dbError;

      // Redirect to checkout with both photoId and quantity
      router.push(`/market/${marketId}/checkout?photoId=${photoRecord.id}&quantity=${quantity}`);

    } catch (error) {
      console.error('Error saving photo:', error);
      setMessage('Failed to save photo. Please try again.');
    }
  };

  const handleSave = async (newSettings) => {
    if (!user || !marketId) return;

    try {
      const { error } = await supabase
        .from('market_camera_settings')
        .upsert({
          ...newSettings,
          market_id: marketId,
          user_id: user.id
        });

      if (error) throw error;

      // Refresh settings after save
      const { data, error: fetchError } = await supabase
        .from('market_camera_settings')
        .select('*')
        .eq('market_id', marketId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setSettings(data);
    } catch (err) {
      console.error('Error saving camera settings:', err);
      setError(err.message);
    }
  };

  return (
    <div style={{ 
      height: '100svh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Camera and Photo Display */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '70vh',
        overflow: 'hidden'
      }}>
        {photo ? (
          <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <img 
              src={photo} 
              alt="Captured photo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {borderUrl && (
              <img
                src={borderUrl}
                alt="Frame overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            )}
          </div>
        ) : (
          <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} 
              onPlay={() => setCameraActive(true)}
            />
            {borderUrl && (
              <img
                src={borderUrl}
                alt="Frame overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            )}
          </div>
        )}
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '10px'
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
              <span style={{
                fontSize: '20px',
                color: 'white',
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {quantity}
              </span>
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
                fontWeight: '500'
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

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px'
            }}>
              <button 
                onClick={() => {
                  if (videoRef.current?.srcObject) {
                    const track = videoRef.current.srcObject.getVideoTracks()[0];
                    const settings = track.getSettings();
                    track.applyConstraints({
                      facingMode: settings.facingMode === 'user' ? 'environment' : 'user'
                    });
                  }
                }}
                style={{
                  padding: '16px',
                  backgroundColor: '#4267B2',
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
                  padding: '16px',
                  backgroundColor: '#4267B2',
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
          </>
        ) : (
          <button 
            onClick={startCountdown}
            disabled={!cameraActive || photosTaken >= maxPhotos}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#3B82F6',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              opacity: (!cameraActive || photosTaken >= maxPhotos) ? '0.5' : '1'
            }}
          >
            Take Photo
          </button>
        )}
      </div>

      {/* Countdown Overlay */}
      <Countdown number={countdownNumber} />
    </div>
  );
}
