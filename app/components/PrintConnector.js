"use client"; // Still needed because we use hooks and browser APIs

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Wrap component definition in forwardRef
const PrintConnector = forwardRef(({ onGeneratePdf, onReady }, ref) => { // Added ref parameter and onReady prop
  // State to hold the WebSocket object
  const [ws, setWs] = useState(null);
  // State to display connection status or messages from helper
  const [helperStatus, setHelperStatus] = useState("Not Connected");
  const [isSending, setIsSending] = useState(false); // State to disable button during send
  // Using useRef to avoid re-creating WebSocket on every render
  const wsRef = useRef(null);

  // *** NEW STATE: For printer list and selection ***
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(''); // Store selected printer name or ID

  // This effect runs once when the component mounts (appears on the page)
  useEffect(() => {
    // Only try to connect if we haven't already
    if (!wsRef.current) {
      console.log("Attempting to connect to WebSocket helper...");
      setHelperStatus("Connecting...");

      // Create the WebSocket connection
      const socket = new WebSocket('ws://localhost:8080'); // Connects to your helper app

      // --- WebSocket Event Handlers ---
      socket.onopen = () => {
        console.log("WebSocket connection established");
        setHelperStatus("Connected to Helper App");
        wsRef.current = socket;
        setWs(socket);

        // --- Call onReady callback if provided ---
        if (typeof onReady === 'function') {
          console.log("Calling onReady callback...");
          onReady();
        }
        // ------------------------------------------

        // Request printer list on connect
        console.log("Requesting printer list from helper...");
        const message = { command: "GET_PRINTERS" };
        socket.send(JSON.stringify(message));
        setHelperStatus("Connected. Getting printer list...");
      };

      socket.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data);
          console.log("Message from helper:", messageData);

          // *** NEW: Handle PRINTER_LIST response ***
          if (messageData.status === "PRINTER_LIST" && Array.isArray(messageData.printers)) {
            console.log("Received printer list:", messageData.printers);
            setAvailablePrinters(messageData.printers);
            // Auto-select first printer or a default if desired
            if (messageData.printers.length > 0) {
              // You might want to load/save the last selected printer from localStorage here
              const savedPrinter = localStorage.getItem('selectedPrinterName');
              const foundSaved = messageData.printers.find(p => p.name === savedPrinter);
              setSelectedPrinter(foundSaved ? savedPrinter : (messageData.printers[0]?.name || '')); // Select first printer by name
              setHelperStatus(`Connected. Printers loaded (${messageData.printers.length}).`);
            } else {
              setHelperStatus("Connected. No printers reported by helper.");
              setAvailablePrinters([]); // Ensure it's an empty array
              setSelectedPrinter('');
            }
          } else if (messageData.status === 'success' || messageData.status === 'error' || messageData.status === 'info' || messageData.status === 'processing' || messageData.status === 'printing') {
            setHelperStatus(`Helper: ${messageData.message}`);
            // Re-enable button only on final success/error/info
            if (messageData.status !== 'processing' && messageData.status !== 'printing') {
              setIsSending(false);
            }
          } else {
            // Handle other messages (like print status updates later)
            setHelperStatus(`Helper says: ${messageData.message || 'Unknown status'}`);
            setIsSending(false); // Assume final state if unknown status
          }
        } catch (error) {
          console.error("Received non-JSON message or parse error:", event.data);
          setHelperStatus("Received unreadable message from helper");
          setIsSending(false);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
        setHelperStatus("Disconnected from Helper App");
        wsRef.current = null;
        setWs(null);
        setIsSending(false);
        setAvailablePrinters([]); // Clear printers on disconnect
        setSelectedPrinter('');
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setHelperStatus("Error connecting to Helper App (is it running?)");
        wsRef.current = null;
        setWs(null);
        setIsSending(false);
        setAvailablePrinters([]); // Clear printers on error
        setSelectedPrinter('');
      };
    }

    // --- Cleanup function ---
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection");
        wsRef.current.close();
      }
    };
  }, []); // Runs once on mount

  // *** UPDATE Function to generate PDF and send via WebSocket ***
  const sendPrintJob = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not connected. Cannot send message.");
      setHelperStatus("Cannot send: Not connected to helper.");
      return false; // Return status
    }
    if (typeof onGeneratePdf !== 'function') {
      console.error("onGeneratePdf prop is not a function!");
      alert("Error: Print function not available.");
      return false;
    }
    // *** NEW: Check if a printer is selected ***
    if (!selectedPrinter) {
       alert("Please select a printer from the dropdown first.");
       return false;
    }

    setIsSending(true);
    setHelperStatus("Generating PDF data...");

    try {
      const pdfDataUri = await onGeneratePdf(); // Call the function passed from parent

      if (!pdfDataUri) {
        console.log("PDF generation cancelled or failed.");
        setHelperStatus("PDF generation failed or was cancelled.");
        setIsSending(false);
        return false;
      }

      console.log("Sending PRINT command with PDF data and selected printer to helper...");
      const message = {
        command: "PRINT",
        data: pdfDataUri,
        // *** NEW: Include selected printer name ***
        printerName: selectedPrinter
      };
      ws.send(JSON.stringify(message));
      setHelperStatus(`Sent PRINT command for printer: ${selectedPrinter}`);
      // Keep isSending true until response or error
      return true; // Indicate sending initiated

    } catch (error) {
      console.error("Error during PDF generation or sending:", error);
      setHelperStatus("Error preparing print job.");
      setIsSending(false);
      return false; // Indicate error
    }
  };

  // *** NEW: Save selected printer to localStorage ***
  useEffect(() => {
    if (selectedPrinter) {
      localStorage.setItem('selectedPrinterName', selectedPrinter);
    }
  }, [selectedPrinter]);

  // Expose the sendPrintJob function via the ref
  useImperativeHandle(ref, () => ({
    triggerPrint: sendPrintJob,
  }));

  // This component renders the status display and the button
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', marginTop: '20px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
      <h3>Print Helper Connection</h3>
      <p>
        Status: <strong>{helperStatus}</strong>
      </p>

      {/* *** NEW: Printer Selection Dropdown *** */}
      <div style={{ margin: '10px 0' }}>
        <label htmlFor="printerSelect" style={{ marginRight: '10px' }}>Select Printer:</label>
        <select
          id="printerSelect"
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          disabled={!ws || ws.readyState !== WebSocket.OPEN || availablePrinters.length === 0}
          style={{ padding: '5px' }}
        >
          <option value="">{availablePrinters.length === 0 ? '(No printers found)' : '-- Select --'}</option>
          {/* Assuming helper sends back { name: 'Printer Name', id: 123 } or similar */}
          {availablePrinters.map((printer) => (
            <option key={printer.name} value={printer.name}>
              {printer.displayName || printer.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={sendPrintJob}
        style={{ padding: '8px 15px', fontSize: '14px', cursor: 'pointer' }}
        disabled={!ws || ws.readyState !== WebSocket.OPEN || isSending || !selectedPrinter} // Also disable if no printer selected
      >
        {isSending ? 'Sending...' : 'Send Print Job via Helper'}
      </button>
    </div>
  );
});

// IMPORTANT: Export the forwarded ref component
export default PrintConnector; 