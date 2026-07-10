'use client';

import { useEffect, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useBackendAuth } from '@/components/backend/shell/useBackendAuth';

/**
 * Admin landing page — sends admins to the dashboard. Employees are bounced
 * to the ops portal by the shared auth hook before this redirect matters.
 */
export default function AdminPage(): ReactElement {
  const router = useRouter();
  const { isAuthenticated, role } = useBackendAuth();

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, role, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-gray-500">Loading…</div>
    </div>
  );
}
