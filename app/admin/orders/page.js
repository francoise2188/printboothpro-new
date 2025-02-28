'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/orders/management');
  }, []);

  return null;
} 