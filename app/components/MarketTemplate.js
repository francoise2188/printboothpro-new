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
  console.log('🎯 MarketTemplate Component - Received marketId:', marketId);
  const [template, setTemplate] = useState(Array(9).fill(null));
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [photoStates, setPhotoStates] = useState({});
  const [processedPhotoIds, setProcessedPhotoIds] = useState(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem(`processed_photos_${marketId}`);
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [crops, setCrops] = useState({});
  const [editedPhotos, setEditedPhotos] = useState({});
  const fileInputRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState('');

  // *** RENAME STATE BACK FOR REPRINT ***
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [reprintPhotos, setReprintPhotos] = useState([]);
  const [isLoadingReprint, setIsLoadingReprint] = useState(false);

  // *** NEW STATE: Store IDs from the last confirmed print job ***
  const [lastPrintedBatchIds, setLastPrintedBatchIds] = useState([]);

  // Initialize photo states when template changes
  useEffect(() => {
    const newPhotoStates = {};
    template.forEach(photo => {
      if (photo) {
        newPhotoStates[photo.id] = {
          zoom: photo.scale || 1,
          isEdited: false
        };
      }
    });
    setPhotoStates(newPhotoStates);
  }, [template]);

  // Save processed photos to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      `processed_photos_${marketId}`,
      JSON.stringify(Array.from(processedPhotoIds))
    );
  }, [processedPhotoIds, marketId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Don't clear localStorage on unmount anymore
      setTemplate(Array(9).fill(null));
    };
  }, []);

  const templateStyle = {
    width: '207mm',  // 8.151 inches in mm
    height: '207mm',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 69mm)',  // 2.717 inches in mm
    gap: '0mm',
    backgroundColor: '#fff',
    padding: '0',
    margin: '0 auto'
  };

  const cellStyle = {
    width: '69mm',
    height: '69mm',
    position: 'relative',
    border: '1px dashed #ddd',
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
    width: '50.8mm',  // 2 inches
    height: '50.8mm', // 2 inches
    position: 'absolute',
    top: '9.1mm',
    left: '9.1mm',
    objectFit: 'cover'
  };

  const photoContainerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: '2px',
    overflow: 'hidden'
  };

  const cuttingGuideStyle = {
    position: 'absolute',
    pointerEvents: 'none',
    border: '2px solid #bbb',  // Changed from #999 to #bbb for even lighter gray
    width: '69mm',     // 2.717 inches
    height: '69mm',    // 2.717 inches
    top: '0',
    left: '0',
    zIndex: 1,
    boxSizing: 'border-box'
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

  // Handle delete photo
  const handleDeletePhoto = async (photo, index) => {
    try {
      console.log('🗑️ Attempting to delete photo:', photo.id);
      
      // First remove from template immediately to prevent flicker
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = null;
        return newTemplate;
      });

      // Add to processed photos to prevent re-adding
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.add(photo.id);
        return newSet;
      });

      // Update the database - Change status to deleted
      const { error } = await supabase
        .from('market_photos')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', photo.id);

      if (error) throw error;

      console.log('✅ Photo successfully deleted:', photo.id);
      toast.success('Photo removed from template');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
      
      // Revert template change if database update failed
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = photo;
        return newTemplate;
      });
      
      // Remove from processed photos if failed
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.delete(photo.id);
        return newSet;
      });
    }
  };

  // Handle duplicate photo
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

  // Handle add photo - REVERT TO SINGLE FILE LOGIC
  const handleAddPhoto = async (index) => { // Use index directly
    try {
      // Get single file
      const file = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // input.multiple = false; // Explicitly single (or omit)
        input.onchange = (e) => resolve(e.target.files ? e.target.files[0] : null); // Resolve with the first file or null
        input.click();
      });

      if (!file) return; // Check if a file was selected

      // Show loading toast
      const loadingToast = toast.loading(`Uploading ${file.name}...`);

      // Check if slot is still empty (basic concurrency check)
      if (template[index] !== null) {
        toast.dismiss(loadingToast);
        toast.error('Slot was filled while selecting the file. Please choose another empty slot.');
        return;
      }

      // Upload to Supabase Storage
      const fileName = `${marketId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('market_photos')
        .upload(fileName, file);

      if (uploadError) {
         toast.dismiss(loadingToast);
         throw uploadError;
      }

      // Create database record
      const { data: photo, error: dbError } = await supabase
        .from('market_photos')
        .insert([{
          market_id: marketId,
          photo_url: fileName,
          status: 'in_template',
          order_code: `MKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          scale: 1 // Set initial scale to 1
        }])
        .select()
        .single();

      if (dbError) {
         toast.dismiss(loadingToast);
         throw dbError;
      }

      // Add to template state immediately at the specified index
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = photo;
        return newTemplate;
      });

      // Add to processed photos (though maybe less critical now?)
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.add(photo.id);
        return newSet;
      });
      
      // Initialize crop state locally
      setCrops(prev => ({
         ...prev,
         [photo.id]: {
           x: 0, 
           y: 0, 
           zoom: 1
         }
       }));

      toast.dismiss(loadingToast);
      toast.success(`Photo uploaded successfully to slot ${index + 1}`);

    } catch (error) {
      console.error('Error in handleAddPhoto:', error);
      toast.error(`Failed to upload photo: ${error.message || 'Unknown error'}`);
      // Ensure any loading toast is dismissed on general failure
      toast.dismiss(); 
    }
  };

  // Process Photos
  useEffect(() => {
    const processIncomingPhotos = async () => {
      if (!marketId) {
        console.log('Skipping photo processing - no market ID');
        return;
      }

      try {
        // Get only active photos for this market
        const { data: photos, error } = await supabase
          .from('market_photos')
          .select('*')
          .eq('market_id', marketId)
          .eq('status', 'in_template')
          .is('printed_at', null)
          .not('status', 'eq', 'deleted')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Supabase error while fetching photos:', error.message);
          return;
        }

        if (!photos || photos.length === 0) {
          // console.log('No candidate photos found for market:', marketId);
          return;
        }

        // console.log('Processing candidate photos:', photos.map(p => p.id));
        let updated = false;
        setTemplate(current => {
          const newTemplate = [...current];
          const currentIdsInTemplate = new Set(newTemplate.filter(p => p).map(p => p.id));

          for (const photo of photos) {
            try {
              // Skip if photo is already in the template array being built OR if it was manually deleted via UI (in processedPhotoIds)
              if (currentIdsInTemplate.has(photo.id) || processedPhotoIds.has(photo.id)) {
                // console.log('Skipping photo already in template or processed:', photo.id);
                continue;
              }

              const emptySlot = newTemplate.findIndex(slot => slot === null);
              if (emptySlot !== -1) {
                console.log(`[processIncomingPhotos] Adding photo ${photo.id} to empty slot ${emptySlot}`);
                newTemplate[emptySlot] = photo;
                currentIdsInTemplate.add(photo.id); // Add ID to set for this run
                updated = true; // Mark that an update occurred

                // Ensure initial crop state exists
                if (!crops[photo.id]) {
                   setCrops(prevCrops => ({
                       ...prevCrops,
                       [photo.id]: { x: 0, y: 0, zoom: photo.scale || 1 }
                   }));
                }

              } else {
                // console.log('No empty slots available for photo:', photo.id);
                break; // Stop processing if template is full
              }
            } catch (photoError) {
              console.error('Error processing individual photo:', photo.id, photoError);
            }
          }
          return updated ? newTemplate : current; // Only return new array if changed
        });

      } catch (error) {
        console.error('Error in photo processing:', error);
      }
    };

    // Run once on mount and then interval
    processIncomingPhotos(); 
    const interval = setInterval(processIncomingPhotos, 5000); // Increase interval slightly?
    return () => clearInterval(interval);
  // Depend on marketId. processedPhotoIds dependency might cause loops if not careful.
  // If processedPhotoIds is updated inside, it triggers the effect again.
  // Let's remove processedPhotoIds dependency for now and rely on the check inside.
  }, [marketId, processedPhotoIds]); 

  // Load Overlay
  useEffect(() => {
    async function fetchOverlay() {
      console.log('🔍 Starting overlay fetch process');
      
      if (!marketId) {
        console.log('⚠️ No market ID provided');
        return;
      }

      console.log('🎯 Using market ID:', marketId);
      
      try {
        console.log('🔍 Querying market_camera_settings for market ID:', marketId);
        
        const { data, error } = await supabase
          .from('market_camera_settings')
          .select('*')
          .eq('market_id', marketId)
          .single();

        if (error) {
          console.error('❌ Error fetching overlay:', error);
          return;
        }

        console.log('📦 Complete market_camera_settings data:', data);

        if (data?.border_url) {
          console.log('🎯 Found border URL:', data.border_url);
          // Use the border_url directly as it should already be a full URL
          setOverlayUrl(data.border_url);
          console.log('🔗 Setting overlay URL to:', data.border_url);
        } else {
          console.log('⚠️ No border_url found in settings. Full data:', data);
        }
      } catch (error) {
        console.error('❌ Unexpected error:', error);
      }
    }

    fetchOverlay();
  }, [marketId]);

  // Add a debug effect to monitor overlayUrl changes
  useEffect(() => {
    console.log('💫 overlayUrl changed:', overlayUrl);
  }, [overlayUrl]);

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

      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving photo edit:', error.message);
      toast.error('Failed to save changes: ' + error.message);
    }
  };

  // Update print handler to check for unsaved changes
  const handlePrint = async () => {
    console.log('🖨️ [handlePrint] Starting print process...'); // Log: Start
    try {
      // Check for any unsaved changes
      const unsavedPhotos = Object.keys(editedPhotos);
      if (unsavedPhotos.length > 0) {
        console.log('⚠️ [handlePrint] Unsaved changes detected:', unsavedPhotos); // Log: Unsaved changes
        const saveFirst = window.confirm('There are unsaved changes. Save before printing?');
        if (saveFirst) {
          console.log('💾 [handlePrint] User chose to save first.'); // Log: Saving choice
          // Save all edited photos
          for (const photoId of unsavedPhotos) {
            const photo = template.find(p => p?.id === photoId);
            if (photo) {
              console.log(`💾 [handlePrint] Saving changes for photo ${photoId}...`); // Log: Saving specific photo
              await handleSaveEdit(photo);
            }
          }
          console.log('✅ [handlePrint] Finished saving changes.'); // Log: Saving complete
        } else {
           console.log('🚫 [handlePrint] User chose not to save before printing.'); // Log: Not saving
        }
      }

      const photosToPrint = template.filter(photo => photo !== null);
      const photoIdsToPrint = photosToPrint.map(photo => photo.id); // Get IDs BEFORE printing

      console.log(`📄 [handlePrint] Photos identified for printing: ${photoIdsToPrint.join(', ')}`); // Log: Photos identified

      if (photoIdsToPrint.length === 0) {
        console.log('❌ [handlePrint] No photos to print.'); // Log: No photos
        toast.error('No photos to print');
        return;
      }

      // --- Crucial Part: Get Next Print Number ---
      // We need a function to get the next available print number for this market.
      // Let's assume we have a function called getNextPrintNumber(marketId)
      // If it doesn't exist, we'll need to create it. For now, we'll placeholder it.

      // Placeholder: We need the actual function call here.
      // For now, let's just log that we would fetch it.
      console.log(`🔢 [handlePrint] Would attempt to get next print number for market ${marketId}`); 
      // const nextPrintNumber = await getNextPrintNumber(marketId); // Example future call
      // console.log(`🔢 [handlePrint] Next available print number is: ${nextPrintNumber}`); // Example future log

      // --- End Crucial Part ---

      // Show print dialog
      console.log('🖥️ [handlePrint] Showing system print dialog...'); // Log: Show print dialog
      window.print();

      // After print dialog closes, ask for confirmation
      console.log('❓ [handlePrint] Asking user for print confirmation...'); // Log: Ask confirmation
      const didPrint = window.confirm('Did you complete printing? Click OK if you printed, Cancel if you did not print.');
      
      if (didPrint) {
        console.log('👍 [handlePrint] User confirmed printing.'); // Log: User confirmed
        
        // *** STORE THE IDs of the photos that were just printed ***
        setLastPrintedBatchIds(photoIdsToPrint);
        console.log(`📝 [handlePrint] Stored last printed batch IDs: ${photoIdsToPrint.join(', ')}`);

        // --- Database Update Attempt ---
        console.log(`🔄 [handlePrint] Preparing to update database status for photos: ${photoIdsToPrint.join(', ')}`); 

        const updatePayload = { 
            status: 'printed',
            printed_at: new Date().toISOString()
        };
        const { error: updateError } = await supabase
          .from('market_photos')
          .update(updatePayload)
          .in('id', photoIdsToPrint); // Use the IDs captured before print
        
        if (updateError) {
           // ... (existing error logging) ...
           // Don't throw error here anymore, just log it, as reprint list doesn't depend on it
           console.error('❌ [handlePrint] Database update FAILED (but proceeding): ', updateError.message);
        } else {
           console.log('✅ [handlePrint] Database update call successful or no error thrown.');
        }
        // ... (rest of existing success logic: clear template, show toast) ...

        console.log('✅ [handlePrint] Post-print actions completed.'); 
        setTemplate(Array(9).fill(null)); // Clear template
        console.log('🔄 [handlePrint] Template cleared.'); // Log: Template cleared
        toast.success('Print job recorded. Template cleared.');

      } else {
        console.log('👎 [handlePrint] User cancelled printing.'); // Log: User cancelled
      }
    } catch (error) {
      console.error('💥 [handlePrint] Error during print process:', error); // Log: General Error
      toast.error('Print failed: ' + error.message);
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
    if (lastPrintedBatchIds.length === 0) {
      toast('No photos were recorded in the last print batch.');
      setReprintPhotos([]);
      return;
    }

    setIsLoadingReprint(true);
    try {
      console.log(`Fetching details for last printed batch IDs: ${lastPrintedBatchIds.join(', ')}`);
      const { data, error } = await supabase
        .from('market_photos')
        .select('*')
        .eq('market_id', marketId) // Still filter by market for safety
        .in('id', lastPrintedBatchIds); // Fetch photos by IDs stored in state

      if (error) throw error;
      
      // Optional: Sort the results to match the order they were printed?
      // Or keep the order returned by the DB.
      setReprintPhotos(data || []);
      console.log('Fetched reprint photos:', data);

    } catch (error) {
      console.error('Error fetching reprint photos by ID:', error);
      toast.error('Failed to load details for the last print batch.');
      setReprintPhotos([]);
    } finally {
      setIsLoadingReprint(false);
    }
  };

  // *** UPDATE FUNCTION: Show reprint modal and fetch data ***
  const handleShowReprintModal = () => {
    if (lastPrintedBatchIds.length === 0) {
       toast('No photos were recorded in the last print batch.');
       return;
    }
    setShowReprintModal(true);
    fetchReprintPhotos(); // fetchReprintPhotos now uses the state IDs
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
                        onClick={() => handleDeletePhoto(photo, index)}
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
                      objectFit="contain"
                      minZoom={0.2}
                      maxZoom={3}
                      zoomSpeed={0.1}
                      restrictPosition={true}
                      style={{
                        containerStyle: {
                          width: '50.8mm',
                          height: '50.8mm',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'white'
                        },
                        cropAreaStyle: {
                          width: '50.8mm',
                          height: '50.8mm',
                          color: 'rgba(255, 255, 255, 0.3)'
                        },
                        mediaStyle: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }
                      }}
                    />
                    {renderOverlay(photo)}
                  </div>
                  
                  {/* Website URL */}
                  <div className="website-url"
                    style={{
                      position: 'absolute',
                      width: '50.8mm',
                      textAlign: 'center',
                      bottom: '5mm',  // Changed from 3mm to 5mm to move it closer to photo
                      left: '50%',
                      transform: 'translateX(-50%) rotate(180deg)',
                      fontSize: '8pt',
                      color: 'black',
                      fontFamily: 'Arial, sans-serif',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    {websiteUrl}
                  </div>

                  {/* Order Code */}
                  <div className="order-code"
                    style={{
                      position: 'absolute',
                      width: 'auto',
                      textAlign: 'center',
                      top: '50%',
                      left: '7mm',
                      fontSize: '8pt',
                      color: 'black',
                      fontFamily: 'Arial, sans-serif',
                      transform: 'translateY(-50%) rotate(-90deg)',
                      transformOrigin: 'left center',
                      pointerEvents: 'none',
                      zIndex: 9999
                    }}
                  >
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
          <h2>Recently Printed Photos</h2>
          {isLoadingReprint ? (
            <p>Loading...</p>
          ) : reprintPhotos.length === 0 ? (
            <p>No recently printed photos found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {reprintPhotos.map(photo => (
                <div key={photo.id} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleAddReprintPhoto(photo)}>
                  <img 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/market_photos/${photo.photo_url}`}
                    alt={`Photo ${photo.id}`}
                    style={{ width: '100px', height: '100px', objectFit: 'cover', border: '1px solid #ccc' }}
                  />
                  <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>ID: {photo.id}</p>
                  <p style={{ fontSize: '0.8rem' }}>Status: {photo.status}</p> {/* Should be 'printed' */}
                  <p style={{ fontSize: '0.8rem' }}>Printed: {photo.printed_at ? new Date(photo.printed_at).toLocaleString() : 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      <style jsx global>{`
        @media print {
          @page { 
            size: 8.5in 11in;
            margin: 0;
          }
          
          /* Hide everything by default */
          body * { 
            visibility: hidden;
          }
          
          /* Show only essential print elements */
          #printArea,
          #printArea .print-template,
          #printArea .print-cell,
          #printArea .reactEasyCrop_Container,
          #printArea .reactEasyCrop_Image,
          #printArea .print-overlay,
          #printArea .website-url,
          #printArea .order-code,
          #printArea .cutting-square {
            visibility: visible !important;
          }

          /* Ensure website URL maintains its position */
          .website-url {
            position: absolute !important;
            width: 50.8mm !important;
            textAlign: center !important;
            bottom: 5mm !important;  // Changed from 3mm to 5mm to move it closer to photo
            left: 50% !important;
            transform: translateX(-50%) rotate(180deg) !important;
            fontSize: 8pt !important;
            color: black !important;
            fontFamily: Arial, sans-serif !important;
            pointerEvents: none !important;
            zIndex: 10 !important;
          }

          /* Add 72x72mm squares around photos */
          .print-cell {
            position: relative !important;
            width: 2.835in !important; /* 72mm in inches */
            height: 2.835in !important;
          }

          .print-cell::before {
            content: '' !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 2.835in !important;
            height: 2.835in !important;
            border: 1px solid #dddddd !important;
            visibility: visible !important;
            z-index: 9999 !important;
            pointer-events: none !important;
          }

          /* Position print template */
          .print-template {
            width: 8.5in !important;
            height: 8.5in !important;
            display: grid !important;
            grid-template-columns: repeat(3, 2.835in) !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            position: relative !important;
            justify-content: center !important;
          }

          #printArea {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 8.5in !important;
            height: 8.5in !important;
            max-width: 8.5in !important;
            max-height: 8.5in !important;
            overflow: visible !important;
          }

          /* Hide the old cutting guides */
          .cutting-guide,
          .reactEasyCrop_Container::before {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
} 

