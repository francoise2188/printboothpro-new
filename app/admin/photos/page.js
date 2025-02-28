'use client';

import PhotoQueue from '../components/PhotoQueue';

export default function PhotosPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Live Photos</h1>
      <PhotoQueue />
    </div>
  );
}
