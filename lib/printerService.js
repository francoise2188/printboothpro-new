class PrinterService {
  async getPrinters() {
    try {
      // Get the API key from localStorage
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const apiKey = settings.printnode_api_key;
      
      if (!apiKey) {
        throw new Error('PrintNode API key not found. Please configure your printer settings.');
      }

      console.log('Getting printers with API key:', apiKey ? 'Present' : 'Missing');

      const response = await fetch('/api/print/printers', {
        headers: {
          'X-PrintNode-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get printers:', errorText);
        throw new Error(`Failed to get printers: ${errorText}`);
      }

      const data = await response.json();
      console.log('Printer service response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get printers');
      }

      return data.printers || [];
    } catch (error) {
      console.error('Error getting printers:', error);
      throw error;
    }
  }

  async sendPrintJob(content, printerId) {
    try {
      // Get the API key from localStorage
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const apiKey = settings.printnode_api_key;
      
      if (!apiKey) {
        throw new Error('PrintNode API key not found. Please configure your printer settings.');
      }

      console.log('Sending print job:', { 
        printerId,
        contentLength: content.length,
        apiKey: apiKey ? 'Present' : 'Missing'
      });

      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PrintNode-API-Key': apiKey
        },
        body: JSON.stringify({
          content,
          printerId: parseInt(printerId),
          title: `PrintBooth Job ${Date.now()}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Print job failed:', errorText);
        throw new Error(`Print failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('Print job response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Print failed');
      }

      return data.jobId;
    } catch (error) {
      console.error('Print job error:', error);
      throw error;
    }
  }

  async getJobStatus(jobId, printerId) {
    try {
      // Get the API key from localStorage
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const apiKey = settings.printnode_api_key;
      
      if (!apiKey) {
        throw new Error('PrintNode API key not found. Please configure your printer settings.');
      }

      console.log('Checking job status:', { jobId, printerId });

      const response = await fetch(`/api/print/status?jobId=${jobId}&printerId=${printerId}`, {
        headers: {
          'X-PrintNode-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Job status check failed:', errorText);
        throw new Error(`Failed to get job status: ${errorText}`);
      }

      const data = await response.json();
      console.log('Job status response:', data);
      
      if (!data.status) {
        throw new Error('Invalid status response from server');
      }

      return data.status;
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }
}

export const printerService = new PrinterService(); 