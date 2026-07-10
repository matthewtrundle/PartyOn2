'use client';

import { ReactElement, useState } from 'react';

/** Shared staff login card for both portals (navy HQ styling). */
export default function LoginScreen({
  onLogin,
}: {
  onLogin: (password: string) => Promise<{ ok: boolean; error?: string }>;
}): ReactElement {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await onLogin(password);
    if (!result.ok) {
      setError(result.error || 'Invalid password');
      setPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="font-heading text-3xl tracking-[0.1em] uppercase text-gray-900">
            Party On <span className="text-brand-blue">HQ</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Staff Portal</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              placeholder="Enter your password"
              required
              autoFocus
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-2 px-4 bg-brand-blue text-white font-semibold tracking-[0.08em] rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
