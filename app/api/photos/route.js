import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log('🚨 Starting photo upload process...');
  
  try {
    const { photo, saveToDatabase = true, eventId = null, status = 'pending', source = 'guest', email = null } = await request.json();
    
    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'No photo data provided' },
        { status: 400 }
      );
    }

    if (eventId) {
      // Check event photo limit
      const { data: eventData, error: eventError } = await supabaseServer
        .from('events')
        .select('photo_limit, photos_per_person')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Error fetching event:', eventError);
        throw eventError;
      }

      // Check total event photo limit
      if (eventData.photo_limit) {
        const { count, error: countError } = await supabaseServer
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .is('deleted_at', null);

        if (countError) {
          console.error('❌ Error counting photos:', countError);
          throw countError;
        }

        if (count >= eventData.photo_limit) {
          return NextResponse.json(
            { 
              success: false, 
              message: `This event has reached its photo limit. Please see the event host if you have any questions.`,
              details: {
                limitReached: true
              }
            },
            { status: 400 }
          );
        }
      }

      // Check per-email photo limit if email is provided
      if (email && eventData.photos_per_person !== null) {
        const { data: submissionData, error: submissionError } = await supabaseServer
          .from('photo_submissions')
          .select('submission_count')
          .eq('event_id', eventId)
          .eq('email', email)
          .single();

        if (submissionError && submissionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('❌ Error checking submission count:', submissionError);
          throw submissionError;
        }

        const currentCount = submissionData?.submission_count || 0;
        if (currentCount >= eventData.photos_per_person) {
          return NextResponse.json(
            {
              success: false,
              message: `You have reached your limit of ${eventData.photos_per_person} photos for this event.`,
              details: {
                limitReached: true,
                limitType: 'per_email'
              }
            },
            { status: 400 }
          );
        }
      }
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
      source: source,
      email: email // Add email to photo record
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

    // Update photo submission count if this is an event photo with an email
    if (eventId && email) {
      const { error: upsertError } = await supabaseServer
        .from('photo_submissions')
        .upsert({
          event_id: eventId,
          email: email,
          submission_count: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,email',
          count: 'submission_count + 1'
        });

      if (upsertError) {
        console.error('❌ Error updating submission count:', upsertError);
        // Don't throw here - the photo was saved successfully
      }
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
