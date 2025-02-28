'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './dashboard.module.css';
import Link from 'next/link';

// Helper function to format relative time
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

export default function Dashboard() {
  const { user, loading, isSubscribed } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalOrders: 0,
    revenue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simplified data fetching function
  async function fetchDashboardData() {
    if (!user?.id) return;
    setIsRefreshing(true);

    try {
      // Fetch all data in parallel for better performance
      const [{ data: events }, { data: orders }, { data: photos }] = await Promise.all([
        supabase
          .from('events')
          .select('id, is_active')
          .eq('user_id', user.id),
        
        supabase
          .from('orders')
          .select('id, price, created_at, event_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('photos')
          .select('id, created_at, event_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      // Get unique event IDs
      const eventIds = new Set([
        ...(orders?.map(o => o.event_id).filter(Boolean) || []),
        ...(photos?.map(p => p.event_id).filter(Boolean) || [])
      ]);

      // Fetch event names if needed
      let eventMap = {};
      if (eventIds.size > 0) {
        const { data: eventNames } = await supabase
          .from('events')
          .select('id, name')
          .in('id', Array.from(eventIds));

        eventMap = Object.fromEntries(
          eventNames?.map(event => [event.id, event.name]) || []
        );
      }

      // Update stats
      setStats({
        totalEvents: events?.length || 0,
        activeEvents: events?.filter(event => event.is_active)?.length || 0,
        totalOrders: orders?.length || 0,
        revenue: orders?.reduce((sum, order) => sum + (Number(order.price) || 0), 0) || 0
      });

      // Update recent activity
      const activity = [
        ...(photos?.map(photo => ({
          icon: '📸',
          title: photo.event_id 
            ? `New photo taken at ${eventMap[photo.event_id] || 'Unknown Event'}`
            : 'New photo taken',
          time: formatRelativeTime(photo.created_at)
        })) || []),
        ...(orders?.slice(0, 3).map(order => ({
          icon: '📦',
          title: order.event_id 
            ? `New order received for ${eventMap[order.event_id] || 'Unknown Event'}`
            : 'New order received',
          time: formatRelativeTime(order.created_at)
        })) || [])
      ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 3);

      setRecentActivity(activity);
      setError(null);
    } catch (error) {
      console.error('Dashboard error:', error.message);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }

  // Auth check
  useEffect(() => {
    if (!loading && (!user || !isSubscribed())) {
      router.push('/subscribe');
    }
  }, [user, loading, router, isSubscribed]);

  // Simple polling with cleanup
  useEffect(() => {
    let isMounted = true;
    
    async function initFetch() {
      if (user?.id && isMounted) {
        await fetchDashboardData();
      }
    }

    initFetch();

    const interval = setInterval(() => {
      if (user?.id && isMounted) {
        initFetch();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user || !isSubscribed()) {
    return null;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  const quickActions = [
    {
      icon: '📅',
      title: 'Create Event',
      path: '/admin/events'
    },
    {
      icon: '🖼️',
      title: 'Manage Templates',
      path: '/admin/template'
    },
    {
      icon: '📦',
      title: 'View Orders',
      path: '/admin/orders/management'
    }
  ];

  return (
    <div className={styles.dashboardContainer}>
      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>Welcome back!</h1>
        <p className={styles.welcomeSubtitle}>
          Here's what's happening with your events today.
          {isRefreshing && <span className={styles.refreshing}> • Refreshing...</span>}
        </p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <div className={styles.statsIcon}>📅</div>
          <div className={styles.statsLabel}>Total Events</div>
          <div className={styles.statsValue}>{stats.totalEvents}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsIcon}>🎯</div>
          <div className={styles.statsLabel}>Active Events</div>
          <div className={styles.statsValue}>{stats.activeEvents}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsIcon}>📦</div>
          <div className={styles.statsLabel}>Total Orders</div>
          <div className={styles.statsValue}>{stats.totalOrders}</div>
        </div>
        <div className={styles.statsCard}>
          <div className={styles.statsIcon}>💰</div>
          <div className={styles.statsLabel}>Revenue</div>
          <div className={styles.statsValue}>${stats.revenue}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.activityList}>
          {recentActivity.map((activity, index) => (
            <div key={index} className={styles.activityItem}>
              <span className={styles.activityIcon}>{activity.icon}</span>
              <div className={styles.activityContent}>
                <div className={styles.activityTitle}>{activity.title}</div>
                <div className={styles.activityTime}>{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        {quickActions.map((action, index) => (
          <Link href={action.path} key={index}>
            <button className={styles.actionButton}>
              <span>{action.icon}</span>
              {action.title}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
