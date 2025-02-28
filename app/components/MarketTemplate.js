import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import styles from '../admin/markets/template/template.module.css';
import { QRCodeSVG } from 'qrcode.react';

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
    border: '1px dashed #ddd',
    width: '52.8mm',  // 50.8mm + 2mm for the border
    height: '52.8mm', // 50.8mm + 2mm for the border
    top: '8.1mm',    // 9.1mm - 1mm to account for border
    left: '8.1mm',   // 9.1mm - 1mm to account for border
    zIndex: 1
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

  // Handle add photo
  const handleAddPhoto = async (index) => {
    try {
      const file = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => resolve(e.target.files[0]);
        input.click();
      });

      if (!file) return;

      // Show loading toast
      const loadingToast = toast.loading('Uploading photo...');

      // Upload to Supabase Storage
      const fileName = `${marketId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('market_photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data: photo, error: dbError } = await supabase
        .from('market_photos')
        .insert([{
          market_id: marketId,
          photo_url: fileName,
          status: 'in_template',
          order_code: `MKT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Add to template
      setTemplate(current => {
        const newTemplate = [...current];
        newTemplate[index] = photo;
        return newTemplate;
      });

      // Add to processed photos
      setProcessedPhotoIds(current => {
        const newSet = new Set(current);
        newSet.add(photo.id);
        return newSet;
      });

      toast.dismiss(loadingToast);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
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
        // Get only active photos that are in template and not printed or deleted
        const { data: photos, error } = await supabase
          .from('market_photos')
          .select('*')
          .eq('market_id', marketId)
          .eq('status', 'in_template')  // Must be in template
          .is('printed_at', null)       // Must not be printed
          .not('status', 'eq', 'deleted') // Must not be deleted
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Supabase error while fetching photos:', error.message);
          return;
        }

        if (!photos) {
          console.log('No photos found for market:', marketId);
          return;
        }

        if (photos.length > 0) {
          console.log('Processing photos:', photos.map(p => ({ id: p.id, source: p.source, column_source: p.column_source })));
          setTemplate(current => {
            const newTemplate = [...current];
            for (const photo of photos) {
              try {
                // Skip if we've already processed this photo
                if (processedPhotoIds.has(photo.id)) {
                  console.log('Skipping already processed photo:', photo.id);
                  continue;
                }
                
                const emptySlot = newTemplate.findIndex(slot => slot === null);
                if (emptySlot !== -1) {
                  newTemplate[emptySlot] = photo;
                  // Add to processed photos
                  setProcessedPhotoIds(current => {
                    const newSet = new Set(current);
                    newSet.add(photo.id);
                    return newSet;
                  });
                  console.log('Added photo', photo.id, 'to slot', emptySlot, 'source:', photo.source, 'column_source:', photo.column_source);
                } else {
                  console.log('No empty slots available for photo:', photo.id);
                }
              } catch (photoError) {
                console.error('Error processing individual photo:', photo.id, photoError);
              }
            }
            return newTemplate;
          });
        }
      } catch (error) {
        console.error('Error in photo processing:', error);
      }
    };

    processIncomingPhotos();
    const interval = setInterval(processIncomingPhotos, 3000);
    return () => clearInterval(interval);
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
    try {
      // Check for any unsaved changes
      const unsavedPhotos = Object.keys(editedPhotos);
      if (unsavedPhotos.length > 0) {
        const saveFirst = window.confirm('There are unsaved changes. Save before printing?');
        if (saveFirst) {
          // Save all edited photos
          for (const photoId of unsavedPhotos) {
            const photo = template.find(p => p?.id === photoId);
            if (photo) {
              await handleSaveEdit(photo);
            }
          }
        }
      }

      const photoIds = template
        .filter(photo => photo !== null)
        .map(photo => photo.id);

      if (photoIds.length === 0) {
        toast.error('No photos to print');
        return;
      }

      // Show print dialog
      window.print();

      // After print dialog closes, ask for confirmation
      const didPrint = window.confirm('Did you complete printing? Click OK if you printed, Cancel if you did not print.');
      
      if (didPrint) {
        // Only update database if user confirms they printed
        const { error: updateError } = await supabase
          .from('market_photos')
          .update({ 
            status: 'printed',
            printed_at: new Date().toISOString()
          })
          .in('id', photoIds);

        if (updateError) throw updateError;

        setTemplate(Array(9).fill(null));
        toast.success('Print completed');
      }
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Print failed');
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
                          top: '9.1mm',
                          left: '9.1mm',
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
                      top: 'calc(9.1mm + 52.8mm)',
                      left: '9.1mm',
                      fontSize: '8pt',
                      color: 'black',
                      fontFamily: 'Arial, sans-serif',
                      transform: 'rotate(180deg)',
                      pointerEvents: 'none'
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
                      top: '35mm',
                      left: '4mm',
                      fontSize: '8pt',
                      color: 'black',
                      fontFamily: 'Arial, sans-serif',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'left top',
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

      <style jsx global>{`
        @media print {
          @page { 
            size: 216mm 279mm;
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
          #printArea .cutting-guide,
          #printArea .print-overlay,
          #printArea .website-url,
          #printArea .order-code {
            visibility: visible !important;
          }

          /* Hide all controls and non-essential elements */
          button,
          input,
          .empty-slot,
          [class*="controls"],
          .text-gray-400,
          .print:hidden,
          .reactEasyCrop_CropArea,
          .reactEasyCrop_Container > *:not(.reactEasyCrop_Image):not(.print-overlay) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }

          #printArea {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 207mm !important;
            height: 207mm !important;
          }

          .print-template {
            width: 207mm !important;
            height: 207mm !important;
            display: grid !important;
            grid-template-columns: repeat(3, 69mm) !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
          }

          .print-cell {
            width: 69mm !important;
            height: 69mm !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background-color: white !important;
            overflow: hidden !important;
          }

          .reactEasyCrop_Container {
            width: 50.8mm !important;
            height: 50.8mm !important;
            position: absolute !important;
            top: 9.1mm !important;
            left: 9.1mm !important;
            background: white !important;
            overflow: hidden !important;
          }

          .reactEasyCrop_Image {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            transform-origin: center !important;
          }

          .print-overlay {
            width: 50.8mm !important;
            height: 50.8mm !important;
            position: absolute !important;
            top: 9.1mm !important;
            left: 9.1mm !important;
            object-fit: contain !important;
            z-index: 5 !important;
          }

          .cutting-guide {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            border: 1px dashed #ddd !important;
            width: 52.8mm !important;
            height: 52.8mm !important;
            top: 8.1mm !important;
            left: 8.1mm !important;
            z-index: 1 !important;
          }

          .website-url {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            width: 50.8mm !important;
            text-align: center !important;
            top: calc(9.1mm + 52.8mm) !important;
            left: 9.1mm !important;
            font-size: 8pt !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            transform: rotate(180deg) !important;
            z-index: 20 !important;
          }

          .order-code {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            width: auto !important;
            text-align: center !important;
            top: 35mm !important;
            left: 4mm !important;
            font-size: 8pt !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            transform: rotate(-90deg) !important;
            transform-origin: left top !important;
            z-index: 20 !important;
          }
        }
      `}</style>
    </div>
  );
} 
