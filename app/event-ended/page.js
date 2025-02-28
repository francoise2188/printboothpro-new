'use client';

export default function EventEndedPage() {
  return (
    <div className="min-h-screen bg-black p-2 sm:p-4">
      <div className="w-full max-w-md mx-auto" style={{ 
        backgroundColor: 'var(--background-light)',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'var(--primary-green)',
          padding: '1.5rem',
          borderBottom: '1px solid var(--secondary-sage)'
        }}>
          <h2 style={{ 
            fontFamily: 'var(--font-accent)',
            color: 'var(--text-light)',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            margin: 0
          }}>
            Thank You for Celebrating!
          </h2>
        </div>

        {/* Content */}
        <div style={{
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'var(--text-dark)',
            fontSize: 'clamp(1rem, 4vw, 1.125rem)',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '1rem' }}>
              This event has ended and the photo booth is no longer active.
            </p>
            <p>
              We hope you enjoyed capturing memories with us!
            </p>
          </div>

          {/* Decorative Divider */}
          <div style={{
            width: '100%',
            height: '1px',
            background: 'var(--accent-tan)',
            margin: '0.5rem 0'
          }} />

          {/* Contact Info */}
          <div style={{
            textAlign: 'center',
            color: 'var(--secondary-sage)',
            fontSize: 'clamp(0.875rem, 3vw, 1rem)'
          }}>
            <p>
              If you have any questions, please contact the event organizer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
