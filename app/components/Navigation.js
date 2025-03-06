'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path;
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          PrintBooth Pro
        </Link>
        
        <div className={styles.links}>
          <Link href="/about" className={`${styles.link} ${isActive('/about') ? styles.active : ''}`}>
            About Us
          </Link>
          <Link href="/faq" className={`${styles.link} ${isActive('/faq') ? styles.active : ''}`}>
            FAQ
          </Link>
          <Link href="/blog" className={`${styles.link} ${isActive('/blog') ? styles.active : ''}`}>
            Blog
          </Link>
          <Link href="/contact" className={`${styles.link} ${isActive('/contact') ? styles.active : ''}`}>
            Contact
          </Link>
          <Link href="/privacy" className={`${styles.link} ${isActive('/privacy') ? styles.active : ''}`}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </nav>
  );
} 