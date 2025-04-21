'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

function shouldShowNavigation(pathname) {
  // List of paths where navigation should appear
  const navigationPaths = [
    '/',
    '/subscription',
    '/login',
    '/about',
    '/faq',
    '/contact',
    '/privacy',
    '/blog'
  ];

  // Check if current path matches any of the navigation paths
  // or if it's a blog post page
  return navigationPaths.some(path => pathname === path) || pathname.startsWith('/blog/');
}

export default function NavigationWrapper() {
  const pathname = usePathname();
  
  if (!shouldShowNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
} 