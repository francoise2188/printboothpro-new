'use client';

import { useState, useEffect, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../../lib/supabase';
import PhotoQueue from './PhotoQueue';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import { printerService } from '../../../lib/printerService';
import { PRINTER_SETTINGS } from '../../../lib/printerConfig';
import styles from './TemplateGrid.module.css';
import { jsPDF } from 'jspdf';

export default function TemplateGrid({ selectedEventId }) {
  const [template, setTemplate] = useState(Array(9).fill(null));
  const [autoPrint, setAutoPrint] = useState(() => {
    // Try to get saved preference from localStorage, default to true if not found
    const saved = localStorage.getItem('autoPrint');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReprintOpen, setIsReprintOpen] = useState(false);
  const [recentPrints, setRecentPrints] = useState([]);
  const [selectedPrints, setSelectedPrints] = useState([]);
  const [websiteUrl, setWebsiteUrl] = useState('www.yourwebsite.com'); // Default value
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [printCount, setPrintCount] = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [popupWindow, setPopupWindow] = useState(null);
  const { user } = useAuth();
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [printStatus, setPrintStatus] = useState('idle'); // idle, printing, error
  const [currentPrintJob, setCurrentPrintJob] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());

  // Keep track of the last processed photo ID
  const [lastProcessedPhotoId, setLastProcessedPhotoId] = useState(null);

  // Initialize processedPhotoIds state
  const [processedPhotoIds, setProcessedPhotoIds] = useState(() => {
    try {
      if (!selectedEventId) return new Set();
      const saved = localStorage.getItem(`processed_photos_${selectedEventId}`);
      if (!saved) {
        console.log('No processed photos found in localStorage');
        return new Set();
      }
      const processedIds = JSON.parse(saved);
      console.log('Initialized processed photos:', processedIds);
      return new Set(processedIds);
    } catch (error) {
      console.error('Error loading processed photos from localStorage:', error);
      return new Set();
    }
  });

  // Save processedPhotoIds to localStorage whenever it changes
  useEffect(() => {
    if (selectedEventId) {
      try {
        localStorage.setItem(
          `processed_photos_${selectedEventId}`,
          JSON.stringify(Array.from(processedPhotoIds))
        );
      } catch (error) {
        console.error('Error saving processed photos to localStorage:', error);
      }
    }
  }, [processedPhotoIds, selectedEventId]);

  // Remove the cleanup effect that's causing issues
  useEffect(() => {
    // Clear processed photos when event changes
    if (selectedEventId) {
      console.log('Event changed, clearing local state only');
      setProcessedPhotoIds(new Set());
      localStorage.removeItem(`processed_photos_${selectedEventId}`);
      setLoadedImages(new Set());
    }
  }, [selectedEventId]);

  useEffect(() => {
    console.log('🖼 Initial Template Load:', {
      templateLength: template.length
    });
  }, []);

  useEffect(() => {
    console.log('🖼️ Template State:', template.map(photo => ({
      id: photo?.id,
      url: photo?.url,
      hasOverlay: !!photo?.frame_overlay
    })));
  }, [template]);

  const cleanupTemplateState = async () => {
    if (!selectedEventId || !user) return;
    
    try {
      console.log('Starting template cleanup...');
      setLoading(true);
      
      // First, get all photos that are marked as in_template
      const { data: templatePhotos, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', selectedEventId)
        .eq('status', 'in_template')
        .is('deleted_at', null);
        
      if (fetchError) throw fetchError;
      
      // Create a map to track positions and duplicates
      const positionMap = new Map();
      const duplicates = [];
      
      templatePhotos.forEach(photo => {
        if (photo.template_position) {
          if (positionMap.has(photo.template_position)) {
            duplicates.push(photo.id);
          } else {
            positionMap.set(photo.template_position, photo.id);
          }
        }
      });
      
      // Reset duplicates to pending status
      if (duplicates.length > 0) {
        const { error: updateError } = await supabase
          .from('photos')
          .update({
            status: 'pending',
            template_position: null
          })
          .in('id', duplicates);
          
        if (updateError) throw updateError;
      }
      
      // Reset template state
      setTemplate(Array(9).fill(null));
      setProcessedPhotoIds(new Set());
      setLoadedImages(new Set());
      setLoading(false);
      
      console.log('Template cleanup completed');
    } catch (error) {
      console.error('Cleanup error:', error);
      setError('Failed to cleanup template state');
      setLoading(false);
    }
  };

  // Modify the existing useEffect for template processing
  useEffect(() => {
    const processTemplate = async () => {
      if (!user || !selectedEventId) {
        console.log('Missing required data:', {
          hasUser: !!user,
          eventId: selectedEventId
        });
        return;
      }

      try {
        console.log('Processing template for event:', {
          eventId: selectedEventId,
          userId: user.id
        });
        
        // Get ALL photos for this event in a single query
        const { data: allPhotos, error } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', selectedEventId)
          .or('status.eq.in_template,status.eq.pending')
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching photos:', error);
          return;
        }

        // Log all pending photos for debugging
        const pendingPhotos = allPhotos?.filter(p => p.status === 'pending') || [];
        console.log('All pending photos:', pendingPhotos.map(p => ({
          id: p.id,
          created_at: p.created_at,
          event_id: p.event_id
        })));

        console.log('Fetched photos:', {
          total: allPhotos?.length,
          pending: pendingPhotos.length,
          inTemplate: allPhotos?.filter(p => p.status === 'in_template').length,
          eventId: selectedEventId
        });

        // Initialize empty template
        const newTemplate = Array(9).fill(null);
        let needsCleanup = false;

        // First, place all in_template photos in their correct positions
        const inTemplatePhotos = allPhotos.filter(p => p.status === 'in_template');
        
        // Check for position conflicts
        const positionMap = new Map();
        inTemplatePhotos.forEach(photo => {
          if (photo.template_position && photo.template_position <= 9) {
            if (positionMap.has(photo.template_position)) {
              needsCleanup = true;
            } else {
              positionMap.set(photo.template_position, photo);
              newTemplate[photo.template_position - 1] = photo;
            }
          }
        });

        // If we detected conflicts, trigger cleanup
        if (needsCleanup) {
          console.log('Position conflicts detected, triggering cleanup...');
          await cleanupTemplateState();
          return;
        }

        // Find first empty slot
        const firstEmptySlot = newTemplate.findIndex(slot => slot === null);

        console.log('Template status:', {
          firstEmptySlot,
          pendingPhotosCount: pendingPhotos.length,
          templateState: newTemplate.map((p, i) => ({
            position: i + 1,
            hasPhoto: !!p,
            photoId: p?.id
          }))
        });

        // If we have an empty slot and pending photos, process one
        if (firstEmptySlot !== -1 && pendingPhotos.length > 0) {
          const photoToMove = pendingPhotos[0];
          console.log('Processing pending photo:', {
            photoId: photoToMove.id,
            targetSlot: firstEmptySlot + 1,
            eventId: photoToMove.event_id
          });

          // Verify event ID matches
          if (photoToMove.event_id !== selectedEventId) {
            console.error('Event ID mismatch:', {
              photoEventId: photoToMove.event_id,
              selectedEventId
            });
            return;
          }

          // Update the photo status in database
          const { error: updateError } = await supabase
            .from('photos')
            .update({
              status: 'in_template',
              template_position: firstEmptySlot + 1
            })
            .eq('id', photoToMove.id)
            .eq('status', 'pending')
            .eq('event_id', selectedEventId);

          if (updateError) {
            console.error('Error updating photo status:', updateError);
            return;
          }

          // Add to template immediately
          newTemplate[firstEmptySlot] = {
            ...photoToMove,
            status: 'in_template',
            template_position: firstEmptySlot + 1
          };

          console.log('Successfully added photo to template:', {
            photoId: photoToMove.id,
            position: firstEmptySlot + 1,
            eventId: selectedEventId
          });
        }

        // Update template state if different
        setTemplate(current => {
          const currentIds = current.map(p => p?.id).join(',');
          const newIds = newTemplate.map(p => p?.id).join(',');
          if (currentIds !== newIds) {
            console.log('Updating template with new state');
            return newTemplate;
          }
          return current;
        });
        setLoading(false);

      } catch (error) {
        console.error('Template processing error:', error);
        if (error instanceof Error) {
          setError(error.message);
        }
        setLoading(false);
      }
    };

    // Run immediately and set up interval
    processTemplate();
    const interval = setInterval(processTemplate, 3000);
    return () => clearInterval(interval);
  }, [selectedEventId, user?.id]);

  useEffect(() => {
    const calculateTime = () => {
      try {
        const photosCount = template.filter(photo => photo !== null).length;
        const time = calculatePrintTime(photosCount);
        if (time) {
          setEstimatedTime(time);
        }
      } catch (error) {
        console.error('Error calculating time:', error);
        setEstimatedTime('Calculating...');
      }
    };

    calculateTime();
  }, [template]);

  const loadRecentPrints = async () => {
    try {
      console.log('Loading recent prints...', {
        userId: user?.id,
        eventId: selectedEventId
      });
      
      // Get all recently printed photos
      const { data: recentPhotos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .eq('print_status', 'printed')  // Look specifically for printed status
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading recent prints:', error);
        throw error;
      }

      console.log('Found recent prints:', {
        count: recentPhotos?.length,
        photos: recentPhotos?.map(p => ({
          id: p.id,
          status: p.status,
          print_status: p.print_status
        }))
      });

      if (!recentPhotos || recentPhotos.length === 0) {
        setRecentPrints([]);
        toast.error('No recent prints found');
      } else {
        setRecentPrints(recentPhotos);
      }

      setIsReprintOpen(true);
      
    } catch (error) {
      console.error('Error loading recent prints:', error);
      toast.error('Failed to load recent prints');
    }
  };

  // Add a function to check print status
  const checkPrintStatus = async (photoIds) => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, print_status, status')
        .in('id', photoIds);

      if (error) throw error;

      console.log('Print status check:', data);
      return data;
    } catch (error) {
      console.error('Error checking print status:', error);
      return null;
    }
  };

  const handleImageLoad = (photoId) => {
    console.log(`Image loaded: ${photoId}`);
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(photoId);
      return newSet;
    });
    
    // Reset print status to idle if it was in error state
    if (printStatus === 'error') {
      setPrintStatus('idle');
    }
  };

  useEffect(() => {
    // Only reset loadedImages if template is actually empty
    const hasPhotos = template.some(photo => photo !== null);
    if (!hasPhotos) {
      requestAnimationFrame(() => {
        setLoadedImages(new Set());
      });
    }
    requestAnimationFrame(() => {
      setPrintStatus('idle');
    });
  }, [template]);

  // Clear processed photos function
  const clearProcessedPhotos = useCallback(() => {
    if (selectedEventId) {
      setProcessedPhotoIds(new Set());
      localStorage.removeItem(`processed_photos_${selectedEventId}`);
      setTemplate(Array(9).fill(null));
      setLoadedImages(new Set());
    }
  }, [selectedEventId]);

  const monitorPrintJob = useCallback(async (jobId, printer) => {
    const MAX_CHECKS = 5;
    let checkCount = parseInt(localStorage.getItem(`print_check_${jobId}`) || '0');
    
    if (checkCount >= MAX_CHECKS) {
      console.log('Print job monitoring completed after', MAX_CHECKS, 'checks');
      setPrintStatus('idle');
      setIsPrinting(false);
      setCurrentPrintJob(null);
      localStorage.removeItem(`print_check_${jobId}`);
      toast.success('Print job completed - check your printer', {
        id: `print-status-${jobId}`,
        duration: 3000
      });
      clearProcessedPhotos();
      return;
    }

    try {
      checkCount++;
      localStorage.setItem(`print_check_${jobId}`, checkCount.toString());

      // Get the API key from localStorage
      const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const apiKey = userSettings.printnode_api_key;
      
      if (!apiKey) {
        setIsPrinting(false);
        setPrintStatus('idle');
        throw new Error('PrintNode API key not found');
      }

      const response = await fetch(`/api/print/status?jobId=${jobId}&printerId=${printer}`, {
        headers: {
          'X-PrintNode-API-Key': apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Status check failed:', {
          status: response.status,
          error: errorData
        });
        
        // If we get a 404, assume the job was cancelled or deleted
        if (response.status === 404) {
          console.log('Print job no longer exists (likely cancelled):', jobId);
          setPrintStatus('idle');
          setIsPrinting(false);
          setCurrentPrintJob(null);
          localStorage.removeItem(`print_check_${jobId}`);
          toast.error('Print job was cancelled');
          clearProcessedPhotos();
          return;
        }
        
        setIsPrinting(false);
        setPrintStatus('idle');
        throw new Error(`Failed to get job status: ${errorData}`);
      }

      const data = await response.json();
      console.log('Print job status:', data);

      // Update toast message every 3 checks (6 seconds)
      if (checkCount % 3 === 0) {
        toast.loading('Print job is processing...', {
          id: `print-status-${jobId}`,
          duration: 3000
        });
      }

      // Handle different status types
      switch(data.status) {
        case 'completed':
          console.log('Print job completed successfully');
          setPrintStatus('idle');
          setIsPrinting(false);
          setCurrentPrintJob(null);
          localStorage.removeItem(`print_check_${jobId}`);
          toast.success('Print completed successfully!', {
            id: `print-status-${jobId}`
          });
          clearProcessedPhotos();
          break;
          
        case 'failed':
        case 'error':
        case 'cancelled':
          console.log('Print job failed or was cancelled:', data.status);
          setPrintStatus('idle');
          setIsPrinting(false);
          setCurrentPrintJob(null);
          localStorage.removeItem(`print_check_${jobId}`);
          toast.error(`Print ${data.status}: ${data.lastError || 'Job was cancelled'}`, {
            id: `print-status-${jobId}`
          });
          clearProcessedPhotos();
          break;
          
        case 'printing':
        case 'queued':
        case 'pending':
          console.log('Print job is processing...', {
            status: data.status,
            printer: data.printer,
            state: data.printerState,
            checkCount,
            maxChecks: MAX_CHECKS
          });
          setPrintStatus('printing');
          // Reduced delay between checks to 2 seconds
          setTimeout(() => monitorPrintJob(jobId, printer), 2000);
          break;
          
        default:
          console.log('Unknown print status:', data.status);
          setPrintStatus('idle');
          setIsPrinting(false);
          setCurrentPrintJob(null);
          localStorage.removeItem(`print_check_${jobId}`);
          toast.error('Print monitoring failed: Unknown status', {
            id: `print-status-${jobId}`
          });
          clearProcessedPhotos();
      }
    } catch (error) {
      console.error('Print monitoring error:', error);
      setPrintStatus('idle');
      setIsPrinting(false);
      setCurrentPrintJob(null);
      localStorage.removeItem(`print_check_${jobId}`);
      toast.error(`Print monitoring failed: ${error.message}`, {
        id: `print-status-${jobId}`
      });
      clearProcessedPhotos();
    }
  }, [clearProcessedPhotos]);

  const handlePrint = useCallback(async () => {
    if (isPrinting) return;

    try {
      // Get settings at the start
      const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      if (!userSettings.printnode_api_key) {
        toast.error('PrintNode API key not found. Please configure your settings first.');
        return;
      }

      if (!selectedPrinter) {
        toast.error('No printer selected. Please check PrintNode connection.');
        return;
      }

      const photosToUpdate = template
        .filter(photo => photo !== null)
        .map(photo => ({
          id: photo.id,
          url: photo.url
        }));

      if (photosToUpdate.length === 0) {
        toast.error('Template is empty - add some photos first');
        return;
      }

      setIsPrinting(true);
      setPrintStatus('printing');

      // Update print status before printing
      const { error: statusError } = await supabase
        .from('photos')
        .update({
          print_status: 'printing',
          status: 'printing'
        })
        .in('id', photosToUpdate.map(p => p.id));

      if (statusError) {
        console.error('Error updating print status:', statusError);
        toast.error('Failed to update photo status');
        setIsPrinting(false);
        setPrintStatus('idle');
        return;
      }

      // Create a canvas with precise measurements
      const canvas = document.createElement('canvas');
      const DPI = 300;
      const PHOTO_SIZE_INCHES = 2;
      const CELL_SIZE_INCHES = 2.717;
      const GRID_SIZE = 3;
      
      // Calculate sizes in pixels
      const PHOTO_SIZE_PX = PHOTO_SIZE_INCHES * DPI;
      const CELL_SIZE_PX = CELL_SIZE_INCHES * DPI;
      const TOTAL_WIDTH_PX = CELL_SIZE_PX * GRID_SIZE;
      
      canvas.width = TOTAL_WIDTH_PX;
      canvas.height = TOTAL_WIDTH_PX;
      const ctx = canvas.getContext('2d', { alpha: false });
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        // Load and draw images
        const loadImagePromises = photosToUpdate.map((photo, index) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              // Calculate position in grid
              const row = Math.floor(index / GRID_SIZE);
              const col = index % GRID_SIZE;
              
              // Calculate exact position for this cell
              const cellX = col * CELL_SIZE_PX;
              const cellY = row * CELL_SIZE_PX;
              
              // Calculate photo position within cell (centered)
              const photoX = cellX + ((CELL_SIZE_PX - PHOTO_SIZE_PX) / 2);
              const photoY = cellY + ((CELL_SIZE_PX - PHOTO_SIZE_PX) / 2);
              
              // Draw photo at exact size
              ctx.drawImage(img, photoX, photoY, PHOTO_SIZE_PX, PHOTO_SIZE_PX);
              
              // Add URL text directly to canvas
              ctx.save();
              ctx.font = `${32}px Arial`;
              ctx.fillStyle = 'black';
              ctx.translate(photoX + PHOTO_SIZE_PX/2, photoY + PHOTO_SIZE_PX + 30);
              ctx.rotate(Math.PI);  // Rotate 180 degrees
              ctx.textAlign = 'center';
              ctx.fillText(websiteUrl, 0, 0);
              ctx.restore();
              
              resolve();
            };
            
            img.onerror = reject;
            img.src = photo.url;
          });
        });

        // Wait for all images to be drawn
        await Promise.all(loadImagePromises);

        // Create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: 'letter'
        });

        // Calculate position to center grid on letter page
        const PAGE_WIDTH = 8.5;
        const PAGE_HEIGHT = 11;
        const GRID_WIDTH_INCHES = CELL_SIZE_INCHES * GRID_SIZE;
        const X_OFFSET = (PAGE_WIDTH - GRID_WIDTH_INCHES) / 2;
        const Y_OFFSET = (PAGE_HEIGHT - GRID_WIDTH_INCHES) / 2;

        // Convert canvas to JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        // Add complete grid (with URLs) to PDF
        pdf.addImage(imgData, 'JPEG', X_OFFSET, Y_OFFSET, GRID_WIDTH_INCHES, GRID_WIDTH_INCHES);

        // Get PDF as base64
        const pdfData = pdf.output('datauristring');

        // Send to printer
        const response = await fetch('/api/print', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PrintNode-API-Key': userSettings.printnode_api_key
          },
          body: JSON.stringify({
            content: pdfData,
            printerId: parseInt(selectedPrinter),
            title: `PrintBooth Job - ${new Date().toISOString()}`
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Print failed: ${errorText}`);
        }

        const printData = await response.json();
        
        if (!printData.success) {
          throw new Error(printData.message || 'Print failed');
        }

        // Update photos to printed status
        const { error: finalUpdateError } = await supabase
          .from('photos')
          .update({
            print_status: 'printed',
            status: 'printed'
          })
          .in('id', photosToUpdate.map(p => p.id));

        if (finalUpdateError) {
          console.error('Error updating final print status:', finalUpdateError);
        }

        toast.success('Print job sent successfully!');
        setCurrentPrintJob(printData.jobId);
        
        // Start monitoring the print job
        setTimeout(() => {
          monitorPrintJob(printData.jobId, selectedPrinter);
        }, 3000);

      } catch (error) {
        console.error('Print processing error:', error);
        // Revert photos to previous status
        const { error: revertError } = await supabase
          .from('photos')
          .update({
            print_status: 'pending',
            status: 'in_template'
          })
          .in('id', photosToUpdate.map(p => p.id));

        if (revertError) {
          console.error('Error reverting photo status:', revertError);
        }
        
        throw error;
      }

    } catch (error) {
      console.error('Print error:', error);
      toast.error(`Print failed: ${error.message}`);
      setIsPrinting(false);
      setPrintStatus('idle');
      setCurrentPrintJob(null);
    }
  }, [template, user?.id, selectedPrinter, websiteUrl, monitorPrintJob, isPrinting]);

  const handleReprintSelect = (photo) => {
    setSelectedPrints(current => {
      if (current.includes(photo.id)) {
        return current.filter(id => id !== photo.id);
      } else {
        return [...current, photo.id];
      }
    });
  };

  const handleAddSelectedToTemplate = async () => {
    const selectedPhotos = recentPrints.filter(photo => selectedPrints.includes(photo.id));
    
    if (!selectedEventId) {
      console.error('No event ID available');
      toast.error('No event selected');
      return;
    }

    // Find empty slots in the template
    const emptySlots = template.reduce((slots, photo, index) => {
      if (!photo) slots.push(index);
      return slots;
    }, []);

    try {
      // Add selected photos to empty slots
      for (let i = 0; i < selectedPhotos.length; i++) {
        if (emptySlots[i] !== undefined) {
          const photo = selectedPhotos[i];
          const slotIndex = emptySlots[i];
          const templatePosition = slotIndex + 1;

          console.log('Attempting to update photo:', {
            photoId: photo.id,
            position: templatePosition,
            eventId: selectedEventId
          });

          // Update database first
          const { data: updatedPhoto, error: updateError } = await supabase
            .from('photos')
            .update({
              status: 'in_template',
              template_position: templatePosition,
              event_id: selectedEventId
            })
            .eq('id', photo.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating photo in database:', {
              error: updateError,
              photo: photo.id,
              position: templatePosition
            });
            throw updateError;
          }

          console.log('Successfully updated photo:', updatedPhoto);

          // Then update UI
          setTemplate(current => {
            const newTemplate = [...current];
            newTemplate[slotIndex] = {
              ...updatedPhoto,
              status: 'in_template',
              template_position: templatePosition
            };
            return newTemplate;
          });
        }
      }

      setIsReprintOpen(false);
      setSelectedPrints([]);
      toast.success('Added selected photos to template');
    } catch (error) {
      console.error('Error adding photos to template:', {
        error: error,
        code: error.code,
        details: error.details,
        message: error.message
      });
      toast.error(`Failed to add photos: ${error.message || 'Unknown error'}`);
    }
  };

  const calculatePrintTime = (numberOfPhotos) => {
    const timePerPhoto = 30;
    const totalSeconds = numberOfPhotos * timePerPhoto;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const handleMultiplePrints = async (photo, count) => {
    if (!photo || count < 1) {
      throw new Error('Invalid photo or count');
    }

    if (!selectedEventId) {
      console.error('No event ID available');
      toast.error('No event selected');
      return null;
    }

    try {
      console.log('Starting multiple prints:', {
        originalPhoto: photo.id,
        count,
        eventId: selectedEventId
      });

      // Create new template array from current state
      const newTemplate = [...template];
      let added = 0;
      
      // Fill empty slots with copies
      for (let i = 0; i < 9 && added < count; i++) {
        if (newTemplate[i] === null) {
          console.log('Creating copy for slot:', i + 1);

          // Create a new photo entry in the database
          const { data: newPhoto, error: insertError } = await supabase
            .from('photos')
            .insert({
              event_id: selectedEventId,
              url: photo.url,
              status: 'in_template',
              template_position: i + 1,
              original_photo_id: photo.id,
              user_id: photo.user_id || user.id,
              frame_overlay: photo.frame_overlay,
              created_at: new Date().toISOString(),
              print_status: 'pending',
              storage_status: 'uploaded',
              source: photo.source || 'reprint'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating new photo copy:', {
              error: insertError,
              code: insertError.code,
              details: insertError.details,
              message: insertError.message,
              originalPhoto: photo.id,
              position: i + 1
            });
            throw insertError;
          }

          console.log('Successfully created photo copy:', newPhoto);

          // Then update UI with the new photo
          newTemplate[i] = newPhoto;
          added++;
        }
      }
      
      // Update template state
      setTemplate(newTemplate);
      
      // Show success message
      if (added === count) {
        toast.success(`Added ${added} copies to template`);
      } else {
        toast.warning(`Added ${added} of ${count} copies. Template is full.`);
      }
      
      return newTemplate;
    } catch (error) {
      console.error('Error adding multiple prints:', {
        error: error,
        code: error.code,
        details: error.details,
        message: error.message,
        originalPhoto: photo.id
      });
      toast.error(`Failed to add prints: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  // Function to open print popup
  const openPrintPopup = (photo) => {
    setSelectedPhoto(photo);  // Make sure we set the selected photo first
    setPrintCount(1);  // Reset count
    
    const popup = window.open('', '_blank', 'width=400,height=300');
    if (!popup) {
      toast.error('Please allow popups for this site');
      return;
    }
    
    setPopupWindow(popup);
    
    popup.document.write(`
      <html>
        <head>
          <title>Multiple Prints</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .button { 
              margin: 5px; 
              padding: 10px 20px; 
              background-color: #007bff; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
            }
            .count {
              font-size: 24px;
              margin: 0 15px;
            }
            .button:disabled { 
              background-color: #ccc; 
            }
            .button-group {
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h3>Multiple Prints</h3>
          <div class="button-group">
            <button class="button" onclick="window.opener.decrementPrintCount()">-</button>
            <span class="count" id="printCount">1</span>
            <button class="button" onclick="window.opener.incrementPrintCount()">+</button>
          </div>
          <div>
            <button class="button" onclick="window.opener.addToTemplate()">Add to Template</button>
            <button class="button" style="background-color: #6c757d;" onclick="window.close()">Cancel</button>
          </div>
        </body>
      </html>
    `);
    popup.document.close();  // Important: close the document after writing
  };

  useEffect(() => {
    window.incrementPrintCount = () => {
      setPrintCount(prev => {
        const emptySlots = template.filter(slot => slot === null).length;
        const newCount = Math.min(prev + 1, emptySlots);
        
        if (popupWindow && !popupWindow.closed) {
          const countElement = popupWindow.document.getElementById('printCount');
          if (countElement) {
            countElement.textContent = String(newCount);
          }
        }
        
        return newCount;
      });
    };

    window.decrementPrintCount = () => {
      setPrintCount(prev => {
        const newCount = Math.max(1, prev - 1);
        
        if (popupWindow && !popupWindow.closed) {
          const countElement = popupWindow.document.getElementById('printCount');
          if (countElement) {
            countElement.textContent = String(newCount);
          }
        }
        
        return newCount;
      });
    };

    window.addToTemplate = async () => {
      console.log('addToTemplate called', { selectedPhoto, printCount });
      
      if (!selectedPhoto) {
        console.error('No photo selected');
        return;
      }

      try {
        await handleMultiplePrints(selectedPhoto, printCount);
        
        // Close window after successful addition
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }
      } catch (error) {
        console.error('Error in addToTemplate:', error);
      }
    };

    // Cleanup
    return () => {
      delete window.incrementPrintCount;
      delete window.decrementPrintCount;
      delete window.addToTemplate;
    };
  }, [selectedPhoto, printCount, template, popupWindow, handleMultiplePrints]);

  useEffect(() => {
    console.log('Component mounted');
    console.log('Loading state:', loading);
    console.log('Error state:', error);
  }, []);

  useEffect(() => {
    async function debugTemplate() {
      console.log('🔍 Debugging Template Grid');
      
      try {
        // Test photo retrieval
        const { data, error } = await supabase
          .from('photos')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'in_template')
          .order('template_position', { ascending: true });

        console.log('📸 Template Photos:', {
          photosFound: data?.length || 0,
          photos: data,
          error: error
        });

        // Log current template state
        console.log('🎯 Current Template State:', {
          templateLength: template.length,
          hasPhotos: template.some(photo => photo !== null),
          template: template
        });
      } catch (error) {
        console.error('🚨 Debug Error:', error);
      }
    }

    debugTemplate();
  }, [template]);

  useEffect(() => {
    async function loadPrinters() {
      try {
        console.log('Starting printer load process...');
        const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        console.log('User settings loaded:', settings);

        if (!settings.printnode_api_key) {
          console.error('No PrintNode API key found in settings');
          toast.error('Please set up your PrintNode API key in Account Settings first');
          return;
        }

        console.log('Fetching printers from PrintNode...');
        const printers = await printerService.getPrinters();
        console.log('Printers response:', printers);
        
        if (Array.isArray(printers) && printers.length > 0) {
          console.log('Found printers:', printers);
          setAvailablePrinters(printers);
          
          // Only set the selected printer if none is currently selected
          if (!selectedPrinter) {
            // If there's a default printer in settings, use that
            if (settings.printnode_printer_id) {
              const savedPrinter = printers.find(p => p.id === settings.printnode_printer_id);
              if (savedPrinter) {
                console.log('Using saved printer:', savedPrinter);
                setSelectedPrinter(savedPrinter.id);
              } else {
                // If saved printer not found, use first available
                console.log('Saved printer not found, using first available:', printers[0]);
                setSelectedPrinter(printers[0].id);
                // Update saved printer
                localStorage.setItem('userSettings', JSON.stringify({
                  ...settings,
                  printnode_printer_id: printers[0].id
                }));
              }
            } else {
              // No saved printer, use first available
              console.log('Using first available printer:', printers[0]);
              setSelectedPrinter(printers[0].id);
              localStorage.setItem('userSettings', JSON.stringify({
                ...settings,
                printnode_printer_id: printers[0].id
              }));
            }
          }
        } else {
          console.error('No printers found in response:', printers);
          toast.error('No printers found. Please check your PrintNode setup.');
          setAvailablePrinters([]);
        }
      } catch (error) {
        console.error('Printer loading error:', error);
        toast.error('Failed to load printers. Please check your PrintNode settings.');
        setAvailablePrinters([]);
      }
    }

    // Load printers immediately and then every 30 seconds
    loadPrinters();
    const interval = setInterval(loadPrinters, 30000);
    
    return () => clearInterval(interval);
  }, [selectedPrinter]); // Add selectedPrinter to dependencies

  // Add effect to save printer selection
  useEffect(() => {
    if (selectedPrinter) {
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      localStorage.setItem('userSettings', JSON.stringify({
        ...settings,
        printnode_printer_id: selectedPrinter
      }));
      console.log('Saved printer selection:', selectedPrinter);
    }
  }, [selectedPrinter]);

  // Add debug logging for printer state changes
  useEffect(() => {
    console.log('Printer state updated:', {
      selectedPrinter,
      availablePrinters: availablePrinters.map(p => ({
        id: p.id,
        name: p.name
      })),
      autoPrint
    });
  }, [selectedPrinter, availablePrinters, autoPrint]);

  useEffect(() => {
    // Skip if any required state is not ready
    if (!template || !autoPrint || !loadedImages) {
      console.log('Auto-print check skipped - missing required state:', {
        hasTemplate: !!template,
        autoPrint,
        hasLoadedImages: !!loadedImages
      });
      return;
    }

    // Skip if already printing
    if (isPrinting || printStatus === 'printing') {
      console.log('Auto-print check skipped - print in progress');
      return;
    }

    const nonEmptyPhotos = template.filter(photo => photo !== null);
    const allPhotosLoaded = nonEmptyPhotos.every(photo => loadedImages.has(photo.id));
    const templateIsFull = nonEmptyPhotos.length === 9;
    
    console.log('Auto-print conditions:', {
      autoPrint,
      templateIsFull,
      allPhotosLoaded,
      loadedPhotosCount: loadedImages.size,
      totalPhotos: nonEmptyPhotos.length,
      printStatus,
      isPrinting
    });
    
    // Only trigger print if all conditions are met
    if (autoPrint && templateIsFull && allPhotosLoaded && printStatus === 'idle' && !isPrinting) {
      console.log('🖨️ Auto-print triggered! Starting print process...');
      
      // Add a small delay to ensure all images are properly loaded
      setTimeout(() => {
        handlePrint().catch(error => {
          console.error('Auto-print error:', error);
          setIsPrinting(false);
          setPrintStatus('idle');
        });
      }, 1000);
    }
  }, [template, autoPrint, loadedImages, printStatus, isPrinting, handlePrint]);

  // Add effect to save autoPrint preference
  useEffect(() => {
    localStorage.setItem('autoPrint', JSON.stringify(autoPrint));
  }, [autoPrint]);

  // Handle delete photo
  const handleDeletePhoto = async (photo, index) => {
    if (!window.confirm('Are you sure you want to remove this photo?')) {
      return;
    }

    try {
      // Update UI first
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = null;
        return newTemplate;
      });

      // Update in database
      const { error: updateError } = await supabase
        .from('photos')
        .update({
          status: 'deleted',
          template_position: null,
          deleted_at: new Date().toISOString()
        })
        .eq('id', photo.id)
        .eq('event_id', selectedEventId);

      if (updateError) {
        throw updateError;
      }

    } catch (error) {
      console.error('Error deleting photo:', error);
      // Revert UI if there was an error
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = photo;
        return newTemplate;
      });
      toast.error('Failed to remove photo');
    }
  };

  // Add error boundary
  if (error) {
    console.error('Template Error:', error);
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (loading) {
    console.log('Still loading...');
    return <div className="p-4">Loading template...</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
            onClick={() => setError(null)}
          >
            ×
          </span>
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Current Template</h2>
          <p className={styles.subtitle}>3x3 Grid • 2"×2" Photos • 300 DPI</p>
          <div className={styles.estimatedTime}>
            Estimated Print Time: {estimatedTime || 'Calculating...'}
          </div>
        </div>
        <div className={styles.controls}>
          <button
            onClick={cleanupTemplateState}
            className={styles.secondaryButton}
          >
            Reset Template
          </button>
          <div className={styles.printerControls}>
            <select
              value={selectedPrinter || ''}
              onChange={(e) => {
                const newPrinterId = e.target.value;
                console.log('Printer selected:', newPrinterId);
                setSelectedPrinter(newPrinterId);
              }}
              className={styles.printerSelect}
            >
              <option value="">Select Printer</option>
              {availablePrinters.map(printer => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </div>
          <label className={styles.autoPrintLabel}>
            <input 
              type="checkbox" 
              checked={autoPrint} 
              onChange={(e) => setAutoPrint(e.target.checked)}
              className={styles.checkbox}
            />
            Auto-Print {autoPrint && <span style={{ color: 'green', marginLeft: '4px' }}>●</span>}
          </label>
          <button 
            className={isPrinting ? styles.secondaryButton : styles.primaryButton}
            onClick={handlePrint}
            disabled={isPrinting || !selectedPrinter}
          >
            {isPrinting ? 'Printing...' : 'Print Template'}
          </button>
        </div>
      </div>

      <div className={styles.urlInput}>
        <label className={styles.urlLabel}>
          Website URL
        </label>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className={styles.urlField}
        />
      </div>

      <div className={styles.templateGrid}>
        <div className={styles.gridContainer}>
          <div 
            className="print-template"
            style={{
              width: '8.151in',
              height: '8.151in',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 2.717in)',
              gap: '0px',
              transform: 'scale(0.85)',
              transformOrigin: 'center',
              position: 'relative'
            }}
          >
            {template.map((photo, index) => (
              <div 
                key={index} 
                className={`print-cell ${photo ? styles.cellWithPhoto : styles.cell}`}
                style={{
                  width: '2.717in',
                  height: '2.717in',
                  position: 'relative'
                }}
              >
                {photo ? (
                  <>
                    <div className={styles.photoContainer}>
                      <img 
                        src={photo.url} 
                        alt={`Photo ${index + 1}`}
                        className="print-image"
                        style={{
                          width: '2in',
                          height: '2in',
                          position: 'absolute',
                          top: '0.3585in',
                          left: '0.3585in',
                          objectFit: 'cover',
                          opacity: loadedImages.has(photo.id) ? 1 : 0.5
                        }}
                        onLoad={() => handleImageLoad(photo.id)}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/200';
                          handleImageLoad(photo.id);
                        }}
                      />
                      <div className={styles.cellControls}>
                        <button
                          onClick={() => handleDeletePhoto(photo, index)}
                          className={styles.dangerButton}
                        >
                          ×
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setPrintCount(1);
                            openPrintPopup(photo);
                          }}
                          className={styles.primaryButton}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div 
                      className="screen-url"
                      style={{
                        position: 'absolute',
                        width: '2in',
                        textAlign: 'center',
                        top: 'calc(0.3585in + 2.05in)',
                        left: '0.3585in',
                        fontSize: '8pt',
                        color: 'black',
                        transform: 'rotate(180deg)'
                      }}
                    >
                      {websiteUrl}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptySlot}>
                    Empty Slot {index + 1}
                  </div>
                )}
              </div>
            ))}
            
            {template.map((photo, index) => photo && (
              <div
                key={`print-url-${index}`}
                className="print-only-url"
                style={{
                  position: 'absolute',
                  width: '2in',
                  textAlign: 'center',
                  top: `${Math.floor(index / 3) * 2.717 + 2.3585}in`,
                  left: `${(index % 3) * 2.717 + 0.3585}in`,
                  fontSize: '8pt',
                  color: 'black',
                  transform: 'rotate(180deg)',
                  display: 'none'
                }}
              >
                {websiteUrl}
              </div>
            ))}
          </div>
          
          {/* Print-only grid */}
          <div 
            className="print-only-grid"
            style={{ display: 'none' }}
          >
            {template.map((photo, index) => (
              <div 
                key={`print-${index}`}
                className="print-cell"
                style={{
                  width: '2.717in',
                  height: '2.717in',
                  position: 'relative',
                  pageBreakInside: 'avoid'
                }}
              >
                {photo && (
                  <>
                    <img 
                      src={photo.url} 
                      alt={`Print Photo ${index + 1}`}
                      style={{
                        width: '2in',
                        height: '2in',
                        position: 'absolute',
                        top: '0.3585in',
                        left: '0.3585in',
                        objectFit: 'cover'
                      }}
                    />
                    <div 
                      style={{
                        position: 'absolute',
                        width: '2in',
                        textAlign: 'center',
                        bottom: '0.15in',
                        left: '0.3585in',
                        fontSize: '8pt',
                        color: 'black',
                        transform: 'rotate(180deg)'
                      }}
                    >
                      {websiteUrl}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isReprintOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Recent Prints</h3>
                <p className={styles.modalSubtitle}>Select photos to add back to the template</p>
              </div>
              <button
                onClick={() => setIsReprintOpen(false)}
                className={styles.closeButton}
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className={styles.reprintGrid}>
              {recentPrints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent prints available
                </div>
              ) : (
                recentPrints.map((photo) => (
                  <div 
                    key={photo.id}
                    className={`${styles.reprintItem} ${selectedPrints.includes(photo.id) ? styles.selected : ''}`}
                    onClick={() => handleReprintSelect(photo)}
                  >
                    <img 
                      src={photo.url}
                      alt="Recent print"
                      className={styles.reprintImage}
                    />
                    {selectedPrints.includes(photo.id) && (
                      <div className={styles.checkmark}>✓</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.footerText}>
                {selectedPrints.length} photo{selectedPrints.length !== 1 ? 's' : ''} selected
              </div>
              <div className={styles.footerButtons}>
                <button
                  onClick={() => setIsReprintOpen(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedToTemplate}
                  className={styles.primaryButton}
                  disabled={selectedPrints.length === 0}
                >
                  Add to Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { 
            size: 8.5in 11in;
            margin: 0;
          }
          
          body * { 
            visibility: hidden;
          }
          
          .print-template,
          .print-template .print-cell,
          .print-template .print-image { 
            visibility: visible !important; 
          }

          .screen-url {
            display: none !important;
          }
          
          .print-only-url {
            display: block !important;
            visibility: visible !important;
          }
          
          nav, header, h1, h2, p, button, .preview-only { 
            display: none !important;
          }
          
          .print-template {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 8.151in !important;
            height: 8.151in !important;
            margin: 0 !important;
            display: grid !important;
            grid-template-columns: repeat(3, 2.717in) !important;
            gap: 0px !important;
            justify-content: center !important;
            align-content: center !important;
            box-sizing: border-box !important;
          }
          
          .print-cell {
            width: 2.717in !important;
            height: 2.717in !important;
            position: relative !important;
            border: none !important;
          }
          
          .print-image {
            width: 2in !important;
            height: 2in !important;
            position: absolute !important;
            top: 0.3585in !important;
            left: 0.3585in !important;
            object-fit: cover !important;
          }
        }
      `}</style>
      <Toaster position="top-right" />
    </div>
  );
}
