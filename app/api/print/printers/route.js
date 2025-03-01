import { NextResponse } from 'next/server';

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