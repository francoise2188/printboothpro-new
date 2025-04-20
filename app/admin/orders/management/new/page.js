'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../../lib/AuthContext';

export default function NewOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // Set loading false initially
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Default taxIncluded state to false
  const [taxIncluded, setTaxIncluded] = useState(false);

  // Restore total_amount to editable state
  const [formData, setFormData] = useState({
    external_reference: '',
    customer_name: '',
    email: '',
    phone: '',
    shipping_address: '',
    shipping_method: '',
    total_photos: '',
    status: 'pending',
    cost_per_unit: '',
    total_amount: '' // Admin enters this manually
  });

  // Check for user on component mount (simpler check)
  useEffect(() => {
    if (!user) {
        console.log("No user found on mount, redirecting...");
        router.push('/login');
    }
  }, [user, router]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle the radio button group for tax inclusion
    if (name === 'taxInclusionRadio') {
        setTaxIncluded(value === 'true'); // Convert string "true"/"false" to boolean
    } else {
        // Keep existing logic for other inputs
        let newValue = value;
        if (type === 'number') {
            if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                newValue = value; 
            } else {
                return; // Ignore invalid number input
            }
        }
        setFormData(prev => ({
          ...prev,
          [name]: newValue
        }));
    }
  };

  const handleGenerateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const generatedOrderNumber = `${year}${month}${day}-${timestamp}`;
    setFormData(prev => ({
      ...prev,
      external_reference: generatedOrderNumber
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
        alert("User session not found. Cannot create order.");
        return;
    }
    setLoading(true);
    console.log('Creating order for user:', user.id);

    const now = new Date();
    try {
      const orderData = {
        id: crypto.randomUUID(),
        external_reference: formData.external_reference || null, 
        customer_name: formData.customer_name,
        email: formData.email,
        phone: formData.phone,
        shipping_address: formData.shipping_address,
        shipping_method: formData.shipping_method,
        status: formData.status,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        total_amount: parseFloat(formData.total_amount) || 0, // Use manually entered total
        total_photos: parseInt(formData.total_photos) || 0,
        tax_included: taxIncluded, // Save the toggle state
        user_id: user.id, 
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      console.log("Submitting Order Data:", orderData);

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData]) 
        .select()
        .single();

      if (error) throw error;

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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Number (Optional - Leave blank or generate)
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                name="external_reference"
                value={formData.external_reference}
                onChange={handleChange}
                className="w-full p-2 border rounded-l focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., #1234 from website"
              />
              <button 
                type="button"
                onClick={handleGenerateOrderNumber}
                className="bg-blue-500 text-white px-3 py-2 rounded-r hover:bg-blue-600 text-sm"
                style={{ height: '42px' }}
              >
                Generate
              </button>
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Per Magnet
            </label>
            <input
              type="number"
              name="cost_per_unit"
              value={formData.cost_per_unit}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount
            </label>
            <input
              type="number"
              name="total_amount"
              value={formData.total_amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
              placeholder="0.00"
              required
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount includes Sales Tax? *
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="taxInclusionRadio" // Shared name for the group
                  value="true" // String value "true"
                  checked={taxIncluded === true} // Check if state is true
                  onChange={handleChange}
                  required // Add required to enforce selection
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="taxInclusionRadio"
                  value="false" // String value "false"
                  checked={taxIncluded === false} // Check if state is false
                  onChange={handleChange}
                  required // Also add required here
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>

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