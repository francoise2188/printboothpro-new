import { NextResponse } from 'next/server';

// Get list of printers
export async function GET(request) {
  try {
    // Get the PrintNode API key from the request headers
    const printNodeApiKey = request.headers.get('x-printnode-api-key');
    console.log('Received request for printers with API key:', printNodeApiKey ? 'Present' : 'Missing');
    
    if (!printNodeApiKey) {
      console.error('No PrintNode API key provided in headers');
      return NextResponse.json(
        { success: false, message: 'PrintNode API key is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to connect to PrintNode...');

    // Call PrintNode API directly
    const response = await fetch('https://api.printnode.com/printers', {
      headers: {
        'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`
      }
    });

    console.log('PrintNode response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PrintNode API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to connect to PrintNode. Please check your API key.' },
        { status: response.status }
      );
    }

    const printers = await response.json();
    console.log('Received printers from PrintNode:', printers);

    if (!Array.isArray(printers)) {
      console.error('Unexpected response format from PrintNode:', printers);
      return NextResponse.json(
        { success: false, message: 'Unexpected response from PrintNode' },
        { status: 500 }
      );
    }

    // Format the printer data
    const formattedPrinters = printers.map(printer => ({
      id: printer.id,
      name: printer.name,
      description: printer.description || printer.name,
      state: printer.state,
      computer: printer.computer?.name || 'Unknown'
    }));

    console.log('Formatted printer data:', formattedPrinters);

    return NextResponse.json({
      success: true,
      printers: formattedPrinters
    });

  } catch (error) {
    console.error('PrintNode API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to connect to PrintNode: ' + error.message
      },
      { status: 500 }
    );
  }
}

// Handle print job
export async function POST(request) {
  try {
    const data = await request.json();
    const { content, printerId, title = 'Print Job' } = data;

    if (!content) {
      console.error('No content provided');
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Ensure printerId is a number and exists
    if (!printerId || isNaN(parseInt(printerId))) {
      console.error('Invalid printer ID:', printerId);
      return NextResponse.json(
        { error: 'Valid Printer ID is required' },
        { status: 400 }
      );
    }

    // Get the PrintNode API key from the request headers
    const printNodeApiKey = request.headers.get('x-printnode-api-key');
    if (!printNodeApiKey) {
      console.error('No PrintNode API key provided');
      return NextResponse.json(
        { error: 'PrintNode API key is required' },
        { status: 400 }
      );
    }

    // Create print job payload with specific settings for your printer
    const printJob = {
      printerId: parseInt(printerId),
      title,
      contentType: "pdf_base64",
      content: content.split(',')[1],
      source: "PrintBooth App",
      options: {
        copies: 1,
        dpi: "300",
        paper: "Letter",
        orientation: "portrait",
        fit_to_page: true,
        scale: 1.0,
        center: true,
        margins: 0,
        color: true,
        media: "stationery",
        quality: "normal",
        duplex: "long-edge",
      }
    };

    // Verify content format
    console.log('Verifying print job content:', {
      contentStart: content.substring(0, 50) + '...',
      base64Start: printJob.content.substring(0, 50) + '...',
      contentLength: content.length,
      base64Length: printJob.content.length,
      hasBase64Prefix: content.startsWith('data:application/pdf;base64,')
    });

    // Log job details for debugging
    console.log('Sending print job to PrintNode:', {
      printerId: printJob.printerId,
      title: printJob.title,
      contentType: printJob.contentType,
      options: printJob.options,
      contentLength: printJob.content.length,
      apiKeyPresent: !!printNodeApiKey
    });

    // Get printer capabilities before sending job
    const printerResponse = await fetch(`https://api.printnode.com/printers/${printerId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`
      }
    });

    if (printerResponse.ok) {
      const printerInfo = await printerResponse.json();
      console.log('Printer capabilities:', {
        name: printerInfo.name,
        state: printerInfo.state,
        capabilities: printerInfo.capabilities,
        description: printerInfo.description
      });
    }

    // Submit print job to PrintNode
    const response = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(printJob)
    });

    // Log the raw response for debugging
    const responseText = await response.text();
    console.log('Raw PrintNode response:', {
      status: response.status,
      body: responseText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      console.error('PrintNode API error:', {
        status: response.status,
        error: responseText,
        printerId: printJob.printerId,
        request: {
          ...printJob,
          content: `${printJob.content.substring(0, 50)}...`
        }
      });
      return NextResponse.json(
        { error: `PrintNode API error: ${responseText}` },
        { status: response.status }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse PrintNode response:', {
        error,
        responseText
      });
      return NextResponse.json({ 
        error: 'Invalid response from PrintNode',
        rawResponse: responseText
      }, { status: 500 });
    }

    // Check if we got a valid job ID back
    if (!responseData || typeof responseData !== 'number') {
      console.error('Invalid job ID received:', responseData);
      return NextResponse.json({ 
        error: 'Invalid job ID received from PrintNode',
        rawResponse: responseData
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      jobId: responseData,
      message: 'Print job created successfully'
    });

  } catch (error) {
    console.error('Print error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 