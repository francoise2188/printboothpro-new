'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NewEventCamera from '../../../components/NewEventCamera';

export default function CameraPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id;

  useEffect(() => {
    // Debug logging
    console.log('Camera Page Mounted');
    console.log('Event ID:', eventId);
  }, [eventId]);

  // If no event ID, redirect to home
  if (!eventId) {
    console.log('No event ID found, should redirect');
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">No event ID provided</h2>
          <p className="mt-2 text-gray-400">Please scan a valid QR code</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">Initializing Camera...</h2>
          <p className="mt-2 text-gray-400">Please wait while we set up your photo booth</p>
          <p className="mt-2 text-sm text-gray-500">Event ID: {eventId}</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-black">
        <NewEventCamera eventId={eventId} />
      </div>
    </Suspense>
  );
} 