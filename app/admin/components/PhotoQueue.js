'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import styles from './PhotoQueue.module.css';

export default function PhotoQueue({ selectedEventId }) {
  const [photos, setPhotos] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggedPhoto, setDraggedPhoto] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!selectedEventId) {
        setPhotos([]);
        setQueueCount(0);
        return;
      }

      setLoading(true);
      try {
        // Get total count of photos in queue
        const { count, error: countError } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', selectedEventId)
          .eq('status', 'pending')
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (countError) throw countError;
        setQueueCount(count || 0);

        // Get next 9 photos for preview
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', selectedEventId)
          .eq('status', 'pending')
          .is('deleted_at', null)
          .order('queue_order', { ascending: true, nullsLast: true })
          .order('created_at', { ascending: true })
          .limit(9);

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

  const handleDeletePhoto = async (photoId) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', photoId);

      if (error) throw error;

      // Update local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setQueueCount(prev => prev - 1);
      toast.success('Photo removed from queue');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to remove photo');
    }
  };

  const handleDragStart = (e, photo) => {
    setDraggedPhoto(photo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetPhoto) => {
    e.preventDefault();
    if (!draggedPhoto || draggedPhoto.id === targetPhoto.id) return;

    try {
      // Get the new order of photos
      const newPhotos = [...photos];
      const draggedIndex = newPhotos.findIndex(p => p.id === draggedPhoto.id);
      const targetIndex = newPhotos.findIndex(p => p.id === targetPhoto.id);
      
      // Remove dragged photo and insert at new position
      newPhotos.splice(draggedIndex, 1);
      newPhotos.splice(targetIndex, 0, draggedPhoto);

      // Update the order in the database
      const updates = newPhotos.map((photo, index) => ({
        id: photo.id,
        queue_order: index + 1 // Start from 1 to avoid 0
      }));

      // Update each photo's queue_order individually to avoid conflicts
      for (const update of updates) {
        const { error } = await supabase
          .from('photos')
          .update({ queue_order: update.queue_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update local state
      setPhotos(newPhotos);
      toast.success('Photo order updated');
    } catch (error) {
      console.error('Error reordering photos:', error);
      toast.error('Failed to reorder photos');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.queueContainer}>
      <div className={styles.queueHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Photo Queue</h2>
          <p className={styles.subtitle}>Next photos waiting to be printed</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.queueStats}>
            <span className={styles.queueCount}>{queueCount}</span>
            <span className={styles.queueLabel}>photos waiting</span>
          </div>
          {loading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner}></div>
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {!selectedEventId ? (
        <div className={styles.emptyState}>
          Please select an event to view its photo queue
        </div>
      ) : photos.length === 0 ? (
        <div className={styles.emptyState}>
          No photos waiting in queue
        </div>
      ) : (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={styles.photoCard}
              draggable
              onDragStart={(e) => handleDragStart(e, photo)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, photo)}
            >
              <div className={styles.photoPreview}>
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className={styles.photoImage}
                />
                <div className={styles.photoOverlay}>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className={styles.deleteButton}
                    title="Remove from queue"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={styles.photoInfo}>
                <span className={styles.photoNumber}>#{index + 1}</span>
                <span className={styles.photoTime}>{formatTime(photo.created_at)}</span>
              </div>
              <div className={styles.dragHandle} title="Drag to reorder">
                ⋮⋮
              </div>
            </div>
          ))}
        </div>
      )}

      {queueCount > photos.length && (
        <div className={styles.morePhotos}>
          +{queueCount - photos.length} more photos in queue
        </div>
      )}
    </div>
  );
}
