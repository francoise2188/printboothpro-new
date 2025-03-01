'use client';

// Camera Route v2.0 - Using NewEventBoothCamera (2023)
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import NewEventBoothCamera from '../../../components/NewEventBoothCamera';

export default function CameraPage() {
  const { id: eventId } = useParams();

  useEffect(() => {
    console.log('Camera page mounted with event ID:', eventId);
    // Force component refresh
    console.log('Using NewEventBoothCamera v2.0');
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Please scan a valid QR code</h1>
        <p>You will be redirected to the home page...</p>
      </div>
    );
  }

  return <NewEventBoothCamera eventId={eventId} key={`camera-${eventId}-v2`} />;
} 