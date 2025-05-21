'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import TemplateGrid from '../components/TemplateGrid';
import PhotoQueue from '../components/PhotoQueue';
import PrintConnector from '../../components/PrintConnector';
import { useAuth } from '../../../lib/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TemplatePage() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrintConnectorReady, setIsPrintConnectorReady] = useState(false);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const printConnectorRef = useRef(null);

  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadEvents() {
      try {
        if (!user) {
          console.log('No user logged in');
          setEvents([]);
          return;
        }

        const { data, error } = await supabase
          .from('events')
          .select('id, name, date')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [user]);

  const generatePdfDataUri = async () => {
    const input = document.getElementById('print-capture-area');
    if (!input) {
      console.error("Could not find element with ID 'print-capture-area'");
      alert("Error: Could not find the print capture area to capture.");
      return null;
    }

    // Temporarily show the print-capture-area for html2canvas
    const prevDisplay = input.style.display;
    input.style.display = 'block';

    console.log("Generating PDF data for element:", input);

    try {
      const canvas = await html2canvas(input, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#fff',
      });
      // Hide the print-capture-area again
      input.style.display = prevDisplay;

      // Check canvas size
      console.log('Canvas size:', canvas.width, canvas.height);
      if (canvas.width === 0 || canvas.height === 0) {
        alert('Error: The print area could not be captured. Make sure it is visible and has content.');
        return null;
      }
      
      const imgData = canvas.toDataURL('image/png');
      console.log('imgData:', imgData.slice(0, 50)); // Should start with 'data:image/png'
      if (!imgData.startsWith('data:image/png')) {
        alert('Error: The captured image is not a valid PNG.');
        return null;
      }

      // Use your template size for the PDF
      const pdfWidth = 211.0354; // mm
      const pdfHeight = 211.0354; // mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Add the image to the PDF, filling the page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfDataUri = pdf.output('datauristring');
      console.log("PDF data URI generated.");
      return pdfDataUri;
      
    } catch (err) {
      // Always hide the print-capture-area again, even on error
      input.style.display = prevDisplay;
      console.error("Error generating PDF data URI:", err);
      alert("Error generating PDF data. See console for details.");
      return null;
    }
  };

  const handlePrintConnectorReady = () => {
    console.log("Parent page: PrintConnector reported ready.");
    setIsPrintConnectorReady(true);
  };

  const triggerSilentPrint = () => {
    console.log("Parent page: Attempting to trigger silent print...");
    if (isPrintConnectorReady && printConnectorRef.current && typeof printConnectorRef.current.triggerPrint === 'function') {
      printConnectorRef.current.triggerPrint();
    } else {
      if (!isPrintConnectorReady) {
          console.warn("Auto-print skipped: Print connector is not yet ready.");
      } else if (!printConnectorRef.current) {
          console.error("PrintConnector ref is null or undefined! Cannot trigger print.");
      } else {
          console.error("PrintConnector ref exists, but triggerPrint method is not available yet. Cannot trigger print.", printConnectorRef.current);
      }
      console.warn("Auto-print skipped: Print connector was not ready.");
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-red-600">Please log in to view your events</div>;
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select an event...</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId ? (
        <>
          <PrintConnector
            ref={printConnectorRef}
            onGeneratePdf={generatePdfDataUri}
            onReady={handlePrintConnectorReady}
          />
          <div className="mt-4">
            <TemplateGrid
              selectedEventId={selectedEventId}
              onAutoPrintTrigger={triggerSilentPrint}
              isPrintConnectorReady={isPrintConnectorReady}
            />
          </div>
          <div className="mt-8">
            <PhotoQueue selectedEventId={selectedEventId} />
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Please select an event to view its template and photo queue
        </div>
      )}
    </div>
  );
}
