'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import Webcam from 'react-webcam';

// Countdown overlay component
const CountdownOverlay = ({ number }) => {
  if (!number) return null;
  
  return (
    <div className="countdown-overlay">
      <div className="countdown-number">
        {number}
      </div>
    </div>
  );
};

export default function NewBoothCamera({ eventId }) {
  const webcamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Updated camera constraints for better quality and no zoom
  const videoConstraints = {
    width: { min: 1280, ideal: 1920, max: 2560 },
    height: { min: 720, ideal: 1080, max: 1440 },
    facingMode,
    frameRate: { min: 15, ideal: 30 },
    // Advanced constraints to prevent zoom
    advanced: [
      {
        zoom: 1,
        digitalZoom: 1
      }
    ]
  };

  // Fetch frame overlay when component mounts (keeping the same overlay logic)
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

  // Function to capture photo
  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Create a new canvas to combine webcam shot with overlay
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Set canvas size to match the captured image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the captured photo
          ctx.drawImage(img, 0, 0);
          
          // If there's an overlay, draw it on top
          if (overlayUrl) {
            const overlay = new Image();
            overlay.crossOrigin = 'anonymous';
            overlay.onload = () => {
              ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
              // Convert final image to base64
              const finalImage = canvas.toDataURL('image/jpeg', 0.95);
              setPhoto(finalImage);
            };
            overlay.src = overlayUrl;
          } else {
            // If no overlay, use the photo as is
            setPhoto(imageSrc);
          }
        };
        
        img.src = imageSrc;
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
    }
  }, [overlayUrl]);

  // Start countdown and take photo
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
        capture();
      }
    }, 1000);
  };

  // Save photo locally
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

  // Print photo (keeping the same print logic)
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

  const handleRetake = () => {
    setPhoto(null);
  };

  const switchCamera = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Camera Container */}
      <div className="flex-1 relative" style={{ 
        minHeight: '75vh', 
        backgroundColor: '#000',
        maxHeight: '80vh' // Added to prevent stretching on mobile
      }}>
        {photo ? (
          <img
            src={photo}
            alt="Captured photo"
            className="w-full h-full object-contain" // Changed from object-cover to object-contain
            style={{ maxHeight: '80vh' }} // Added to maintain aspect ratio
          />
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-full h-full object-contain" // Changed from object-cover to object-contain
            style={{ maxHeight: '80vh' }} // Added to maintain aspect ratio
            mirrored={facingMode === 'user'}
          />
        )}

        {/* Countdown Overlay - Made more visible */}
        <CountdownOverlay number={countdownNumber} />
      </div>

      {/* Controls - Made more mobile-friendly */}
      <div className="bg-black p-4 flex flex-col gap-3 items-center" style={{ 
        minHeight: '20vh',
        paddingBottom: 'env(safe-area-inset-bottom, 1rem)' // Added for iPhone notch
      }}>
        {photo ? (
          <>
            <button 
              onClick={savePhoto}
              className="w-full max-w-[300px] h-12 bg-blue-600 text-white rounded-lg font-bold active:scale-95 transition-transform"
            >
              Save Photo
            </button>
            <button 
              onClick={printPhoto}
              className="w-full max-w-[300px] h-12 bg-green-500 text-white rounded-lg font-bold active:scale-95 transition-transform"
            >
              Print My Photo
            </button>
            <button 
              onClick={handleRetake}
              className="w-full max-w-[300px] h-12 bg-gray-600 text-white rounded-lg font-bold active:scale-95 transition-transform"
            >
              Retake Photo
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={startCountdown}
              className="w-full max-w-[300px] h-12 bg-blue-600 text-white rounded-lg font-bold active:scale-95 transition-transform"
            >
              Take Photo
            </button>
            <button
              onClick={switchCamera}
              className="w-full max-w-[300px] h-12 bg-gray-600 text-white rounded-lg font-bold active:scale-95 transition-transform"
            >
              Switch Camera
            </button>
          </>
        )}
        <button 
          onClick={() => router.push(`/event/${eventId}`)}
          className="w-full max-w-[300px] h-12 bg-gray-700 text-white rounded-lg font-bold active:scale-95 transition-transform"
        >
          Back to Event
        </button>
      </div>

      {/* Make countdown overlay more visible */}
      <style jsx global>{`
        .countdown-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          z-index: 100;
        }
        .countdown-number {
          font-size: min(40vh, 300px);
          color: white;
          font-weight: 900;
          text-shadow: 0 0 20px rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
} 