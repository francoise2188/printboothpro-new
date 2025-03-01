'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import NewBoothCamera from '../../../components/NewBoothCamera';

export default function CameraPage() {
  const { id: eventId } = useParams();

  useEffect(() => {
    console.log('Camera page mounted with event ID:', eventId);
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Please scan a valid QR code</h1>
        <p>You will be redirected to the home page...</p>
      </div>
    );
  }

  return <NewBoothCamera eventId={eventId} />;
} 