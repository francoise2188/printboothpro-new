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
    const input = document.getElementById('template-preview-area');
    if (!input) {
      console.error("Could not find element with ID 'template-preview-area'");
      alert("Error: Could not find the template area to capture.");
      return null;
    }

    console.log("Generating PDF data for element:", input);

    try {
      const canvas = await html2canvas(input, {
        useCORS: true,
        scale: 2,
        onclone: (clonedDoc) => {
            const scaledElement = clonedDoc.querySelector('.print-template'); 
            if (scaledElement) {
                console.log('Removing transform scale from cloned element for capture.');
                scaledElement.style.transform = 'none'; 
            } else {
                console.warn('Could not find .print-template element in cloned document to remove scale.');
            }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 612;
      const pdfHeight = 792;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      const pageAspect = pdfWidth / pdfHeight;
      const imgAspect = imgWidth / imgHeight;
      let finalImgWidth, finalImgHeight;

      if (imgAspect > pageAspect) {
        finalImgWidth = pdfWidth;
        finalImgHeight = pdfWidth / imgAspect;
      } else {
        finalImgHeight = pdfHeight;
        finalImgWidth = pdfHeight * imgAspect;
      }

      const xPos = (pdfWidth - finalImgWidth) / 2;
      const yPos = (pdfHeight - finalImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, finalImgWidth, finalImgHeight);

      const pdfDataUri = pdf.output('datauristring');
      console.log("PDF data URI generated."); 
      return pdfDataUri;
      
    } catch (err) {
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
