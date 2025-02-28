'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../../lib/AuthContext';
import styles from '../../orders.module.css';

export default function EditOrder({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (orderId && user) {
      loadOrder();
    }
  }, [orderId, user]);

  const loadOrder = async () => {
    try {
      console.log('Loading order:', orderId, 'for user:', user.id);
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }
      
      if (!order) {
        console.error('Order not found:', orderId);
        throw new Error('Order not found');
      }

      console.log('✅ Order loaded:', order);
      setFormData(order);
    } catch (error) {
      console.error('Error loading order:', error.message || error);
      alert('Failed to load order');
      router.push('/admin/orders/management');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log('Updating order:', orderId, 'for user:', user.id);
      const { error } = await supabase
        .from('orders')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }

      console.log('✅ Order updated successfully');
      router.push('/admin/orders/management');
    } catch (error) {
      console.error('Error updating order:', error.message || error);
      alert(`Failed to update order: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      console.log('Deleting order:', orderId, 'for user:', user.id);
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }

      console.log('✅ Order deleted successfully');
      router.push('/admin/orders/management');
    } catch (error) {
      console.error('Error deleting order:', error.message || error);
      alert(`Failed to delete order: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading order...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Order</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Order Reference */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Order Number</label>
            <input
              type="text"
              name="external_reference"
              value={formData.external_reference}
              onChange={handleChange}
              className={styles.input}
              placeholder="e.g., #1234"
            />
          </div>

          {/* Customer Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Customer Name *</label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          {/* Email */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {/* Phone */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {/* Shipping Address */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Shipping Address</label>
            <textarea
              name="shipping_address"
              value={formData.shipping_address}
              onChange={handleChange}
              className={styles.textarea}
              rows="3"
            />
          </div>

          {/* Shipping Method */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Shipping Method</label>
            <select
              name="shipping_method"
              value={formData.shipping_method}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">Select shipping method...</option>
              <option value="standard">Standard Shipping</option>
              <option value="express">Express Shipping</option>
              <option value="pickup">Local Pickup</option>
            </select>
          </div>

          {/* Total Photos */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Number of Photos</label>
            <input
              type="number"
              name="total_photos"
              value={formData.total_photos}
              onChange={handleChange}
              min="0"
              className={styles.input}
            />
          </div>

          {/* Status */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className={styles.formFooter}>
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={saving}
              className={styles.primaryButton}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/orders/management')}
              className={styles.secondaryButton}
            >
              Cancel
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleDelete}
            className={styles.dangerButton}
          >
            Delete Order
          </button>
        </div>
      </form>
    </div>
  );
} 