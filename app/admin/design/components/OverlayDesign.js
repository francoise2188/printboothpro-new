'use client';

import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function OverlayDesign() {
  const [preview, setPreview] = useState(null);
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploading(true);
      
      // Create a new image element
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Set preview with resized image
        setPreview(canvas.toDataURL('image/png'));
      };
      
      // Load image from file
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      const fileName = `frame_${Date.now()}.png`;
      const { data, error } = await supabase.storage
        .from('designs')
        .upload(`frames/${fileName}`, file);

      if (error) throw error;
      setMessage('Frame uploaded successfully!');
    } catch (error) {
      setMessage('Error uploading frame');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Controls Section - Now in a fixed position at the top */}
      <div className="mb-8">  {/* Added margin-bottom for spacing */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => document.getElementById('frame-upload').click()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Frame'}
          </button>
          
          {preview && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Preview Frame
            </button>
          )}
          
          <input
            id="frame-upload"
            type="file"
            accept="image/png"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {message && (
          <div className={`mt-4 text-center text-sm ${
            message.includes('successfully') ? 'text-green-600' : 'text-red-600'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Main container - WITHOUT grid */}
      <div className="relative mx-auto p-4">
        {/* Photo Area Container */}
        <div 
          className="relative mx-auto bg-white"
          style={{ 
            width: '400px',
            height: '400px',
            border: '2px solid #374151',
            boxShadow: `inset 0 0 0 2px #ef4444`,
            overflow: 'hidden',
            position: 'relative'  // Ensure proper containment
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Center Cross - Contained within photo area */}
          <div className="absolute inset-0">
            {/* Vertical line */}
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '0',
                height: '100%',
                width: '1px',
                backgroundColor: '#e5e7eb',
                transform: 'translateX(-50%)',
                pointerEvents: 'none'
              }}
            />
            {/* Horizontal line */}
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                width: '100%',
                height: '1px',
                backgroundColor: '#e5e7eb',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* Frame Preview */}
          {preview && (
            <div 
              onMouseDown={handleMouseDown}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale/100})`,
                cursor: isDragging ? 'grabbing' : 'grab',
                position: 'absolute',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 2
              }}
            >
              <img 
                src={preview}
                alt="Frame"
                style={{ maxHeight: '150px', maxWidth: '150px', objectFit: 'contain' }}
                draggable="false"
              />
            </div>
          )}
        </div>

        {/* Helper text */}
        <div className="text-center mt-2 text-sm text-red-500">
          Any part of the frame outside the red border will be cut off in the final magnet
        </div>

        {/* Scale Controls with adjusted range */}
        {preview && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scale: {scale}%
              </label>
              <input
                type="range"
                min="10"    // Reduced minimum scale
                max="150"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <button
              onClick={() => {
                setScale(100);
                setPosition({ x: 0, y: 0 });
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Reset Position & Scale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
