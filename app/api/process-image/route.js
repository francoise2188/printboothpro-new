import sharp from 'sharp';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageData, type = 'display' } = await request.json();

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Process settings - aggressive saturation reduction for glossy paper
    const settings = type === 'print' ? {
      saturation: 0.4,    // Reduce saturation by 60% (aggressive reduction for glossy paper)
      gamma: 1.3,         // Further increase gamma to lighten midtones
      quality: 95,        // Keep high quality for printing
      brightness: 0.9,    // Further reduce brightness for glossy paper
      contrast: 1.0       // Neutral contrast
    } : {
      saturation: 0.9,    // Display settings remain the same
      gamma: 1.0,
      quality: 85,
      brightness: 1.0,
      contrast: 1.05
    };

    // Process image
    const processedBuffer = await sharp(inputBuffer)
      .modulate({
        saturation: settings.saturation,
        brightness: settings.brightness
      })
      .gamma(settings.gamma)
      .linear(settings.contrast, -(128 * (settings.contrast - 1)) / 255)
      .jpeg({ quality: settings.quality })
      .toBuffer();

    // Convert back to base64
    const processedBase64 = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

    return NextResponse.json({ processedImage: processedBase64 });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 