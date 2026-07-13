'use client';

/**
 * PartyChat mount controller.
 *
 * Decides on which pages the chat bubble should appear. Mounted once
 * in the root layout (via PixelMount). The bubble is a floating action
 * button so it doesn't interact with page layout — we just hide it
 * entirely on routes where it would be redundant or in the way.
 *
 * Hidden on:
 *   - /admin/* and /ops/*  (internal tools)
 *   - /dashboard/*         (customer-facing order experience, has its own UX)
 *   - /event-quiz          (already has a mandatory modal)
 *   - /checkout/*, /invoice/* (don't distract during checkout)
 *   - /api/*               (no UI)
 *   - /affiliate/*, /partners/* (separate funnels with their own forms)
 *   - /dads-gone-wild         (private friends-only invite — no marketing widgets)
 */
import { usePathname } from 'next/navigation';
import PartyChat from './PartyChat';

const HIDE_PATTERNS: RegExp[] = [
  /^\/admin(\/|$)/,
  /^\/ops(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/event-quiz(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/invoice(\/|$)/,
  /^\/cart(\/|$)/,
  /^\/api\//,
  /^\/affiliate(\/|$)/,
  /^\/partners(\/|$)/,
  /^\/dads-gone-wild(\/|$)/,
  // Private event invites — no general chat bubble; the page has its
  // own dedicated flow.
  /^\/events(\/|$)/,
  // Full Moon Party lander — has its own share FAB; keep it distraction-free.
  /^\/full-moon-aug1(\/|$)/,
  // Premier Concierge landers — own questionnaire modal; no drink-planner bubble.
  /^\/austin-bachelor-concierge(\/|$)/,
  /^\/austin-bachelorette-concierge(\/|$)/,
  /^\/austin-concierge(\/|$)/,
  /^\/concierge-quote(\/|$)/,
];

export default function PartyChatMount() {
  const pathname = usePathname() ?? '/';
  if (HIDE_PATTERNS.some((re) => re.test(pathname))) return null;
  return <PartyChat />;
}
