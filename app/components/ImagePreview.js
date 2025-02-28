'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ImagePreview({ imageData, alt = 'Preview', width = 200, height = 150 }) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    setError(false);
    setIsLoading(true);

    if (!imageData) {
      console.log('No image data provided');
      setError(true);
      setIsLoading(false);
      return;
    }

    // Log the incoming image data for debugging
    console.log('📸 Image Preview Data:', {
      type: typeof imageData,
      value: imageData,
      isObject: typeof imageData === 'object',
      keys: typeof imageData === 'object' ? Object.keys(imageData) : null
    });

    // Handle different types of image data
    try {
      // If it's a timestamp or invalid data, show error
      if (typeof imageData === 'string' && /^\d{4}-\d{2}-\d{2}/.test(imageData)) {
        console.error('Received timestamp instead of image URL:', imageData);
        setError(true);
        return;
      }

      // If it's a URL string (including blob URLs)
      if (typeof imageData === 'string' && (
        imageData.startsWith('http') || 
        imageData.startsWith('data:') ||
        imageData.startsWith('blob:')
      )) {
        setImageUrl(imageData);
      }
      // If it's an object with a URL property
      else if (typeof imageData === 'object' && imageData?.url) {
        setImageUrl(imageData.url);
      }
      // If it's an object with a publicUrl property
      else if (typeof imageData === 'object' && imageData?.publicUrl) {
        setImageUrl(imageData.publicUrl);
      }
      // If it's an object with a landing_background property
      else if (typeof imageData === 'object' && imageData?.landing_background) {
        setImageUrl(imageData.landing_background);
      }
      else {
        console.error('Unsupported image data format:', imageData);
        setError(true);
      }
    } catch (err) {
      console.error('Error processing image data:', err);
      setError(true);
    }

    setIsLoading(false);
  }, [imageData]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" 
           style={{ width: width, height: height }}>
        <p className="text-sm text-gray-500">Image not available</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" 
           style={{ width: width, height: height }}>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" 
           style={{ width: width, height: height }}>
        <p className="text-sm text-gray-500">No image</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ width: width, height: height }}>
      <img
        src={imageUrl}
        alt={alt}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '150px',
          maxHeight: '150px'
        }}
        onError={() => {
          console.error('Failed to load image:', imageUrl);
          setError(true);
        }}
      />
    </div>
  );
}
