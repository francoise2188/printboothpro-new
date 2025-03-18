import sharp from 'sharp';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageData, type = 'display' } = await request.json();

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Process settings
    const settings = type === 'print' ? {
      saturation: 0.8,    // Reduce saturation by 20%
      gamma: 1.1,         // Slightly adjust gamma
      quality: 95,        // High quality for printing
      brightness: 1.05,   // Slightly increase brightness
      contrast: 1.1       // Slightly increase contrast
    } : {
      saturation: 0.9,    // Reduce saturation by 10%
      gamma: 1.0,         // Normal gamma
      quality: 85,        // Good quality for web
      brightness: 1.0,    // Normal brightness
      contrast: 1.05      // Slight contrast boost
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