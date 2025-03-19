import sharp from 'sharp';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageData, type = 'display' } = await request.json();

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Process settings - restored to normal now that printer settings are correct
    const settings = type === 'print' ? {
      saturation: 1.0,    // Normal saturation
      gamma: 1.0,         // Normal gamma
      quality: 95,        // High quality for printing
      brightness: 1.0,    // Normal brightness
      contrast: 1.0       // Normal contrast
    } : {
      saturation: 1.0,    // Normal display settings
      gamma: 1.0,
      quality: 85,
      brightness: 1.0,
      contrast: 1.0
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