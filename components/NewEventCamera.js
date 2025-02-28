'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

// Countdown overlay component
const CountdownOverlay = ({ number }) => {
  if (!number) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-[100]">
      <div 
        className="text-[600px] font-black text-white"
        style={{ 
          textShadow: '0 0 60px rgba(255,255,255,0.9)',
          fontFamily: 'var(--font-accent)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          lineHeight: '0.8',
          fontSize: 'min(600px, 50vh)',
          color: 'var(--text-light)',
        }}
      >
        {number}
      </div>
    </div>
  );
};

export default function NewEventCamera({ eventId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayImageRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isFetching, setIsFetching] = useState(false);
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
          // Create Image object for overlay
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = data.frame_overlay.startsWith('data:image') 
            ? data.frame_overlay 
            : data.frame_overlay;
          
          img.onload = () => {
            overlayImageRef.current = img;
            setOverlayUrl(data.frame_overlay);
          };
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchFrame();
  }, [eventId, isFetching]);

  // Initialize camera and start canvas rendering
  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [facingMode]);

  // Canvas rendering loop
  useEffect(() => {
    const renderFrame = () => {
      if (!videoRef.current || !canvasRef.current || photo) return;
      
      // Make sure video is actually playing
      if (videoRef.current.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match video dimensions
      canvas.width = 1080;
      canvas.height = 1080;

      // Calculate scaling to maintain aspect ratio
      const video = videoRef.current;
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

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context state
      ctx.save();

      // Mirror if using front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      // Draw video
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Restore context state
      ctx.restore();

      // Draw overlay if available
      if (overlayImageRef.current) {
        ctx.drawImage(overlayImageRef.current, 0, 0, canvas.width, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    // Start rendering when component mounts
    renderFrame();

    // Add video loadeddata event listener
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadeddata', renderFrame);
    }

    return () => {
      if (video) {
        video.removeEventListener('loadeddata', renderFrame);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [photo, facingMode]);

  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to start camera. Please check permissions.');
    }
  };

  const takePhoto = () => {
    if (!canvasRef.current) return;
    
    try {
      const photoUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setPhoto(photoUrl);
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
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = photo;  // photo is already a base64 data URL
      link.download = `photo-${Date.now()}.jpg`;  // Give the photo a unique name
      
      // Trigger download
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
      console.log('Starting print process for event:', eventId);
      
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

      console.log('Verified event:', eventData.name);
      
      // Convert base64 to blob
      const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
      const photoBlob = Buffer.from(base64Data, 'base64');

      // Generate filename with event ID for organization
      const timestamp = Date.now();
      const filename = `photos/${eventId}/${timestamp}.jpg`;
      
      console.log('Uploading photo:', filename);

      // Upload to storage
      const { error: uploadError } = await supabase
        .storage
        .from('photos')
        .upload(filename, photoBlob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('photos')
        .getPublicUrl(filename);

      console.log('Photo uploaded successfully. Creating database record with URL:', publicUrl);

      // Save to database with print status
      const { data: photoRecord, error: dbError } = await supabase
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

      if (dbError) {
        console.error('Database insert failed:', dbError);
        throw dbError;
      }

      console.log('Photo record created:', photoRecord);

      // Dismiss loading toast
      toast.dismiss(loadingToast);
      toast.success('Your photo is being printed!');
      
      // Redirect to thank you page
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
    startCamera();
  };

  const switchCamera = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Camera Container - Make it fill most of the screen */}
      <div className="flex-1 relative" style={{
        minHeight: '75vh',
        backgroundColor: '#000'
      }}>
        {/* Video Element - kept in viewport but invisible */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
        />
        
        {/* Canvas or Photo Display - Make it fill the container */}
        {photo ? (
          <img
            src={photo}
            alt="Captured photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
          />
        )}

        {/* Countdown Overlay */}
        <CountdownOverlay number={countdownNumber} />
      </div>

      {/* Controls - Fixed at bottom with large buttons */}
      <div style={{ backgroundColor: '#000000', padding: '1rem 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          {photo ? (
            <>
              <button 
                onClick={savePhoto}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#2563eb', // Bright blue
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Save Photo
              </button>
              <button 
                onClick={printPhoto}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#22c55e', // Bright green
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Print My Photo
              </button>
              <button 
                onClick={handleRetake}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#4b5563', // Dark gray
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Retake Photo
              </button>
              <button 
                onClick={() => router.push(`/event/${eventId}`)}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#374151', // Slightly darker gray for the back button
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Back to Event
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={startCountdown}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#2563eb', // Bright blue
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Take Photo
              </button>
              <button
                onClick={switchCamera}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#4b5563', // Dark gray
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Switch Camera
              </button>
              <button 
                onClick={() => router.push(`/event/${eventId}`)}
                className="py-4 rounded-lg font-bold shadow-lg active:scale-95 transition-transform"
                style={{
                  backgroundColor: '#374151', // Slightly darker gray for the back button
                  color: '#ffffff',
                  fontFamily: 'var(--font-primary)',
                  border: 'none',
                  width: '80%',
                  maxWidth: '400px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                Back to Event
              </button>
            </>
          )}
      </div>
    </div>
  );
} 