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
        title: 'Initial Setup',
        content: 'The first step is setting up PrintNode for automatic printing. Create your free PrintNode account, get your API key, and enter it in Account Settings. This enables the auto-print feature for your events. The PrintNode client must be running on your computer during events for automatic printing to work.'
      },
      {
        title: 'Event Management',
        content: 'Create and manage events with detailed information including event name, date, type, time, expected guests, venue, address, package details, pricing, and photo limits. Customize each event with landing page backgrounds (1920x1080 pixels) and camera overlays (50.8mm x 50.8mm) which can be designed in Canva. Each event gets a unique QR code that can be printed and displayed for guests to access the photo booth.'
      },
      {
        title: 'Photo Template System',
        content: 'The template manager allows you to select events and customize the photo layout. Add your website or email to be printed under each photo. Photos automatically enter the template when guests take them, and with auto-print enabled, full templates print automatically. A queue system manages incoming photos while printing is in progress, and you can reprint up to 150 past photos.'
      },
      {
        title: 'Market Features',
        content: 'Similar to events, markets can be customized with backgrounds and borders. Customers can either take themed photos in the booth or upload their own photos. The market template allows photo adjustments (zoom/pan) before printing, and includes integrated checkout options.'
      },
      {
        title: 'Order Management',
        content: 'Create and manage orders with customer details, shipping information, and photo specifications. The order template provides zoom and pan controls for optimal photo positioning before printing.'
      },
      {
        title: 'Settings & Configuration',
        content: 'Configure payment settings (PayPal/Venmo), set pricing tiers for magnets (single, 3, 6, or 9), and manage tax rates. Account Settings houses your PrintNode API key and email information.'
      }
    ]
  };

  const gettingStartedSteps = [
    {
      title: 'Create PrintNode Account',
      description: 'Sign up for a free PrintNode account and download their client. The client must be running on your computer during events for automatic printing to work.',
      link: 'https://app.printnode.com/account/download'
    },
    {
      title: 'Configure Account Settings',
      description: 'Get your PrintNode API key and connect your printer. Keep the PrintNode client running in the background during events.',
      link: '/admin/account'
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
      description: 'Photos automatically print during events, letting you focus on creating magnets and interacting with guests. The queue system ensures smooth processing.'
    },
    {
      title: 'Real-time Preview',
      description: 'See live previews of photos before printing to ensure quality. Monitor the print queue and status in real-time.'
    }
  ];

  const setupSteps = [
    {
      title: '1. PrintNode Setup',
      steps: [
        'Create a free PrintNode account at printnode.com',
        'Download and install the PrintNode client on your computer',
        'After installation, log into the PrintNode client',
        'Go to your PrintNode dashboard at printnode.com',
        'Click on your account name in the top right',
        'Select "API Keys" from the dropdown menu',
        'Click "Create API Key" and give it a name (e.g., "PrintBooth")',
        'Copy the generated API key',
        'Go to Account Settings in PrintBooth',
        'Paste the API key in the "PrintNode API Key" field and click Save',
        'Click "Test Connection" to verify everything works',
        'Make sure your printer is connected and showing in PrintNode',
        'IMPORTANT: Keep the PrintNode client running during events',
        'Check that your printer is set to Letter size (8.5x11 inches)',
        'Test print before each event'
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
        '- Photo limit (if applicable)',
        'Customize event appearance:',
        '- Upload landing page background (1920x1080 pixels)',
        '- Add camera overlay (50.8mm x 50.8mm)',
        'Generate and test the event QR code',
        'Preview the event link in your browser',
        'Ensure PrintNode client is running'
      ]
    },
    {
      title: '3. Template Management',
      steps: [
        'Select your event from the template dropdown',
        'Enter your website/email for photo watermarks',
        'Choose your printer from the dropdown',
        'Toggle auto-print on/off as needed',
        'Monitor the photo queue at the bottom',
        'Use the reprint feature if needed (stores up to 150 photos)',
        'Manage photos in template:',
        '- Use X to delete photos',
        '- Use + to duplicate photos',
        'Watch print status and queue progress'
      ]
    },
    {
      title: '4. During the Event',
      steps: [
        'Ensure PrintNode client is running',
        'Monitor the print queue for any issues',
        'Keep track of paper and ink levels',
        'Watch for any error messages',
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
      answer: 'Photos are printed at 2x2 inches (50.8mm x 50.8mm) at 300 DPI for professional quality. They are arranged in a 3x3 grid on standard Letter size paper (8.5x11 inches). Landing page backgrounds should be 1920x1080 pixels, and camera overlays should match the photo size of 50.8mm x 50.8mm.'
    },
    {
      question: 'How do I get my PrintNode API key?',
      answer: 'After creating your PrintNode account and installing the client: 1) Log into printnode.com, 2) Click your account name in the top right, 3) Select "API Keys", 4) Click "Create API Key", 5) Copy the key and paste it into PrintBooth Account Settings. Remember to keep the PrintNode client running during events.'
    },
    {
      question: 'How does the automated printing work?',
      answer: 'The PrintNode client must be running on your computer during events. When guests take photos, they automatically enter the print queue and fill the template grid. With auto-print enabled, full templates print automatically. The queue system manages additional incoming photos while printing is in progress.'
    },
    {
      question: 'How do I manage event QR codes?',
      answer: 'Each event gets a unique QR code that you can print and display. You can activate/deactivate the QR code to control access - when deactivated, guests will see an "event has ended" message. You can also preview how the event looks by testing the event link in your browser.'
    },
    {
      question: 'What should I prepare before an event?',
      answer: 'Ensure PrintNode client is installed and running, test your printer connection, verify paper size is set to Letter (8.5x11"), prepare backup supplies, test the event QR code, check your landing page and overlays look correct, and verify your website/email watermark in the template.'
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
                  <p>{section.content}</p>
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
                    <a href={step.link} className={styles.link}>
                      Go to {step.title} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'features' && (
          <div className={styles.section}>
            <h2>Feature Overview</h2>
            <div className={styles.featureGrid}>
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
            <h2>Detailed Setup Guide</h2>
            <div className={styles.setupGuide}>
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
          </div>
        )}

        {activeSection === 'faq' && (
          <div className={styles.section}>
            <h2>Frequently Asked Questions</h2>
            <div className={styles.faqList}>
              {faqs.map((faq, index) => (
                <div key={index} className={styles.faqItem}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 