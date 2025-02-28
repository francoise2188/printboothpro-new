'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function SettingsPage() {
  const params = useParams();
  const marketId = params.marketId;
  
  const [settings, setSettings] = useState({
    paypal_username: '',
    venmo_username: '',
    single_magnet_price: '0',
    three_magnets_price: '0',
    six_magnets_price: '0',
    nine_magnets_price: '0',
    enable_tax: false,
    tax_rate: '0',
    coupons: []  // Array of coupon objects
  });

  const [message, setMessage] = useState('');

  const fetchSettings = async () => {
    try {
      console.log('Attempting to fetch settings for marketId:', marketId);
      
      if (!marketId) {
        throw new Error('Market ID is missing');
      }

      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('market_id', marketId);

      if (error) {
        throw error;
      }

      // If no data or empty array, create new settings
      if (!data || data.length === 0) {
        const { data: newData, error: insertError } = await supabase
          .from('payment_settings')
          .insert([
            { 
              market_id: marketId,
              paypal_username: '',
              venmo_username: '',
              single_magnet_price: '0',
              three_magnets_price: '0',
              six_magnets_price: '0',
              nine_magnets_price: '0',
              enable_tax: false,
              tax_rate: '0',
              coupons: []
            }
          ])
          .select();

        if (insertError) {
          throw insertError;
        }
        setSettings(newData[0]);
        return;
      }

      // Use the first record if multiple exist
      setSettings(data[0]);
      setMessage('');
      
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        fullError: error
      });
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Saving settings:', settings); // Debug log

      // Convert empty strings to '0' and ensure all numbers are valid strings
      const sanitizedSettings = {
        ...settings,
        single_magnet_price: settings.single_magnet_price || '0',
        three_magnets_price: settings.three_magnets_price || '0',
        six_magnets_price: settings.six_magnets_price || '0',
        nine_magnets_price: settings.nine_magnets_price || '0',
        tax_rate: settings.tax_rate || '0'
      };

      console.log('Sanitized settings:', sanitizedSettings); // Debug log

      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          market_id: marketId,
          ...sanitizedSettings,
          paypal_username: settings.paypal_username || '',
          venmo_username: settings.venmo_username || '',
          enable_tax: settings.enable_tax || false,
          coupons: settings.coupons || []
        });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Save error:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      setMessage('Error saving settings: ' + error.message);
    }
  };

  useEffect(() => {
    if (marketId) {
      fetchSettings();
    }
  }, [marketId]);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Payment Settings</h1>
      
      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Payment Methods Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">PayPal Username</label>
              <input
                type="text"
                value={settings.paypal_username}
                onChange={(e) => setSettings({...settings, paypal_username: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter PayPal username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Venmo Username</label>
              <input
                type="text"
                value={settings.venmo_username}
                onChange={(e) => setSettings({...settings, venmo_username: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter Venmo username"
              />
            </div>
          </div>
        </div>

        {/* Magnet Pricing Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Magnet Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Single Magnet Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.single_magnet_price || '0'}
                onChange={(e) => setSettings({
                  ...settings,
                  single_magnet_price: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Three Magnets Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.three_magnets_price || '0'}
                onChange={(e) => setSettings({
                  ...settings,
                  three_magnets_price: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Six Magnets Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.six_magnets_price || '0'}
                onChange={(e) => setSettings({
                  ...settings,
                  six_magnets_price: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nine Magnets Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.nine_magnets_price || '0'}
                onChange={(e) => setSettings({
                  ...settings,
                  nine_magnets_price: e.target.value
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tax Settings Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Tax Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_tax}
                onChange={(e) => setSettings({...settings, enable_tax: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">Enable Tax</label>
            </div>
            {settings.enable_tax && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({...settings, tax_rate: parseFloat(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Coupons Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Coupons</h2>
          <div className="space-y-4">
            {settings.coupons.map((coupon, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={coupon.code}
                    onChange={(e) => {
                      const newCoupons = [...settings.coupons];
                      newCoupons[index] = { ...coupon, code: e.target.value };
                      setSettings({ ...settings, coupons: newCoupons });
                    }}
                    placeholder="Coupon Code"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={coupon.discount}
                    onChange={(e) => {
                      const newCoupons = [...settings.coupons];
                      newCoupons[index] = { ...coupon, discount: parseFloat(e.target.value) };
                      setSettings({ ...settings, coupons: newCoupons });
                    }}
                    placeholder="Discount %"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="date"
                    value={coupon.expiry || ''}
                    onChange={(e) => {
                      const newCoupons = [...settings.coupons];
                      newCoupons[index] = { ...coupon, expiry: e.target.value };
                      setSettings({ ...settings, coupons: newCoupons });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const newCoupons = settings.coupons.filter((_, i) => i !== index);
                    setSettings({ ...settings, coupons: newCoupons });
                  }}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            ))}
            
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  coupons: [
                    ...settings.coupons,
                    { code: '', discount: 0, expiry: '' }
                  ]
                });
              }}
              className="mt-2 px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Coupon
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
} 