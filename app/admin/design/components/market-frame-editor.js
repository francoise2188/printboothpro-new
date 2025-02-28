'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../lib/AuthContext';

export default function MarketFrameEditor() {
  const { user } = useAuth();
  const [defaultFrame, setDefaultFrame] = useState(null);
  const [marketFrame, setMarketFrame] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [markets, setMarkets] = useState([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch markets and current frames
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

        // Fetch default frame
        const { data: defaultData } = await supabase
          .from('design_settings')
          .select('url')
          .eq('type', 'market_frame_default')
          .order('created_at', { ascending: false })
          .limit(1);

        if (defaultData?.length > 0) {
          setDefaultFrame(defaultData[0].url);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  // Fetch market-specific frame when market is selected
  useEffect(() => {
    async function fetchMarketFrame() {
      if (!selectedMarket) return;

      const { data } = await supabase
        .from('design_settings')
        .select('url')
        .eq('type', 'market_frame')
        .eq('market_id', selectedMarket)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      setMarketFrame(data?.[0]?.url || null);
    }

    fetchMarketFrame();
  }, [selectedMarket, user.id]);

  const handleUpload = async (e, type) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `market_frame_${Date.now()}.${fileExt}`;
      
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
          type: type,
          url: publicUrl,
          market_id: type === 'market_frame' ? selectedMarket : null,
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      if (type === 'market_frame_default') {
        setDefaultFrame(publicUrl);
      } else {
        setMarketFrame(publicUrl);
      }
      
      setMessage('✅ Upload successful!');
      
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Default Frame Section */}
      <div className="mb-8">
        <h3 className="font-semibold mb-4">Default Market Frame:</h3>
        {defaultFrame && (
          <div className="mb-4">
            <img 
              src={defaultFrame} 
              alt="Default frame" 
              className="max-h-[150px] max-w-[150px] mx-auto"
            />
          </div>
        )}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <label className="block text-center cursor-pointer">
            <span className="text-gray-600">
              {uploading ? 'Uploading...' : 'Upload Default Market Frame'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, 'market_frame_default')}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Market-Specific Frame Section */}
      <div>
        <h3 className="font-semibold mb-4">Market-Specific Frame:</h3>
        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        >
          <option value="">Select a market</option>
          {markets.map((market) => (
            <option key={market.id} value={market.id}>
              {market.name}
            </option>
          ))}
        </select>

        {selectedMarket && (
          <>
            {marketFrame && (
              <div className="mb-4">
                <img 
                  src={marketFrame} 
                  alt="Market frame" 
                  className="max-h-[150px] max-w-[150px] mx-auto"
                />
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <label className="block text-center cursor-pointer">
                <span className="text-gray-600">
                  {uploading ? 'Uploading...' : 'Upload Market-Specific Frame'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, 'market_frame')}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </>
        )}
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
