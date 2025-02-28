console.log('Debug - Environment Variables:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  environment: process.env.VERCEL_ENV || 'local'
}); 

import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Get the authenticated user using cookies from the request
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get the event data from the request body
    const body = await request.json();
    
    // Create the event
    const eventData = {
      user_id: user.id,
      name: body.name,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status || 'not_started',
      event_type: body.event_type,
      location: body.location,
      address: body.address,
      expected_guests: body.expected_guests,
      package: body.package,
      package_price: body.package_price,
      photo_limit: body.photo_limit,
      client_name: body.client_name,
      client_email: body.client_email,
      client_phone: body.client_phone
    };

    // Insert the event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      console.error('Error creating event:', eventError);
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }

    // Create default design settings for the event
    const designData = {
      event_id: newEvent.id,
      landing_background: null,
      frame_overlay: null,
      updated_at: new Date().toISOString()
    };

    const { error: designError } = await supabase
      .from('design_settings')
      .insert(designData);

    if (designError) {
      console.error('Error creating design settings:', designError);
      // We don't return an error here since the event was created successfully
      // The design settings can be created later when needed
    }

    // Return the newly created event
    return NextResponse.json({ 
      success: true, 
      event: newEvent,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 