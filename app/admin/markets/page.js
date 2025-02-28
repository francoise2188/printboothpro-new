'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useAuth } from '../../../lib/AuthContext';
import styles from './markets.module.css';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const convertTo12Hour = (time24) => {
  if (!time24) return 'TBD';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export default function MarketManager() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [isNewMarket, setIsNewMarket] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [designs, setDesigns] = useState({ border: null, landing_page: null });
  const [viewMode, setViewMode] = useState('list');
  const [calendarApi, setCalendarApi] = useState(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    status: 'draft'
  });
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [expandedSections, setExpandedSections] = useState({
    thisWeek: true,
    upcoming: true,
    past: false
  });

  useEffect(() => {
    if (user) {
    fetchMarkets();
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMarket) {
      setFormData({
        name: selectedMarket.name || '',
        description: selectedMarket.description || '',
        date: selectedMarket.date || '',
        start_time: selectedMarket.start_time || '',
        end_time: selectedMarket.end_time || '',
        location: selectedMarket.location || '',
        status: selectedMarket.status || 'draft'
      });
      fetchDesigns();
    } else if (isNewMarket) {
      setFormData({
        name: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        status: 'draft'
      });
    }
  }, [selectedMarket, isNewMarket]);

  const fetchMarkets = async () => {
    try {
      console.log('Fetching markets...');
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      // Since the date column is of type 'date', it will come back as YYYY-MM-DD
      console.log('Raw market data from Supabase:', data);
      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setMessage('Error loading markets');
    }
  };

  const fetchDesigns = async () => {
    if (!selectedMarket) return;

    try {
      const { data, error } = await supabase
        .from('market_camera_settings')
        .select('*')
        .eq('market_id', selectedMarket.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setDesigns({
        border: data?.border_url || null,
        landing_page: data?.landing_page_url || null
      });
    } catch (error) {
      console.error('Error fetching designs:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleUpload = async (e, type) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      
      if (!file || !selectedMarket) {
        setMessage('No file selected or no market selected');
        return;
      }

      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `market_camera/${selectedMarket.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('market_designs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('market_designs')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Check if record exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from('market_camera_settings')
        .select('*')
        .eq('market_id', selectedMarket.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing record:', fetchError);
        throw fetchError;
      }

      // 4. Prepare upsert data
      const timestamp = new Date().toISOString();
      const upsertData = {
        market_id: selectedMarket.id,
        user_id: user.id,
        updated_at: timestamp,
        created_at: timestamp
      };

      // Add URLs based on type and preserve existing URLs
      if (type === 'border') {
        upsertData.border_url = publicUrl;
        if (existingRecord?.landing_page_url) {
          upsertData.landing_page_url = existingRecord.landing_page_url;
        }
      } else if (type === 'landing_page') {
        upsertData.landing_page_url = publicUrl;
        if (existingRecord?.border_url) {
          upsertData.border_url = existingRecord.border_url;
        }
      }

      // If there's an existing record, use its created_at instead
      if (existingRecord?.created_at) {
        upsertData.created_at = existingRecord.created_at;
      }

      // 5. Perform upsert with explicit on_conflict handling
      const { error: upsertError } = await supabase
        .from('market_camera_settings')
        .upsert(upsertData, {
          onConflict: 'market_id',
          returning: 'minimal'
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        throw new Error(`Failed to save design settings: ${upsertError.message}`);
      }

      setMessage('✅ Upload successful!');
      await fetchDesigns();
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`❌ Error: ${error.message || 'Failed to upload. Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const inputDate = formData.date; // Get the raw input date
      console.log('RAW INPUT DATE FROM FORM:', inputDate);
      
      // Create submission data with exact date string
      const submissionData = {
        ...formData,
        date: inputDate // Use the raw input date string
      };

      console.log('SUBMISSION DATA BEING SENT TO SUPABASE:', submissionData);

      if (isNewMarket) {
        const { data, error } = await supabase
          .from('markets')
          .insert([{
            ...submissionData,
            user_id: user.id
          }])
          .select();

        if (error) throw error;
        console.log('RESPONSE FROM SUPABASE INSERT:', data);
        setMessage('Market created successfully!');
        setSelectedMarket(null);
        setIsNewMarket(false);
      } else {
        const { error } = await supabase
          .from('markets')
          .update(submissionData)
          .eq('id', selectedMarket.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setMessage('Market updated successfully!');
        setSelectedMarket(null);
      }

      // Fetch markets and log what we get back
      const { data: freshData } = await supabase
        .from('markets')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      console.log('FRESH DATA AFTER SAVE:', freshData);
      setMarkets(freshData || []);

    } catch (error) {
      console.error('Error saving market:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleDeleteMarket = async (marketId) => {
    if (!marketId) {
      setMessage('❌ No market selected');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this market? This will also delete all associated photos and designs.')) {
      return;
    }

    try {
      console.log('Attempting to delete market and associated data...');
      const { data, error } = await supabase.rpc('delete_market_cascade', {
        market_id_param: marketId,
        auth_user_id: user.id
      });

      if (error) {
        console.error('Error:', error);
        throw new Error(`Failed to delete market: ${error.message}`);
      }

      if (!data) {
        throw new Error('Not authorized to delete this market');
      }

      console.log('Successfully deleted market and all associated data');
      setMessage('✅ Market and associated data deleted successfully');
      setSelectedMarket(null);
      setIsNewMarket(false);
      await fetchMarkets();
    } catch (error) {
      console.error('Delete operation failed:', error);
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const isUpcoming = (market) => {
    const marketDate = new Date(market.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return marketDate >= today;
  };

  const getCalendarEvents = () => {
    // Convert markets to calendar events
    const marketEvents = markets.map(market => {
      const eventDate = market.date.split('T')[0];
      return {
        id: `market-${market.id}`,
        title: market.name,
        start: `${eventDate}T${market.start_time || '00:00'}`,
        end: `${eventDate}T${market.end_time || '23:59'}`,
        allDay: false,
        extendedProps: {
          type: 'market',
          location: market.location,
          status: market.status,
          description: market.description,
          startTime: market.start_time,
          endTime: market.end_time
        }
      };
    });

    // Convert events to calendar events
    const calendarEvents = events.map(event => {
      const eventDate = event.date.split('T')[0];
      return {
        id: `event-${event.id}`,
        title: event.name,
        start: `${eventDate}T${event.start_time || '00:00'}`,
        end: `${eventDate}T${event.end_time || '23:59'}`,
        allDay: false,
        extendedProps: {
          type: 'event',
          location: event.location,
          status: event.status,
          description: event.description,
          startTime: event.start_time,
          endTime: event.end_time
        }
      };
    });

    // Combine both types of events
    return [...marketEvents, ...calendarEvents];
  };

  const handleEventClick = (clickInfo) => {
    clickInfo.jsEvent.preventDefault();
    const isCurrentEvent = selectedCalendarEvent?.id === clickInfo.event.id;
    
    if (isCurrentEvent) {
      setSelectedCalendarEvent(null);
    } else {
      setSelectedCalendarEvent(clickInfo.event);
    }
  };

  useEffect(() => {
    return () => {
      setSelectedCalendarEvent(null);
    };
  }, []);

  const ExpandedEventDetails = ({ event, onClose }) => {
    const isMarket = event.extendedProps.type === 'market';
    
    // Extract the ID from the event ID string, handling both numeric and UUID formats
    const eventId = event.id.replace(/^(market|event)-/, '');

    // Add debug logs
    console.log('Debug - Event Details:', {
        isMarket,
        eventId,
        eventFullId: event.id,
        marketsAvailable: markets.length,
        markets: markets.map(m => ({ id: m.id, name: m.name }))
    });

    const handleEditClick = () => {
        try {
            // Validate eventId
            if (!eventId) {
                throw new Error('Invalid market ID');
            }

            console.log('Looking for market with ID:', eventId);
            console.log('Available markets:', markets);

            // Find the market in our local state, comparing as strings to ensure proper matching
            const marketToEdit = markets.find(m => m.id === eventId);
            
            if (!marketToEdit) {
                console.error('Market not found in local state:', eventId);
                console.log('Available market IDs:', markets.map(m => m.id));
                setMessage('Error: Market not found');
                return;
            }

            console.log('Found market to edit:', marketToEdit);

            // Set the selected market and close the expanded view
            setSelectedMarket(marketToEdit);
            setIsNewMarket(false);
            onClose();
            
        } catch (error) {
            console.error('Error handling edit:', error);
            setMessage(`Error: ${error.message || 'Failed to edit market. Please try again.'}`);
        }
  };

  return (
      <div className={styles.expandedEvent}>
        <div className={styles.expandedEventContent}>
          <button onClick={onClose} className={styles.closeExpandedButton}>×</button>
          <h3 className={styles.expandedEventTitle}>{event.title}</h3>
          
          <div className={styles.expandedEventDetails}>
            {/* Date and Time */}
            <div className={styles.expandedEventTime}>
              <div className={styles.expandedDetailRow}>
                <span className={styles.expandedDetailIcon}>📅</span>
                <span>{new Date(event.start).toLocaleDateString()}</span>
              </div>
              <div className={styles.expandedDetailRow}>
                <span className={styles.expandedDetailIcon}>⏰</span>
                <span>
                  {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {event.end && ` - ${new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              </div>
            </div>

            {/* Location */}
            {event.extendedProps.location && (
              <div className={styles.expandedDetailRow}>
                <span className={styles.expandedDetailIcon}>📍</span>
                <span>{event.extendedProps.location}</span>
              </div>
            )}

            {/* Status */}
            <div className={styles.expandedDetailRow}>
              <span className={styles.expandedDetailIcon}>🔵</span>
              <span className={`${styles.statusBadge} ${styles[`status${event.extendedProps.status}`]}`}>
                {event.extendedProps.status.charAt(0).toUpperCase() + event.extendedProps.status.slice(1)}
              </span>
            </div>

            {/* Description */}
            {event.extendedProps.description && (
              <div className={styles.expandedDetailDescription}>
                <div className={styles.expandedDetailRow}>
                  <span className={styles.expandedDetailIcon}>📝</span>
                  <span>{event.extendedProps.description}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {isMarket && (
            <div className={styles.expandedEventActions}>
              <button
                onClick={handleEditClick}
                className={`${styles.actionButton} ${styles.editButton}`}
              >
                Edit Market
              </button>
            </div>
          )}
      </div>
      </div>
    );
  };

  useEffect(() => {
    return () => {
      if (calendarApi) {
        try {
          calendarApi.destroy();
        } catch (error) {
          console.error('Error cleaning up calendar:', error);
        }
      }
    };
  }, [calendarApi]);

  const renderEventContent = (eventInfo) => {
    const isMarket = eventInfo.event.extendedProps.type === 'market';
    
    return (
      <div className={`${styles.calendarEvent} ${isMarket ? styles.marketEvent : styles.regularEvent}`}>
        <div className={styles.eventTitle}>
          {eventInfo.event.title}
          </div>
        {(eventInfo.event.extendedProps.startTime || eventInfo.event.extendedProps.endTime) && (
          <div className={styles.eventTime}>
            {eventInfo.event.extendedProps.startTime ? 
              new Date(`2000-01-01T${eventInfo.event.extendedProps.startTime}`).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit'
              }) : ''
            }
            {eventInfo.event.extendedProps.endTime && 
              ` - ${new Date(`2000-01-01T${eventInfo.event.extendedProps.endTime}`).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit'
              })}`
            }
          </div>
        )}
      </div>
    );
  };

  const sortMarkets = (markets) => {
    return [...markets].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'location':
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });
  };

  const filterAndSortMarkets = (markets) => {
    const filtered = markets.filter(market => {
      const searchLower = searchQuery.toLowerCase();
      return (
        market.name.toLowerCase().includes(searchLower) ||
        market.location.toLowerCase().includes(searchLower)
      );
    });
    return sortMarkets(filtered);
  };

  // Update the display of dates to avoid any automatic conversions
  const formatDisplayDate = (dateStr) => {
    // Split the date string and rearrange it
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year.slice(2)}`;
  };

  // Update the market card display
  const MarketCard = ({ market }) => (
    <div className={styles.marketDetails}>
      <div className={styles.detailItem}>
        <span className={styles.detailLabel}>Date</span>
        <span className={styles.detailValue}>
          {formatDisplayDate(market.date)}
        </span>
      </div>
      {/* ... rest of the market card ... */}
    </div>
  );

  // Update the organizeMarkets function to use real dates
  const organizeMarkets = (markets) => {
    // Get real today's date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toLocaleDateString('en-CA');
    
    // Calculate end of current week
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfWeekStr = endOfWeek.toLocaleDateString('en-CA');

    // Calculate end of current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfMonthStr = endOfMonth.toLocaleDateString('en-CA');

    console.log('ORGANIZING MARKETS:');
    console.log('Actual today:', todayStr);
    console.log('End of week:', endOfWeekStr);
    console.log('End of month:', endOfMonthStr);
    console.log('All market dates:', markets.map(m => ({ id: m.id, date: m.date, name: m.name })));

    // Organize markets based on real dates
    return {
      today: markets.filter(market => market.date === todayStr),
      thisWeek: markets.filter(market => 
        market.date > todayStr && 
        market.date <= endOfWeekStr
      ),
      upcoming: markets.filter(market => 
        market.date > endOfWeekStr
      ),
      past: markets.filter(market => market.date < todayStr)
    };
  };

  // Add this function to toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Add this component for the market list section
  const MarketListSection = ({ title, markets, isExpanded, onToggle }) => (
    <div className={styles.marketSection}>
      <button 
        className={styles.sectionHeader} 
        onClick={onToggle}
      >
        <h3 className={styles.sectionTitle}>{title}</h3>
        <span className={styles.expandIcon}>
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      {isExpanded && (
        <div className={styles.marketsList}>
          {markets.map(market => (
            <div 
              key={market.id}
              className={`${styles.marketItem} ${selectedMarket?.id === market.id ? styles.selected : ''}`}
              onClick={() => setSelectedMarket(market)}
            >
              <div>
                <div className={styles.marketName}>{market.name}</div>
                <div className={styles.marketDetails}>
                  {new Date(market.date).toLocaleDateString()} • {convertTo12Hour(market.start_time)} - {convertTo12Hour(market.end_time)}
                </div>
                <div className={styles.marketLocation}>
                  📍 {market.location || 'Location not set'}
                </div>
              </div>
              <div className={styles.marketActions}>
                <button 
                  className={`${styles.actionButton} ${styles.editButton}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarket(market);
                  }}
                >
                  View/Edit
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMarket(market.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {markets.length === 0 && (
            <div className={styles.noMarkets}>No markets in this period</div>
        )}
      </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Market Manager</h1>
        <div className={styles.headerButtons}>
          <button
            onClick={() => {
              setIsNewMarket(true);
              setSelectedMarket(null);
            }}
            className={styles.createButton}
          >
            Create New Market
          </button>
          <div className={styles.viewToggleButtons}>
            <button
              className={`${styles.viewToggleButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
            <button
              className={`${styles.viewToggleButton} ${viewMode === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              Calendar View
            </button>
          </div>
        </div>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {!isNewMarket && !selectedMarket && (
        <>
          {viewMode === 'list' ? (
            <>
              <div className={styles.controls}>
                <input
                  type="text"
                  placeholder="Search markets by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.sortSelect}
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="location">Sort by Location</option>
                </select>
              </div>

              <div className={styles.marketsList}>
                {Object.entries(organizeMarkets(filterAndSortMarkets(markets))).map(([section, sectionMarkets]) => {
                  let sectionTitle;
                  switch(section) {
                    case 'today':
                      sectionTitle = "Today's Markets";
                      break;
                    case 'thisWeek':
                      sectionTitle = 'This Week';
                      break;
                    case 'upcoming':
                      sectionTitle = 'Upcoming';
                      break;
                    case 'past':
                      sectionTitle = 'Past';
                      break;
                    default:
                      sectionTitle = section;
                  }
                  
                  return sectionMarkets.length > 0 ? (
                    <div key={section} className={styles.marketSection}>
                      <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
                      {sectionMarkets.map(market => (
                        <div 
                          key={market.id}
                          className={styles.marketCard}
                          onClick={() => setSelectedMarket(market)}
                        >
                          <div className={styles.marketHeader}>
                            <h3 className={styles.marketTitle}>{market.name}</h3>
                            <span className={`${styles.status} ${styles[`status${market.status.charAt(0).toUpperCase() + market.status.slice(1)}`]}`}>
                              {market.status}
                            </span>
                          </div>
                          
                          <div className={styles.marketDetails}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Date</span>
                              <span className={styles.detailValue}>
                                {formatDisplayDate(market.date)}
                              </span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Time</span>
                              <span className={styles.detailValue}>
                                {convertTo12Hour(market.start_time)} - {convertTo12Hour(market.end_time)}
                              </span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Location</span>
                              <span className={styles.detailValue}>
                                {market.location || 'Location not set'}
                              </span>
                            </div>
                          </div>

                          <div className={styles.marketActions}>
                            <button 
                              className={`${styles.actionButton} ${styles.editButton}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMarket(market);
                              }}
                            >
                              View/Edit
                            </button>
                            <button 
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMarket(market.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })}
                {filterAndSortMarkets(markets).length === 0 && (
                  <div className={styles.noMarkets}>
                    No markets found. Create your first market to get started!
                  </div>
                )}
              </div>
            </>
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
                  if (el && el.getApi) {
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
                  styles[`status${eventInfo.event.extendedProps.status}`],
                  selectedCalendarEvent?.id === eventInfo.event.id ? styles.selectedEvent : '',
                  eventInfo.event.extendedProps.type === 'market' ? styles.marketEvent : styles.regularEvent
                ]}
                slotMinTime="06:00:00"
                slotMaxTime="24:00:00"
                dayMaxEvents={4}
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: true
                }}
                height="auto"
                expandRows={true}
                dayMaxEventRows={5}
                moreLinkContent={(args) => `+${args.num} more`}
                moreLinkClick="popover"
                allDaySlot={false}
                slotDuration="00:30:00"
                slotLabelInterval="01:00"
                slotLabelFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: true
                }}
                nowIndicator={true}
                scrollTime="08:00:00"
                views={{
                  timeGridWeek: {
                    titleFormat: { month: 'long', day: 'numeric' },
                    dayHeaderFormat: { weekday: 'long', month: 'numeric', day: 'numeric', omitCommas: true }
                  }
                }}
              />
              {selectedCalendarEvent && (
                <ExpandedEventDetails 
                  event={selectedCalendarEvent} 
                  onClose={() => setSelectedCalendarEvent(null)} 
                />
              )}
            </div>
          )}
        </>
      )}

      {(isNewMarket || selectedMarket) && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              {isNewMarket ? 'Create New Market' : 'Edit Market'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedMarket(null);
                setIsNewMarket(false);
              }}
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.timeGroup}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={styles.textarea}
                rows="3"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={styles.select}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className={styles.formFooter}>
            <div className={styles.buttonGroup}>
              <button
                type="submit"
                className={styles.primaryButton}
              >
                {isNewMarket ? 'Create Market' : 'Update Market'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMarket(null);
                  setIsNewMarket(false);
                }}
                className={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>
            
            {!isNewMarket && selectedMarket && (
              <button
                type="button"
                onClick={() => handleDeleteMarket(selectedMarket.id)}
                className={styles.dangerButton}
              >
                Delete Market
              </button>
            )}
          </div>
        </form>
      )}

      {!isNewMarket && selectedMarket && (
        <div className={styles.designSection}>
          <h3 className={styles.sectionTitle}>Market Designs</h3>
          <div className={styles.designGrid}>
            {/* Border Upload */}
            <div className={styles.uploadCard}>
              <h4 className={styles.uploadTitle}>Photo Border</h4>
              {designs.border && (
                <div className={styles.previewContainer}>
                  <div className={styles.imagePreview}>
                    <img 
                      src={designs.border}
                      alt="Current border"
                      className={styles.previewImage}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this border?')) {
                        try {
                          const { error } = await supabase
                            .from('market_camera_settings')
                            .update({ border_url: null })
                            .eq('market_id', selectedMarket.id);

                          if (error) throw error;
                          setDesigns(prev => ({ ...prev, border: null }));
                          setMessage('Border deleted successfully');
                        } catch (error) {
                          console.error('Error deleting border:', error);
                          setMessage('Error deleting border');
                        }
                      }
                    }}
                    className={styles.deleteButton}
                  >
                    Delete Border
                  </button>
                </div>
              )}
              <label className={styles.uploadLabel}>
                <span className={styles.uploadButton}>
                  {uploading ? 'Uploading...' : 'Upload Border'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, 'border')}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Landing Page Upload */}
            <div className={styles.uploadCard}>
              <h4 className={styles.uploadTitle}>Landing Page Background</h4>
              {designs.landing_page && (
                <div className={styles.previewContainer}>
                  <div className={styles.imagePreview}>
                    <img 
                      src={designs.landing_page}
                      alt="Current background"
                      className={styles.previewImage}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this background?')) {
                        try {
                          const { error } = await supabase
                            .from('market_camera_settings')
                            .update({ landing_page_url: null })
                            .eq('market_id', selectedMarket.id);

                          if (error) throw error;
                          setDesigns(prev => ({ ...prev, landing_page: null }));
                          setMessage('Background deleted successfully');
                        } catch (error) {
                          console.error('Error deleting background:', error);
                          setMessage('Error deleting background');
                        }
                      }
                    }}
                    className={styles.deleteButton}
                  >
                    Delete Background
                  </button>
                </div>
              )}
              <label className={styles.uploadLabel}>
                <span className={styles.uploadButton}>
                  {uploading ? 'Uploading...' : 'Upload Background'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, 'landing_page')}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {!isNewMarket && selectedMarket && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Market QR Code</h3>
          <div className="flex flex-col items-center space-y-4">
            <QRCodeSVG 
              value={`${window.location.origin}/market/${selectedMarket.id}`}
              size={150}
              level="H"
              includeMargin={true}
            />
            
            <div className="flex flex-col items-center space-y-2 w-full max-w-md">
              <input
                type="text"
                value={`${window.location.origin}/market/${selectedMarket.id}`}
                readOnly
                className="w-full px-3 py-2 border rounded text-sm bg-gray-50"
              />
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/market/${selectedMarket.id}`);
                    setMessage('Link copied to clipboard!');
                    setTimeout(() => setMessage(''), 3000);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Copy Market Link
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>QR Code - ${selectedMarket.name}</title>
                          <style>
                            body {
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              justify-content: center;
                              min-height: 100vh;
                              margin: 0;
                              padding: 20px;
                            }
                            h2 { 
                              margin-bottom: 20px;
                              font-size: 24px;
                              font-weight: bold;
                            }
                            svg {
                              width: 600px !important;
                              height: 600px !important;
                            }
                          </style>
                        </head>
                        <body>
                          <h2>${selectedMarket.name}</h2>
                          ${document.querySelector('.flex.flex-col.items-center.space-y-4 svg').outerHTML}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                >
                  Print QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 

