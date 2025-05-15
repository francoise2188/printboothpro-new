'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

export default function EventPage() {
  const [email, setEmail] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  
  const supabase = createClientComponentClient();

  // Get the raw ID from the URL
  const eventId = params?.id || '';

  useEffect(() => {
    let isMounted = true;

    async function checkEventStatus() {
      if (!eventId) {
        console.log('No event ID found');
        setError('Event ID is missing');
        setIsLoading(false);
        return;
      }

      console.log('Checking event status for ID:', eventId);

      try {
        setIsLoading(true);
        
        // Fetch the event data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*, design_settings(*)')
          .eq('id', eventId)
          .single();

        if (!isMounted) return;

        if (eventError) {
          console.error('Error fetching event:', eventError.message);
          setError('Unable to load event');
          setIsLoading(false);
          return;
        }

        if (!eventData) {
          console.error('No event found for ID:', eventId);
          setError('Event not found');
          setIsLoading(false);
          return;
        }

        // If event is not active, show error
        if (!eventData.is_active) {
          setError('This event is no longer active');
          setIsLoading(false);
          return;
        }

        // Set background URL from design settings
        if (eventData.design_settings?.[0]?.landing_background) {
          setBackgroundUrl(eventData.design_settings[0].landing_background);
        }
        
        setIsLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error details:', err.message);
        setError('Unable to load event. Please try again later.');
        setIsLoading(false);
      }
    }

    checkEventStatus();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && eventId && !isSubmitting) { 
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        // First check if user has reached their photo limit
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('photos_per_person, total_photo_limit')
          .eq('id', eventId)
          .single();

        if (eventError) {
          throw new Error('Failed to verify event. Please try again.');
        }

        // Check total event photo limit if set
        if (eventData.total_photo_limit) {
          const { count, error: countError } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .is('deleted_at', null);

          if (countError) {
            throw new Error('Failed to check event photo limit. Please try again.');
          }

          if (count >= eventData.total_photo_limit) {
            setSubmitError('You have reached your photo limit for this event. For any questions, please contact the event organizer.');
            setIsSubmitting(false);
            return;
          }
        }

        // Check current photo submissions for this user
        const { data: submissionData, error: submissionError } = await supabase
          .from('photo_submissions')
          .select('photos_submitted')
          .eq('event_id', eventId)
          .eq('email', email)
          .single();

        if (submissionError && submissionError.code !== 'PGRST116') {
          throw new Error('Failed to check photo limit. Please try again.');
        }

        const currentSubmissions = submissionData?.photos_submitted || 0;
        const photosPerPerson = eventData.photos_per_person;

        // Only check limit if photos_per_person is not null (not unlimited)
        if (photosPerPerson !== null && currentSubmissions >= photosPerPerson) {
          setSubmitError(`You have already taken your ${photosPerPerson} photo${photosPerPerson > 1 ? 's' : ''} for this event.`);
          setIsSubmitting(false);
          return;
        }
        // If unlimited, do not show a limit error

        // If we get here, user hasn't reached their limit, so save their email
        const { error: insertError } = await supabase
          .from('emails') 
          .insert({ 
            email: email, 
            event_id: eventId 
          });

        if (insertError) {
          console.error('Error saving email to database:', insertError);
          throw new Error('Failed to save email. Please check your connection and try again.');
        }

        // Save email to localStorage and redirect to camera
        localStorage.setItem('userEmail', email);
        router.push(`/camera/${eventId}`);

      } catch (err) {
        console.error('Email submission failed:', err);
        setSubmitError(err.message || 'An unknown error occurred during submission.');
        setIsSubmitting(false);
      }
    } else if (!email) {
      setSubmitError("Please enter your email address.");
    } else if (!eventId) {
      setSubmitError("Event ID is missing. Cannot proceed.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">Loading Photo Booth...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center text-white max-w-md">
          {error === 'This event is no longer active' ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                Thank you for celebrating!
              </h2>
              <p className="text-lg sm:text-xl leading-relaxed">
                This event has ended and the photo booth is no longer active.
              </p>
              <p className="text-lg sm:text-xl leading-relaxed mt-4">
                We hope you enjoyed capturing memories with us!
              </p>
              <p className="text-base sm:text-lg text-gray-300 mt-6">
                If you have any questions, please contact the event organizer.
              </p>
            </>
          ) : (
            <h2 className="text-xl font-semibold">{error}</h2>
          )}
        </div>
      </div>
    );
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
      {backgroundUrl && (
        <div style={{
          position: 'absolute',
          height: '102vh',
          width: '100vw',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          padding: 0,
        }}>
          <Image
            src={backgroundUrl}
            alt="Event Background"
            fill
            style={{
              objectFit: 'contain',
              objectPosition: 'center'
            }}
            priority
            unoptimized
          />
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '15px',
        borderRadius: '12px',
        width: '80%',
        maxWidth: '350px',
        zIndex: 2
      }}>
        <form onSubmit={handleSubmit}>
          {submitError && (
            <p style={{ color: 'red', marginBottom: '10px', textAlign: 'center', fontSize: '0.9em' }}>
              {submitError}
            </p>
          )}
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ccc',
              borderRadius: '5px'
            }}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Start Photo Booth'}
          </button>
        </form>
      </div>
    </div>
  );
} 