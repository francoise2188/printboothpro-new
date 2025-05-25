import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import styles from '../admin/markets/template/template.module.css';
import { QRCodeSVG } from 'qrcode.react';

// Simple Modal Component (can be styled further)
const Modal = ({ children, onClose }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: 'white', padding: '20px', borderRadius: '5px', maxHeight: '80vh', overflowY: 'auto', minWidth: '300px', maxWidth: '90vw' }}>
      <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
      {children}
    </div>
  </div>
);

export default function MarketTemplate({ marketId }) {
  console.log('--- MarketTemplate FUNCTION BODY ENTERED --- Top of component. marketId prop:', marketId); // NEW TOPMOST LOG
  console.log('🎯 MarketTemplate Component - Received marketId:', marketId);
  const [template, setTemplate] = useState(Array(9).fill(null));
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [processedPhotoIds, setProcessedPhotoIds] = useState(() => {
    const saved = localStorage.getItem(`processed_photos_${marketId}`);
    console.log(`[useState processedPhotoIds] Initializing. marketId: ${marketId}. Found in localStorage: ${!!saved}`); // New log for this part
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [crops, setCrops] = useState({});
  const [editedPhotos, setEditedPhotos] = useState({});
  const fileInputRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [showReprintModal, setShowReprintModal] = useState(false);
  const [reprintPhotos, setReprintPhotos] = useState([]);
  const [isLoadingReprint, setIsLoadingReprint] = useState(false);
  const [lastPrintedBatchIds, setLastPrintedBatchIds] = useState([]);

  // New state for order-by-order processing
  const [currentOrderCode, setCurrentOrderCode] = useState(null);
  const [currentOrderPhotos, setCurrentOrderPhotos] = useState([]);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [photoStates, setPhotoStates] = useState({});
  const [initialOrderLoaded, setInitialOrderLoaded] = useState(false);
  const [lastSuccessfulLoadTimestamp, setLastSuccessfulLoadTimestamp] = useState(null); // New state for polling

  // New state for editing protection
  const [isEditing, setIsEditing] = useState(false);

  // Add useEffect to fetch overlay URL
  useEffect(() => {
    async function fetchOverlay() {
      if (!marketId) return;
      
      try {
        console.log('Fetching overlay for market:', marketId);
        const { data, error } = await supabase
          .from('market_camera_settings')
          .select('border_url')
          .eq('market_id', marketId)
          .single();

        if (error) {
          console.error('Error fetching overlay:', error);
          return;
        }

        if (data?.border_url) {
          console.log('Found overlay URL:', data.border_url);
          setOverlayUrl(data.border_url);
        } else {
          console.log('No overlay URL found for market:', marketId);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchOverlay();
  }, [marketId]);

  // Moved function definitions up
  const synchronizeState = async () => {
    console.log('=== SYNCHRONIZING STATE ===');
    try {
      const { data: marketPhotos, error } = await supabase
        .from('market_photos')
        .select('id, status')
        .eq('market_id', marketId);

      if (error) throw error;

      // Update processedPhotoIds based on actual database state
      const deletedPhotoIds = new Set(
        marketPhotos
          .filter(p => p.status === 'deleted' || p.status === 'printed')
          .map(p => p.id)
      );

      setProcessedPhotoIds(deletedPhotoIds);
      console.log('State synchronized:', {
        totalPhotos: marketPhotos.length,
        deletedPhotos: deletedPhotoIds.size
      });
    } catch (error) {
      console.error('Error synchronizing state:', error);
    }
  };

  const loadNextOrder = async () => {
    // Don't load if we're editing
    if (isEditing) {
      console.log('User is editing, skipping loadNextOrder');
      return;
    }

    console.log('=== LOAD NEXT ORDER START ===');
    
    // Synchronize state before loading next order
    await synchronizeState();
    
    console.log('Current state:', {
      marketId,
      isLoadingOrder,
      processedPhotoIds: Array.from(processedPhotoIds),
      currentOrderCode,
      template: template.map(t => t?.id || null)
    });

    if (!marketId) {
      console.log('No marketId provided, clearing template');
      setTemplate(Array(9).fill(null));
      setCurrentOrderCode(null);
      setCurrentOrderPhotos([]);
      setIsLoadingOrder(false);
      setInitialOrderLoaded(true);
      setLastSuccessfulLoadTimestamp(Date.now());
      return;
    }

    // Don't proceed if we're still editing
    if (isEditing) {
      console.log('User started editing during load, aborting');
      return;
    }

    // Only reset template if we're actually loading a new order
    const hasActivePhotos = template.some(photo => photo !== null);
    if (hasActivePhotos) {
      console.log('Template has active photos, skipping reset');
      return;
    }

    console.log('Setting loading state to true');
    setIsLoadingOrder(true);
    setTemplate(Array(9).fill(null));

    try {
      // First, let's verify what photos exist for this market
      console.log('Verifying market photos...');
      const { data: marketPhotos, error: marketError } = await supabase
        .from('market_photos')
        .select('id, status, order_code')
        .eq('market_id', marketId);

      if (marketError) {
        console.error('Error fetching market photos:', marketError);
        throw marketError;
      }

      console.log('All photos in market:', {
        total: marketPhotos?.length,
        byStatus: marketPhotos?.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {}),
        byOrder: marketPhotos?.reduce((acc, p) => {
          acc[p.order_code] = (acc[p.order_code] || 0) + 1;
          return acc;
        }, {})
      });

      // Now find pending orders
      console.log('Fetching pending orders for market:', marketId);
      const { data: pendingOrderCodes, error: orderCodeError } = await supabase
        .from('market_photos')
        .select('order_code, created_at')
        .eq('market_id', marketId)
        .eq('status', 'in_template')
        .order('created_at', { ascending: true });

      if (orderCodeError) {
        console.error('Error fetching pending orders:', orderCodeError);
        throw orderCodeError;
      }

      console.log('Found pending orders:', pendingOrderCodes);

      let nextOrderCode = null;
      if (pendingOrderCodes && pendingOrderCodes.length > 0) {
        for (const potentialOrder of pendingOrderCodes) {
          console.log('Checking order:', potentialOrder.order_code);
          
          // Get all photos for this order
          const { data: photosInOrder, error: photosInOrderError } = await supabase
            .from('market_photos')
            .select('id, status')
            .eq('market_id', marketId)
            .eq('order_code', potentialOrder.order_code);

          if (photosInOrderError) {
            console.error('Error fetching photos for order:', potentialOrder.order_code, photosInOrderError);
            continue;
          }

          console.log('Photos in order:', {
            orderCode: potentialOrder.order_code,
            totalPhotos: photosInOrder?.length,
            statuses: photosInOrder?.map(p => p.status),
            processedIds: Array.from(processedPhotoIds)
          });

          // Check if any photos in this order are still in_template and not processed
          const hasActivePhotos = photosInOrder?.some(p => 
            p.status === 'in_template' && !processedPhotoIds.has(p.id)
          );

          if (hasActivePhotos) {
            nextOrderCode = potentialOrder.order_code;
            console.log('Found valid next order:', nextOrderCode);
            break;
          } else {
            console.log('Order fully processed, skipping:', potentialOrder.order_code);
          }
        }
      }

      if (nextOrderCode) {
        console.log('Loading photos for order:', nextOrderCode);
        const { data: photos, error: photosError } = await supabase
          .from('market_photos')
          .select('*')
          .eq('market_id', marketId)
          .eq('order_code', nextOrderCode)
          .order('created_at', { ascending: true });

        if (photosError) {
          console.error('Error fetching photos:', photosError);
          throw photosError;
        }

        console.log('Fetched photos:', {
          total: photos?.length,
          photos: photos?.map(p => ({ id: p.id, status: p.status }))
        });

        // Filter out processed, deleted, and printed photos
        const activePhotosInOrder = photos.filter(p => 
          !processedPhotoIds.has(p.id) && 
          p.status !== 'deleted' && 
          p.status !== 'printed'
        );

        console.log('Active photos after filtering:', {
          total: activePhotosInOrder.length,
          photos: activePhotosInOrder.map(p => ({ id: p.id, status: p.status }))
        });

        setCurrentOrderCode(nextOrderCode);
        setCurrentOrderPhotos(activePhotosInOrder);

        const templatePhotos = activePhotosInOrder.slice(0, 9).map(photo => ({
          ...photo,
          scale: 1,
          crop: { x: 0, y: 0 },
          zoom: 1,
        }));

        const newTemplate = Array(9).fill(null);
        templatePhotos.forEach((photo, i) => {
          newTemplate[i] = photo;
        });

        console.log('Setting new template:', {
          totalSlots: newTemplate.length,
          filledSlots: newTemplate.filter(t => t !== null).length
        });

        setTemplate(newTemplate);
        setCrops({});
        setEditedPhotos({});

      } else {
        console.log('No new pending orders found');
        setCurrentOrderCode(null);
        setCurrentOrderPhotos([]);
        setTemplate(Array(9).fill(null));
        toast.success('All orders processed for this market!');
      }
    } catch (error) {
      console.error('Error in loadNextOrder:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Failed to load next order: ' + (error.message || 'Unknown error'));
      setTemplate(Array(9).fill(null));
      setCurrentOrderCode(null);
      setCurrentOrderPhotos([]);
      setIsLoadingOrder(false);
      setInitialOrderLoaded(true);
    } finally {
      console.log('=== LOAD NEXT ORDER END ===');
      setIsLoadingOrder(false);
      if (!initialOrderLoaded) {
        setInitialOrderLoaded(true);
      }
      setLastSuccessfulLoadTimestamp(Date.now());
    }
  };

  // Polling for new orders
  useEffect(() => {
    if (!marketId) return;

    // Check if template has any photos
    const hasPhotos = template.some(photo => photo !== null);
    if (hasPhotos) {
      console.log('Template has photos, polling paused');
      return;
    }

    const pollInterval = setInterval(() => {
      pollForNewOrders();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [marketId, template]); // Add template to dependencies to re-run when it changes

  const pollForNewOrders = async () => {
    // Don't poll if we're editing or loading
    if (!marketId || isLoadingOrder || isEditing) {
      console.log('Skipping poll - editing or loading:', { isEditing, isLoadingOrder });
      return;
    }

    // Double check template is empty before polling
    const hasPhotos = template.some(photo => photo !== null);
    if (hasPhotos) {
      console.log('Template has photos, skipping poll');
      return;
    }

    try {
      console.log('Checking for new orders...');
      
      // First verify we have a valid marketId
      if (!marketId) {
        console.log('No marketId available, skipping poll');
        return;
      }

      // Make the query more specific and add error handling
      const { data, error, count } = await supabase
        .from('market_photos')
        .select('id, created_at', { count: 'exact' })
        .eq('market_id', marketId)
        .eq('status', 'in_template')
        .limit(1);

      if (error) {
        console.error('[Polling] Database error:', error.message);
        return;
      }

      // Check if we got valid data
      if (!data) {
        console.log('[Polling] No data returned from query');
        return;
      }

      if (count && count > 0) {
        console.log('New order found, loading...');
        await loadNextOrder();
      } else {
        console.log('No new orders found');
      }
    } catch (error) {
      // More detailed error logging
      console.error('[Polling] Exception during poll:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
    }
  };

  // Initialize photo states when currentOrderPhotos changes (or template for display)
  useEffect(() => {
    const newPhotoStates = {};
    template.forEach(photo => {
      if (photo) {
        newPhotoStates[photo.id] = {
          zoom: photo.scale || 1,
          isEdited: !!editedPhotos[photo.id], // Keep existing edit state
          crop: crops[photo.id] || { x: 0, y: 0 } // Keep existing crop state
        };
      }
    });
    setPhotoStates(newPhotoStates);
  }, [template, crops, editedPhotos]);

  useEffect(() => {
    localStorage.setItem(
      `processed_photos_${marketId}`,
      JSON.stringify(Array.from(processedPhotoIds))
    );
  }, [processedPhotoIds, marketId]);

  // Load initial order when marketId changes
  useEffect(() => {
    console.log('[Effect marketId] Hook evaluated. marketId:', marketId);
    if (marketId) {
      console.log('[Effect marketId] marketId is present. Preparing to call loadNextOrder. Current initialOrderLoaded:', initialOrderLoaded);
      setInitialOrderLoaded(false); // Reset before loading new market
      setProcessedPhotoIds(new Set()); // Clear processedPhotoIds when market is selected
      if (!isEditing) {
        console.log('[Effect marketId] About to call loadNextOrder().');
        loadNextOrder();
        console.log('[Effect marketId] Called loadNextOrder().');
      } else {
        console.log('[Effect marketId] User is editing, skipping loadNextOrder.');
      }
    } else {
      console.log('[Effect marketId] marketId is null or undefined. Clearing order and setting initialOrderLoaded to false.');
      setTemplate(Array(9).fill(null));
      setCurrentOrderCode(null);
      setCurrentOrderPhotos([]);
      setInitialOrderLoaded(false); // Ensure it's false if no marketId
    }
    // Realtime subscription setup will be in its own useEffect
  }, [marketId]); // Keep loadNextOrder dependency on marketId for initial load

  // Cleanup effect (remains similar, might not need to clear template here if loadNextOrder handles it)
  useEffect(() => {
    return () => {
      setTemplate(Array(9).fill(null)); // Clear visual template on unmount
      console.log('[MarketTemplate Unmount] Component unmounting. Cleared template.');
      // Don't clear localStorage on unmount
    };
  }, []);

  const templateStyle = {
    width: '211.0354mm',
    height: '211.0354mm',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 69.0118mm)',
    gap: '2mm',
    backgroundColor: '#fff',
    padding: '0',
    margin: '0 auto'
  };

  const cellStyle = {
    width: '69.0118mm',
    height: '69.0118mm',
    position: 'relative',
    border: '1px dashed #aaaaaa',
    boxSizing: 'border-box',
    backgroundColor: '#f8f9fa',
    overflow: 'visible'
  };

  const orderCodeStyle = {
    position: 'absolute',
    left: '2mm',
    top: '2mm',
    fontSize: '8px',
    color: '#666',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: '2px 4px',
    borderRadius: '2px'
  };

  const photoStyle = {
    width: '50.8mm',
    height: '50.8mm',
    position: 'absolute',
    top: '9.1mm',
    left: '9.1mm',
    objectFit: 'cover'
  };

  const photoContainerStyle = {
    width: '50.8mm',
    height: '50.8mm',
    position: 'absolute',
    top: '9.1mm',
    left: '9.1mm',
    backgroundColor: '#f8f9fa',
    borderRadius: '2px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const cuttingGuideStyle = {
    position: 'absolute',
    pointerEvents: 'none',
    border: '1px dashed #aaaaaa',
    width: '50.8mm',
    height: '50.8mm',
    top: '9.1mm',
    left: '9.1mm',
    zIndex: 10
  };

  const cellControlsStyle = {
    position: 'absolute',
    top: '5px',
    left: '5px',
    right: '5px',
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 20
  };

  const handleDeletePhoto = async (photo, index) => {
    console.log('=== DELETE PHOTO START ===');
    console.log('Deleting photo:', {
      id: photo.id,
      orderCode: photo.order_code,
      index,
      currentTemplate: template.map(t => t?.id || null)
    });

    // Prevent multiple deletions of the same photo
    if (processedPhotoIds.has(photo.id)) {
      console.log('Photo already processed, skipping deletion');
      return;
    }

    const originalPhoto = template[index];
    let retryCount = 0;
    const maxRetries = 3;

    const updatePhotoStatus = async () => {
      console.log(`Attempting to update photo status (attempt ${retryCount + 1}/${maxRetries})`);
      
      // First, let's try a direct update without select
      const { error: updateError } = await supabase
        .from('market_photos')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString(),
          // Add these fields to ensure the trigger doesn't interfere
          is_uploaded: true,
          has_overlay: false
        })
        .eq('id', photo.id);

      if (updateError) {
        console.error('Error updating photo status:', updateError);
        throw updateError;
      }

      // Wait a moment to ensure the update is processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now verify the update
      const { data: verifyUpdate, error: verifyUpdateError } = await supabase
        .from('market_photos')
        .select('id, status, updated_at, is_uploaded, has_overlay')
        .eq('id', photo.id)
        .single();

      if (verifyUpdateError) {
        console.error('Error verifying update:', verifyUpdateError);
        throw verifyUpdateError;
      }

      console.log('Verified photo status after update:', verifyUpdate);

      if (verifyUpdate.status !== 'deleted') {
        // Try one more time with a different approach
        console.log('First update attempt failed, trying alternative approach...');
        
        // Try updating with a different method
        const { error: secondUpdateError } = await supabase
          .rpc('update_photo_status', {
            photo_id: photo.id,
            new_status: 'deleted'
          });

        if (secondUpdateError) {
          console.error('Error in second update attempt:', secondUpdateError);
          throw secondUpdateError;
        }

        // Wait again
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify one more time
        const { data: finalVerify, error: finalVerifyError } = await supabase
          .from('market_photos')
          .select('id, status, updated_at, is_uploaded, has_overlay')
          .eq('id', photo.id)
          .single();

        if (finalVerifyError) {
          console.error('Error in final verification:', finalVerifyError);
          throw finalVerifyError;
        }

        console.log('Final verification after second attempt:', finalVerify);

        if (finalVerify.status !== 'deleted') {
          throw new Error(`Photo status was not updated to deleted. Current status: ${finalVerify.status}. Please check Supabase permissions and database triggers.`);
        }

        return finalVerify;
      }

      return verifyUpdate;
    };

    try {
      // First, verify the current status of the photo
      console.log('Verifying current photo status...');
      const { data: currentPhoto, error: verifyError } = await supabase
        .from('market_photos')
        .select('id, status')
        .eq('id', photo.id)
        .single();

      if (verifyError) {
        console.error('Error verifying photo status:', verifyError);
        throw verifyError;
      }

      if (currentPhoto.status === 'deleted') {
        console.log('Photo already deleted, updating local state only');
        // Update local state only
        setTemplate(current => {
          const newTemplate = [...current];
          newTemplate[index] = null;
          return newTemplate;
        });
        setProcessedPhotoIds(current => {
          const newSet = new Set(current);
          newSet.add(photo.id);
          return newSet;
        });
        return;
      }

      console.log('Current photo status:', currentPhoto);

      // Add to processedPhotoIds immediately to prevent race conditions
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.add(photo.id);
        return newSet;
      });

      // Optimistically update UI
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = null;
        return newTemplate;
      });
      
      // Update currentOrderPhotos state
      const updatedOrderPhotos = currentOrderPhotos.filter(p => p.id !== photo.id);
      setCurrentOrderPhotos(updatedOrderPhotos);

      // Try to update the photo status with retries
      let success = false;
      while (retryCount < maxRetries && !success) {
        try {
          await updatePhotoStatus();
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          console.log(`Retry ${retryCount} after error:`, error);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success('Photo removed from template');

      // Check if the current order is now empty
      if (updatedOrderPhotos.length === 0 && currentOrderCode) {
        console.log('Order is now empty, clearing template and loading next order');
        setTemplate(Array(9).fill(null)); // Clear the template
        setCurrentOrderCode(null);
        setCurrentOrderPhotos([]);
        // Add a small delay to ensure state updates are processed
        setTimeout(() => {
          loadNextOrder();
        }, 100);
      }
    } catch (error) {
      console.error('Error in handleDeletePhoto:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      // Remove from processedPhotoIds if the operation failed
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.delete(photo.id);
        return newSet;
      });
      
      toast.error('Failed to remove photo: ' + error.message);
      
      // Revert optimistic UI updates
      setTemplate(current => {
        const newTemplate = [...current];
        if (originalPhoto) newTemplate[index] = originalPhoto;
        return newTemplate;
      });
    }
    console.log('=== DELETE PHOTO END ===');
  };

  const handleDuplicatePhoto = async (photo) => {
    const emptySlot = template.findIndex(slot => slot === null);
    if (emptySlot === -1) {
      toast.error('No empty slots available');
      return;
    }

    setTemplate(current => {
      const newTemplate = [...current];
      newTemplate[emptySlot] = { ...photo, template_position: emptySlot + 1 };
      return newTemplate;
    });
  };

  const handleAddPhoto = async (index) => {
    try {
      const file = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => resolve(e.target.files ? e.target.files[0] : null);
        input.click();
      });

      if (!file) return;

      const loadingToast = toast.loading(`Uploading ${file.name}...`);

      if (template[index] !== null) {
        toast.dismiss(loadingToast);
        toast.error('Slot was filled while selecting the file. Please choose another empty slot.');
        return;
      }

      const fileName = `${marketId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('market_photos')
        .upload(fileName, file);

      if (uploadError) {
         toast.dismiss(loadingToast);
         throw uploadError;
      }

      const activeOrderCode = currentOrderCode || `MKT-ADMIN-${Date.now().toString().slice(-6)}`;
      if (!currentOrderCode) {
        console.log("[handleAddPhoto] No active customer order, creating admin order code:", activeOrderCode);
      }

      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();

      const { data: photoData, error: dbError } = await supabase
        .from('market_photos')
        .insert([{
          market_id: marketId,
          photo_url: fileName,
          status: 'in_template',
          column_source: 'admin_upload',
          order_code: activeOrderCode, 
          user_id: session?.user?.id || null, // Updated to use current session
        }])
        .select()
        .single();

      if (dbError) {
         toast.dismiss(loadingToast);
         throw dbError;
      }

      toast.dismiss(loadingToast);
      toast.success(`${file.name} uploaded and added.`);

      // Update UI
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = photoData;
        return newTemplate;
      });

      // Add to currentOrderPhotos if it's part of the loaded order or a new admin order
      if (activeOrderCode === currentOrderCode) {
          setCurrentOrderPhotos(prev => [...prev, photoData].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
      } else if (!currentOrderCode && activeOrderCode.startsWith('MKT-ADMIN')) {
          // This was a new admin-initiated order
          setCurrentOrderCode(activeOrderCode);
          setCurrentOrderPhotos([photoData]);
      }

    } catch (error) {
      console.error('Error adding photo:', error);
      toast.error('Failed to add photo: ' + (error.message || error));
    }
  };

  const handleCropChange = (photoId) => (location) => {
    setCrops(prev => ({
      ...prev,
      [photoId]: {
        x: location.x,
        y: location.y,
        zoom: location.zoom
      }
    }));
    setEditedPhotos(prev => ({
      ...prev,
      [photoId]: true
    }));
    setIsEditing(true); // User is now editing
  };

  const handleSaveEdit = async (photo) => {
    try {
      const crop = crops[photo.id];
      if (!crop) return;

      console.log('Saving transforms:', {
        scale: crop.zoom
      });

      const { error } = await supabase
        .from('market_photos')
        .update({
          scale: crop.zoom
        })
        .eq('id', photo.id);

      if (error) throw error;

      setEditedPhotos(prev => {
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });
      setIsEditing(false); // Editing done after save
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving photo edit:', error.message);
      toast.error('Failed to save changes: ' + error.message);
    }
  };

  const handlePrint = async () => {
    try {
      // Get all photos in the current template that aren't null
      const photosToPrint = template.filter(photo => photo !== null);
      
      if (photosToPrint.length === 0) {
        toast.error('No photos to print');
        return;
      }

      // Update all photos to printed status
      const updates = photosToPrint.map(photo => 
        supabase
          .from('market_photos')
          .update({ 
            status: 'printed',
            printed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', photo.id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Errors updating photos:', errors);
        throw new Error('Failed to update some photos');
      }

      // Add all photo IDs to processedPhotoIds
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        photosToPrint.forEach(photo => newSet.add(photo.id));
        return newSet;
      });

      // Clear the template
      setTemplate(Array(9).fill(null));
      setCurrentOrderCode(null);
      setCurrentOrderPhotos([]);
      
      // Trigger print
      window.print();
      
      toast.success(`Printed ${photosToPrint.length} photos`);

      // Wait for state updates to be processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now load the next order
      await loadNextOrder();

    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to print: ' + error.message);
    }
  };

  const renderOverlay = (photo) => {
    console.log('🎨 Attempting to render overlay:', { 
      overlayUrl, 
      photoId: photo?.id,
      marketId: marketId,
      hasPhoto: !!photo,
      photo_url: photo?.photo_url
    });
    
    // Only show overlay for photos from the camera (photos with market_camera in the path)
    if (!photo?.photo_url?.includes('market_camera')) {
      console.log('📸 Skipping overlay - not a camera photo:', photo?.id);
      return null;
    }
    
    if (!overlayUrl) {
      console.log('⚠️ No overlay URL available for photo:', photo?.id);
      return null;
    }

    return (
      <img 
        src={overlayUrl}
        alt="Border overlay"
        className="print-overlay"
        style={{
          width: '50.8mm',
          height: '50.8mm',
          position: 'absolute',
          top: '9.1mm',
          left: '9.1mm',
          pointerEvents: 'none',
          objectFit: 'contain',
          zIndex: 5
        }}
        onError={(e) => {
          console.error('❌ Overlay failed to load:', {
            url: overlayUrl,
            error: e.target.src,
            marketId: marketId,
            photoId: photo?.id
          });
        }}
        onLoad={() => {
          console.log('✅ Overlay loaded successfully:', {
            url: overlayUrl,
            marketId: marketId,
            photoId: photo?.id
          });
        }}
      />
    );
  };

  // *** UPDATE FUNCTION: Fetch photos from the LAST PRINTED BATCH ***
  const fetchReprintPhotos = async () => {
    if (!marketId) return;

    setIsLoadingReprint(true);
    try {
      console.log('Fetching recent photos for market:', marketId);
      const { data, error } = await supabase
        .from('market_photos')
        .select('*')
        .eq('market_id', marketId)
        .in('status', ['printed', 'in_template']) // Include both printed and template photos
        .order('created_at', { ascending: false }) // Most recent first
        .limit(100); // Show up to 100 photos

      if (error) throw error;
      
      setReprintPhotos(data || []);
      console.log('Fetched reprint photos:', data);

    } catch (error) {
      console.error('Error fetching reprint photos:', error);
      toast.error('Failed to load recent photos.');
      setReprintPhotos([]);
    } finally {
      setIsLoadingReprint(false);
    }
  };

  // *** UPDATE FUNCTION: Show reprint modal and fetch data ***
  const handleShowReprintModal = () => {
    setShowReprintModal(true);
    fetchReprintPhotos(); // Now fetches more photos
  };

  // *** UPDATE FUNCTION: Add selected REPRINT photo back to template ***
  const handleAddReprintPhoto = async (photoToAdd) => {
    const emptySlotIndex = template.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      toast.error('Template is full. Cannot add photo.');
      return;
    }

    try {
      // Update photo status in DB back to in_template
      const { error: updateError } = await supabase
        .from('market_photos')
        .update({
          status: 'in_template', // Set status back
          printed_at: null, // Clear the printed timestamp
          updated_at: new Date().toISOString()
        })
        .eq('id', photoToAdd.id);

      if (updateError) throw updateError;

      // Update local state
      setTemplate(current => {
        const newTemplate = [...current];
        // Add the photo back with updated status/printed_at
        newTemplate[emptySlotIndex] = { ...photoToAdd, status: 'in_template', printed_at: null }; 
        return newTemplate;
      });
      
      // Set initial crop state for the re-added photo
      setCrops(prev => ({
        ...prev,
        [photoToAdd.id]: { x: 0, y: 0, zoom: photoToAdd.scale || 1 }
      }));

      toast.success('Photo added back to template for reprinting.');
      setShowReprintModal(false); // Close modal on success

    } catch (error) {
      console.error('Error re-adding photo for reprint:', error);
      toast.error('Failed to add photo back to template.');
    }
  };

  const handleClearTemplate = async () => {
    console.log('=== CLEAR TEMPLATE START ===');
    try {
      // Get all photos in the current template that aren't null
      const photosToClear = template.filter(photo => photo !== null);
      
      if (photosToClear.length === 0) {
        toast('Template is already empty');
        return;
      }

      // Show confirmation dialog
      if (!confirm(`Are you sure you want to clear all ${photosToClear.length} photos from the template?`)) {
        return;
      }

      // Update all photos to deleted status
      const updates = photosToClear.map(photo => 
        supabase
          .from('market_photos')
          .update({ 
            status: 'deleted',
            updated_at: new Date().toISOString(),
            is_uploaded: true,
            has_overlay: false
          })
          .eq('id', photo.id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Errors updating photos:', errors);
        throw new Error('Failed to clear some photos');
      }

      // Add all photo IDs to processedPhotoIds
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        photosToClear.forEach(photo => newSet.add(photo.id));
        return newSet;
      });

      // Clear the template
      setTemplate(Array(9).fill(null));
      setCurrentOrderCode(null);
      setCurrentOrderPhotos([]);
      
      toast.success(`Cleared ${photosToClear.length} photos from template`);

      // Load next order after a short delay
      setTimeout(() => {
        loadNextOrder();
      }, 100);

    } catch (error) {
      console.error('Error clearing template:', error);
      toast.error('Failed to clear template: ' + error.message);
    }
    console.log('=== CLEAR TEMPLATE END ===');
  };

  // Print Preview function (like handlePrint, but does NOT call window.print())
  const handlePrintPreview = async () => {
    try {
      // Always build a 3x3 grid for printing
      const printGrid = Array(9).fill(null);
      template.filter(photo => photo !== null).forEach((photo, idx) => {
        if (idx < 9) printGrid[idx] = photo;
      });

      if (printGrid.every(cell => cell === null)) {
        toast.error('No photos to preview');
        return;
      }

      const previewWindow = window.open('', '_blank');
      if (!previewWindow) {
        toast.error('Please allow pop-ups for this website');
        return;
      }

      previewWindow.document.write(`
        <html>
          <head>
            <title>Print Preview</title>
            <style>
              @page { size: 216mm 279mm; margin: 0; }
              body { margin: 0; padding: 0; background: white; }
              #printArea {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 211.0354mm !important;
                height: 211.0354mm !important;
              }
              .print-template {
                width: 211.0354mm !important;
                height: 211.0354mm !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                background-color: white !important;
              }
              .print-cell {
                position: absolute !important;
                width: 69.0118mm !important;
                height: 69.0118mm !important;
                border: 1px solid black !important;
                background-color: white !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              .print-cell:nth-child(1) { left: 0mm !important; top: 0mm !important; }
              .print-cell:nth-child(2) { left: 71.0118mm !important; top: 0mm !important; }
              .print-cell:nth-child(3) { left: 142.0236mm !important; top: 0mm !important; }
              .print-cell:nth-child(4) { left: 0mm !important; top: 71.0118mm !important; }
              .print-cell:nth-child(5) { left: 71.0118mm !important; top: 71.0118mm !important; }
              .print-cell:nth-child(6) { left: 142.0236mm !important; top: 71.0118mm !important; }
              .print-cell:nth-child(7) { left: 0mm !important; top: 142.0236mm !important; }
              .print-cell:nth-child(8) { left: 71.0118mm !important; top: 142.0236mm !important; }
              .print-cell:nth-child(9) { left: 142.0236mm !important; top: 142.0236mm !important; }
              .order-code {
                visibility: visible !important;
                display: block !important;
                position: absolute !important;
                width: 69mm !important;
                text-align: center !important;
                font-size: 10px !important;
                color: black !important;
                font-family: Arial !important;
                top: 4mm !important;
                left: 0 !important;
                z-index: 20 !important;
              }
              .website-url {
                visibility: visible !important;
                display: block !important;
                position: absolute !important;
                width: 2in !important;
                text-align: center !important;
                top: calc(0.3585in + 2.08in) !important;
                left: 0.3585in !important;
                font-size: 8pt !important;
                color: black !important;
                font-family: Arial, sans-serif !important;
                transform: rotate(180deg) !important;
                z-index: 20 !important;
              }
            </style>
          </head>
          <body>
            <div id="printArea">
              <div class="print-template">
                ${printGrid.map((photo, idx) => photo ? `
                  <div class="print-cell">
                    <div class="order-code">${photo.order_code || 'No Code'}</div>
                    <img src="${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/market_photos/${photo.photo_url}" style="width:50.8mm;height:50.8mm;position:absolute;top:9.1mm;left:9.1mm;object-fit:cover;" />
                    <div className="website-url">${websiteUrl}</div>
                  </div>
                ` : `
                  <div class="print-cell"></div>
                `).join('')}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      previewWindow.document.close();
    } catch (error) {
      console.error('[handlePrintPreview] Error:', error);
      toast.error('Error generating preview: ' + error.message);
    }
  };

  return (
    <div>
      {/* Print Controls */}
      <div className={styles.controls}>
        <button 
          className={styles.primaryButton}
          onClick={handlePrint}
        >
          Print Template
        </button>
        <button
          className={styles.reprintButton}
          onClick={handleShowReprintModal}
        >
          Reprints
        </button>
        <button
          className={styles.clearButton}
          onClick={handleClearTemplate}
          style={{
            backgroundColor: '#dc2626', // red-600
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginLeft: '0.5rem'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'} // red-700
          onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'} // red-600
        >
          Clear Template
        </button>
        <button
          className={styles.primaryButton}
          style={{ marginLeft: '0.5rem', backgroundColor: '#64748b' }}
          onClick={handlePrintPreview}
        >
          Print Preview
        </button>
      </div>

      {/* Order Code Display - Added this section */}
      {template.some(photo => photo?.order_code) && (
        <div className="mb-4 p-4 bg-blue-900 rounded-lg text-center">
          <p className="text-gray-300 text-sm mb-1">Order Code:</p>
          <p className="text-white text-2xl font-bold">
            {template.find(photo => photo?.order_code)?.order_code}
          </p>
        </div>
      )}

      <div className={styles.urlInput}>
        <label className={styles.urlLabel}>Website URL:</label>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className={styles.urlField}
          placeholder="Enter website URL"
        />
      </div>

      {/* Add a wrapper div for print centering */}
      <div id="printArea">
        <div 
          className="print-template"
          style={templateStyle}
        >
          {template.map((photo, index) => (
            <div 
              key={index} 
              className="print-cell"
              style={cellStyle}
            >
              {/* Cell Controls */}
              <div style={cellControlsStyle} className="print:hidden">
                {photo ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          console.log('Delete button clicked for photo:', photo.id);
                          handleDeletePhoto(photo, index);
                        }}
                        className="bg-red-600 text-white w-8 h-8 rounded hover:bg-red-700 flex items-center justify-center shadow-sm transition-colors"
                        title="Delete photo"
                      >
                        ×
                      </button>
                      {editedPhotos[photo.id] && (
                        <button
                          onClick={() => handleSaveEdit(photo)}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm shadow-sm transition-colors"
                          title="Save changes"
                        >
                          Save
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 items-center bg-white rounded px-2 shadow-sm">
                      <button
                        onClick={() => {
                          const currentZoom = crops[photo.id]?.zoom || 1;
                          const newZoom = Math.max(0.2, currentZoom - 0.1);
                          handleCropChange(photo.id)({ ...crops[photo.id], zoom: newZoom });
                        }}
                        className="bg-gray-100 w-7 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs text-gray-600 min-w-[35px] text-center font-medium">
                        {((crops[photo.id]?.zoom || 1) * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => {
                          const currentZoom = crops[photo.id]?.zoom || 1;
                          const newZoom = Math.min(3, currentZoom + 0.1);
                          handleCropChange(photo.id)({ ...crops[photo.id], zoom: newZoom });
                        }}
                        className="bg-gray-100 w-7 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          handleCropChange(photo.id)({
                            x: 0,
                            y: 0,
                            zoom: 1
                          });
                        }}
                        className="bg-gray-100 px-2 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-xs transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => handleAddPhoto(index)}
                    className="bg-blue-600 text-white w-8 h-8 rounded hover:bg-blue-700 flex items-center justify-center shadow-sm transition-colors"
                  >
                    +
                  </button>
                )}
              </div>

              <div style={cuttingGuideStyle} className="cutting-guide" />
              
              {photo ? (
                <>
                  <div style={photoContainerStyle}>
                    <Cropper
                      image={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/market_photos/${photo.photo_url}`}
                      crop={{ x: crops[photo.id]?.x || 0, y: crops[photo.id]?.y || 0 }}
                      zoom={crops[photo.id]?.zoom || 1}
                      aspect={1}
                      onCropChange={(crop) => handleCropChange(photo.id)({ ...crops[photo.id], ...crop })}
                      onZoomChange={(zoom) => handleCropChange(photo.id)({ ...crops[photo.id], zoom })}
                      showGrid={false}
                      cropSize={{ width: 192, height: 192 }}
                      objectFit="cover"
                      minZoom={0.2}
                      maxZoom={3}
                      zoomSpeed={0.1}
                      restrictPosition={false}
                      style={{
                        containerStyle: {
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'white'
                        }
                      }}
                    />
                    {renderOverlay(photo)}
                  </div>
                  
                  {/* Website URL */}
                  <div className="website-url print-only">
                    {websiteUrl}
                  </div>

                  {/* Order Code */}
                  <div className="order-code print-only">
                    {photo.order_code || 'No Code'}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm print:hidden">
                  Empty Slot {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* *** UPDATE MODAL BACK: Reprint Photos *** */}
      {showReprintModal && (
        <Modal onClose={() => setShowReprintModal(false)}>
          <h2>Recent Photos</h2>
          {isLoadingReprint ? (
            <p>Loading...</p>
          ) : reprintPhotos.length === 0 ? (
            <p>No recent photos found.</p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: '10px',
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '10px'
            }}>
              {reprintPhotos.map(photo => (
                <div 
                  key={photo.id} 
                  style={{ 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '5px',
                    backgroundColor: photo.status === 'printed' ? '#f0f0f0' : 'white'
                  }} 
                  onClick={() => handleAddReprintPhoto(photo)}
                >
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/market_photos/${photo.photo_url}`}
                    alt={`Photo ${photo.id}`}
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      objectFit: 'cover', 
                      border: '1px solid #ccc',
                      borderRadius: '2px'
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>ID: {photo.id}</p>
                  <p style={{ fontSize: '0.8rem' }}>Status: {photo.status}</p>
                  <p style={{ fontSize: '0.8rem' }}>
                    {photo.status === 'printed' 
                      ? `Printed: ${photo.printed_at ? new Date(photo.printed_at).toLocaleString() : 'N/A'}`
                      : `Added: ${new Date(photo.created_at).toLocaleString()}`
                    }
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: 216mm 279mm;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #printArea,
          #printArea .print-template {
            visibility: visible !important;
          }
          #printArea .print-cell:empty,
          #printArea .print-cell:not(:has(img)) {
            display: none !important;
            visibility: hidden !important;
          }
          #printArea .print-cell:not(:empty),
          #printArea .reactEasyCrop_Container,
          #printArea .reactEasyCrop_Image,
          #printArea .order-code,
          #printArea .website-url {
            visibility: visible !important;
          }
          .print\:hidden,
          button,
          input,
          .empty-slot,
          [class*="controls"],
          [style*="zoomControlsStyle"],
          .reactEasyCrop_Container > *:not(.reactEasyCrop_Image),
          .text-gray-400 {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          #printArea {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 211.0354mm !important;
            height: 211.0354mm !important;
          }
          .print-template {
            width: 211.0354mm !important;
            height: 211.0354mm !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            background-color: white !important;
          }
          .print-cell {
            position: absolute !important;
            width: 69.0118mm !important;
            height: 69.0118mm !important;
            border: 1px solid black !important;
            background-color: white !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .print-cell:nth-child(1) { left: 0mm !important; top: 0mm !important; }
          .print-cell:nth-child(2) { left: 71.0118mm !important; top: 0mm !important; }
          .print-cell:nth-child(3) { left: 142.0236mm !important; top: 0mm !important; }
          .print-cell:nth-child(4) { left: 0mm !important; top: 71.0118mm !important; }
          .print-cell:nth-child(5) { left: 71.0118mm !important; top: 71.0118mm !important; }
          .print-cell:nth-child(6) { left: 142.0236mm !important; top: 71.0118mm !important; }
          .print-cell:nth-child(7) { left: 0mm !important; top: 142.0236mm !important; }
          .print-cell:nth-child(8) { left: 71.0118mm !important; top: 142.0236mm !important; }
          .print-cell:nth-child(9) { left: 142.0236mm !important; top: 142.0236mm !important; }
          .cutting-guide {
            visibility: hidden !important;
            display: none !important;
          }
          .print-cutting-guide {
            visibility: hidden !important;
            display: none !important;
          }
          .order-code {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            width: 69mm !important;
            text-align: center !important;
            font-size: 10px !important;
            color: black !important;
            font-family: Arial !important;
            top: 4mm !important;
            left: 0 !important;
            z-index: 20 !important;
          }
          .website-url {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            width: 2in !important;
            text-align: center !important;
            top: calc(0.3585in + 2.08in) !important;
            left: 0.3585in !important;
            font-size: 8pt !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            transform: rotate(180deg) !important;
            z-index: 20 !important;
          }
        }
        .reactEasyCrop_Container {
          position: relative;
          width: 100% !important;
          height: 100% !important;
          background: #f8f9fa;
        }
        .reactEasyCrop_Image {
          max-width: none !important;
          max-height: none !important;
          width: 100%;
          height: 100%;
          object-fit: contain !important;
          transform-origin: center !important;
        }
        .reactEasyCrop_CropArea {
          width: 50.8mm !important;
          height: 50.8mm !important;
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
} 

