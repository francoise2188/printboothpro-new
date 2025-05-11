'use client';

import { useState, useEffect, Fragment, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../../lib/supabase';
import PhotoQueue from './PhotoQueue';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import styles from './TemplateGrid.module.css';
import { jsPDF } from 'jspdf';

export default function TemplateGrid({ selectedEventId, onAutoPrintTrigger, isPrintConnectorReady }) {
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
          .or('status.eq.in_template,status.eq.pending')  // Get both in_template and pending photos
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching photos:', error);
          return;
        }

        // Filter out photos that are already processed
        const unprocessedPhotos = allPhotos?.filter(photo => 
          !processedPhotoIds.has(photo.id)
        ) || [];
        
        // Log all pending photos for debugging
        const pendingPhotos = unprocessedPhotos.filter(p => p.status === 'pending');
        console.log('All pending photos:', pendingPhotos.map(p => ({
          id: p.id,
          created_at: p.created_at,
          event_id: p.event_id,
          status: p.status
        })));

        console.log('Fetched photos:', {
          total: allPhotos?.length,
          pending: pendingPhotos.length,
          inTemplate: unprocessedPhotos.filter(p => p.status === 'in_template').length,
          eventId: selectedEventId
        });

        // Initialize empty template
        const newTemplate = Array(9).fill(null);

        // First, place all in_template photos in their correct positions
        const inTemplatePhotos = unprocessedPhotos.filter(p => p.status === 'in_template');
        
        // Place photos in their positions
        inTemplatePhotos.forEach(photo => {
          if (photo.template_position && photo.template_position <= 9) {
            // Only place the photo if the position is empty
            if (!newTemplate[photo.template_position - 1]) {
              newTemplate[photo.template_position - 1] = photo;
            }
          }
        });

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
  }, [selectedEventId, user?.id, processedPhotoIds]);

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

  const handleImageLoad = (photoId) => {
    console.log(`Image loaded: ${photoId}`);
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(photoId);
      return newSet;
    });
  };

  useEffect(() => {
    // Only reset loadedImages if template is actually empty
    const hasPhotos = template.some(photo => photo !== null);
    if (!hasPhotos) {
      requestAnimationFrame(() => {
        setLoadedImages(new Set());
      });
    }
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

    if (emptySlots.length < selectedPhotos.length) {
      toast.error(`Only ${emptySlots.length} empty slots available. Please remove some photos first.`);
      return;
    }

    const loadingToast = toast.loading('Adding reprints to template...');

    try {
      // Create a new template array to update all at once
      const newTemplate = [...template];
      
      // Add selected photos to empty slots
      for (let i = 0; i < selectedPhotos.length; i++) {
        if (emptySlots[i] !== undefined) {
          const originalPhoto = selectedPhotos[i];
          const slotIndex = emptySlots[i];
          const templatePosition = slotIndex + 1;

          // Check if this photo is already in the template
          const isAlreadyInTemplate = template.some(photo => 
            photo && photo.original_photo_id === originalPhoto.id
          );

          if (isAlreadyInTemplate) {
            console.log('Skipping duplicate reprint:', originalPhoto.id);
            continue;
          }

          console.log('Creating reprint for template:', {
            originalPhotoId: originalPhoto.id,
            printNumber: originalPhoto.print_number,
            position: templatePosition
          });

          // Create a new photo record as a reprint
          const { data: newPhoto, error: insertError } = await supabase
            .from('photos')
            .insert({
              event_id: selectedEventId,
              user_id: user.id,
              url: originalPhoto.url,
              status: 'in_template',
              template_position: templatePosition,
              print_status: 'pending',
              print_number: originalPhoto.print_number,
              original_photo_id: originalPhoto.id,
              created_at: new Date().toISOString(),
              source: 'reprint'
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating reprint:', {
              error: insertError,
              details: {
                event_id: selectedEventId,
                user_id: user.id,
                template_position: templatePosition,
                print_number: originalPhoto.print_number,
                original_photo_id: originalPhoto.id
              }
            });
            throw new Error(`Failed to create reprint: ${insertError.message}`);
          }

          console.log('Successfully created reprint:', {
            newPhotoId: newPhoto.id,
            originalPrintNumber: originalPhoto.print_number,
            position: templatePosition
          });

          // Update the template array
          newTemplate[slotIndex] = newPhoto;
        }
      }

      // Update the template state all at once
      setTemplate(newTemplate);
      
      // Force a re-render of the template
      setLoadedImages(new Set());

      toast.dismiss(loadingToast);
      setIsReprintOpen(false);
      setSelectedPrints([]);
      toast.success('Added reprints to template');
    } catch (error) {
      console.error('Error adding reprints to template:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to add reprints: ' + (error.message || 'Unknown error'));
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
    // This function used to handle PrintNode directly. 
    // Now, printing is triggered via onAutoPrintTrigger which uses the helper.
    // This function might need rethinking. For now, let's just log a warning
    // if it gets called, as it might be linked to UI elements we haven't updated.
    console.warn("handleMultiplePrints function was called, but direct PrintNode printing is removed. Check UI elements calling this.");
    toast.error("Multi-print function needs update for new print helper.");

    /* --- Old PrintNode Logic (to be removed) ---
    setIsPrinting(true);
    setPrintStatus('printing');
    try {
      const printJobs = [];
      for (let i = 0; i < count; i++) {
        for (const photo of photos) {
          const printJob = {
            printerId: selectedPrinter,
            title: `PrintBooth-${photo.event_id}-${photo.id}-${i + 1}`,
            contentType: 'pdf_uri',
            content: photo.pdf_url, // Assuming photo object has pdf_url
            source: 'PrintBooth Web App'
          };
          printJobs.push(printJob);
        }
      }
      console.log('Sending multiple prints:', printJobs);
      const response = await printerService.printMultiple(printJobs);
      console.log('PrintNode multiple print response:', response);
      if (response.success) {
        toast.success(`Sent ${printJobs.length} print jobs successfully.`);
        setPrintStatus('idle');
      } else {
        toast.error(`Failed to send print jobs: ${response.message}`);
        setPrintStatus('error');
      }
    } catch (error) {
      console.error('Error sending multiple prints:', error);
      toast.error(`Error sending print jobs: ${error.message}`);
      setPrintStatus('error');
    } finally {
      setIsPrinting(false);
    }
    */
  };

  // Function to open print popup
  const openPrintPopup = (photo) => {
    // This might have been used for single prints via PrintNode.
    // Now, single prints should also ideally go through the helper.
    // Let's disable this for now or make it trigger the helper.
    console.warn("openPrintPopup called. Currently disabled/needs update for print helper.");
    // Option 1: Disable
    // toast.info("Direct print popup disabled.");
    // Option 2: Trigger helper (if template is ready)
    // if (isPrintConnectorReady) {
    //   console.log("Triggering print via helper from openPrintPopup");
    //   onAutoPrintTrigger(); // Re-use the trigger 
    // } else {
    //   toast.error("Print helper not ready.");
    // }
    
    /* -- Old Logic ---
    setSelectedPhoto(photo);
    setPrintCount(1);
    setShowPrintModal(true);
    */
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

  // Ref to prevent multiple triggers for the same full batch
  const autoPrintTriggeredRef = useRef(false);

  // Modified useEffect for Auto-Print
  useEffect(() => {
    if (!template || !loadedImages || typeof onAutoPrintTrigger !== 'function') {
      return;
    }
    const nonEmptyPhotos = template.filter(photo => photo !== null);
    const templateIsFull = nonEmptyPhotos.length === 9;
    const allImagesLoaded = nonEmptyPhotos.every(photo => loadedImages.has(photo.id));

    if (!templateIsFull || !allImagesLoaded) {
         autoPrintTriggeredRef.current = false;
    }

    if (
      autoPrint &&
      isPrintConnectorReady && 
      templateIsFull &&
      allImagesLoaded &&
      !autoPrintTriggeredRef.current
    ) {
      console.log("Auto-print conditions met! Triggering print via helper after 1s delay...");
      autoPrintTriggeredRef.current = true;
      const timer = setTimeout(async () => {
          console.log("Executing delayed auto-print trigger.");
          try {
            // Get all photos in the template before clearing
            const photosToPrint = template.filter(p => p !== null);
            
            // Update photo status in database first
            const { error: updateError } = await supabase
              .from('photos')
              .update({
                status: 'printed',
                print_status: 'printed'
              })
              .in('id', photosToPrint.map(p => p.id));

            if (updateError) {
              throw updateError;
            }

            // Create a static print template
            const printDiv = document.createElement('div');
            printDiv.className = 'print-template print-only';
            printDiv.innerHTML = `
                <style>
                    @media print {
                        body * { display: none !important; }
                        .print-only { display: block !important; }
                        .print-template { 
                            position: fixed;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            width: 8.409in;
                            height: 8.409in;
                        }
                        .print-cell {
                            position: absolute;
                            width: 2.803in;
                            height: 2.803in;
                            border: 3px solid #c0c0c0;
                        }
                        .print-image {
                            width: 2in;
                            height: 2in;
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            object-fit: cover;
                        }
                        .print-number {
                            position: absolute;
                            width: 2in;
                            text-align: center;
                            font-size: 8pt;
                            color: black;
                            transform: rotate(180deg);
                            left: 50%;
                            margin-left: -1in;
                            top: calc(50% - 1in - 10pt);
                        }
                    }
                </style>
            `;

            // Add cells for each photo
            photosToPrint.forEach((photo) => {
                if (photo) {
                    const row = Math.floor((photo.template_position - 1) / 3);
                    const col = (photo.template_position - 1) % 3;
                    
                    const cell = document.createElement('div');
                    cell.className = 'print-cell print-only';
                    cell.style.cssText = `
                        left: ${col * 2.803}in;
                        top: ${row * 2.803}in;
                    `;

                    const img = document.createElement('img');
                    img.src = photo.url;
                    img.className = 'print-image print-only';

                    const printNumber = document.createElement('div');
                    printNumber.className = 'print-number print-only';
                    printNumber.textContent = `#${photo.print_number || '?'}`;

                    cell.appendChild(img);
                    cell.appendChild(printNumber);
                    printDiv.appendChild(cell);
                }
            });

            // Add print-only class to body
            document.body.classList.add('print-only');
            
            // Add the print div to the document
            document.body.appendChild(printDiv);

            // Trigger the print
            await onAutoPrintTrigger();
            
            // Clean up
            document.body.removeChild(printDiv);
            document.body.classList.remove('print-only');

            // Clear the template and update UI
            setTemplate(Array(9).fill(null));
            setLoadedImages(new Set());
            
            // Add printed photos to processed list
            const printedPhotoIds = photosToPrint.map(p => p.id);
            setProcessedPhotoIds(prev => new Set([...prev, ...printedPhotoIds]));
          } catch (error) {
            console.error("Error during auto-print:", error);
            // Reset the flag even if there's an error
            autoPrintTriggeredRef.current = false;
          }
      }, 1000);
      return () => {
          console.log("Cleaning up auto-print timer (conditions changed or unmount)");
          clearTimeout(timer);
      } 
    }
  }, [template, autoPrint, loadedImages, onAutoPrintTrigger, isPrintConnectorReady]);

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

  const handleAddCopyToTemplate = async (photoToAdd) => {
    if (!selectedEventId || !user) {
      toast.error("Cannot add photo: Event or user not identified.");
      return;
    }

    const emptySlotIndex = template.findIndex(slot => slot === null);

    if (emptySlotIndex === -1) {
      toast.error("Template is full. Cannot add another copy.");
      return;
    }

    try {
      const loadingToastId = toast.loading("Adding copy to template...");
      const nextPrintNum = await getNextPrintNumber(selectedEventId);

      const newPhotoCopy = {
        event_id: selectedEventId,
        user_id: user.id, // Assuming you want to associate with the current admin
        url: photoToAdd.url,
        status: 'in_template', // Or 'pending' if processTemplate strictly handles moving to in_template
        template_position: emptySlotIndex + 1,
        print_number: nextPrintNum,
        original_photo_id: photoToAdd.id, // Link to the original photo
        created_at: new Date().toISOString(),
        source: photoToAdd.source || 'event_booth_admin_copy', // Identify source
        // Copy other relevant fields if necessary, e.g., from photoToAdd
        // Be cautious about copying fields like 'id' or mutable status fields directly
      };

      const { data, error } = await supabase
        .from('photos')
        .insert([newPhotoCopy])
        .select()
        .single();

      if (error) {
        console.error("Error inserting photo copy:", error);
        toast.error(`Failed to add copy: ${error.message}`);
        throw error;
      }

      toast.success("Photo copy added to template!");
      
      // Optionally, to give faster UI feedback, update local template state here
      // This is a bit redundant if processTemplate runs quickly and correctly,
      // but can improve perceived responsiveness.
      // setTemplate(currentTemplate => {
      //   const updatedTemplate = [...currentTemplate];
      //   updatedTemplate[emptySlotIndex] = data; // Use the data returned from insert
      //   return updatedTemplate;
      // });
      // Or, more simply, rely on the processTemplate useEffect to refresh.
      // If processTemplate doesn't run often enough, you might need to trigger it.

      toast.dismiss(loadingToastId);
    } catch (err) {
      toast.dismiss(toast.loading()); // Dismiss any stray loading toasts
      // Error already handled by toast in the try block for DB error
      console.error("Error in handleAddCopyToTemplate:", err);
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
                            opacity: 1,
                            transition: 'none'
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
                            onClick={() => handleAddCopyToTemplate(photo)}
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
          <label className={styles.autoPrintLabel}>
            <input 
              type="checkbox" 
              checked={autoPrint} 
              onChange={(e) => setAutoPrint(e.target.checked)}
              className={styles.checkbox}
            />
            Auto-Print when grid is full {autoPrint && <span style={{ color: 'green', marginLeft: '4px' }}>●</span>}
          </label>
          <button 
            className={styles.primaryButton}
            onClick={async () => {
                console.log("Manual Print button clicked, triggering helper...");
                if (isPrintConnectorReady) {
                    // Check if template has photos before printing
                    const photosToPrint = template.filter(p => p !== null);
                    if (photosToPrint.length > 0) {
                        try {
                            console.log('Photos to print:', photosToPrint.map(p => ({
                                id: p.id,
                                print_number: p.print_number,
                                position: p.template_position
                            })));
                            
                            // Update photo status in database first
                            const { data: updateData, error: updateError } = await supabase
                                .from('photos')
                                .update({
                                    status: 'printed',
                                    print_status: 'printed'
                                })
                                .in('id', photosToPrint.map(p => p.id))
                                .select();

                            if (updateError) {
                                console.error('Database update error:', updateError);
                                throw new Error(`Failed to update photo status: ${updateError.message}`);
                            }

                            // Create a new template array with only the photos to print
                            const printTemplate = Array(9).fill(null);
                            photosToPrint.forEach(photo => {
                                if (photo.template_position) {
                                    printTemplate[photo.template_position - 1] = photo;
                                }
                            });

                            // Create a static print template
                            const printDiv = document.createElement('div');
                            printDiv.className = 'print-template print-only';
                            printDiv.innerHTML = `
                                <style>
                                    @media print {
                                        body * { display: none !important; }
                                        .print-only { display: block !important; }
                                        .print-template { 
                                            position: fixed;
                                            left: 50%;
                                            top: 50%;
                                            transform: translate(-50%, -50%);
                                            width: 8.409in;
                                            height: 8.409in;
                                        }
                                        .print-cell {
                                            position: absolute;
                                            width: 2.803in;
                                            height: 2.803in;
                                            border: 3px solid #c0c0c0;
                                        }
                                        .print-image {
                                            width: 2in;
                                            height: 2in;
                                            position: absolute;
                                            top: 50%;
                                            left: 50%;
                                            transform: translate(-50%, -50%);
                                            object-fit: cover;
                                        }
                                        .print-number {
                                            position: absolute;
                                            width: 2in;
                                            text-align: center;
                                            font-size: 8pt;
                                            color: black;
                                            transform: rotate(180deg);
                                            left: 50%;
                                            margin-left: -1in;
                                            top: calc(50% - 1in - 10pt);
                                        }
                                    }
                                </style>
                            `;

                            // Add cells for each photo
                            photosToPrint.forEach((photo) => {
                                if (photo) {
                                    const row = Math.floor((photo.template_position - 1) / 3);
                                    const col = (photo.template_position - 1) % 3;
                                    
                                    const cell = document.createElement('div');
                                    cell.className = 'print-cell print-only';
                                    cell.style.cssText = `
                                        left: ${col * 2.803}in;
                                        top: ${row * 2.803}in;
                                    `;

                                    const img = document.createElement('img');
                                    img.src = photo.url;
                                    img.className = 'print-image print-only';

                                    const printNumber = document.createElement('div');
                                    printNumber.className = 'print-number print-only';
                                    printNumber.textContent = `#${photo.print_number || '?'}`;

                                    cell.appendChild(img);
                                    cell.appendChild(printNumber);
                                    printDiv.appendChild(cell);
                                }
                            });

                            // Add print-only class to body
                            document.body.classList.add('print-only');
                            
                            // Add the print div to the document
                            document.body.appendChild(printDiv);

                            // Trigger the print
                            await onAutoPrintTrigger();
                            
                            // Clean up
                            document.body.removeChild(printDiv);
                            document.body.classList.remove('print-only');

                            // Clear the template and update UI
                            setTemplate(Array(9).fill(null));
                            setLoadedImages(new Set());
                            
                            // Add printed photos to processed list
                            const printedPhotoIds = photosToPrint.map(p => p.id);
                            setProcessedPhotoIds(prev => new Set([...prev, ...printedPhotoIds]));
                            
                            toast.success('Template printed successfully');
                        } catch (error) {
                            console.error("Error during manual print:", {
                                message: error.message,
                                stack: error.stack,
                                error: error
                            });
                            toast.error(`Failed to print template: ${error.message || 'Unknown error'}`);
                        }
                    } else {
                        toast.error("Template is empty. Add photos before printing.");
                    }
                } else {
                    toast.error("Print helper connection not ready. Cannot print manually.");
                    console.error("Manual print failed: Print connector not ready.");
                }
            }}
            disabled={!isPrintConnectorReady || !template.some(p => p !== null)} 
          >
            Print Template Now
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
        <div 
           id="template-preview-area"
           className={styles.gridContainer}
        >
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
                          opacity: 1,
                          transition: 'none'
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
                          onClick={() => handleAddCopyToTemplate(photo)}
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
          
          body * { 
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .print-template {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 8.409in !important;
            height: 8.409in !important;
          }

          .print-cell {
            position: absolute !important;
            width: 2.803in !important;
            height: 2.803in !important;
            border: 3px solid #c0c0c0 !important;
          }

          .print-image {
            width: 2in !important;
            height: 2in !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            object-fit: cover !important;
          }

          .print-number {
            position: absolute !important;
            width: 2in !important;
            text-align: center !important;
            font-size: 8pt !important;
            color: black !important;
            transform: rotate(180deg) !important;
            left: 50% !important;
            margin-left: -1in !important;
            top: calc(50% - 1in - 10pt) !important;
          }
        }
      `}</style>
      <Toaster position="top-right" />
    </div>
  );
}
            
            