'use client';

export default function ThankYouPage() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      color: 'white',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>
        Thank You For Using Our Photo Booth!
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
        Your photo has been sent to print
      </p>
    </div>
  );
}
