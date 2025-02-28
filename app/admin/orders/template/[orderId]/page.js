'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../../lib/AuthContext';
import 'react-image-crop/dist/ReactCrop.css';
import ReactCrop from 'react-image-crop';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Cropper from 'react-easy-crop';
import styles from './page.module.css';

export default function OrderTemplate({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [template, setTemplate] = useState(Array(9).fill(null));
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 100,
    aspect: 1
  });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const activePhotoRef = useRef(null);
  const [photoScales, setPhotoScales] = useState({});
  const [editedPhotos, setEditedPhotos] = useState({});
  const [positions, setPositions] = useState({});
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Add state for crop area
  const [crops, setCrops] = useState({});

  useEffect(() => {
    if (orderId && user) {
      loadOrder();
      loadTemplate();
    }
  }, [orderId, user]);

  const loadOrder = async () => {
    try {
      console.log('Loading order:', orderId, 'for user:', user.id);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }
      
      if (!data) {
        console.error('Order not found:', orderId);
        throw new Error('Order not found');
      }

      console.log('✅ Order loaded:', data);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error.message || error);
      alert('Failed to load order');
      router.push('/admin/orders/management');
    }
  };

  const loadTemplate = async () => {
    try {
      console.log('Loading template for order:', orderId);
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError) {
        console.error('Supabase error:', orderError.message, orderError.details);
        throw orderError;
      }

      if (!orderData) {
        console.error('Order not found:', orderId);
        throw new Error('Order not found or access denied');
      }

      const { data, error } = await supabase
        .from('order_photos')
        .select('*')
        .eq('order_id', orderId)
        .order('position');

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }

      const newTemplate = Array(9).fill(null);
      const newPositions = {};
      const newScales = {};
      const newCrops = {};

      data.forEach(photo => {
        if (photo.position >= 0 && photo.position < 9) {
          newTemplate[photo.position] = photo;
          newPositions[photo.id] = {
            x: photo.position_x || 0,
            y: photo.position_y || 0
          };
          newScales[photo.id] = photo.scale || 1;
          newCrops[photo.id] = {
            x: photo.position_x || 0,
            y: photo.position_y || 0,
            zoom: photo.scale || 1
          };
        }
      });

      console.log('✅ Template loaded:', { photos: data.length, template: newTemplate });
      setTemplate(newTemplate);
      setPositions(newPositions);
      setPhotoScales(newScales);
      setCrops(newCrops);
    } catch (error) {
      console.error('Error loading template:', error.message || error);
      alert('Failed to load template');
      router.push('/admin/orders/management');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e, position) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError || !orderData) {
        throw new Error('Order not found or access denied');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}/${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('order-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data } = supabase.storage
          .from('order-photos')
          .getPublicUrl(fileName);

        if (!data?.publicUrl) {
          throw new Error('Failed to get public URL');
        }

        // Save photo record with initial scale of 1
        const { data: photoData, error: dbError } = await supabase
          .from('order_photos')
          .insert({
            order_id: orderId,
            photo_url: data.publicUrl,
            position: position,
            scale: 1, // Set initial scale
            position_x: 0, // Set initial position
            position_y: 0,
            status: 'pending'
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Update local state
        setPhotoScales(prev => ({
          ...prev,
          [photoData.id]: 1
        }));

        setPositions(prev => ({
          ...prev,
          [photoData.id]: { x: 0, y: 0 }
        }));
      }

      // Reload template
      await loadTemplate();
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleSaveEdit = async (photo) => {
    try {
      const crop = crops[photo.id];
      if (!crop) return;

      console.log('Saving transforms:', {
        scale: crop.zoom,
        position_x: crop.x,
        position_y: crop.y
      });

      const { error } = await supabase
        .from('order_photos')
        .update({
          scale: crop.zoom,
          position_x: crop.x,
          position_y: crop.y
        })
        .eq('id', photo.id);

      if (error) throw error;

      setEditedPhotos(prev => {
        const next = { ...prev };
        delete next[photo.id];
        return next;
      });

      alert('Changes saved successfully');
    } catch (error) {
      console.error('Error saving photo edit:', error.message);
      alert('Failed to save changes: ' + error.message);
    }
  };

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

      // Update status of all photos to 'printed'
      const { error } = await supabase
        .from('order_photos')
        .update({ status: 'printed' })
        .eq('order_id', orderId);

      if (error) throw error;
      
      window.print();
    } catch (error) {
      console.error('Error updating print status:', error);
      alert('Failed to update print status');
    }
  };

  const handleDeletePhoto = async (position) => {
    try {
      // Get the photo to delete
      const photoToDelete = template[position];
      if (!photoToDelete) return;

      // Delete from Supabase
      const { error: deleteError } = await supabase
        .from('order_photos')
        .delete()
        .eq('order_id', orderId)
        .eq('position', position);

      if (deleteError) throw deleteError;

      // Reload template
      await loadTemplate();
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  const handleMouseDown = (e, photo) => {
    e.preventDefault();
    setSelectedPhoto(photo);
    setIsDragging(true);
    
    const currentPosition = positions[photo.id] || { x: 0, y: 0 };
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
  };

  // Add these event listeners back
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseUp = () => {
    if (selectedPhoto) {
      setEditedPhotos(prev => ({
        ...prev,
        [selectedPhoto.id]: true
      }));
    }
    setIsDragging(false);
    setSelectedPhoto(null);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedPhoto) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Allow free movement for positioning
    setPositions(prev => ({
      ...prev,
      [selectedPhoto.id]: { x: newX, y: newY }
    }));
  };

  const handleScaleChange = (photoId, newScale) => {
    setPhotoScales(prev => ({
      ...prev,
      [photoId]: newScale
    }));
  };

  // Update getPhotoStyle to use CSS variables
  const getPhotoStyle = (photo) => {
    if (!photo) return photoStyle;
    
    const currentScale = photoScales[photo.id] || 1;
    const currentPosition = positions[photo.id] || { x: 0, y: 0 };
    
    return {
      position: 'absolute',
      width: '50.8mm',
      height: '50.8mm',
      objectFit: 'cover',
      cursor: isDragging ? 'grabbing' : 'grab',
      transformOrigin: 'center',
      '--scale': currentScale,
      '--x': `${currentPosition.x}px`,
      '--y': `${currentPosition.y}px`,
      transform: 'translate(var(--x), var(--y)) scale(var(--scale))'
    };
  };

  // Add template styles
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
    overflow: 'visible'  // Keep visible for zoom controls
  };

  const photoStyle = {
    width: '50.8mm',  // 2 inches
    height: '50.8mm', // 2 inches
    position: 'absolute',
    top: '9.1mm',
    left: '9.1mm',
    objectFit: 'cover'
  };

  // Update photoContainerStyle to enforce 2x2 size and show controls
  const photoContainerStyle = {
    width: '50.8mm',  // 2 inches
    height: '50.8mm', // 2 inches
    position: 'absolute',
    top: '9.1mm',
    left: '9.1mm',
    backgroundColor: '#f8f9fa',
    borderRadius: '2px',
    overflow: 'hidden'  // Change to hidden to constrain photo
  };

  const cuttingGuideStyle = {
    position: 'absolute',
    pointerEvents: 'none',
    border: '1px dashed #ddd',  // Light gray dashed border
    width: '50.8mm',
    height: '50.8mm',
    top: '9.1mm',
    left: '9.1mm',
    zIndex: 10
  };

  // Update cell controls style to span full width
  const cellControlsStyle = {
    position: 'absolute',
    top: '5px',
    left: '5px',
    right: '5px',
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 20
  };

  // Add zoom controls style
  const zoomControlsStyle = {
    position: 'absolute',
    top: '5px',  // Move to top
    right: '5px',  // Position on right
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 30,
    whiteSpace: 'nowrap'
  };

  // Load saved positions and scales when template loads
  useEffect(() => {
    const loadedPositions = {};
    const loadedScales = {};
    
    template.forEach(photo => {
      if (photo) {
        // Make sure to use the saved values from the database
        loadedPositions[photo.id] = {
          x: photo.position_x || 0,
          y: photo.position_y || 0
        };
        loadedScales[photo.id] = photo.scale || 1;
        
        console.log(`Loaded transforms for photo ${photo.id}:`, {
          scale: photo.scale,
          position: { x: photo.position_x, y: photo.position_y }
        });
      }
    });
    
    setPositions(loadedPositions);
    setPhotoScales(loadedScales);
  }, [template]);

  // Update photo container style to show active state
  const getPhotoContainerStyle = (photo, isActive) => ({
    ...photoContainerStyle,
    outline: isActive ? '2px solid #3b82f6' : 'none',
    transition: 'outline 0.2s ease'
  });

  // Update the file input to be just the + button
  const renderAddPhotoButton = (index) => (
    <button
      onClick={() => document.getElementById(`fileInput${index}`).click()}
      className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-600 cursor-pointer"
    >
      <span className="text-xl">+</span>
      <input
        id={`fileInput${index}`}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, index)}
        className="hidden"
        style={{ display: 'none' }}
      />
    </button>
  );

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

  if (loading) {
    return <div className="p-6">Loading template...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Order Details */}
      <div className={styles.header}>
        <h1 className={styles.title}>Order Template</h1>
        <div className={styles.orderDetails}>
          <p>Order: {order?.external_reference || orderId}</p>
          <p>Customer: {order?.customer_name}</p>
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700">Website URL</label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={styles.urlInput}
              placeholder="Enter website URL"
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={handlePrint}
          className={styles.primaryButton}
        >
          Print Photos
        </button>
        <button
          onClick={() => router.push('/admin/orders/management')}
          className={styles.secondaryButton}
        >
          Back to Orders
        </button>
      </div>

      {/* Add a wrapper div for print centering */}
      <div id="printArea">
        <div style={templateStyle} className="print-template">
          {template.map((photo, index) => (
            <div key={index} style={cellStyle} className="print-cell relative group">
              {/* Order Code */}
              <div className="order-code absolute z-20 print:visible"
                style={{
                  fontSize: '10px',
                  color: 'black',
                  fontFamily: 'Arial',
                  width: '69mm',
                  textAlign: 'center',
                  top: '4mm',
                  left: 0
                }}
              >
                {order?.external_reference || orderId}
              </div>

              <div style={cuttingGuideStyle} className="cutting-guide" />
              
              {/* Cell Controls */}
              <div style={cellControlsStyle} className="print:hidden">
                {photo ? (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeletePhoto(index)}
                        className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                        title="Delete photo"
                      >
                        ×
                      </button>
                      {editedPhotos[photo.id] && (
                        <button
                          onClick={() => handleSaveEdit(photo)}
                          className="bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 text-sm"
                          title="Save changes"
                        >
                          Save
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 items-center bg-white rounded-full px-2 shadow-sm">
                      <button
                        onClick={() => {
                          const currentZoom = crops[photo.id]?.zoom || 1;
                          const newZoom = Math.max(0.2, currentZoom - 0.1);
                          handleCropChange(photo.id)({ ...crops[photo.id], zoom: newZoom });
                        }}
                        className="bg-gray-100 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 text-sm font-bold"
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
                        className="bg-gray-100 w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 text-sm font-bold"
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
                        className="bg-gray-100 px-2 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 text-xs"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                ) : (
                  renderAddPhotoButton(index)
                )}
              </div>
              
              {photo ? (
                <div style={photoContainerStyle}>
                  <Cropper
                    image={photo.photo_url}
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
                    restrictPosition={false}
                    style={{
                      containerStyle: {
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'white'
                      },
                      mediaStyle: {
                        width: 'auto',
                        height: 'auto',
                        maxHeight: '300%',
                        maxWidth: '300%'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm print:hidden">
                  Empty Slot {index + 1}
                </div>
              )}

              {/* Website URL */}
              <div className="website-url absolute z-20 print:visible"
                style={{
                  position: 'absolute',
                  width: '2in',
                  textAlign: 'center',
                  top: 'calc(0.3585in + 2.05in)',
                  left: '0.3585in',
                  fontSize: '8pt',
                  color: 'black',
                  fontFamily: 'Arial, sans-serif',
                  transform: 'rotate(180deg)'
                }}
              >
                {websiteUrl}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update the print styles to properly handle transformations */}
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
          #printArea .order-code,
          #printArea .website-url,
          #printArea .cutting-guide {
            visibility: visible !important;
          }

          /* Hide all controls and non-essential elements */
          .print\\:hidden,
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

          /* Style the cutting guide */
          .cutting-guide {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            border: 1px dashed #ddd !important;
            width: 50.8mm !important;
            height: 50.8mm !important;
            top: 9.1mm !important;
            left: 9.1mm !important;
            z-index: 10 !important;
          }

          /* Style the order code */
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

          /* Style the website URL */
          .website-url {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            width: 2in !important;
            text-align: center !important;
            top: calc(0.3585in + 2.05in) !important;
            left: 0.3585in !important;
            font-size: 8pt !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            transform: rotate(180deg) !important;
            z-index: 20 !important;
          }
        }

        /* Styles for the cropper */
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
          object-fit: cover !important;
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