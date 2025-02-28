'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function NewOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const supabase = createClientComponentClient();

  const [formData, setFormData] = useState({
    external_reference: '',
    customer_name: '',
    email: '',
    phone: '',
    shipping_address: '',
    shipping_method: '',
    total_photos: 0,
    status: 'pending'
  });

  useEffect(() => {
    async function getSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        router.push('/login');
      }
    }
    
    getSession();
  }, [router, supabase]);

  if (!session) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('Creating order for user:', session.user.id);

    try {
      const orderData = {
        id: crypto.randomUUID(),
        ...formData,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('✅ Order created successfully:', data);
      router.push('/admin/orders/management');
    } catch (error) {
      console.error('Error creating order:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        formData: formData
      });
      alert(`Failed to create order: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New Order</h1>
        <button
          onClick={() => router.push('/admin/orders/management')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Orders
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* External Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Number
            </label>
            <input
              type="text"
              name="external_reference"
              value={formData.external_reference}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., #1234"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Shipping Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Address
            </label>
            <textarea
              name="shipping_address"
              value={formData.shipping_address}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Shipping Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Method
            </label>
            <select
              name="shipping_method"
              value={formData.shipping_method}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select shipping method...</option>
              <option value="standard">Standard Shipping</option>
              <option value="express">Express Shipping</option>
              <option value="pickup">Local Pickup</option>
            </select>
          </div>

          {/* Total Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Photos
            </label>
            <input
              type="number"
              name="total_photos"
              value={formData.total_photos}
              onChange={handleChange}
              min="0"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
} 