import React from 'react';

const CountdownOverlay = ({ count }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-white text-9xl font-bold">{count}</div>
    </div>
  );
};

export default CountdownOverlay; 