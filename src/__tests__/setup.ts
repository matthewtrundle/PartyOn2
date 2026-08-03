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

// Testing-library's 1s default is generous locally but far too tight on CI.
// GitHub runners are 2-core and this suite is 150+ files across parallel
// workers, so a queue assertion can wait on a multi-step chain — keypress →
// mutation → advance → the next card's own fetch → confirmation — under heavy
// contention. Two separate post-merge runs went red that way with nothing
// actually broken (5s was not enough the second time).
//
// This only changes how long a wait MAY take before failing. A passing
// assertion still resolves immediately, and a genuinely broken one still
// fails — it just takes longer to say so, which is the right trade against
// red-herring failures on main.
// Deliberately BELOW vitest's testTimeout (30s, vitest.config.ts) so a stuck
// assertion fails with "expected X to be Y" rather than an opaque
// "Test timed out", which is what makes these diagnosable.
configure({ asyncUtilTimeout: 10_000 });

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
