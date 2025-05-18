export default function TestGrid() {
  const images = [
    "/austin texas (18).png",
    "/austin texas (19).png",
    "/austin texas (20).png"
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      width: '600px',
      margin: '40px auto'
    }}>
      {images.map((url, idx) => (
        <div key={idx} style={{
          border: '1px solid #ccc',
          padding: '10px',
          background: '#fff'
        }}>
          <img src={url} alt={`Photo ${idx + 1}`} style={{ width: '100%' }} />
        </div>
      ))}
    </div>
  );
} 