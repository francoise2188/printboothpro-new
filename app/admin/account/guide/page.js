'use client';

import { useState, useEffect } from 'react';
import styles from './guide.module.css';

export default function AdminGuidePage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const programOverview = {
    title: 'PrintBooth Pro Overview',
    sections: [
      {
        title: 'What You\'ll Need',
        content: 'Hardware: Windows laptop or desktop (with WiFi), compatible printer (for 2x2 magnet prints), magnet-making equipment. Software: PrintBooth Helper App (Windows only), web browser + internet connection.'
      },
      {
        title: 'Photo Limits Explained',
        content: (
          <div className={styles.setupSteps}>
            <div className={styles.setupContent}>
{`**Why Use Photo Limits?**
• Control costs by limiting total photos per event
• Ensure fair distribution of photos among guests
• Manage printer resources and supplies
• Create different packages (e.g., 2 photos per person)

**Types of Limits You Can Set:**

1. **Total Event Photo Limit**
   • Controls the total number of photos for the entire event
   • Leave empty for unlimited photos
   • Perfect for:
     - Budget control
     - Limited supplies
     - Package-based events
   • Example: Set to 100 for a 50-person event with 2 photos each

2. **Photos Per Person**
   • Controls how many photos each guest can take
   • Two options:
     - Set a specific number (e.g., 2 photos)
     - Enable unlimited photos
   • Perfect for:
     - Package deals
     - VIP guests
     - Open photo booths
   • Example: Set to 2 for a standard package

**How Limits Work:**
• When a guest enters their email:
  - System checks their previous submissions
  - Shows remaining photos they can take
  - Prevents access if they've reached their limit

• For the total event limit:
  - System tracks all photos taken
  - Shows remaining photos for the event
  - Prevents new photos when limit is reached

**Best Practices:**
• For weddings: Consider unlimited photos per person
• For corporate events: Set specific limits per person
• For markets: Use total event limit based on supplies
• For package deals: Match limits to package prices

**Changing Limits:**
• You can adjust limits anytime during the event
• Changes only affect new photo submissions
• Previous photos remain in the system
• Great for extending limits if needed`}
            </div>
          </div>
        )
      },
      {
        title: 'Quick Setup Steps',
        content: (
          <div className={styles.setupSteps}>
            <div className={styles.setupContent}>
{`1. **Download & Install PrintBooth Helper (Windows Only)**
   • Log into your account
   • Go to Account Settings > Download Helper
   • Install on your Windows computer (must be connected to printer)
   • Keep the Helper App running during events for auto-print

   PrintBooth Helper Management:
   • Finding the Helper:
     - Look for the PrintBooth icon in your system tray (bottom right of screen)
     - If you don't see it, check the hidden icons (^ arrow)
     - Double-click the icon to open the Helper window
   
   • If Helper Isn't Running:
     - Open Start Menu
     - Search for "PrintBooth Helper"
     - Click to start the application
     - You should see the icon in your system tray
   
   • Restarting the Helper:
     - Right-click the Helper icon in system tray
     - Click "Exit" or "Close"
     - Wait a few seconds
     - Start the Helper again from Start Menu
     - Check the Template page to confirm connection

2. **Set Up Your Printer**
   • Use 8.5x11" photo paper
   • Confirm printer is connected & working
   • Test a print to ensure proper alignment

3. **Create an Event**
   • Go to your dashboard > "New Event"
   • Fill in event details:
     - Name, date, location
     - Expected guest count
     - Package type and pricing
   • Upload required images:
     - Landing Page Background (1920x1080 JPG/PNG, 5MB max)
       * Can be designed in Canva or any image editor
     - Camera Overlay (2x2", transparent PNG, 5MB max)
       * Can be designed in Canva or any image editor
   • Set photo limits (optional)
   • Download your event QR code

   Event Features Explained:
   • Photo Queue:
     - Shows the next 9 photos waiting to be printed
     - Photos automatically fill the template grid
     - You can drag and drop photos to reorder them
     - Click the X to remove a photo from the queue
     - Click the + to duplicate a photo in the queue
   
   • Reprint Feature:
     - Stores up to 150 past photos
     - Access by clicking "Reprint" button
     - Select any past photo to add to current queue
     - Great for reprints or if a print fails
     - Photos stay available until you end the event

4. **Set Up a Market**
   • Go to Markets > "New Market"
   • Enter market details:
     - Market name and location
     - Operating hours
     - Pricing for magnets
   • Upload required images:
     - Landing Page Background (1920x1080 JPG/PNG, 5MB max)
       * Can be designed in Canva or any image editor
     - Camera Overlay (2x2", transparent PNG, 5MB max)
       * Can be designed in Canva or any image editor
   • Download your market QR code

   Market Order System Explained:
   • How Orders Work:
     - Each customer order creates a new template
     - You'll see a pop-up notification for new orders
     - Current order fills the template automatically
     - Template shows all 9 photos for the order
   
   • Processing Orders:
     - Print the current order's photos
     - Once printed, you can:
       * Click "Clear Template" to remove current order
       * Next order will automatically fill the template
     - Or manually clear to prepare for next order
   
   • Order Management:
     - See all pending orders in the queue
     - Reorder photos within an order if needed
     - Delete photos if customer wants to retake
     - Each order stays in queue until cleared

5. **Set Up Payment Methods**
   • Go to Settings > Payment Settings
   • Add your payment information:
     - PayPal.me username
     - Venmo username (no @ symbol)
   • Set your magnet pricing
   • Enable/disable tax collection
   • Set tax rate if enabled

6. **Test Your Setup**
   • Scan the QR code with your phone
   • Take a test photo
   • Verify the print process
   • Check payment flow (for markets)

Common Issues & Solutions:
• Printer Not Connecting:
  - Check if printer is turned on and connected
  - Verify paper is loaded correctly
  - Try restarting the PrintBooth Helper
  - Check printer settings in Windows
  - Make sure correct printer is selected in Helper

• Photos Not Appearing in Queue:
  - Check if PrintBooth Helper is running
  - Verify internet connection
  - Try refreshing the template page
  - Check if photos are being taken successfully
  - Look for any error messages in Helper

• Payment Issues:
  - Verify PayPal.me username is correct
  - Check Venmo username (no @ symbol)
  - Ensure prices are set correctly
  - Test payment flow in preview mode
  - Check customer's payment method

• Template Alignment Problems:
  - Verify printer paper size is 8.5x11"
  - Check printer settings for margins
  - Test print alignment using test button
  - Adjust template settings if needed
  - Make sure camera overlay size is correct

Need More Help?
• Check the FAQ section
• Contact support at support@printboothpro.com
• Visit our help center at help.printboothpro.com`}
            </div>
          </div>
        )
      },
      {
        title: 'Photo Limits & Controls',
        content: 'Set flexible photo limits for your events: Total Event Photo Limit (optional) - Control the total number of photos for the entire event. Photos Per Person - Set a specific limit per person or enable unlimited photos. Perfect for controlling costs and managing guest experience.'
      },
      {
        title: 'Guest Photo Experience',
        content: 'At the event: Guests scan the QR code, camera opens on their phone with overlay, countdown + photo preview, they click "Make My Magnet!" → It auto-sends to your computer & prints!'
      },
      {
        title: 'Printing System & Template Workflow',
        content: 'Template: 3x3 photo grid auto-fills, drag & drop to rearrange, add watermark/email branding, preview before printing → Photos print automatically. Queue: See next 9 photos waiting, reorder or delete photos, reprint up to 150 past photos.'
      },
      {
        title: 'Payments & Pricing',
        content: 'Supported Methods: PayPal (enter your PayPal.me username), Venmo (enter your Venmo username—no @ symbol). Pricing Tiers: Set prices for 1, 3, 6, or 9 magnets (in dollars + cents), option to enable tax collection, set your tax rate (%) in Settings.'
      },
      {
        title: 'Admin Dashboard Features',
        content: 'View active events & photo counts, monitor print queue, access and share QR codes, manage printer settings, customize invoice details (business name, logo, terms).'
      },
      {
        title: 'Troubleshooting Tips',
        content: 'Not printing? Make sure Helper App is running. Wrong prints? Check template size or printer alignment. Queue stuck? Clear old photos and restart the Helper App.'
      },
      {
        title: 'Support',
        content: 'Need help? Check the FAQ or contact support at support@printboothpro.com. We\'re here to help your business stick. 😉'
      }
    ]
  };

  const gettingStartedSteps = [
    {
      title: 'Download & Install Print Booth Helper',
      description: 'Go to Account Settings and download the Print Booth Helper application installer. Install it on the Windows computer connected to your printer.',
      link: '/admin/account'
    },
    {
      title: 'Run the Print Booth Helper',
      description: 'Launch the Print Booth Helper application after installation. Keep it running in the background during events to enable printing from the website.',
    },
    {
      title: 'Set Up Your First Event',
      description: 'Create an event with custom settings, backgrounds, and overlays. Test the QR code and preview the guest experience.',
      link: '/admin/events'
    }
  ];

  const features = [
    {
      title: 'Event Management',
      description: 'Create and manage events with customizable settings. Each event can be either prepaid or market-style, with different payment and printing options.'
    },
    {
      title: 'Professional Photo Printing',
      description: 'High-quality 2x2 inch prints at 300 DPI for sharp, professional results. Photos are automatically arranged in a 3x3 grid for efficient printing.'
    },
    {
      title: 'Automated Workflow',
      description: 'Photos automatically print during events when the Print Booth Helper app is running and connected, letting you focus on creating magnets and interacting with guests. The queue system ensures smooth processing.'
    },
    {
      title: 'Real-time Preview',
      description: 'See live previews of photos before printing to ensure quality. Monitor the print queue and status in real-time.'
    }
  ];

  const setupSteps = [
    {
      title: '1. Print Booth Helper Setup',
      steps: [
        'Go to Account Settings in PrintBooth Pro.',
        'Download the Print Booth Helper application installer using the link provided.',
        'Run the downloaded `.exe` file on the Windows computer connected to your event printer.',
        'Follow the installation wizard steps (click "More info" -> "Run anyway" if Windows SmartScreen appears).',
        'After installation, run "Print Booth Helper" from your Start Menu.',
        'The helper application window will appear. Keep this application running during your events.',
        'Go to the Template page in PrintBooth Pro.',
        'The "Print Helper Connection" box should show "Connected" and load your printer list.',
        'Select the desired printer from the dropdown in the connection box.',
        'This selected printer will be used for both automatic and manual prints initiated from the Template page.',
        'Check that your printer is set to Letter size (8.5x11 inches).',
        'Test print before each event using the "Print Template Now" button.'
      ]
    },
    {
      title: '2. Event Setup',
      steps: [
        'Go to Events in the admin menu',
        'Click "Create New Event"',
        'Enter event details:',
        '- Event name, date, and time',
        '- Venue and address',
        '- Expected guest count',
        '- Package type and pricing',
        'Set photo limits:',
        '- Total Event Photo Limit (optional) - Leave empty for unlimited',
        '- Photos Per Person - Set a number or check "Unlimited"',
        'Customize event appearance:',
        '- Upload landing page background (1920x1080 pixels)',
        '- Add camera overlay (50.8mm x 50.8mm)',
        'Generate and test the event QR code',
        'Preview the event link in your browser',
        'Ensure the Print Booth Helper application is running'
      ]
    },
    {
      title: '3. Template Management',
      steps: [
        'Select your event from the template dropdown',
        'Enter your website/email for photo watermarks',
        'Verify the Print Booth Helper connection status and selected printer.',
        'Toggle auto-print on/off as needed',
        'Monitor the photo queue at the bottom',
        'Use the reprint feature if needed (stores up to 150 photos)',
        'Manage photos in template:',
        '- Use X to delete photos',
        '- Use + to duplicate photos',
        'Watch the Helper Connection status box for print progress/errors.'
      ]
    },
    {
      title: '4. During the Event',
      steps: [
        'Ensure the Print Booth Helper application is running',
        'Monitor the Template page for connection status and print progress',
        'Keep track of paper and ink levels',
        'Watch for any error messages (check browser console and helper app if needed)',
        'Process photos in order as they come in',
        'Maintain organization of printed photos',
        'Monitor QR code access if time-limiting needed',
        'Keep backup supplies readily available'
      ]
    }
  ];

  const faqs = [
    {
      question: 'What are the exact photo specifications?',
      answer: 'Photos are printed at 2x2 inches (50.8mm x 50.8mm) at 300 DPI for professional quality. They are arranged in a 3x3 grid on standard Letter size paper (8.5x11 inches). Landing page backgrounds should be 1080x1920 pixels, and camera overlays should match the photo size of 50.8mm x 50.8mm.'
    },
    {
      question: 'How do I set up the Print Booth Helper?',
      answer: 'Go to Account Settings, download the installer, and run it on the Windows computer connected to your printer. Launch the application after installation. It needs to remain running during events. The connection status and printer selection will appear on the Template page when the helper is running.'
    },
    {
      question: 'How does the automated printing work?',
      answer: 'The Print Booth Helper application must be running on your computer during events and connected via the Template page. When guests take photos, they automatically fill the template grid. With auto-print enabled, full templates print automatically using the printer selected in the connection box. The queue system manages additional incoming photos.'
    },
    {
      question: 'How do I manage event QR codes?',
      answer: 'Each event gets a unique QR code that you can print and display. You can activate/deactivate the QR code to control access - when deactivated, guests will see an "event has ended" message. You can also preview how the event looks by testing the event link in your browser.'
    },
    {
      question: 'What should I prepare before an event?',
      answer: 'Ensure the Print Booth Helper application is installed and running on the correct computer, test the printer connection via the Template page, verify paper size is set to Letter (8.5x11"), prepare backup supplies, test the event QR code, check your landing page and overlays look correct, and verify your website/email watermark in the template.'
    },
    {
      question: 'How do photo limits work?',
      answer: 'You can set two types of limits for your events: 1) Total Event Photo Limit - Controls the total number of photos for the entire event (leave empty for unlimited). 2) Photos Per Person - Controls how many photos each guest can take (set a number or enable unlimited). The system will automatically enforce these limits and show appropriate messages to guests when limits are reached.'
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Guide</h1>
      
      <div className={styles.navigation}>
        <button 
          className={`${styles.navButton} ${activeSection === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          PrintBooth Pro Overview
        </button>
        <button 
          className={`${styles.navButton} ${activeSection === 'getting-started' ? styles.active : ''}`}
          onClick={() => setActiveSection('getting-started')}
        >
          Getting Started
        </button>
        <button 
          className={`${styles.navButton} ${activeSection === 'features' ? styles.active : ''}`}
          onClick={() => setActiveSection('features')}
        >
          Features
        </button>
        <button 
          className={`${styles.navButton} ${activeSection === 'setup' ? styles.active : ''}`}
          onClick={() => setActiveSection('setup')}
        >
          Setup Guide
        </button>
        <button 
          className={`${styles.navButton} ${activeSection === 'faq' ? styles.active : ''}`}
          onClick={() => setActiveSection('faq')}
        >
          FAQ
        </button>
      </div>

      <div className={styles.content}>
        {activeSection === 'overview' && (
          <div className={styles.section}>
            <h2>{programOverview.title}</h2>
            <div className={styles.overviewGrid}>
              {programOverview.sections.map((section, index) => (
                <div key={index} className={styles.overviewCard}>
                  <h3>{section.title}</h3>
                  {typeof section.content === 'string' ? (
                    <p>{section.content}</p>
                  ) : (
                    section.content
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'getting-started' && (
          <div className={styles.section}>
            <h2>Getting Started Checklist</h2>
            <div className={styles.checklist}>
              {gettingStartedSteps.map((step, index) => (
                <div key={index} className={styles.checklistItem}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {step.link && (
                    <a href={step.link} className={styles.linkButton}>Go to Page</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'features' && (
          <div className={styles.section}>
            <h2>Key Features</h2>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'setup' && (
          <div className={styles.section}>
            <h2>Setup Guide</h2>
            {setupSteps.map((section, index) => (
              <div key={index} className={styles.setupSection}>
                <h3>{section.title}</h3>
                <ol className={styles.stepsList}>
                  {section.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'faq' && (
          <div className={styles.section}>
            <h2>Frequently Asked Questions</h2>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 