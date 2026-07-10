'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { StaffRole } from './nav-config';

/**
 * Shared auth state machine for the HQ shell (extracted from the old
 * ops/admin layouts, which duplicated it with different sessionStorage keys).
 *
 * Rules that keep hydration safe (do not break these):
 * - sessionStorage is only touched inside effects, never during render.
 * - `isAuthenticated` is tri-state; chrome renders only when `true` AND the
 *   role is resolved, so employees never flash admin nav.
 * - Old `ops_*` / `admin_*` keys are ignored (not migrated): users holding a
 *   valid `ops_session` cookie fall through to the /api/ops/session restore
 *   and get the unified keys written.
 */
const KEY_AUTH = 'staff_authenticated';
const KEY_ROLE = 'staff_role';

export interface BackendAuth {
  isAuthenticated: boolean | null;
  role: StaffRole | null;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export function useBackendAuth(): BackendAuth {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const authenticated = sessionStorage.getItem(KEY_AUTH);
    const storedRole = sessionStorage.getItem(KEY_ROLE) as StaffRole | null;

    if (authenticated === 'true' && storedRole) {
      setIsAuthenticated(true);
      setRole(storedRole);
      return;
    }

    // sessionStorage is empty (new tab / old keys) — check the httpOnly cookie
    fetch('/api/ops/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.role) {
          sessionStorage.setItem(KEY_AUTH, 'true');
          sessionStorage.setItem(KEY_ROLE, data.role);
          setIsAuthenticated(true);
          setRole(data.role);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Employees never see /admin/* (preserves the pre-shell admin layout rule)
  useEffect(() => {
    if (isAuthenticated && role === 'employee' && pathname?.startsWith('/admin')) {
      router.replace('/ops/today');
    }
  }, [isAuthenticated, role, pathname, router]);

  const login = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await response.json();

        if (!data.success || !data.role) {
          return { ok: false, error: data.error || 'Invalid password' };
        }

        sessionStorage.setItem(KEY_AUTH, 'true');
        sessionStorage.setItem(KEY_ROLE, data.role);
        setIsAuthenticated(true);
        setRole(data.role);

        if (data.role === 'employee') {
          if (pathname?.startsWith('/admin') || pathname === '/ops') {
            router.push('/ops/today');
          }
        } else if (pathname === '/ops') {
          router.push('/ops/today');
        } else if (pathname === '/admin') {
          router.push('/admin/dashboard');
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Failed to verify password' };
      }
    },
    [pathname, router],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/ops/logout', { method: 'POST' });
    } catch {
      // Best-effort cookie clear
    }
    sessionStorage.removeItem(KEY_AUTH);
    sessionStorage.removeItem(KEY_ROLE);
    setIsAuthenticated(false);
    setRole(null);
  }, []);

  return { isAuthenticated, role, login, logout };
}
