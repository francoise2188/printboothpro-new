// Process image with optimized settings
export async function processImage(imageData, type = 'display') {
  try {
    const response = await fetch('/api/process-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData,
        type
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process image');
    }

    const data = await response.json();
    return data.processedImage;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

// Process image specifically for print output
export async function processForPrint(imageData) {
  return processImage(imageData, 'print');
}

// Process image for preview/display
export async function processForDisplay(imageData) {
  return processImage(imageData, 'display');
} 