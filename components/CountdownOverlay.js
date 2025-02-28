import React from 'react';

const CountdownOverlay = ({ number }) => {
  if (!number) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-white text-9xl font-bold">{number}</div>
    </div>
  );
};

export default CountdownOverlay; 