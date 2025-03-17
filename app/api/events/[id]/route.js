import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Create Supabase client
const supabase = createClient(
  'https://maupxocrkqnsfaaprqyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdXB4b2Nya3Fuc2ZhYXBycXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwODQwMzIsImV4cCI6MjA0NTY2MDAzMn0.vHIcIHyDMkSN_KS2zd5px_vbi4GcxE0D-xx-mNFSOdY'
);

// Update event
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Get the authenticated user using cookies from the request
    const cookieStore = await cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    
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
    
    // First update the event details
    const updateData = {
      name: body.name,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status,
      event_type: body.event_type,
      location: body.location,
      address: body.address,
      expected_guests: body.expected_guests,
      package: body.package,
      package_price: body.package_price,
      photo_limit: body.photo_limit
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    console.log('Updating event with data:', updateData);

    // Add user_id check to ensure user owns this event
    const { data: eventData, error: eventError } = await supabaseServer
      .from('events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (eventError) {
      console.error('Error updating event:', eventError);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    if (!eventData) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    // Then handle design settings if provided
    if (body.landing_background !== undefined || body.frame_overlay !== undefined) {
      try {
        // First check if design settings exist
        const { data: existingDesigns, error: checkError } = await supabaseServer
          .from('design_settings')
          .select('id')
          .eq('event_id', id);

        if (checkError) {
          console.error('Error checking existing design settings:', {
            error: checkError,
            message: checkError.message,
            details: checkError.details
          });
          throw checkError;
        }

        const existingDesign = existingDesigns?.[0];

        console.log('Existing design check:', {
          exists: !!existingDesign,
          id: existingDesign?.id
        });

        const designData = {
          event_id: id,
          landing_background: body.landing_background,
          frame_overlay: body.frame_overlay,
          updated_at: new Date().toISOString()
        };

        let designResult;
        if (existingDesign) {
          // Update existing design settings
          console.log('Updating existing design settings for ID:', existingDesign.id);
          designResult = await supabaseServer
            .from('design_settings')
            .update(designData)
            .eq('id', existingDesign.id)
            .select()
            .single();
        } else {
          // Insert new design settings
          console.log('Inserting new design settings for event:', id);
          designResult = await supabaseServer
            .from('design_settings')
            .insert([designData])
            .select()
            .single();
        }

        if (designResult.error) {
          console.error('Error in design settings operation:', {
            operation: existingDesign ? 'update' : 'insert',
            error: designResult.error,
            message: designResult.error.message,
            details: designResult.error.details,
            code: designResult.error.code,
            hint: designResult.error.hint
          });
          throw designResult.error;
        }

        // Fetch the updated event with design settings
        const { data: updatedEvent, error: fetchError } = await supabaseServer
          .from('events')
          .select('*, design_settings(*)')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching updated event:', fetchError);
          throw fetchError;
        }

        return NextResponse.json({ 
          event: updatedEvent,
          message: 'Event updated successfully' 
        });

      } catch (error) {
        console.error('Error in design settings update:', error);
        return NextResponse.json(
          { error: 'Failed to update design settings', details: error.message },
          { status: 500 }
        );
      }
    }

    // If no design settings were updated, return the event as is
    return NextResponse.json({ 
      event: eventData,
      message: 'Event updated successfully' 
    });
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Get event
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Get the authenticated user using cookies from the request
    const cookieStore = await cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication failed', details: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Fetch the event with design settings and user_id check
    const { data: event, error: eventError } = await supabaseServer
      .from('events')
      .select('*, design_settings(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (eventError) {
      console.error('Database error:', eventError);
      return NextResponse.json(
        { error: 'Failed to fetch event', details: eventError.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Unexpected error in GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Delete event
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log('Starting deletion for event:', id);

    // Get the authenticated user using cookies from the request
    const cookieStore = cookies();
    const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser();
    
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

    // First verify the user owns this event
    const { data: event, error: eventCheckError } = await supabaseServer
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (eventCheckError) {
      console.error('Error checking event ownership:', eventCheckError);
      return NextResponse.json(
        { error: 'Failed to verify event ownership' },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    // Delete in this order:
    // 1. Delete photos from storage
    // 2. Delete photo records from 'photos' table
    // 3. Delete design settings
    // 4. Delete event record

    // 1. Get and delete photos from storage
    const { data: photos, error: photosError } = await supabaseServer
      .from('photos')  // Changed from event_photos to photos
      .select('photo_url')
      .eq('event_id', id);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      // Don't return error, continue with other deletions
      console.log('Continuing deletion process despite photo fetch error');
    }

    // Delete photo files from storage if they exist
    if (photos && photos.length > 0) {
      console.log('Found photos to delete:', photos.length);
      
      // Extract just the file paths from the full URLs
      const photoUrls = photos
        .map(p => {
          if (!p.photo_url) return null;
          // Remove the storage URL prefix to get just the file path
          const match = p.photo_url.match(/photos\/.*$/);  // Updated regex pattern
          return match ? match[0] : null;
        })
        .filter(Boolean);

      console.log('Attempting to delete photos:', photoUrls);

      if (photoUrls.length > 0) {
        const { error: storageError } = await supabaseServer.storage
          .from('photos')
          .remove(photoUrls);

        if (storageError) {
          console.error('Error deleting photos from storage:', storageError);
          // Continue with deletion even if storage cleanup fails
          console.log('Continuing deletion process despite storage cleanup error');
        } else {
          console.log('Successfully deleted photos from storage');
        }
      }
    }

    // 2. Delete photo records
    const { error: photoDeleteError } = await supabaseServer
      .from('photos')  // Changed from event_photos to photos
      .delete()
      .eq('event_id', id);

    if (photoDeleteError) {
      console.error('Error deleting photo records:', photoDeleteError);
      // Continue with other deletions
      console.log('Continuing deletion process despite photo records deletion error');
    } else {
      console.log('Successfully deleted photo records');
    }

    // 3. Delete design settings
    const { error: designDeleteError } = await supabaseServer
      .from('design_settings')
      .delete()
      .eq('event_id', id);

    if (designDeleteError) {
      console.error('Error deleting design settings:', designDeleteError);
      // Continue with deletion even if design settings cleanup fails
      console.log('Continuing deletion process despite design settings deletion error');
    } else {
      console.log('Successfully deleted design settings');
    }

    // 4. Finally delete the event
    const { error: deleteError } = await supabaseServer
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    console.log('Successfully deleted event and all associated data');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}