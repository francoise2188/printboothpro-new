'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import EventQRCode from '../components/EventQRCode';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../lib/AuthContext';
import styles from './events.module.css';
import { toast } from 'react-hot-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const statusColors = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventStatus, setEventStatus] = useState('not_started');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [expectedGuests, setExpectedGuests] = useState('');
  const [package_, setPackage] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [landingPageImage, setLandingPageImage] = useState(null);
  const [cameraOverlay, setCameraOverlay] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showForm, setShowForm] = useState(false);

  const [sortOption, setSortOption] = useState('date');

  const [viewMode, setViewMode] = useState('list');

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [calendarApi, setCalendarApi] = useState(null);

  const statusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

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

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isStatusUpdating, setIsStatusUpdating] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const supabase = createClientComponentClient();
  const { user } = useAuth();

  async function fetchEvents() {
    try {
      setIsPageLoading(true);
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      // Add debug logging
      console.log('Debug - Raw events from database:', eventsData);
      console.log('Debug - Sample event date format:', eventsData?.[0]?.date);

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
      setIsPageLoading(false);
    }
  }

  const fetchMarkets = async () => {
    try {
      const { data: marketsData, error } = await supabase
        .from('markets')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setMarkets(marketsData);
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchMarkets();
    }
  }, [user]);

  const handleEditEvent = async (event) => {
    setEditingEvent(event);
    setEventName(event.name || '');
    const eventDateTime = new Date(event.date);
    const formattedDate = eventDateTime.toISOString().split('T')[0];
    setEventDate(formattedDate);
    setEventStatus(event.status || 'not_started');
    setStartTime(event.start_time || '');
    setEndTime(event.end_time || '');
    setEventType(event.event_type || '');
    setLocation(event.location || '');
    setAddress(event.address || '');
    setExpectedGuests(event.expected_guests?.toString() || '');
    setPackage(event.package || '');
    setPackagePrice(event.package_price?.toString() || '');
    
    // Set client info
    setClientName(event.client_name || '');
    setClientEmail(event.client_email || '');
    setClientPhone(event.client_phone || '');
    
    // Initialize empty overlays object
    event.existingOverlays = { landing_background: null, frame_overlay: null };
    
    // Fetch existing overlays
    try {
      const { data: designData } = await supabase
        .from('design_settings')
        .select('*')
        .eq('event_id', event.id);

      // Check if we have any design data
      if (designData && designData.length > 0) {
        event.existingOverlays = {
          landing_background: designData[0].landing_background,
          frame_overlay: designData[0].frame_overlay
        };
        console.log('Found existing overlays:', event.existingOverlays);
      } else {
        console.log('No existing overlays found for event:', event.id);
      }
    } catch (error) {
      console.error('Error in overlay fetch:', error);
      // Don't throw error, just continue without overlays
    }
    
    setShowForm(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          setEvents(events.filter(event => event.id !== eventId));
          showSuccess('Event deleted successfully');
        } else {
          throw new Error(data.error || 'Failed to delete event');
        }
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete event');
      }
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    
    // Parse the 24h time string
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    
    // Convert to 12h format
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Function to process files to base64
  const processFile = async (file) => {
    if (!file) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Just use the date string directly from the form
      console.log('Debug - Form submission date:', eventDate);

      const eventData = {
        name: eventName,
        date: eventDate,  // This will now be just YYYY-MM-DD
        status: eventStatus,
        start_time: startTime,
        end_time: endTime,
        event_type: eventType,
        location: location,
        address: address,
        expected_guests: parseInt(expectedGuests) || 0,
        package: package_,
        package_price: parseFloat(packagePrice) || 0,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        user_id: user.id
      };

      console.log('Debug - Event data being saved:', eventData);

      let eventId;
      
      if (!editingEvent) {
        const { data: newEvent, error: insertError } = await supabase
          .from('events')
          .insert({ ...eventData })
          .select()
          .single();
          
        if (insertError) throw insertError;
        eventId = newEvent.id;

        // Create default design settings for new event
        const { error: designError } = await supabase
          .from('design_settings')
          .insert({
            event_id: eventId,
            landing_background: null,
            frame_overlay: null,
            updated_at: new Date().toISOString()
          });
          
        if (designError) {
          console.error('Error creating default design settings:', designError);
          // Continue even if design settings creation fails
        }
      } else {
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);
          
        if (updateError) throw updateError;
        eventId = editingEvent.id;
      }

      // Process overlays
      try {
        // Check if we have any new files to process
        const hasNewLandingPage = landingPageImage instanceof File;
        const hasNewOverlay = cameraOverlay instanceof File;
        
        if (hasNewLandingPage || hasNewOverlay) {
          console.log('Processing new overlay files...');
          
          // First check if design settings already exist
          const { data: existingDesign } = await supabase
            .from('design_settings')
            .select('*')
            .eq('event_id', eventId);
          
          const designData = {
            event_id: eventId,
            landing_background: hasNewLandingPage ? await processFile(landingPageImage) : (existingDesign?.[0]?.landing_background || null),
            frame_overlay: hasNewOverlay ? await processFile(cameraOverlay) : (existingDesign?.[0]?.frame_overlay || null),
            updated_at: new Date().toISOString()
          };

          console.log('Design data being saved:', designData);

          if (existingDesign && existingDesign.length > 0) {
            console.log('Updating existing design settings...');
            const { error: updateError } = await supabase
              .from('design_settings')
              .update(designData)
              .eq('event_id', eventId);
              
            if (updateError) {
              console.error('Error updating design settings:', updateError);
              throw updateError;
            }
          } else {
            console.log('Creating new design settings...');
            const { error: insertError } = await supabase
              .from('design_settings')
              .insert(designData);
              
            if (insertError) {
              console.error('Error inserting design settings:', insertError);
              throw insertError;
            }
          }
          console.log('Successfully processed overlays');
        } else {
          console.log('No new overlay files to process');
        }
      } catch (error) {
        console.error('Error processing overlays:', error);
        // Continue with form submission even if overlay processing fails
      }

      setShowForm(false);
      setIsSubmitting(false);
      toast.success(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
      
      // Immediately fetch events to update the display
      await fetchEvents();
      
      // Reset the form
      resetForm();

    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
      toast.error('Error saving event. Please try again.');
    }
  };

  const resetForm = () => {
    setEventName('');
    setEventDate('');
    setEventStatus('not_started');
    setStartTime('');
    setEndTime('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setEventType('');
    setLocation('');
    setAddress('');
    setExpectedGuests('');
    setPackage('');
    setPackagePrice('');
    setEditingEvent(null);
    setLandingPageImage(null);
    setCameraOverlay(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setShowForm(true);
  };

  // Add this helper function to show overlay status
  const getOverlayStatus = (overlay) => {
    if (!overlay) return '(No file selected)';
    if (typeof overlay === 'string' && overlay.startsWith('data:')) return '(Current overlay will be replaced)';
    if (overlay instanceof File) return overlay.name;
    return '(Has existing overlay)';
  };

  // Add this helper function at the top with other helper functions
  const formatEventDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      // Create a date object and adjust for timezone
      const date = new Date(dateString);
      // Use UTC methods to prevent timezone conversion
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      // Format as MM/DD/YYYY
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Update the groupEventsByTimePeriod function
  const groupEventsByTimePeriod = (events) => {
    // Get today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const [currentYear, currentMonth] = today.split('-');

    console.log('Debug - Today\'s date:', today);

    return {
      today: events.filter(event => {
        console.log('Debug - Comparing dates:', {
          eventName: event.name,
          eventDate: event.date,
          today: today,
          isEqual: event.date === today
        });
        return event.date === today;
      }),
      thisMonth: events.filter(event => {
        const [eventYear, eventMonth] = event.date.split('-');
        return eventYear === currentYear && 
               eventMonth === currentMonth && 
               event.date !== today;
      }),
      upcoming: events.filter(event => event.date > today),
      past: events.filter(event => event.date < today)
    };
  };

  // Update the sorting logic
  const getSortedEvents = (events) => {
    const filtered = events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    switch (sortOption) {
      case 'upcoming':
        return [...filtered].sort((a, b) => {
          const aDate = new Date(a.date);
          const bDate = new Date(b.date);
          const aUTC = new Date(Date.UTC(aDate.getUTCFullYear(), aDate.getUTCMonth(), aDate.getUTCDate()));
          const bUTC = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate()));
          if (aUTC < nowUTC && bUTC < nowUTC) return bUTC - aUTC; // Both past
          if (aUTC >= nowUTC && bUTC >= nowUTC) return aUTC - bUTC; // Both upcoming
          return aUTC >= nowUTC ? -1 : 1; // Upcoming first
        });
      case 'past':
        return [...filtered].sort((a, b) => {
          const aDate = new Date(a.date);
          const bDate = new Date(b.date);
          const aUTC = new Date(Date.UTC(aDate.getUTCFullYear(), aDate.getUTCMonth(), aDate.getUTCDate()));
          const bUTC = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate()));
          if (aUTC < nowUTC && bUTC < nowUTC) return bUTC - aUTC; // Most recent past first
          if (aUTC >= nowUTC && bUTC >= nowUTC) return aUTC - bUTC; // Upcoming after
          return aUTC < nowUTC ? -1 : 1; // Past first
        });
      case 'date':
        return [...filtered].sort((a, b) => {
          const aDate = new Date(a.date);
          const bDate = new Date(b.date);
          const aUTC = new Date(Date.UTC(aDate.getUTCFullYear(), aDate.getUTCMonth(), aDate.getUTCDate()));
          const bUTC = new Date(Date.UTC(bDate.getUTCFullYear(), bDate.getUTCMonth(), bDate.getUTCDate()));
          return bUTC - aUTC;
        });
      case 'created':
        return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'name':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'status':
        return [...filtered].sort((a, b) => a.status.localeCompare(b.status));
      default:
        return filtered;
    }
  };

  const sortedEvents = getSortedEvents(events);
  const groupedEvents = groupEventsByTimePeriod(sortedEvents);

  // Add console log to help debug
  console.log('Grouped Events:', {
    today: groupedEvents.today?.length,
    thisMonth: groupedEvents.thisMonth?.length,
    upcoming: groupedEvents.upcoming?.length,
    past: groupedEvents.past?.length
  });

  // Update the getCalendarEvents function
  const getCalendarEvents = () => {
    // Convert markets to calendar events
    const marketEvents = markets.map(market => ({
      id: `market-${market.id}`,
      title: market.name,
      start: `${market.date.split('T')[0]}T${market.start_time || '00:00'}`,
      end: `${market.date.split('T')[0]}T${market.end_time || '23:59'}`,
      allDay: false,
      extendedProps: {
        type: 'market',
        location: market.location,
        status: market.status,
        description: market.description
      }
    }));

    // Convert events to calendar events
    const eventEvents = events.map(event => ({
      id: `event-${event.id}`,
      title: event.name,
      start: `${event.date.split('T')[0]}T${event.start_time || '00:00'}`,
      end: `${event.date.split('T')[0]}T${event.end_time || '23:59'}`,
      allDay: false,
      extendedProps: {
        type: 'event',
        location: event.location,
        status: event.status,
        client: event.client_name,
        package: event.package
      }
    }));

    return [...marketEvents, ...eventEvents];
  };

  // Update the renderEventContent function
  const renderEventContent = (eventInfo) => {
    const isMarket = eventInfo.event.extendedProps.type === 'market';
    
    return (
      <div className={`${styles.calendarEvent} ${isMarket ? styles.marketEvent : styles.regularEvent}`}>
        <div className={styles.eventTitle}>
          {eventInfo.event.title}
        </div>
        <div className={styles.eventTime}>
          {eventInfo.event.start && new Date(eventInfo.event.start).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    );
  };

  // Update the handleEventClick function
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
  };

  // Update ExpandedEventDetails component
  const ExpandedEventDetails = ({ event, onClose }) => {
    const router = useRouter();
    
    const handleViewDetails = () => {
      // Extract the numeric ID by removing the 'event-' prefix
      const eventId = event.id.replace(/^event-/, '');
      
      // Navigate to the event details page
      router.push(`/admin/events/${eventId}`);
      onClose();
    };
    
    return (
      <div className={styles.expandedEvent}>
        <div className={styles.expandedEventContent}>
          <button onClick={onClose} className={styles.closeExpandedButton}>×</button>
          <h3 className={styles.expandedEventTitle}>{event.title}</h3>
          
          <div className={styles.expandedEventDetails}>
            {/* Date and Time */}
            <div className={styles.expandedDetailRow}>
              <span className={styles.expandedDetailIcon}>📅</span>
              <span>Date: {new Date(event.start).toLocaleDateString()}</span>
            </div>
            
            <div className={styles.expandedDetailRow}>
              <span className={styles.expandedDetailIcon}>⏰</span>
              <span>Time: {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {event.end && ` - ${new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</span>
            </div>

            {/* Location */}
            {event.extendedProps.location && (
              <div className={styles.expandedDetailRow}>
                <span className={styles.expandedDetailIcon}>📍</span>
                <span>Location: {event.extendedProps.location}</span>
              </div>
            )}

            {/* Status */}
            <div className={styles.expandedDetailRow}>
              <span className={styles.expandedDetailIcon}>🔵</span>
              <span>Status: {event.extendedProps.status}</span>
            </div>
          </div>

          <div className={styles.expandedEventActions}>
            <button
              onClick={handleViewDetails}
              className={`${styles.actionButton} ${styles.viewButton}`}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add cleanup effect for calendar
  useEffect(() => {
    return () => {
      if (calendarApi) {
        calendarApi.destroy();
      }
    };
  }, [calendarApi]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <div className={styles.headerButtons}>
          <button 
            onClick={handleCreateNew}
            className={styles.createButton}
          >
            Create New Event
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className={`${styles.viewToggleButton} ${viewMode === 'calendar' ? styles.active : ''}`}
          >
            {viewMode === 'list' ? 'Calendar View' : 'List View'}
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="upcoming">Sort by Upcoming Events</option>
          <option value="past">Sort by Past Events</option>
          <option value="date">Sort by Event Date</option>
          <option value="created">Sort by Creation Date</option>
          <option value="name">Sort by Name</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      {successMessage && (
        <div className={styles.success}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Create/Edit Event Form - Moved outside of view mode conditional */}
      {(showForm || editingEvent) && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button 
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingEvent(null);
                resetForm();
              }}
              className={styles.closeButton}
            >
              ×
            </button>
          </div>

          {/* Basic Info Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  required
                  className={styles.input}
                >
                  <option value="">Select Event Type</option>
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select
                  value={eventStatus}
                  onChange={(e) => setEventStatus(e.target.value)}
                  required
                  className={styles.input}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Expected Guests</label>
                <input
                  type="number"
                  value={expectedGuests}
                  onChange={(e) => setExpectedGuests(e.target.value)}
                  required
                  min="0"
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Location Details</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Venue Name</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className={`${styles.input} ${styles.textarea}`}
                />
              </div>
            </div>
          </div>

          {/* Package Details Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Package Details</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Package Type</label>
                <input
                  type="text"
                  value={package_}
                  onChange={(e) => setPackage(e.target.value)}
                  placeholder="e.g. Basic, Premium, Custom"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Package Price ($)</label>
                <input
                  type="number"
                  value={packagePrice}
                  onChange={(e) => setPackagePrice(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Photo Limit</label>
                <input
                  type="number"
                  min="0"
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Client Information Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Client Information</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Client Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Event Overlays Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Event Overlays</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Landing Page Image 
                  <span className="text-sm text-gray-500 ml-2">
                    {editingEvent?.existingOverlays?.landing_background ? '(Has existing image)' : ''}
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLandingPageImage(e.target.files[0])}
                  className={styles.fileInput}
                />
                <span className="text-sm text-gray-500">
                  {getOverlayStatus(landingPageImage)}
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Camera Overlay
                  <span className="text-sm text-gray-500 ml-2">
                    {editingEvent?.existingOverlays?.frame_overlay ? '(Has existing overlay)' : ''}
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCameraOverlay(e.target.files[0])}
                  className={styles.fileInput}
                />
                <span className="text-sm text-gray-500">
                  {getOverlayStatus(cameraOverlay)}
                </span>
              </div>
            </div>
            {uploadProgress > 0 && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingEvent(null);
                resetForm();
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isPageLoading ? (
        <div className={styles.loading}>Loading events...</div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className={styles.eventsList}>
              {/* Today's Events */}
              {groupedEvents.today.length > 0 && (
                <div className={styles.eventGroup}>
                  <h2 className={styles.groupTitle}>Today's Events</h2>
                  {groupedEvents.today.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h3 className={styles.eventTitle}>{event.name}</h3>
                          <p className={styles.eventDate}>
                            {formatEventDate(event.date)} • 
                            {event.start_time && ` ${formatTime(event.start_time)}`}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </p>
                        </div>
                        <span className={`${styles.status} ${statusColors[event.status]}`}>
                          {statusOptions.find(opt => opt.value === event.status)?.label}
                        </span>
                      </div>

                      <div className={styles.eventDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Client</span>
                          <span className={styles.detailValue}>{event.client_name || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Location</span>
                          <span className={styles.detailValue}>{event.location || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Package</span>
                          <span className={styles.detailValue}>{event.package || 'N/A'}</span>
                        </div>
                      </div>

                      <div className={styles.eventActions}>
                        <Link href={`/admin/events/${event.id}`}>
                          <button className={`${styles.actionButton} ${styles.viewButton}`}>
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className={`${styles.actionButton} ${styles.editButton}`}
                        >
                          Edit Event
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* This Month's Events */}
              {groupedEvents.thisMonth.length > 0 && (
                <div className={styles.eventGroup}>
                  <h2 className={styles.groupTitle}>This Month</h2>
                  {groupedEvents.thisMonth.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h3 className={styles.eventTitle}>{event.name}</h3>
                          <p className={styles.eventDate}>
                            {formatEventDate(event.date)} • 
                            {event.start_time && ` ${formatTime(event.start_time)}`}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </p>
                        </div>
                        <span className={`${styles.status} ${statusColors[event.status]}`}>
                          {statusOptions.find(opt => opt.value === event.status)?.label}
                        </span>
                      </div>

                      <div className={styles.eventDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Client</span>
                          <span className={styles.detailValue}>{event.client_name || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Location</span>
                          <span className={styles.detailValue}>{event.location || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Package</span>
                          <span className={styles.detailValue}>{event.package || 'N/A'}</span>
                        </div>
                      </div>

                      <div className={styles.eventActions}>
                        <Link href={`/admin/events/${event.id}`}>
                          <button className={`${styles.actionButton} ${styles.viewButton}`}>
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className={`${styles.actionButton} ${styles.editButton}`}
                        >
                          Edit Event
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Events */}
              {groupedEvents.upcoming.length > 0 && (
                <div className={styles.eventGroup}>
                  <h2 className={styles.groupTitle}>Upcoming Events</h2>
                  {groupedEvents.upcoming.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h3 className={styles.eventTitle}>{event.name}</h3>
                          <p className={styles.eventDate}>
                            {formatEventDate(event.date)} • 
                            {event.start_time && ` ${formatTime(event.start_time)}`}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </p>
                        </div>
                        <span className={`${styles.status} ${statusColors[event.status]}`}>
                          {statusOptions.find(opt => opt.value === event.status)?.label}
                        </span>
                      </div>

                      <div className={styles.eventDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Client</span>
                          <span className={styles.detailValue}>{event.client_name || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Location</span>
                          <span className={styles.detailValue}>{event.location || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Package</span>
                          <span className={styles.detailValue}>{event.package || 'N/A'}</span>
                        </div>
                      </div>

                      <div className={styles.eventActions}>
                        <Link href={`/admin/events/${event.id}`}>
                          <button className={`${styles.actionButton} ${styles.viewButton}`}>
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className={`${styles.actionButton} ${styles.editButton}`}
                        >
                          Edit Event
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Past Events */}
              {groupedEvents.past.length > 0 && (
                <div className={styles.eventGroup}>
                  <h2 className={styles.groupTitle}>Past Events</h2>
                  {groupedEvents.past.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h3 className={styles.eventTitle}>{event.name}</h3>
                          <p className={styles.eventDate}>
                            {formatEventDate(event.date)} • 
                            {event.start_time && ` ${formatTime(event.start_time)}`}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </p>
                        </div>
                        <span className={`${styles.status} ${statusColors[event.status]}`}>
                          {statusOptions.find(opt => opt.value === event.status)?.label}
                        </span>
                      </div>

                      <div className={styles.eventDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Client</span>
                          <span className={styles.detailValue}>{event.client_name || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Location</span>
                          <span className={styles.detailValue}>{event.location || 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Package</span>
                          <span className={styles.detailValue}>{event.package || 'N/A'}</span>
                        </div>
                      </div>

                      <div className={styles.eventActions}>
                        <Link href={`/admin/events/${event.id}`}>
                          <button className={`${styles.actionButton} ${styles.viewButton}`}>
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className={`${styles.actionButton} ${styles.editButton}`}
                        >
                          Edit Event
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show message if no events */}
              {!loading && events.length === 0 && (
                <div className={styles.noEvents}>
                  <p>No events found. Click "Create Event" to add your first event.</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.calendarWrapper}>
              {/* Add Calendar Legend */}
              <div className={styles.calendarLegend}>
                <div className={styles.legendItem}>
                  <div className={`${styles.legendColor} ${styles.marketColor}`}></div>
                  <span>Markets</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={`${styles.legendColor} ${styles.eventColor}`}></div>
                  <span>Events</span>
                </div>
              </div>

              <FullCalendar
                ref={(el) => {
                  if (el) {
                    setCalendarApi(el.getApi());
                  }
                }}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={getCalendarEvents()}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                eventClassNames={(eventInfo) => [
                  styles.calendarEventItem,
                  styles[`status${eventInfo.event.extendedProps.status.replace(/_/g, '')}`],
                  selectedEvent?.id === eventInfo.event.id ? styles.selectedEvent : '',
                  eventInfo.event.extendedProps.type === 'market' ? styles.marketEvent : styles.regularEvent
                ]}
                slotMinTime="06:00:00"
                slotMaxTime="24:00:00"
                dayMaxEvents={3}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: true
                }}
                height="auto"
                expandRows={true}
                dayMaxEventRows={4}
                moreLinkContent={(args) => `+${args.num} events`}
                moreLinkClick="popover"
              />
              {selectedEvent && (
                <ExpandedEventDetails 
                  event={selectedEvent} 
                  onClose={() => setSelectedEvent(null)} 
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}