'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // --- State for Filters ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState(''); // Store as YYYY-MM-DD string
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  // ------------------------

  // Memoize loadOrders to prevent unnecessary re-renders if passed as prop later
  const loadOrders = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters dynamically
      if (filters.term) {
        query = query.ilike('customer_name', `%${filters.term}%`);
      }
      if (filters.orderNum) {
        query = query.ilike('external_reference', `%${filters.orderNum}%`);
      }
      if (filters.date) {
        // Filter for the entire day
        const startDate = new Date(filters.date);
        startDate.setUTCHours(0, 0, 0, 0); // Start of the day UTC
        const endDate = new Date(filters.date);
        endDate.setUTCHours(23, 59, 59, 999); // End of the day UTC
        query = query.gte('created_at', startDate.toISOString());
        query = query.lte('created_at', endDate.toISOString());
      }

      // Always order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }
      console.log('Loaded orders with filters:', filters, data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, [supabase, user]); // Dependencies for useCallback

  // Initial load
  useEffect(() => {
    if (user) {
      loadOrders(); // Load all orders initially
    }
  }, [user, loadOrders]); // Include loadOrders in dependency array

  // Handle search button click
  const handleSearch = () => {
    const filters = {
        term: searchTerm,
        date: searchDate,
        orderNum: searchOrderNumber
    };
    loadOrders(filters);
  };

  // Handle clear button click
  const handleClear = () => {
    setSearchTerm('');
    setSearchDate('');
    setSearchOrderNumber('');
    loadOrders(); // Load all orders
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

      {/* --- Search/Filter Section --- */}
      <div className={styles.filterSection}>
        <input
          type="text"
          placeholder="Search by Customer Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.filterInput}
        />
        <input
          type="date" // Use date input type
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className={styles.filterInput}
        />
        <input
          type="text"
          placeholder="Search by Order Number..."
          value={searchOrderNumber}
          onChange={(e) => setSearchOrderNumber(e.target.value)}
          className={styles.filterInput}
        />
        <button onClick={handleSearch} className={styles.primaryButton} style={{ marginLeft: '8px' }}>Search</button>
        <button onClick={handleClear} className={styles.secondaryButton} style={{ marginLeft: '8px' }}>Clear</button>
      </div>
      {/* --------------------------- */}

      {loading ? (
        <div className={styles.loading}>Loading orders...</div>
      ) : (
        <div className={styles.ordersTable}>
          <table className="w-full">
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Order Number</th>
                <th className={styles.tableHeaderCell}>Customer</th>
                <th className={styles.tableHeaderCell}>Date</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="5" className={styles.noResultsCell}>No orders found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 