'use client';
import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../lib/AuthContext';

export default function EventQRCode({ eventId, eventName }) {
  const [mounted, setMounted] = useState(false);
  const [eventUrl, setEventUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const qrCodeSvgRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    
    // Debug: Log current URL and environment
    console.log('Debug - Current Environment:', {
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'no window',
      isProduction: process.env.NODE_ENV === 'production',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    });

    // Use the environment variable for consistent URLs
    const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/event/${eventId}`;
    console.log('Generated Event URL:', eventUrl);
    setEventUrl(eventUrl);
    
    // Fetch initial event status
    async function fetchEventStatus() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('events')
        .select('is_active')
        .eq('id', eventId)
        .single();
      
      if (data) {
        setIsActive(data.is_active);
      }
    }
    
    fetchEventStatus();
  }, [eventId, user]);

  // Handle QR activation toggle with user_id check
  const toggleEventStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ is_active: !isActive })
        .eq('id', eventId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setIsActive(data.is_active);
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  // Function to handle saving the QR code as PNG
  const handleSaveQRCode = () => {
    if (!qrCodeSvgRef.current) {
      console.error("QR Code SVG element not found.");
      return;
    }

    const svgElement = qrCodeSvgRef.current;
    const svgXml = new XMLSerializer().serializeToString(svgElement);

    // Create an image element to render the SVG
    const img = new Image();
    const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      // Add some padding/margin like the original SVG might have had visually
      const padding = 20; // Adjust padding as needed
      canvas.width = svgElement.clientWidth + padding * 2;
      canvas.height = svgElement.clientHeight + padding * 2;
      const ctx = canvas.getContext('2d');

      // Fill background with white
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image onto the canvas with padding
      ctx.drawImage(img, padding, padding, svgElement.clientWidth, svgElement.clientHeight);
      URL.revokeObjectURL(url); // Clean up blob URL

      // Convert canvas to PNG data URL
      const pngUrl = canvas.toDataURL('image/png');

      // Trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      // Sanitize eventName or provide a default for filename
      const safeEventName = eventName ? eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'event';
      downloadLink.download = `${safeEventName}_qr_code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.onerror = (error) => {
      console.error("Error loading SVG into image:", error);
      URL.revokeObjectURL(url); // Clean up blob URL even on error
    };

    img.src = url;
  };

  if (!mounted) return null;

  return (
    <div className="bg-white p-6 mt-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Event QR Code</h3>
        <button
          onClick={toggleEventStatus}
          className={`px-4 py-2 rounded text-white transition-colors ${
            isActive 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isActive ? 'Deactivate QR' : 'Activate QR'}
        </button>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="relative">
          <QRCodeSVG 
            ref={qrCodeSvgRef}
            value={eventUrl}
            size={256}
            level="H"
            includeMargin={true}
            className={`mb-4 ${!isActive && 'opacity-50'}`}
          />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                Deactivated
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm break-all max-w-full">
          <p className="font-mono">{eventUrl}</p>
        </div>
        
        <p className="text-sm text-gray-600 my-2">
          {isActive 
            ? 'Scan this code to access the photo booth'
            : 'QR code is currently deactivated'
          }
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={() => navigator.clipboard.writeText(eventUrl)}
            className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Copy URL
          </button>
          
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              printWindow.document.write(`
                <html>
                  <head>
                    <title>${eventName} - QR Code</title>
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
                        text-align: center;
                      }
                      .qr-container {
                        text-align: center;
                      }
                      .url-display {
                        margin-top: 20px;
                        font-family: monospace;
                        font-size: 14px;
                        color: #666;
                      }
                      ${!isActive ? '.qr-code { opacity: 0.5; }' : ''}
                    </style>
                  </head>
                  <body>
                    <h2>${eventName || 'Event'}</h2>
                    <div class="qr-container">
                      ${document.querySelector('.flex.flex-col.items-center svg').outerHTML}
                      <div class="url-display">${eventUrl}</div>
                    </div>
                    ${!isActive ? '<p style="text-align: center; color: red; margin-top: 20px;">QR Code Deactivated</p>' : ''}
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}
            className="mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors"
          >
            Print QR Code
          </button>

          <button
            onClick={handleSaveQRCode}
            className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
          >
            Save QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
