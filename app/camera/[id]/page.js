'use client';

// Camera Route v3.0 - Using EventBoothCameraV2 (2023)
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import EventBoothCameraV2 from '../../../components/EventBoothCameraV2';

// Force new instance
const CameraPageV3 = () => {
  console.log('📸 Camera Route v3.0 - Loading EventBoothCameraV2');
  
  const { id: eventId } = useParams();

  useEffect(() => {
    console.log('🎥 Camera page mounted with:', {
      eventId,
      version: 'v3.0',
      component: 'EventBoothCameraV2',
      timestamp: new Date().toISOString()
    });
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Please scan a valid QR code</h1>
        <p>You will be redirected to the home page...</p>
      </div>
    );
  }

  return (
    <div key={`camera-container-${eventId}-v3`}>
      <EventBoothCameraV2 
        eventId={eventId} 
        key={`camera-${eventId}-v3-${Date.now()}`} 
      />
    </div>
  );
};

export default CameraPageV3; 