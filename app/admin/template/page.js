'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import TemplateGrid from '../components/TemplateGrid';
import PhotoQueue from '../components/PhotoQueue';
import { useAuth } from '../../../lib/AuthContext';

export default function TemplatePage() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const { user } = useAuth(); // Get the logged-in user

  useEffect(() => {
    // Get event ID from URL
    const eventId = searchParams.get('event');
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  // Load events for dropdown
  useEffect(() => {
    async function loadEvents() {
      try {
        // Make sure we have a logged-in user
        if (!user) {
          console.log('No user logged in');
          setEvents([]);
          return;
        }

        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const { data, error } = await supabase
          .from('events')
          .select('id, name, date')
          .eq('user_id', user.id) // Only get events for this user
          .gte('date', today) // Only get events from today onwards
          .order('date', { ascending: true }); // Order by date ascending

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [user]); // Add user to dependency array

  if (!user) {
    return <div className="p-8 text-center text-red-600">Please log in to view your events</div>;
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select an event...</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId ? (
        <>
          <div className="mt-8">
            <TemplateGrid selectedEventId={selectedEventId} />
          </div>
          <div className="mt-8">
            <PhotoQueue selectedEventId={selectedEventId} />
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Please select an event to view its template and photo queue
        </div>
      )}
    </div>
  );
}
