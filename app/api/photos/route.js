import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log('🚨 Starting photo upload process...');
  
  try {
    const { photo, saveToDatabase = true, eventId = null, status = 'pending', source = 'guest' } = await request.json();
    
    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'No photo data provided' },
        { status: 400 }
      );
    }

    console.log('📸 Processing photo for', eventId ? `event: ${eventId}` : 'direct save');

    // Remove the data:image/jpeg;base64 prefix
    const base64Data = photo.replace(/^data:image\/jpeg;base64,/, '');
    const photoBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename based on whether it's an event photo or not
    const timestamp = Date.now();
    const fileName = eventId 
      ? `event_photos/${eventId}/${timestamp}.jpg`
      : `photos/${timestamp}.jpg`;
    
    console.log('📁 Uploading to:', fileName);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('photos')
      .upload(fileName, photoBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer.storage
      .from('photos')
      .getPublicUrl(fileName);

    console.log('🔗 Generated URL:', publicUrl);

    // If we're just getting the URL (for save to device), return here
    if (!saveToDatabase) {
      return NextResponse.json({ 
        success: true, 
        photo: { url: publicUrl }
      });
    }

    // Prepare photo entry based on whether it's an event photo or not
    const photoEntry = eventId ? {
      event_id: eventId,
      url: publicUrl,
      status: status,
      created_at: new Date().toISOString(),
      template_position: null,
      template_id: null,
      print_status: 'pending',
      storage_status: 'uploaded',
      error_message: null,
      error_timestamp: null,
      source: source
    } : {
      url: publicUrl,
      status: 'pending',
      print_status: 'pending',
      storage_status: 'uploaded',
      created_at: new Date().toISOString(),
      template_position: 1,
    };

    console.log('💾 Saving to database:', photoEntry);

    const { data, error: dbError } = await supabaseServer
      .from('photos')
      .insert([photoEntry])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

    console.log('✅ Photo saved successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Photo saved successfully',
      photo: data
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Error in photo upload process:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message,
        details: error.toString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function GET(request) {
  return NextResponse.json({ message: "API is working!" });
}
