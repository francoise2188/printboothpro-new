'use client';

import { useState } from 'react';
import LandingPageDesign from './components/LandingPageDesign';
import OverlayEditor from './components/overlay-editor';
import MarketFrameEditor from './components/market-frame-editor';
import MarketLandingDesign from './components/MarketLandingDesign';

export default function DesignPage() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Design Settings</h1>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('events')}
              className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Event Frames
            </button>
            <button
              onClick={() => setActiveTab('markets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'markets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Market Frames
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'events' ? (
          <div className="space-y-12">
            <LandingPageDesign />
            <OverlayEditor />
          </div>
        ) : (
          <div className="space-y-12">
            <MarketLandingDesign />
            <MarketFrameEditor />
          </div>
        )}
      </div>
    </div>
  );
}

