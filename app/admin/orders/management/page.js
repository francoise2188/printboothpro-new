'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../lib/AuthContext';
import styles from '../orders.module.css';

export default function OrderManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }
      console.log('Loaded orders:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting order:', orderId);
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
      // Refresh the orders list
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error.message || error);
      alert(`Failed to delete order: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Order Management</h1>
        <button
          onClick={() => router.push('/admin/orders/management/new')}
          className={styles.addButton}
        >
          Create New Order
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading orders...</div>
      ) : (
        <div className={styles.ordersTable}>
          <table className="w-full">
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Order Reference</th>
                <th className={styles.tableHeaderCell}>Customer</th>
                <th className={styles.tableHeaderCell}>Date</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    {order.external_reference || 'N/A'}
                  </td>
                  <td className={styles.tableCell}>
                    {order.customer_name}
                  </td>
                  <td className={styles.tableCell}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    <button
                      onClick={() => router.push(`/admin/orders/management/${order.id}`)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/admin/orders/template/${order.id}`)}
                      className={styles.templateButton}
                    >
                      Template
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 