import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if the payment was successful
    if (session.payment_status === 'paid' || session.status === 'complete') {
      return NextResponse.json({
        success: true,
        customerEmail: session.customer_email,
        subscriptionId: session.subscription
      });
    } else {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 