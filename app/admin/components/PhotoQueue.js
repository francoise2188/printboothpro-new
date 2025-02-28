'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function PhotoQueue({ selectedEventId }) {
  const [photos, setPhotos] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!selectedEventId) {
        setPhotos([]);
        setQueueCount(0);
        return;
      }

      setLoading(true);
      try {
        // First, get total count of photos in queue, excluding deleted ones
        const { count, error: countError } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', selectedEventId)
          .eq('status', 'available')
          .is('deleted_at', null)  // Only count non-deleted photos
          .order('created_at', { ascending: true });

        if (countError) throw countError;
        setQueueCount(count || 0);

        // Then get the preview of next photos (limiting to 8 for display)
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', selectedEventId)
          .eq('status', 'available')
          .is('deleted_at', null)  // Only get non-deleted photos
          .order('created_at', { ascending: true })
          .limit(8);

        if (error) throw error;
        setPhotos(data || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching photos:', error);
        setError('Failed to load queue');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
    const interval = setInterval(fetchPhotos, 3000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Photo Queue</h2>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {queueCount} photo{queueCount !== 1 ? 's' : ''} waiting
          </span>
          {loading && (
            <span className="text-gray-500 text-sm">
              Refreshing...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      {!selectedEventId ? (
        <div className="text-center text-gray-500 py-4">
          Please select an event to view its photo queue
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No pending photos in queue
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative aspect-square group">
                <img
                  src={photo.url}
                  alt={`Photo ${photo.id}`}
                  className="w-full h-full object-cover rounded shadow-sm transition-transform group-hover:scale-105"
                />
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                  #{index + 1}
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {new Date(photo.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
          {queueCount > photos.length && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              +{queueCount - photos.length} more photos in queue
            </div>
          )}
        </>
      )}
    </div>
  );
}
