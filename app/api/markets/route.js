import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);

    const { data, error } = await supabase
      .from('markets')
      .insert({
        name: body.name,
        upload_limit: body.uploadLimit,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully created market:', data);

    return NextResponse.json({
      success: true,
      marketId: data[0].id,
      market: data[0]
    });

  } catch (error) {
    console.error('Detailed market creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create market',
        details: JSON.stringify(error)
      },
      { status: 500 }
    );
  }
}