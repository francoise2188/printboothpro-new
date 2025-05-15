import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    // Get the user from Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the customer's Stripe ID from your database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error fetching subscription data' },
        { status: 500 }
      );
    }

    if (!subscription?.stripe_customer_id) {
      console.error('No subscription found for user:', user.id);
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    try {
      // Create a Stripe Customer Portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/account`,
        configuration: 'bpm_1ROhGpHDMDX2JtQdmC3h0QgK', // Your portal configuration ID
      });

      return NextResponse.json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe portal session error:', stripeError);
      
      // If there's an error with the portal session, try the direct portal link
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ 
          url: 'https://billing.stripe.com/p/login/4gM8wP9qq9f2cWh8Bb3gk00'
        });
      }
      
      throw stripeError;
    }
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Error creating portal session' },
      { status: 500 }
    );
  }
} 