import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create a transporter using SendGrid
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: "apikey", // This is literally the string "apikey"
    pass: process.env.SENDGRID_API_KEY, // Your SendGrid API Key
  },
});

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Send confirmation email with improved template
    await transporter.sendMail({
      from: {
        name: "PrintBooth Pro",
        address: process.env.SENDGRID_FROM_EMAIL
      },
      to: email,
      subject: 'Welcome to PrintBooth Pro! 📸',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FEFAE0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #A16D47; margin-bottom: 10px;">Welcome to PrintBooth Pro! 🎉</h1>
            <p style="color: #666; font-size: 18px; margin-top: 0;">Your virtual photo booth journey begins here</p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Your Account is Ready!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for choosing PrintBooth Pro! We're excited to help you create amazing photo experiences for your events.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Your account has been created successfully, and you're all set to start creating memorable moments.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin" 
               style="background-color: #A16D47; 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px;
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      transition: background-color 0.3s ease;">
              Go to Your Dashboard →
            </a>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #1e293b; margin-top: 0;">What's Next?</h3>
            <ul style="color: #475569; line-height: 1.6; padding-left: 20px;">
              <li>Set up your first event</li>
              <li>Customize your photo booth template</li>
              <li>Start capturing memories!</li>
            </ul>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p>If you didn't create this account, please ignore this email.</p>
            <p style="margin-top: 20px;">
              PrintBooth Pro - Creating Memories, One Click at a Time
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Confirmation email sent successfully'
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
} 