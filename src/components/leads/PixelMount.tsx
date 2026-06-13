'use client';

/**
 * Client-side wrapper that mounts both the visitor pixel and the
 * returning-visitor bubble scaffold.
 *
 * Lives in its own file because `next/dynamic({ ssr: false })` is not
 * allowed inside Server Components in App Router. The root layout
 * (a Server Component) imports THIS file as a regular module — it's a
 * client component itself, so `dynamic({ ssr: false })` inside is legal
 * — but in practice we can just import the leaf components directly
 * since they're already 'use client' and don't need code-splitting.
 */
import { Suspense } from 'react';
import VisitorPixel from './VisitorPixel';
import ReturningVisitorBubble from './ReturningVisitorBubble';
import FormCaptureWatcher from './FormCaptureWatcher';
import LeadMagnetController from '@/components/leadMagnet/LeadMagnetController';
import PartyChatMount from '@/components/chat/PartyChatMount';
import DeliveryWindowGate from '@/components/DeliveryWindowGate';
import DeliveryWindowBadge from '@/components/DeliveryWindowBadge';

export default function PixelMount() {
  return (
    <>
      {/* VisitorPixel uses useSearchParams which requires a Suspense
          boundary in App Router. */}
      <Suspense fallback={null}>
        <VisitorPixel />
      </Suspense>
      <ReturningVisitorBubble />
      {/* Global form watcher — catches partial submissions from any form
          on the site (newsletter, contact, partner intake, etc.) so they
          land in /admin/brians-stuff?tab=leads automatically. */}
      <Suspense fallback={null}>
        <FormCaptureWatcher />
      </Suspense>
      {/* Lead-magnet trigger controller — watches the current path and
          fires the matching magnet's triggers (time/scroll/exit-intent). */}
      <LeadMagnetController />
      {/* Floating chat bubble — appears on the homepage + landing pages.
          Hidden on admin/ops/dashboard/checkout/event-quiz. */}
      <Suspense fallback={null}>
        <PartyChatMount />
      </Suspense>
      {/* Delivery-window entrance gate — fires once per 24h after the
          age gate clears. Captures today/tomorrow vs future so every
          downstream flow (chat, builder modal, /quote/start) defaults
          the menu + date picker correctly from the start. */}
      <Suspense fallback={null}>
        <DeliveryWindowGate />
      </Suspense>
      {/* Small chip showing the active delivery-window choice; tap to
          reset (the gate re-pops). Hidden when no choice exists yet. */}
      <Suspense fallback={null}>
        <DeliveryWindowBadge />
      </Suspense>
    </>
  );
}
