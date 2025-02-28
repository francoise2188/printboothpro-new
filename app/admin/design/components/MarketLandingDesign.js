'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/AuthContext';

export default function MarketLandingDesign() {
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('');

  // Fetch markets and current background
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch markets
        const { data: marketsData } = await supabase
          .from('markets')
          .select('id, name')
          .order('name');
        
        if (marketsData) {
          setMarkets(marketsData);
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
      }
    }

    fetchData();
  }, []);

  // Fetch background when market is selected
  useEffect(() => {
    async function fetchBackground() {
      if (!selectedMarket) return;

      try {
        const { data, error } = await supabase
          .from('design_settings')
          .select('url')
          .eq('type', 'market_landing_background')
          .eq('market_id', selectedMarket)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setCurrentBackground(data[0].url);
          setPreview(data[0].url);
        } else {
          setCurrentBackground(null);
          setPreview(null);
        }
      } catch (error) {
        console.error('Error fetching background:', error);
      }
    }

    fetchBackground();
  }, [selectedMarket]);

  const handleUpload = async (e) => {
    if (!selectedMarket) {
      setMessage('❌ Please select a market first');
      return;
    }

    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `market_landing_${selectedMarket}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('designs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      // Insert into design_settings with user_id
      const { error: dbError } = await supabase
        .from('design_settings')
        .insert({
          user_id: user.id,
          type: 'market_landing_background',
          url: publicUrl,
          market_id: selectedMarket,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setCurrentBackground(publicUrl);
      setMessage('✅ Upload successful!');
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = async () => {
    if (!selectedMarket) return;

    try {
      setMessage('');
      
      // Remove from design_settings
      const { error } = await supabase
        .from('design_settings')
        .delete()
        .eq('type', 'market_landing_background')
        .eq('market_id', selectedMarket)
        .eq('user_id', user.id);

      if (error) throw error;

      // Clear the preview
      setPreview(null);
      setCurrentBackground(null);
      setMessage('✅ Background removed successfully!');
    } catch (error) {
      console.error('Error removing background:', error);
      setMessage('❌ Error removing background: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Market Landing Page Background</h2>
      
      {/* Market Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Market
        </label>
        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Choose a market...</option>
          {markets.map((market) => (
            <option key={market.id} value={market.id}>
              {market.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Current Background Display */}
      {currentBackground && (
        <div className="mt-4 space-y-4">
          <h3 className="font-semibold">Current Background:</h3>
          <div className="relative">
            <img 
              src={currentBackground} 
              alt="Current background" 
              style={{ maxHeight: '150px', maxWidth: '150px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
            <button
              onClick={removeBackground}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors w-full"
            >
              Remove Current Background
            </button>
          </div>
        </div>
      )}
      
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <label className="block text-center cursor-pointer">
          <span className="text-gray-600">
            {uploading ? 'Uploading...' : 'Click to upload new background image'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded ${message.includes('✅') ? 'bg-green-50' : 'bg-red-50'}`}>
          {message}
        </div>
      )}
    </div>
  );
} 