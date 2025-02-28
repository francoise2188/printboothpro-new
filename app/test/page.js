'use client';

export default function TestPage() {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      marginTop: '50px'
    }}>
      <h1>Test Page</h1>
      <p>If you can see this, the connection is working!</p>
      <button 
        onClick={() => alert('Button works!')}
        style={{
          padding: '10px 20px',
          backgroundColor: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          marginTop: '20px'
        }}
      >
        Click Me
      </button>
    </div>
  );
} 