'use client';

import { AuthProvider } from '../../lib/AuthContext';
import { useAuth } from '../../lib/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  // Don't check auth for login page
  if (pathname === '/admin/login') {
    return children;
  }

  // Show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null; // AuthContext will handle redirect
  }

  // Define menu items with sub-items
  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/admin',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    },
    { 
      name: 'Events', 
      path: '/admin/events',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
      ),
      subItems: [
        {
          name: 'Event Management',
          path: '/admin/events',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
          )
        },
        {
          name: 'Template Manager',
          path: '/admin/template',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
              <path d="M14 14l1.586-1.586a2 2 0 012.828 0L20 14" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )
        }
      ]
    },
    { 
      name: 'Markets', 
      path: '/admin/markets',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 3h18v7H3z" />
          <path d="M3 14h18v7H3z" />
          <path d="M7 10v4" />
          <path d="M17 10v4" />
        </svg>
      ),
      subItems: [
        { 
          name: 'Market List', 
          path: '/admin/markets',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="15" y2="16" />
            </svg>
          )
        },
        { 
          name: 'Market Template',
          path: '/admin/markets/template',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
          )
        }
      ]
    },
    { 
      name: 'Orders', 
      path: '/admin/orders',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 8l-3-6H6L3 8v13a1 1 0 001 1h16a1 1 0 001-1V8z" />
          <path d="M3 8h18" />
          <path d="M8 8c0 2.761 1.79 5 4 5s4-2.239 4-5" />
        </svg>
      ),
      subItems: [
        { 
          name: 'Order Management', 
          path: '/admin/orders/management',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>
          )
        }
      ]
    },
    { 
      name: 'Settings', 
      path: '/admin/settings',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      ),
      subItems: [
        { 
          name: 'Payment Settings', 
          path: '/admin/settings',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          )
        }
      ]
    },
    {
      name: 'Account',
      path: '/admin/account',
      icon: (
        <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      subItems: [
        {
          name: 'Account Settings',
          path: '/admin/account',
          icon: (
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          )
        }
      ]
    }
  ];

  // Check if current path is under markets
  const isMarketsSection = pathname.includes('/admin/markets');

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logo}>
          PrintBooth Pro
        </div>

        {menuItems.map((item) => (
          <div key={item.path} className={styles.menuItemContainer}>
            {/* Main menu item */}
            <Link 
              href={item.path}
              className={pathname === item.path ? styles.menuItemActive : styles.menuItem}
            >
              {item.icon}
              {item.name}
            </Link>

            {/* Sub-items */}
            {item.subItems && (pathname.includes(item.path) || isMarketsSection) && (
              <div className={styles.subMenu}>
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.path}
                    href={subItem.path}
                    className={pathname === subItem.path ? styles.subMenuItemActive : styles.subMenuItem}
                  >
                    {subItem.icon}
                    {subItem.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Sign Out Button */}
        <button
          onClick={() => signOut()}
          className={styles.signOutButton}
        >
          <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* Main content */}
      <div className={styles.mainContent}>
        {children}
      </div>
    </div>
  );
}

// Wrap the layout with AuthProvider
export default function WrappedAdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminLayout>{children}</AdminLayout>
    </AuthProvider>
  );
}