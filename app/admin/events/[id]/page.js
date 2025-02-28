'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ImagePreview from '../../../components/ImagePreview';
import { supabase } from '../../../lib/supabase';
import styles from './page.module.css';

const EventQRCode = dynamic(
  () => import('../../components/EventQRCode'),
  { 
    loading: () => <p>Loading QR code...</p>,
    ssr: false
  }
);

const formatDateTime = (dateString, timezone) => {
  if (!dateString) return 'Not set';
  try {
    // Create a date object from the string
    const date = new Date(dateString);
    // Format it according to the timezone
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    // Add additional validation
    if (typeof dateString !== 'string' || !Date.parse(dateString)) {
      console.log('Invalid date string:', dateString);
      return '';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log('Invalid date object:', date);
      return '';
    }

    // Format as YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    console.log('Problematic date string:', dateString);
    return '';
  }
};

const formatTimeToStandard = (time) => {
  if (!time) return 'Not set';
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const standardHour = hour % 12 || 12;
    return `${standardHour}:${minutes} ${ampm}`;
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
      setError(null);
      
      // Step 1: Update event details first
      const updatePayload = {
        name: editForm.eventName,
        date: editForm.eventDate,
        start_time: editForm.eventDate.split('T')[1] || '00:00',
        end_time: editForm.endDate.split('T')[1] || '00:00',
        photo_limit: parseInt(editForm.photoLimit) || 0,
        status: editForm.status,
        event_type: editForm.eventType,
        location: editForm.location,
        address: editForm.address,
        expected_guests: parseInt(editForm.expectedGuests) || 0,
        package: editForm.package,
        package_price: parseFloat(editForm.packagePrice) || 0
      };

      console.log('Updating event with payload:', updatePayload);

      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update event');
      }

      // Step 2: Handle file uploads if any
      let designSettingsChanged = false;
      let landingBackgroundUrl = event.design_settings?.[0]?.landing_background;
      let frameOverlayUrl = event.design_settings?.[0]?.frame_overlay;

      if (landingPageImage) {
        const timestamp = Date.now();
        const landingFileName = `events/${id}/landing_${timestamp}`;
        
        console.log('Starting landing image upload...', landingFileName);
        
        // Upload the file to Supabase storage
        const { data: landingData, error: landingError } = await supabase.storage
          .from('designs')
          .upload(landingFileName, landingPageImage, {
            cacheControl: '3600',
            upsert: true
          });

        if (landingError) {
          console.error('Landing image upload error:', landingError);
          throw new Error(`Landing image upload failed: ${landingError.message}`);
        }

        console.log('Landing image uploaded successfully');

        // Get the public URL
        const { data } = supabase.storage
          .from('designs')
          .getPublicUrl(landingFileName);

        landingBackgroundUrl = data.publicUrl;
        designSettingsChanged = true;
      }

      if (cameraOverlay) {
        const timestamp = Date.now();
        const overlayFileName = `events/${id}/overlay_${timestamp}`;
        
        console.log('Starting frame overlay upload...', overlayFileName);
        
        // Upload the frame overlay to Supabase storage
        const { data: overlayData, error: overlayError } = await supabase.storage
          .from('designs')
          .upload(overlayFileName, cameraOverlay, {
            cacheControl: '3600',
            upsert: true
          });

        if (overlayError) {
          console.error('Frame overlay upload error:', overlayError);
          throw new Error(`Frame overlay upload failed: ${overlayError.message}`);
        }

        console.log('Frame overlay uploaded successfully');

        // Get the public URL for the frame overlay
        const { data: overlayUrl } = supabase.storage
          .from('designs')
          .getPublicUrl(overlayFileName);

        frameOverlayUrl = overlayUrl.publicUrl;
        designSettingsChanged = true;
      }

      // Step 3: Update design settings only if files were uploaded
      if (designSettingsChanged) {
        console.log('Updating design settings with URLs:', {
          landing_background: landingBackgroundUrl,
          frame_overlay: frameOverlayUrl
        });

        const { data: existingSettings } = await supabase
          .from('design_settings')
          .select('*')
          .eq('event_id', id)
          .maybeSingle();

        const designSettingsPayload = {
          id: existingSettings?.id,
          event_id: id,
          landing_background: landingBackgroundUrl,
          frame_overlay: frameOverlayUrl,
          updated_at: new Date().toISOString()
        };

        console.log('Design settings payload:', designSettingsPayload);

        const { error: designError } = await supabase
          .from('design_settings')
          .upsert(designSettingsPayload);

        if (designError) {
          console.error('Design settings update error:', designError);
          throw new Error(`Design settings update failed: ${designError.message}`);
        }

        console.log('Design settings updated successfully');
      }

      // Show success message and refresh
      setIsEditing(false);
      setSuccessMessage('Event updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchEventDetails();

    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to update event');
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
                      <span className={styles.value}>{new Date(event.date).toLocaleDateString()}</span>
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
            </>
          )}

          {!isEditing && event && event.id && (
            <div className={styles.qrSection}>
              <EventQRCode eventId={event.id} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventDetailsPage;

