'use client';

// Version 2.0 - Force cache bust
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

// Countdown overlay component with market camera styling
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

export default function NewEventBoothCamera({ eventId }) {
  const videoRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Fetch frame overlay when component mounts
  useEffect(() => {
    async function fetchFrame() {
      if (!eventId || isFetching) return;
      
      setIsFetching(true);
      
      try {
        console.log('Fetching frame overlay for event:', eventId);
        const { data, error } = await supabase
          .from('design_settings')
          .select('frame_overlay')
          .eq('event_id', eventId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching frame overlay:', error);
          return;
        }

        if (data?.frame_overlay) {
          console.log('Found frame overlay');
          setOverlayUrl(data.frame_overlay);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsFetching(false);
      }
    }

    fetchFrame();
  }, [eventId, isFetching]);

  // Initialize camera with improved mobile handling
  useEffect(() => {
    async function setupCamera() {
      try {
        // First check if we have camera permissions
        const hasPermission = await navigator.permissions.query({ name: 'camera' });
        if (hasPermission.state === 'denied') {
          throw new Error('Camera permission denied');
        }

        if (videoRef.current?.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
        }

        // Add mobile-specific constraints
        const constraints = {
          video: {
            facingMode,
            width: { min: 1280, ideal: 1920, max: 2560 },
            height: { min: 720, ideal: 1080, max: 1440 },
            frameRate: { ideal: 30, min: 15 },
            // Advanced constraints to prevent zoom
            advanced: [{ zoom: 1, digitalZoom: 1 }]
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure we're properly connected to the stream
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().then(resolve);
            };
          });
        }
        setError(null);
      } catch (err) {
        console.error('Camera setup error:', err);
        toast.error('Unable to access camera. Please check your permissions and try again.');
        setError('Camera access failed');
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
    if (!videoRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      
      const ctx = canvas.getContext('2d');
      
      // Calculate dimensions to maintain aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;
      
      if (videoAspect > canvasAspect) {
        drawWidth = drawHeight * videoAspect;
        offsetX = -(drawWidth - canvas.width) / 2;
      } else {
        drawHeight = drawWidth / videoAspect;
        offsetY = -(drawHeight - canvas.height) / 2;
      }

      // Mirror if using front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      // Draw video
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Draw overlay if available
      if (overlayUrl) {
        const overlay = new Image();
        overlay.crossOrigin = 'anonymous';
        overlay.onload = () => {
          ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
          setPhoto(canvas.toDataURL('image/jpeg', 0.95));
        };
        overlay.src = overlayUrl;
      } else {
        setPhoto(canvas.toDataURL('image/jpeg', 0.95));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
    }
  };

  const savePhoto = () => {
    if (!photo) {
      toast.error('No photo to save');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = photo;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Photo downloading to your device!');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Failed to download photo');
    }
  };

  const printPhoto = async () => {
    if (!photo) {
      toast.error('No photo to print');
      return;
    }

    if (!eventId) {
      toast.error('No event selected. Please select an event first.');
      return;
    }

    try {
      const loadingToast = toast.loading('Sending photo to print queue...');
      
      // Verify event exists first
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        console.error('Event verification failed:', eventError);
        toast.dismiss(loadingToast);
        toast.error('Invalid event selected. Please check the event and try again.');
        return;
      }

      // Convert base64 to blob
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const photoBlob = Buffer.from(base64Data, 'base64');

      // Generate filename with event ID
      const timestamp = Date.now();
      const filename = `photos/${eventId}/${timestamp}.jpg`;
      
      // Upload to storage
      const { error: uploadError } = await supabase
        .storage
        .from('photos')
        .upload(filename, photoBlob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('photos')
        .getPublicUrl(filename);

      // Save to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert([{
          event_id: eventId,
          url: publicUrl,
          status: 'pending',
          print_status: 'pending',
          source: 'event_booth',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      toast.dismiss(loadingToast);
      toast.success('Your photo is being printed!');
      router.push('/thank-you');

    } catch (error) {
      console.error('Error in print process:', error);
      toast.error('Failed to send photo to print queue. Please try again.');
    }
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

  const handleRetake = () => {
    setPhoto(null);
  };

  const switchCamera = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  return (
    <div style={{ 
      height: '100svh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Camera Container */}
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
          {error ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h2 style={{ marginBottom: '20px' }}>{error}</h2>
              <button
                onClick={() => {
                  setError(null);
                  setupCamera();
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => router.push(`/event/${eventId}`)}
                style={{
                  marginTop: '12px',
                  padding: '12px 24px',
                  backgroundColor: '#4B5563',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Back to Event
              </button>
            </div>
          ) : (
            <>
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
                  />
                </div>
              )}
            </>
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
            <button 
              onClick={savePhoto}
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
              Save Photo
            </button>
            <button 
              onClick={printPhoto}
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
              Print My Photo
            </button>
            <button 
              onClick={handleRetake}
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
              Retake Photo
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
        <button 
          onClick={() => router.push(`/event/${eventId}`)}
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
          Back to Event
        </button>
      </div>

      {/* Remove the old countdown styles */}
      <CountdownOverlay number={countdownNumber} />
    </div>
  );
} 