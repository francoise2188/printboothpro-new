'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ImagePreview from '../../../components/ImagePreview';
import { supabase } from '../../../lib/supabase';
import styles from './page.module.css';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../lib/AuthContext';

const EventQRCode = dynamic(
  () => import('../../components/EventQRCode'),
  { 
    loading: () => <p>Loading QR code...</p>,
    ssr: false
  }
);

// Get user's timezone
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('User timezone:', userTimeZone);

const formatDateTime = (dateString) => {
  try {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatInTimeZone(date, userTimeZone, 'MM/dd/yyyy hh:mm a');
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

const formatDateForInput = (dateString) => {
  try {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatInTimeZone(date, userTimeZone, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

const formatTimeToStandard = (time) => {
  try {
    if (!time) return '';
    // Create a dummy date with the time
    const dummyDate = new Date(`2000-01-01T${time}`);
    return format(dummyDate, 'h:mm a');
  } catch (error) {
    console.error('Time formatting error:', error);
    return time;
  }
};

const EventDetailsPage = ({ params }) => {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [landingPageImage, setLandingPageImage] = useState(null);
  const [cameraOverlay, setCameraOverlay] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [editForm, setEditForm] = useState({
    eventName: '',
    eventDate: '',
    endDate: '',
    photoLimit: '',
    status: 'not_started',
    eventType: '',
    location: '',
    address: '',
    expectedGuests: '',
    package: '',
    packagePrice: ''
  });

  const [landingImageLoaded, setLandingImageLoaded] = useState(false);
  const [frameImageLoaded, setFrameImageLoaded] = useState(false);
  const [landingImageError, setLandingImageError] = useState(false);
  const [frameImageError, setFrameImageError] = useState(false);

  const [previewLandingImage, setPreviewLandingImage] = useState(null);
  const [previewFrameOverlay, setPreviewFrameOverlay] = useState(null);

  const eventTypes = [
    'Wedding',
    'Corporate Event',
    'Birthday Party',
    'Anniversary',
    'Graduation',
    'Music Festivals',
    'Cultural Festivals',
    'Tech Conferences',
    'Film Screenings',
    'Art Shows',
    'Food & Wine Events',
    'Startup Meetups',
    'Comedy Shows',
    'Outdoor Markets',
    'Sporting Events',
    'Community Workshops',
    'Networking Mixers',
    'Charity Fundraisers',
    'Food Truck Events',
    'Live Music Performances',
    'Professional Development Seminars',
    'Cultural Celebrations',
    'Pop-up Exhibitions',
    'Other'
  ];

  const supabase = createClientComponentClient();
  const { user } = useAuth();

  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState([]);
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      console.log('Fetching event details for ID:', id);
      const response = await fetch(`/api/events/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to fetch event (${response.status})`);
      }
      
      const eventData = await response.json();
      console.log('Successfully fetched event data:', eventData);

      if (!eventData) {
        console.error('No event data received');
        throw new Error('No event data found');
      }

      // Ensure we have the time fields
      const eventWithTimes = {
        ...eventData,
        start_time: eventData.start_time || eventData.date?.split('T')[1] || '00:00',
        end_time: eventData.end_time || '00:00'
      };
      
      console.log('Setting event with times:', eventWithTimes);
      setEvent(eventWithTimes);
      
      const formData = {
        eventName: eventData.name || '',
        eventDate: formatDateForInput(eventData.date) || '',
        endDate: `${eventData.date?.split('T')[0]}T${eventData.end_time || '00:00'}`,
        photoLimit: eventData.photo_limit?.toString() || '0',
        status: eventData.status || 'not_started',
        eventType: eventData.event_type || '',
        location: eventData.location || '',
        address: eventData.address || '',
        expectedGuests: eventData.expected_guests?.toString() || '',
        package: eventData.package || '',
        packagePrice: eventData.package_price?.toString() || ''
      };

      console.log('Setting form data:', formData);
      setEditForm(formData);

    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message || 'Failed to fetch event details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Convert local dates to UTC for storage
      const localEventDate = new Date(event.date + 'T' + event.start_time);
      const localEndDate = new Date(event.date + 'T' + event.end_time);
      
      // Convert to UTC using the user's timezone
      const utcEventDate = formatInTimeZone(localEventDate, userTimeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
      const utcEndDate = formatInTimeZone(localEndDate, userTimeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");

      const updatePayload = {
        name: event.name,
        description: event.description,
        date: utcEventDate,
        start_time: format(localEventDate, 'HH:mm:ss'),
        end_time: format(localEndDate, 'HH:mm:ss'),
        location: event.location,
        is_active: event.status === 'active'
      };

      console.log('Saving event with payload:', updatePayload);

      const { data, error } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSuccessMessage('Event updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to update event');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        console.log('🗑️ Attempting to delete event:', eventId);
        
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete event');
        }

        const data = await response.json();

        if (data.success) {
          console.log('✅ Event deleted successfully');
          setEvents(events.filter(event => event.id !== eventId));
          showSuccess('Event deleted successfully');
        } else {
          throw new Error(data.error || 'Failed to delete event');
        }
      } catch (err) {
        console.error('❌ Error deleting event:', err);
        setError(err.message || 'Failed to delete event');
      }
    }
  };

  const handleLandingImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLandingPageImage(file);
      // Create a preview URL for the selected file
      setPreviewLandingImage(URL.createObjectURL(file));
    }
  };

  const handleFrameOverlayChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCameraOverlay(file);
      // Create a preview URL for the selected file
      setPreviewFrameOverlay(URL.createObjectURL(file));
    }
  };

  const handleDeleteLandingImage = async () => {
    if (window.confirm('Are you sure you want to delete the landing page background?')) {
      try {
        const { error } = await supabase
          .from('design_settings')
          .update({ landing_background: null })
          .eq('event_id', id);

        if (error) throw error;

        // Clear the preview and file states
        setLandingPageImage(null);
        setPreviewLandingImage(null);
        if (event.design_settings?.[0]) {
          event.design_settings[0].landing_background = null;
        }
        setSuccessMessage('Landing page background deleted successfully');
      } catch (err) {
        setError('Failed to delete landing page background');
      }
    }
  };

  const handleDeleteFrameOverlay = async () => {
    if (window.confirm('Are you sure you want to delete the frame overlay?')) {
      try {
        const { error } = await supabase
          .from('design_settings')
          .update({ frame_overlay: null })
          .eq('event_id', id);

        if (error) throw error;

        // Clear the preview and file states
        setCameraOverlay(null);
        setPreviewFrameOverlay(null);
        if (event.design_settings?.[0]) {
          event.design_settings[0].frame_overlay = null;
        }
        setSuccessMessage('Frame overlay deleted successfully');
      } catch (err) {
        setError('Failed to delete frame overlay');
      }
    }
  };

  const handleExport = async () => {
    if (exportType.length === 0) {
      setError('Please select what you would like to export');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (exportType.includes('emails')) {
        try {
          // Fetch emails for this event from Supabase
          const { data: emails, error } = await supabase
            .from('emails')
            .select('*')
            .eq('event_id', event.id);

          if (error) throw error;

          if (!emails || emails.length === 0) {
            setError('No emails found for this event');
            return;
          }

          // Create email list content from actual data
          const emailContent = [
            `Email List for ${event.name || 'Event'}`,
            '----------------------------------------',
            ...emails.map(email => [
              `Name: ${email.name || 'N/A'}`,
              `Email: ${email.email}`,
              `Photos Taken: ${email.photos_count || 0}`,
              ''
            ]).flat()
          ].join('\n');

          // Create and download text file
          const blob = new Blob([emailContent], { 
            type: 'text/plain' 
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${event.name || 'event'}-emails.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error exporting emails:', error);
          setError('Failed to export emails. Please try again.');
          return;
        }
      }

      if (exportType.includes('photos')) {
        try {
          // Fetch only original photos for this event from Supabase
          const { data: photos, error } = await supabase
            .from('photos')
            .select('*')
            .eq('event_id', event.id)
            .is('deleted_at', null)
            .is('original_photo_id', null);

          if (error) throw error;

          if (!photos || photos.length === 0) {
            setError('No photos found for this event');
            return;
          }

          console.log('Found photos:', photos.map(p => ({
            id: p.id,
            url: p.url,
            created_at: p.created_at
          })));

          // Create a ZIP file using JSZip
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          // Keep track of successful and failed downloads
          const failedPhotos = [];
          let successCount = 0;

          // Add each photo to the ZIP file
          for (const photo of photos) {
            try {
              // Get the storage path from the URL
              const url = new URL(photo.url);
              const pathParts = url.pathname.split('/');
              // Find the index after 'photos' in the path
              const photosIndex = pathParts.findIndex(part => part === 'photos');
              if (photosIndex === -1) {
                console.error('Invalid URL structure - no photos segment:', {
                  photoId: photo.id,
                  url: photo.url
                });
                failedPhotos.push({
                  id: photo.id,
                  reason: 'Invalid URL structure - no photos segment',
                  url: photo.url
                });
                continue;
              }

              // Get everything after 'photos' in the path
              const storagePath = pathParts.slice(photosIndex + 1).join('/');
              
              console.log('Attempting download:', {
                photoId: photo.id,
                originalUrl: photo.url,
                parsedPath: storagePath
              });

              // Get the photo data from storage
              const { data: photoData, error: downloadError } = await supabase
                .storage
                .from('photos')
                .download(storagePath);

              if (downloadError) {
                console.error('Download failed:', {
                  photoId: photo.id,
                  path: storagePath,
                  error: downloadError
                });
                
                failedPhotos.push({
                  id: photo.id,
                  path: storagePath,
                  reason: `Download failed: ${downloadError.message || 'Unknown error'}`
                });
                continue;
              }

              // Generate a filename that includes useful metadata
              const timestamp = new Date(photo.created_at).toISOString().split('T')[0];
              const status = photo.print_status || 'no_status';
              const filename = `photo_${photo.id}_${timestamp}_${status}.jpg`;
              
              // Add the photo to the ZIP file
              zip.file(filename, photoData);
              successCount++;
              console.log('Successfully added to ZIP:', {
                photoId: photo.id,
                filename: filename
              });
            } catch (downloadError) {
              console.error('Error processing photo:', {
                photoId: photo.id,
                error: downloadError
              });
              failedPhotos.push({
                id: photo.id,
                reason: downloadError.message || 'Unknown error'
              });
            }
          }

          // If we have any successful downloads, create the ZIP
          if (successCount > 0) {
            // Generate the ZIP file
            const content = await zip.generateAsync({ type: 'blob' });

            // Create download link for photos
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${event.name}_photos.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // If there were any failures, create a log file
            if (failedPhotos.length > 0) {
              const logContent = [
                `Photo Export Log for ${event.name}`,
                `Date: ${new Date().toLocaleString()}`,
                `Successfully exported: ${successCount} photos`,
                `Failed to export: ${failedPhotos.length} photos`,
                '\nFailed Photos:',
                ...failedPhotos.map(photo => [
                  `ID: ${photo.id}`,
                  photo.path ? `Path: ${photo.path}` : '',
                  photo.url ? `URL: ${photo.url}` : '',
                  `Reason: ${photo.reason}`,
                  ''
                ].filter(Boolean).join('\n'))
              ].join('\n');

              // Create and download the log file
              const logBlob = new Blob([logContent], { type: 'text/plain' });
              const logUrl = window.URL.createObjectURL(logBlob);
              const logLink = document.createElement('a');
              logLink.href = logUrl;
              logLink.download = `${event.name}_photo_export_log.txt`;
              document.body.appendChild(logLink);
              logLink.click();
              document.body.removeChild(logLink);
              window.URL.revokeObjectURL(logUrl);

              setSuccessMessage(`Exported ${successCount} photos. ${failedPhotos.length} photos couldn't be exported - check the log file for details.`);
            } else {
              setSuccessMessage(`Successfully exported all ${successCount} photos!`);
            }
          } else {
            setError('No photos could be downloaded. Check the log file for details.');
          }
        } catch (photoError) {
          console.error('Error exporting photos:', photoError);
          setError(`Error exporting photos: ${photoError.message}`);
        }
      }

      setSuccessMessage('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      setError(`Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (value) => {
    setExportType(prev => {
      if (prev.includes(value)) {
        return prev.filter(type => type !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewLandingImage) URL.revokeObjectURL(previewLandingImage);
      if (previewFrameOverlay) URL.revokeObjectURL(previewFrameOverlay);
    };
  }, [previewLandingImage, previewFrameOverlay]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className={styles.container}>
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingMessage}>Loading event details...</div>
      ) : (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>{event.name}</h1>
            <div>
              <button
                onClick={() => setIsEditing(true)}
                className={styles.primaryButton}
              >
                Edit Event
              </button>
              <button
                onClick={() => router.push('/admin/events')}
                className={styles.secondaryButton}
              >
                Back to Events
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Edit Event</h2>
              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Event Name</label>
                  <input
                    type="text"
                    value={editForm.eventName}
                    onChange={(e) => setEditForm({...editForm, eventName: e.target.value})}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Event Type</label>
                    <select
                      value={editForm.eventType}
                      onChange={(e) => setEditForm({...editForm, eventType: e.target.value})}
                      className={styles.formSelect}
                    >
                      <option value="">Select Type</option>
                      {eventTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Expected Guests</label>
                    <input
                      type="number"
                      value={editForm.expectedGuests}
                      onChange={(e) => setEditForm({...editForm, expectedGuests: e.target.value})}
                      className={styles.formInput}
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Venue/Location Name</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Address</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className={styles.formTextarea}
                    rows="3"
                  />
                </div>

                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Package</label>
                    <input
                      type="text"
                      value={editForm.package}
                      onChange={(e) => setEditForm({...editForm, package: e.target.value})}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Package Price</label>
                    <input
                      type="number"
                      value={editForm.packagePrice}
                      onChange={(e) => setEditForm({...editForm, packagePrice: e.target.value})}
                      className={styles.formInput}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Event Date & Time</label>
                  <div className={styles.grid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Date</label>
                      <input
                        type="date"
                        value={editForm.eventDate.split('T')[0]}
                        onChange={(e) => {
                          const currentTime = editForm.eventDate.split('T')[1] || '00:00';
                          setEditForm({
                            ...editForm, 
                            eventDate: `${e.target.value}T${currentTime}`
                          });
                        }}
                        className={styles.formInput}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Time</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="time"
                          value={editForm.eventDate.split('T')[1] || ''}
                          onChange={(e) => {
                            const currentDate = editForm.eventDate.split('T')[0];
                            setEditForm({
                              ...editForm,
                              eventDate: `${currentDate}T${e.target.value}`
                            });
                          }}
                          className={styles.formInput}
                        />
                        <span style={{ margin: '0 0.5rem' }}>to</span>
                        <input
                          type="time"
                          value={editForm.endDate.split('T')[1] || ''}
                          onChange={(e) => {
                            const currentDate = editForm.eventDate.split('T')[0];
                            setEditForm({
                              ...editForm,
                              endDate: `${currentDate}T${e.target.value}`
                            });
                          }}
                          className={styles.formInput}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3 className={styles.sectionTitle}>Event Overlays</h3>
                  <div className={styles.overlayGrid}>
                    <div className={styles.overlayCard}>
                      <h4 className={styles.overlayTitle}>Landing Page Background</h4>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLandingImageChange}
                        className={styles.fileInput}
                      />
                      <div className={styles.imageContainer}>
                        {(previewLandingImage || event.design_settings?.[0]?.landing_background) && (
                          <>
                            <ImagePreview
                              imageData={previewLandingImage || event.design_settings[0].landing_background}
                              alt="Landing Background"
                              width={200}
                              height={150}
                            />
                            <button
                              onClick={handleDeleteLandingImage}
                              className={`${styles.deleteButton} ${styles.overlayDeleteButton}`}
                              type="button"
                            >
                              Delete Background
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.overlayCard}>
                      <h4 className={styles.overlayTitle}>Frame Overlay</h4>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrameOverlayChange}
                        className={styles.fileInput}
                      />
                      <div className={styles.imageContainer}>
                        {(previewFrameOverlay || event.design_settings?.[0]?.frame_overlay) && (
                          <>
                            <ImagePreview
                              imageData={previewFrameOverlay || event.design_settings[0].frame_overlay}
                              alt="Frame Overlay"
                              width={100}
                              height={100}
                            />
                            <button
                              onClick={handleDeleteFrameOverlay}
                              className={`${styles.deleteButton} ${styles.overlayDeleteButton}`}
                              type="button"
                            >
                              Delete Overlay
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button onClick={handleSave} className={styles.primaryButton}>
                    Save Changes
                  </button>
                  <button onClick={() => setIsEditing(false)} className={styles.secondaryButton}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Event Details</h2>
                <div className={styles.grid}>
                  <div className={styles.infoGroup}>
                    <h3 className={styles.infoTitle}>Basic Information</h3>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Type</span>
                      <span className={styles.value}>{event.event_type || 'Not specified'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Date</span>
                      <span className={styles.value}>{formatDateTime(event.date)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Time</span>
                      <span className={styles.value}>
                        {formatTimeToStandard(event.start_time)} - {formatTimeToStandard(event.end_time)}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Status</span>
                      <span className={`${styles[`status${event.status.replace(/_/g, '')}`]}`}>
                        {event.status}
                      </span>
                    </div>
                  </div>

                  <div className={styles.infoGroup}>
                    <h3 className={styles.infoTitle}>Location</h3>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Venue</span>
                      <span className={styles.value}>{event.location || 'Not specified'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Address</span>
                      <span className={styles.value}>{event.address || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className={styles.infoGroup}>
                    <h3 className={styles.infoTitle}>Package Details</h3>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Package</span>
                      <span className={styles.value}>{event.package || 'Not specified'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Price</span>
                      <span className={styles.value}>
                        {event.package_price ? `$${parseFloat(event.package_price).toFixed(2)}` : 'Not specified'}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.label}>Photo Limit</span>
                      <span className={styles.value}>{event.photo_limit || 'Unlimited'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Event Overlays</h2>
                {event.design_settings && event.design_settings.length > 0 && (
                  <div className={styles.overlayGrid}>
                    {event.design_settings[0].landing_background && (
                      <div className={styles.overlayCard}>
                        <h3 className={styles.overlayTitle}>Landing Page Background</h3>
                        <div className={styles.imageContainer}>
                          <ImagePreview
                            imageData={event.design_settings[0].landing_background}
                            alt="Landing Background"
                            width={200}
                            height={150}
                          />
                        </div>
                      </div>
                    )}
                    
                    {event.design_settings[0].frame_overlay && (
                      <div className={styles.overlayCard}>
                        <h3 className={styles.overlayTitle}>Frame Overlay</h3>
                        <div className={styles.imageContainer}>
                          <ImagePreview
                            imageData={event.design_settings[0].frame_overlay}
                            alt="Frame Overlay"
                            width={100}
                            height={100}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Export Data</h2>
                <div className={styles.exportSection}>
                  <div className={styles.stats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Total Photos</span>
                      <span className={styles.statValue}>
                        {/* Using sample data for testing */}
                        {event.photo_count || 25}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Total Emails</span>
                      <span className={styles.statValue}>
                        {/* Using sample data for testing */}
                        {event.email_count || 15}
                      </span>
                    </div>
                  </div>

                  <div className={styles.exportOptions}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={exportType.includes('emails')}
                        onChange={() => handleCheckboxChange('emails')}
                        className={styles.checkbox}
                      />
                      Email List (CSV)
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={exportType.includes('photos')}
                        onChange={() => handleCheckboxChange('photos')}
                        className={styles.checkbox}
                      />
                      Photos (ZIP)
                    </label>
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={isExporting || exportType.length === 0}
                    className={styles.exportButton}
                  >
                    {isExporting ? 'Exporting...' : 'Export Selected'}
                  </button>
                </div>
              </div>

              {!isEditing && event && event.id && (
                <div className={styles.qrSection}>
                  <EventQRCode eventId={event.id} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EventDetailsPage;

