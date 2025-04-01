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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printNumberSearch, setPrintNumberSearch] = useState('');
  const [filteredPrints, setFilteredPrints] = useState([]);

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

          const nextNum = await getNextPrintNumber(selectedEventId);
          console.log(`Assigning print number ${nextNum} to photo ${photoToMove.id}`);

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
              template_position: firstEmptySlot + 1,
              print_number: nextNum
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
            template_position: firstEmptySlot + 1,
            print_number: nextNum
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
      if (!selectedEventId) {
        toast.error('Please select an event first');
        return;
      }

      console.log('Loading recent prints...', {
        userId: user?.id,
        eventId: selectedEventId
      });
      
      // Get all photos for this event that have been selected for printing
      const { data: recentPhotos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', selectedEventId)
        .or('status.eq.printed,status.eq.in_template,print_status.eq.printing,print_status.eq.printed')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(350);

      if (error) {
        console.error('Error loading recent prints:', error);
        throw error;
      }

      console.log('Found photos for reprint:', {
        count: recentPhotos?.length,
        photos: recentPhotos?.map(p => ({
          id: p.id,
          print_number: p.print_number,
          status: p.status,
          print_status: p.print_status,
          updated_at: p.updated_at,
          url: p.url
        }))
      });

      if (!recentPhotos || recentPhotos.length === 0) {
        setRecentPrints([]);
        setFilteredPrints([]);
        toast.error('No photos available for reprint');
      } else {
        setRecentPrints(recentPhotos);
        setFilteredPrints(recentPhotos);
      }

      setIsReprintOpen(true);
      
    } catch (error) {
      console.error('Error loading recent prints:', error);
      toast.error('Failed to load photos for reprint');
    }
  };

  // Update filtered prints when search changes
  useEffect(() => {
    if (!printNumberSearch) {
      setFilteredPrints(recentPrints);
      return;
    }

    const searchNum = parseInt(printNumberSearch);
    if (isNaN(searchNum)) {
      setFilteredPrints(recentPrints);
      return;
    }

    const filtered = recentPrints.filter(photo => photo.print_number === searchNum);
    setFilteredPrints(filtered);
  }, [printNumberSearch, recentPrints]);

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

      console.log('Starting print process with photos:', photosToUpdate);

      setIsPrinting(true);
      setPrintStatus('printing');

      // First, verify the photos exist and get their current status
      const { data: currentPhotos, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .in('id', photosToUpdate.map(p => p.id));

      if (fetchError) {
        console.error('Error fetching photos:', fetchError);
        throw fetchError;
      }

      console.log('Current photo status:', currentPhotos);

      // Update print status and assign print number
      const { data: updateData, error: statusError } = await supabase
        .from('photos')
        .update({
          print_status: 'printing',
          status: 'printing',
          updated_at: new Date().toISOString()
        })
        .in('id', photosToUpdate.map(p => p.id))
        .select();

      if (statusError) {
        console.error('Error updating print status:', statusError);
        toast.error('Failed to update photo status');
        setIsPrinting(false);
        setPrintStatus('idle');
        return;
      }

      console.log('Updated photos with print number:', {
        updatedPhotos: updateData
      });

      // Create a canvas with precise measurements
      const canvas = document.createElement('canvas');
      const DPI = 300;
      const PHOTO_SIZE_INCHES = 2; // Reverted back to 2 inches (600px @ 300 DPI)
      const CELL_SIZE_INCHES = 2.803;
      const GRID_SIZE = 3;
      const CELL_GAP = 0.05; // Restored constant
      
      // Calculate sizes in pixels
      const PHOTO_SIZE_PX = PHOTO_SIZE_INCHES * DPI;
      const CELL_SIZE_PX = CELL_SIZE_INCHES * DPI;
      const CELL_GAP_PX = CELL_GAP * DPI; // Use constant
      const TOTAL_WIDTH_PX = (CELL_SIZE_PX * GRID_SIZE) + (CELL_GAP_PX * (GRID_SIZE - 1));
      
      canvas.width = TOTAL_WIDTH_PX;
      canvas.height = TOTAL_WIDTH_PX;
      const ctx = canvas.getContext('2d', { alpha: false });
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      try {
        // Load and draw images using currentPhotos (fetched from DB)
        const loadImagePromises = currentPhotos.map((currentPhoto, index) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              // Calculate position in grid (use the photo's template_position)
              // Subtract 1 because position is 1-based, index is 0-based
              const positionIndex = currentPhoto.template_position ? currentPhoto.template_position - 1 : index; 
              const row = Math.floor(positionIndex / GRID_SIZE);
              const col = positionIndex % GRID_SIZE;
              
              // Calculate exact position for this cell
              const cellX = col * (CELL_SIZE_PX + CELL_GAP_PX);
              const cellY = row * (CELL_SIZE_PX + CELL_GAP_PX);
              
              // Calculate photo position within cell (centered)
              const photoX = cellX + ((CELL_SIZE_PX - PHOTO_SIZE_PX) / 2);
              const photoY = cellY + ((CELL_SIZE_PX - PHOTO_SIZE_PX) / 2);
              
              // Draw photo at exact size
              ctx.drawImage(img, photoX, photoY, PHOTO_SIZE_PX, PHOTO_SIZE_PX);
              
              // --- Add Print Number --- 
              ctx.save();
              ctx.font = `30px Arial`; // Slightly larger PX size
              ctx.fillStyle = 'black';
              // Position rotated text *above* the photo, horizontally centered
              const printNumberX = photoX + PHOTO_SIZE_PX / 2;
              const printNumberY = photoY - 30; // Increased offset again
              // Log the specific photo's number being drawn
              console.log(`🎨 Drawing print# ${currentPhoto.print_number} at X:${printNumberX.toFixed(0)}, Y:${printNumberY.toFixed(0)}`); 
              ctx.translate(printNumberX, printNumberY); // Center X, Y above photo + offset
              ctx.rotate(Math.PI); // Rotate 180 degrees (like URL)
              ctx.textAlign = 'center'; // Set alignment after transform
              ctx.fillText(`#${currentPhoto.print_number || '?'}`, 0, 0); // Use the photo's actual number
              ctx.restore();
              // --- End Print Number --- 

              // Add URL text directly to canvas
              ctx.save();
              ctx.font = `30px Arial`; // Slightly larger PX size
              ctx.fillStyle = 'black';
              ctx.translate(photoX + PHOTO_SIZE_PX / 2, photoY + PHOTO_SIZE_PX + 20); // Increased offset slightly
              ctx.rotate(Math.PI);  // Rotate 180 degrees
              ctx.textAlign = 'center';
              ctx.fillText(websiteUrl, 0, 0);
              ctx.restore();
              
              resolve();
            };
            
            img.onerror = reject;
            img.src = currentPhoto.url; // Use currentPhoto.url
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
        // Calculate the total grid width including gaps (use constant)
        const TOTAL_GRID_WIDTH = (CELL_SIZE_INCHES * GRID_SIZE) + (CELL_GAP * (GRID_SIZE - 1));
        const TOTAL_GRID_HEIGHT = (CELL_SIZE_INCHES * GRID_SIZE) + (CELL_GAP * (GRID_SIZE - 1));
        const X_OFFSET = (PAGE_WIDTH - TOTAL_GRID_WIDTH) / 2;
        const Y_OFFSET = (PAGE_HEIGHT - TOTAL_GRID_HEIGHT) / 2;

        // Convert canvas to JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        // Add complete grid (with URLs) to PDF
        pdf.addImage(imgData, 'JPEG', X_OFFSET, Y_OFFSET, TOTAL_GRID_WIDTH, TOTAL_GRID_HEIGHT);

        // Draw cutting guides directly on PDF
        pdf.setDrawColor(192, 192, 192); // Light grey color (RGB: 192,192,192 = #c0c0c0)
        pdf.setLineWidth(0.01); // Set line width to be visible but not too thick

        // Using a size of 71.2mm (about 2.8 inches) for each cell's cutting guide
        const OCTAGON_SIZE_INCHES = 2.8;
        
        // Draw cutting guides for each cell as octagon shapes
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            // Use constant for PDF positioning
            const centerX = X_OFFSET + (col * (CELL_SIZE_INCHES + CELL_GAP)) + (CELL_SIZE_INCHES / 2); 
            const centerY = Y_OFFSET + (row * (CELL_SIZE_INCHES + CELL_GAP)) + (CELL_SIZE_INCHES / 2);
            
            // Calculate octagon points (30% inset on each side)
            const offset = OCTAGON_SIZE_INCHES * 0.5; // Half the width
            const inset = offset * 0.3; // 30% inset
            
            // Define the 8 points of the octagon
            const points = [
              [centerX - offset + inset, centerY - offset], // top left
              [centerX + offset - inset, centerY - offset], // top right
              [centerX + offset, centerY - offset + inset], // right top
              [centerX + offset, centerY + offset - inset], // right bottom
              [centerX + offset - inset, centerY + offset], // bottom right
              [centerX - offset + inset, centerY + offset], // bottom left
              [centerX - offset, centerY + offset - inset], // left bottom
              [centerX - offset, centerY - offset + inset]  // left top
            ];
            
            // Draw the octagon by connecting the points
            pdf.lines(
              [
                [points[1][0] - points[0][0], points[1][1] - points[0][1]], // top left to top right
                [points[2][0] - points[1][0], points[2][1] - points[1][1]], // top right to right top
                [points[3][0] - points[2][0], points[3][1] - points[2][1]], // right top to right bottom
                [points[4][0] - points[3][0], points[4][1] - points[3][1]], // right bottom to bottom right
                [points[5][0] - points[4][0], points[5][1] - points[4][1]], // bottom right to bottom left
                [points[6][0] - points[5][0], points[6][1] - points[5][1]], // bottom left to left bottom
                [points[7][0] - points[6][0], points[7][1] - points[6][1]], // left bottom to left top
                [points[0][0] - points[7][0], points[0][1] - points[7][1]]  // left top to top left
              ],
              points[0][0], points[0][1]
            );
          }
        }

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
        console.log('Updating photos to printed status:', photosToUpdate.map(p => p.id));
        const { data: finalData, error: finalUpdateError } = await supabase
          .from('photos')
          .update({
            print_status: 'printed',
            status: 'printed',
            updated_at: new Date().toISOString()
          })
          .in('id', photosToUpdate.map(p => p.id))
          .select();

        if (finalUpdateError) {
          console.error('Error updating final print status:', finalUpdateError);
          toast.error('Failed to update print status');
        } else {
          console.log('Final photo status update:', finalData);
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
  }, [template, user?.id, selectedPrinter, websiteUrl, monitorPrintJob, isPrinting, selectedEventId]);

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

          console.log('Adding photo to template:', {
            photoId: photo.id,
            position: templatePosition
          });

          // Update database first
          const { error: updateError } = await supabase
            .from('photos')
            .update({
              status: 'in_template',
              template_position: templatePosition,
              print_status: 'pending'  // Reset print status for reprint
            })
            .eq('id', photo.id);

          if (updateError) {
            console.error('Error updating photo:', updateError);
            throw updateError;
          }

          // Then update UI
          setTemplate(current => {
            const newTemplate = [...current];
            newTemplate[slotIndex] = {
              ...photo,
              status: 'in_template',
              template_position: templatePosition,
              print_status: 'pending'
            };
            return newTemplate;
          });
        }
      }

      setIsReprintOpen(false);
      setSelectedPrints([]);
      toast.success('Added selected photos to template');
    } catch (error) {
      console.error('Error adding photos to template:', error);
      toast.error('Failed to add photos to template');
    }
  };

  const calculatePrintTime = (numberOfPhotos) => {
    const timePerPhoto = 30;
    const totalSeconds = numberOfPhotos * timePerPhoto;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const handleMultiplePrints = async (photos, count) => {
    try {
      console.log(`Starting handleMultiplePrints with ${count} copies of photo:`, photos[0]); 
      
      // Ensure photos is an array and has at least one item
      if (!Array.isArray(photos) || photos.length === 0) {
        throw new Error('Invalid input: photos must be a non-empty array.');
      }
      const originalPhoto = photos[0]; // Get the single photo to duplicate

      // Create an array representing the desired number of copies
      const photosToCreate = Array(count).fill(originalPhoto);

      // Find available slots *before* inserting
      const availableSlots = template.reduce((slots, photo, index) => {
        if (!photo) slots.push(index);
        return slots;
      }, []);

      // Limit count to available slots
      const actualCount = Math.min(count, availableSlots.length);
      if (actualCount === 0) {
        toast.error('No empty slots available in the template.');
        return;
      } 
      if (actualCount < count) {
          toast.info(`Only ${actualCount} slots available. Adding ${actualCount} copies.`);
      }

      const photosToInsert = Array(actualCount).fill(originalPhoto);

      // Create new photo entries in the database for each copy
      const newPhotosData = await Promise.all(
        photosToInsert.map(async (photoToCopy, index) => { // Map over the copies array
           // Determine the template position using the pre-calculated available slots
          const slotIndex = availableSlots[index];
          const templatePosition = slotIndex + 1;
          console.log(`Creating copy #${index + 1} at position ${templatePosition}`);

          const insertPayload = {
            event_id: selectedEventId,
            user_id: user.id, 
            url: photoToCopy.url, 
            status: 'in_template', 
            print_status: 'pending', 
            print_number: null, // SETTING PRINT NUMBER TO NULL
            original_photo_id: photoToCopy.id,
            template_position: templatePosition
          };
          
          console.log(`Payload for copy #${index + 1}:`, JSON.stringify(insertPayload));

          const { data, error } = await supabase
            .from('photos')
            .insert([insertPayload])
            .select()
            .single();

          if (error) {
            console.error(`Error creating photo copy #${index + 1}:`, error);
            throw error;
          }

          console.log(`Created new photo copy #${index + 1}:`, data);
          return data; 
        })
      );

      // Update the local template state immediately
      const updatedTemplate = [...template];
      newPhotosData.forEach((newPhoto) => {
          if (newPhoto.template_position >= 1 && newPhoto.template_position <= updatedTemplate.length) {
              updatedTemplate[newPhoto.template_position - 1] = newPhoto;
          }
      });

      console.log('Updating local template state with new photos:', updatedTemplate);
      setTemplate(updatedTemplate);

    } catch (error) {
      console.error('Error in handleMultiplePrints:', error);
      toast.error('Failed to add photos to template');
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
        // Wrap selectedPhoto in an array and pass printCount
        await handleMultiplePrints([selectedPhoto], printCount); 
        
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

  // Function to get next print number for an event
  const getNextPrintNumber = async (eventId) => {
    try {
      console.log('Getting next print number for event:', eventId);
      
      // Get the highest print number for this event
      const { data, error } = await supabase
        .from('photos')
        .select('print_number')
        .eq('event_id', eventId)
        .not('print_number', 'is', null)
        .order('print_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting next print number:', error);
        throw error;
      }

      console.log('Current highest print number:', data);

      // If no photos have been printed yet, start at 1
      if (!data || data.length === 0) {
        console.log('No print numbers found, starting at 1');
        return 1;
      }

      // Return the next number
      const nextNumber = data[0].print_number + 1;
      console.log('Next print number will be:', nextNumber);
      return nextNumber;
    } catch (error) {
      console.error('Error getting next print number:', error);
      throw error;
    }
  };

  // Add Print Preview Modal
  if (showPrintPreview) {
    return (
      <div className={styles.modal}>
        <div className={styles.modalContent} style={{ backgroundColor: 'white', padding: '2rem' }}>
          <div className={styles.modalHeader}>
            <div>
              <h3 className={styles.modalTitle}>Print Preview</h3>
              <p className={styles.modalSubtitle}>This is how your template will look when printed</p>
            </div>
            <button
              onClick={() => setShowPrintPreview(false)}
              className={styles.closeButton}
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div style={{ 
            transform: 'scale(0.8)',
            transformOrigin: 'top center',
            backgroundColor: 'white',
            padding: '1in',
            width: '8.5in',
            height: '11in',
            margin: '0 auto',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '8.151in',
              height: '8.151in',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 2.717in)',
              gap: '0px'
            }}
            className="preview-only"
            >
              {template.map((photo, index) => (
                <div 
                  key={index}
                  style={{
                    width: '2.717in',
                    height: '2.717in',
                    position: 'relative',
                    border: 'none'
                  }}
                >
                  {photo && (
                    <>
                      <div className={styles.photoContainer}>
                        <div className={styles.printNumberBadge} style={{ 
                          position: 'absolute',
                          width: '2in',
                          textAlign: 'center',
                          fontSize: '8pt',
                          color: 'black',
                          transform: 'rotate(180deg)',
                          left: '0.4015in',
                          top: 'calc(0.4015in - 16pt)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          padding: '0',
                          pointerEvents: 'none'
                        }}>
                          #{photo.print_number || '?'}
                        </div>
                        <img 
                          src={photo.url} 
                          alt={`Photo ${index + 1}`}
                          className="print-image"
                          style={{
                            width: '2in',
                            height: '2in',
                            position: 'absolute',
                            top: '0.4015in',
                            left: '0.4015in',
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
                          top: 'calc(0.4015in + 2.05in)',
                          left: '0.4015in',
                          fontSize: '8pt',
                          color: 'black',
                          transform: 'rotate(180deg)'
                        }}
                      >
                        {websiteUrl}
                      </div>
                      <div 
                        className="cutting-guide-square"
                        style={{
                          position: 'absolute',
                          border: '3px solid #c0c0c0',
                          width: '71.2mm',
                          height: '71.2mm',
                          top: '0',
                          left: '0',
                          pointerEvents: 'none',
                          boxSizing: 'border-box',
                          zIndex: 999,
                          display: 'block',
                          pageBreakInside: 'avoid',
                          backgroundColor: 'transparent',
                          margin: '0',
                          padding: '0',
                          color: '#c0c0c0'
                        }} 
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <div className={styles.footerButtons}>
              <button
                onClick={() => setShowPrintPreview(false)}
                className={styles.secondaryButton}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className={styles.title}>Event Template</h2>
          <p className={styles.subtitle}>3x3 Grid • 2"×2" Photos • 300 DPI</p>
        </div>
        <div className={styles.controls}>
          <button
            onClick={() => setShowPrintPreview(true)}
            className={styles.secondaryButton}
          >
            Preview Print Layout
          </button>
          <button
            onClick={loadRecentPrints}
            className={styles.secondaryButton}
          >
            Reprint Photos
          </button>
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
              width: '8.409in',
              height: '8.409in',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 2.803in)',
              gap: '0.05in',
              transform: 'scale(0.85)',
              transformOrigin: 'center',
              position: 'relative',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f9f9f9'
            }}
          >
            {template.map((photo, index) => (
              <div 
                key={index} 
                className={`print-cell ${photo ? styles.cellWithPhoto : styles.cell}`}
                style={{
                  width: '2.803in',
                  height: '2.803in',
                  position: 'relative',
                  border: '1px solid #e0e0e0',
                  boxSizing: 'border-box',
                  backgroundColor: photo ? 'white' : '#f5f5f9'
                }}
              >
                {photo && (
                  <>
                    <div className={styles.photoContainer}>
                      <div className={styles.printNumberBadge} style={{ 
                        position: 'absolute',
                        width: '2in',
                        textAlign: 'center',
                        fontSize: '8pt',
                        color: 'black',
                        transform: 'rotate(180deg)',
                        left: '0.4015in',
                        top: 'calc(0.4015in - 16pt)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        padding: '0',
                        pointerEvents: 'none'
                      }}>
                        #{photo.print_number || '?'}
                      </div>
                      <img 
                        src={photo.url} 
                        alt={`Photo ${index + 1}`}
                        className="print-image"
                        style={{
                          width: '2in',
                          height: '2in',
                          position: 'absolute',
                          top: '0.4015in',
                          left: '0.4015in',
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
                        top: 'calc(0.4015in + 2.05in)',
                        left: '0.4015in',
                        fontSize: '8pt',
                        color: 'black',
                        transform: 'rotate(180deg)'
                      }}
                    >
                      {websiteUrl}
                    </div>
                    <div 
                      className="cutting-guide-square"
                      style={{
                        position: 'absolute',
                        border: '3px solid #c0c0c0',
                        width: '71.2mm',
                        height: '71.2mm',
                        top: '0',
                        left: '0',
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        zIndex: 999,
                        display: 'block',
                        pageBreakInside: 'avoid',
                        backgroundColor: 'transparent',
                        margin: '0',
                        padding: '0',
                        color: '#c0c0c0'
                      }} 
                    />
                  </>
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
                  top: `${Math.floor(index / 3) * 2.803 + 2.4015}in`,
                  left: `${(index % 3) * 2.803 + 0.4015}in`,
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

            {/* Add search box */}
            <div className={styles.searchBox}>
              <input
                type="number"
                value={printNumberSearch}
                onChange={(e) => setPrintNumberSearch(e.target.value)}
                placeholder="Search by print number..."
                className={styles.searchInput}
              />
            </div>

            <div className={styles.reprintGrid}>
              {filteredPrints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {printNumberSearch ? 'No photos found with that print number' : 'No recent prints available'}
                </div>
              ) : (
                filteredPrints.map((photo) => (
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
                    <div className={styles.printNumber}>#{photo.print_number}</div>
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

      <style jsx global>{`
        @media print {
          @page { 
            size: 8.5in 11in;
            margin: 0;
          }
          
          /* First hide everything */
          body * { 
            visibility: hidden !important;
            display: none !important;
          }

          /* Hide preview elements */
          .preview-only {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Then explicitly show only what we want to print */
          .print-template,
          .print-cell,
          .print-image,
          .cutting-guide-square,
          .printNumberBadge { 
            visibility: visible !important;
            display: block !important;
          }

          .screen-url,
          .print-preview-grid { 
            display: none !important;
          }
          
          /* Template positioning - Reverted to centered layout */
          .print-template {
            position: fixed !important;
            /* Calculate total grid width: (3 cells * cell_width) + (2 gaps * gap_width) */
            width: calc(3 * 2.803in + 2 * 0.05in) !important;
            /* Calculate total grid height */
            height: calc(3 * 2.803in + 2 * 0.05in) !important; 
            /* Center horizontally */
            left: 50% !important;
            /* Center vertically */
            top: 50% !important;
            /* Adjust position using transform */
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            padding: 0 !important; 
            /* Make it a grid container */
            display: grid !important;
            grid-template-columns: repeat(3, 2.803in) !important;
            /* Remove justify-content property */
            /* justify-content: center !important; */
            /* Restore fixed gap between columns */
            gap: 0.05in !important; 
            box-sizing: border-box !important;
            background-color: white !important;
            border: none !important;
          }

          /* Position the cells - Remove absolute positioning */
          .print-cell {
            width: 2.803in !important;
            height: 2.803in !important;
            position: relative !important; /* Use relative positioning */
            /* Remove absolute positioning styles */
            /* top: 0 !important; */
            /* left: 0 !important; */
            /* margin-left: ... !important; */
            /* transform: ... !important; */
            box-sizing: border-box !important;
          }

          /* Position each cell at its center point */
          /* Remove this rule as centering is handled by the grid container */
          /* .print-cell:nth-child(1) { ... } */
          /* .print-cell:nth-child(2) { ... } */
          /* .print-cell:nth-child(3) { ... } */

          /* Image positioning within cells - Reverted to 2in */
          .print-image {
            width: 2in !important; /* Reverted size */
            height: 2in !important; /* Reverted size */
            position: absolute !important;
            /* Center image within the cell */
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            object-fit: cover !important;
          }

          /* Print number badge positioning - Reverted for 2in photo */
          .printNumberBadge {
            /* Positioning relative to the 2in photo */
            position: absolute !important;
            /* Center above the image */
            width: 2in !important; /* Match image width */
            text-align: center !important;
            font-size: 8pt !important;
            color: black !important;
            transform: rotate(180deg) !important;
            left: 50% !important;
            margin-left: -1in !important; /* -(Width/2) */
            top: calc(50% - 1in - 10pt) !important; /* -(Height/2) - offset */
            /* Original styles (adjust as needed) */
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            /* visibility / display are handled above */
            z-index: 100 !important;
          }

          /* Cutting guide - centered within cell */
          .cutting-guide-square {
            border: 3px solid #c0c0c0 !important;
            width: 71.2mm !important; /* Approx 2.803 inches */
            height: 71.2mm !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            box-sizing: border-box !important;
            background-color: transparent !important;
          }

          /* Center the cells themselves */
          /* Remove this rule as centering is handled by the grid container */
          /* .print-cell {
            transform: translateX(-50%) !important;
          } */
        }

        @media screen {
          .preview-only {
            display: block;
          }
        }
      `}</style>
      <Toaster position="top-right" />
    </div>
  );
}
            