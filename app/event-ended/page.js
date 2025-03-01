'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function EventEndedPage() {
  return (
    <div className="min-h-screen bg-black p-2 sm:p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 p-6 text-center">
          <h2 className="text-white text-2xl md:text-3xl font-semibold">
            Thank You for Celebrating!
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-800">
              This event has ended and the photo booth is no longer active.
            </p>
            <p className="text-lg text-gray-800">
              We hope you enjoyed capturing memories with us!
            </p>
          </div>

          {/* Decorative Divider */}
          <div className="border-t border-gray-200 my-6" />

          {/* Contact Info */}
          <div className="text-center">
            <p className="text-gray-600">
              If you have any questions, please contact the event organizer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
