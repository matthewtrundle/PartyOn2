import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Testing-library's 1s default is generous locally but tight on a contended CI
// runner — a queue test timed out waiting for a render that was on its way,
// with nothing actually broken. Raising the ceiling only changes how long a
// wait may take before failing; a passing assertion still resolves immediately.
configure({ asyncUtilTimeout: 5000 });

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
