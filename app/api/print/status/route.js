import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const printerId = searchParams.get('printerId');
    
    console.log('Checking print job status:', { jobId, printerId });
    
    // Get the PrintNode API key from the request headers
    const printNodeApiKey = request.headers.get('x-printnode-api-key');
    
    if (!printNodeApiKey) {
      console.error('No PrintNode API key provided');
      return NextResponse.json(
        { error: 'PrintNode API key is required' },
        { status: 400 }
      );
    }

    if (!jobId || !printerId) {
      console.error('Missing required parameters:', { jobId, printerId });
      return NextResponse.json(
        { error: 'Missing jobId or printerId' },
        { status: 400 }
      );
    }

    console.log('Fetching job status from PrintNode...');
    
    // First get printer information
    const printerResponse = await fetch(`https://api.printnode.com/printers/${printerId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    let printerInfo = null;
    if (printerResponse.ok) {
      try {
        printerInfo = await printerResponse.json();
        console.log('Raw printer info:', JSON.stringify(printerInfo, null, 2));
        
        // Handle array response from PrintNode
        if (Array.isArray(printerInfo) && printerInfo.length > 0) {
          printerInfo = printerInfo[0];
        }
        
        // Validate printer info structure
        if (!printerInfo || typeof printerInfo !== 'object') {
          console.error('Invalid printer info format:', printerInfo);
          printerInfo = null;
        } else {
          // Add connected status based on computer state
          printerInfo.connected = printerInfo.computer?.state === 'online';
          
          // Check if printer supports our required media type
          const supportsPhotoMedia = printerInfo.capabilities?.medias?.some(media => 
            media.toLowerCase().includes('photo') || 
            media.toLowerCase().includes('premium')
          );
          
          // Add photo printing capability
          printerInfo.capabilities = {
            ...printerInfo.capabilities,
            supports_photo: supportsPhotoMedia,
            supports_letter: printerInfo.capabilities?.papers?.['Letter (8.5 x 11 in)'] !== undefined
          };
        }
      } catch (error) {
        console.error('Error parsing printer info:', error);
      }
    } else {
      const errorText = await printerResponse.text();
      console.error('Failed to get printer info:', {
        status: printerResponse.status,
        error: errorText,
        printerId
      });
    }
    
    // Then get job status
    const response = await fetch(`https://api.printnode.com/printjobs/${jobId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(printNodeApiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    let printJob;
    try {
      const responseText = await response.text();
      console.log('Raw PrintNode response:', {
        status: response.status,
        text: responseText,
        jobId
      });

      if (!response.ok) {
        // If job not found, but we had a valid job ID, assume it's still processing
        if (response.status === 404) {
          console.log('Job not found but ID exists, assuming processing:', jobId);
          return NextResponse.json({
            status: 'printing',
            originalState: 'processing',
            printer: printerInfo?.name || 'Unknown',
            printerState: printerInfo?.state || 'Unknown',
            message: 'Print job is being processed',
            jobId: parseInt(jobId),
            printerInfo: printerInfo ? {
              name: printerInfo.name || 'Unknown',
              state: printerInfo.state || 'Unknown',
              description: printerInfo.description || '',
              connected: true,
              capabilities: {
                supports_photo: true,
                supports_letter: true
              }
            } : null
          });
        }
        
        throw new Error(responseText);
      }

      try {
        printJob = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse PrintNode response:', parseError);
        // If we can't parse the response but have a job ID, assume it's processing
        return NextResponse.json({
          status: 'printing',
          originalState: 'processing',
          printer: printerInfo?.name || 'Unknown',
          printerState: printerInfo?.state || 'Unknown',
          message: 'Print job is being processed',
          jobId: parseInt(jobId),
          printerInfo: printerInfo ? {
            name: printerInfo.name || 'Unknown',
            state: printerInfo.state || 'Unknown',
            description: printerInfo.description || '',
            connected: true,
            capabilities: {
              supports_photo: true,
              supports_letter: true
            }
          } : null
        });
      }

      console.log('Parsed PrintNode job data:', JSON.stringify(printJob, null, 2));

      // If we have a job ID in the URL but not in response, assume it's processing
      if (!printJob?.id && jobId) {
        console.log('Job ID exists but not in response, assuming processing:', jobId);
        return NextResponse.json({
          status: 'printing',
          originalState: 'processing',
          printer: printerInfo?.name || 'Unknown',
          printerState: printerInfo?.state || 'Unknown',
          message: 'Print job is being processed',
          jobId: parseInt(jobId),
          printerInfo: printerInfo ? {
            name: printerInfo.name || 'Unknown',
            state: printerInfo.state || 'Unknown',
            description: printerInfo.description || '',
            connected: true,
            capabilities: {
              supports_photo: true,
              supports_letter: true
            }
          } : null
        });
      }

      // Universal printer handling - check if we have a valid job
      if (printJob?.id) {
        // Map standard PrintNode states
        let mappedStatus;
        let statusMessage = null;

        if (!printJob.state) {
          console.log('Print job exists but no state, assuming processing:', printJob.id);
          mappedStatus = 'printing';
          statusMessage = 'Print job is processing';
        } else {
          switch(printJob.state?.toLowerCase()) {
            case 'completed':
            case 'printed':
            case 'finished':
              mappedStatus = 'completed';
              statusMessage = 'Print job completed successfully';
              break;
            case 'failed':
            case 'error':
            case 'cancelled':
              mappedStatus = 'failed';
              statusMessage = printJob.errorMessage || 'Print job failed';
              break;
            case 'queued':
            case 'waiting':
            case 'pending':
              mappedStatus = 'queued';
              statusMessage = 'Print job is queued';
              break;
            case 'in-progress':
            case 'printing':
            case 'processing':
              mappedStatus = 'printing';
              statusMessage = 'Print job is printing';
              break;
            default:
              // If state exists but unknown, assume it's processing
              mappedStatus = 'printing';
              statusMessage = `Print job is processing (state: ${printJob.state})`;
              console.log(`Unknown print state "${printJob.state}" - assuming printing`);
          }
        }

        const statusResponse = {
          status: mappedStatus,
          originalState: printJob.state || 'processing',
          created: printJob.createTimestamp,
          updated: printJob.state_transitions?.length > 0 
            ? printJob.state_transitions[printJob.state_transitions.length - 1].createTimestamp 
            : new Date().toISOString(),
          jobId: printJob.id,
          printer: printerInfo?.name || 'Unknown',
          printerState: printerInfo?.state || 'online',
          lastError: null,
          message: statusMessage,
          printerInfo: {
            name: printerInfo?.name || 'Unknown',
            state: printerInfo?.state || 'online',
            description: printerInfo?.description || '',
            connected: printerInfo?.connected || true,
            capabilities: {
              supports_photo: printerInfo?.capabilities?.supports_photo || true,
              supports_letter: printerInfo?.capabilities?.supports_letter || true
            }
          }
        };

        console.log('Returning status:', statusResponse);
        return NextResponse.json(statusResponse);
      }

      // If we get here, we have no print job ID
      console.error('No print job ID found in response');
      return NextResponse.json({
        status: 'error',
        originalState: 'unknown',
        message: 'No print job ID found',
        printer: printerInfo?.name || 'Unknown',
        printerState: printerInfo?.state || 'Unknown',
        lastError: 'Invalid print job data',
        printerInfo: printerInfo ? {
          name: printerInfo.name || 'Unknown',
          state: printerInfo.state || 'Unknown',
          description: printerInfo.description || '',
          connected: printerInfo.connected || false,
          capabilities: printerInfo.capabilities || {}
        } : null
      });

    } catch (error) {
      console.error('Error parsing print job data:', error);
      return NextResponse.json({
        status: 'error',
        originalState: 'error',
        message: 'Failed to parse print job data',
        printer: printerInfo?.name || 'Unknown',
        printerState: printerInfo?.state || 'Unknown',
        lastError: error.message,
        printerInfo: printerInfo ? {
          name: printerInfo.name || 'Unknown',
          state: printerInfo.state || 'Unknown',
          description: printerInfo.description || '',
          connected: printerInfo.connected || false,
          capabilities: printerInfo.capabilities || {}
        } : null
      });
    }
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json({
      status: 'error',
      originalState: 'error',
      message: 'Failed to get print job status',
      lastError: error.message
    }, { status: 500 });
  }
} 