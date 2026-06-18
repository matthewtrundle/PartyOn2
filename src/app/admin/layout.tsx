'use client';

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export type AdminRole = 'admin' | 'employee';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps): ReactElement {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Check if already authenticated in this session
    const authenticated = sessionStorage.getItem('admin_authenticated');
    const storedRole = sessionStorage.getItem('admin_role') as AdminRole | null;

    if (authenticated === 'true' && storedRole) {
      setIsAuthenticated(true);
      setRole(storedRole);
    } else {
      // sessionStorage is empty (tab was closed) -- check if the httpOnly cookie is still valid
      fetch('/api/ops/session')
        .then(res => res.json())
        .then(data => {
          if (data.authenticated && data.role) {
            sessionStorage.setItem('admin_authenticated', 'true');
            sessionStorage.setItem('admin_role', data.role);
            setIsAuthenticated(true);
            setRole(data.role);
          } else {
            setIsAuthenticated(false);
          }
        })
        .catch(() => setIsAuthenticated(false));
    }
  }, []);

  // Redirect employees to ops portal (admin is admin-only)
  useEffect(() => {
    if (isAuthenticated && role === 'employee') {
      router.push('/ops/orders');
    }
  }, [isAuthenticated, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success && data.role) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_role', data.role);
        setIsAuthenticated(true);
        setRole(data.role);

        // Redirect based on role
        if (data.role === 'employee') {
          router.push('/ops/orders');
        } else if (pathname === '/admin') {
          router.push('/admin/dashboard');
        }
      } else {
        setError(data.error || 'Invalid password');
        setPassword('');
      }
    } catch {
      setError('Failed to verify password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/ops/logout', { method: 'POST' });
    } catch {
      // Best-effort cookie clear
    }
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_role');
    setIsAuthenticated(false);
    setRole(null);
    setPassword('');
  };

  // Still checking auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not authenticated - show password form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Party On Delivery
            </h1>
            <p className="text-gray-500 text-sm mt-1">Staff Portal</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Navigation items (admin-only strategic/management features)
  const navItems = [
    { href: '/admin/strategy', label: 'Game Plan' },
    { href: '/admin/dashboard', label: 'Analytics' },
    { href: '/admin/customers', label: 'Customers' },
    { href: '/admin/emails', label: 'Emails' },
    { href: '/admin/sync', label: 'Sync' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/experiments', label: 'Experiments' },
    { href: '/admin/promotions', label: 'Promotions' },
    { href: '/admin/affiliates', label: 'Affiliates' },
    { href: '/admin/brians-stuff', label: "Brian's Stuff" },
    { href: '/admin/settings', label: 'Settings' },
  ];

  // Authenticated - render with navigation
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <span className="font-semibold text-brand-yellow">
                Party On Staff
              </span>
              <div className="hidden md:flex gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname?.startsWith(item.href)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/ops/inventory"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Ops Portal
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 px-4 py-2 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 min-h-[44px] flex items-center rounded-md text-sm font-medium transition-colors ${
                  pathname?.startsWith(item.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
              <Link
                href="/ops/inventory"
                className="block px-3 py-2 min-h-[44px] flex items-center text-sm text-gray-400 hover:text-white transition-colors"
              >
                Ops Portal
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 min-h-[44px] flex items-center text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      {children}
    </div>
  );
}
