'use client';

/**
 * Party-type routing gate.
 *
 * Full-bleed blurred Lake Travis backdrop with a permanent modal
 * asking "What kind of party are you planning?" Two big buttons —
 * Bachelor (navy + gold) and Bachelorette (raspberry + rose) —
 * hard-navigate to the respective planning pages.
 *
 * No close button, no dismiss action. The whole point of this page is
 * to route the visitor; there's nothing behind the modal worth
 * interacting with. If the user needs to bail they can use the browser
 * back button.
 *
 * Router uses next/link with prefetch so the destination page is
 * warmed by the time they click, and the tap-to-navigate feels
 * instant.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { trackCTAClick, trackContactClick } from '@/lib/analytics/ga4-events';

const GATE_PHONE = 'tel:+17373719700';

const NAVY = '#0A1F33';
const GOLD = '#D4AF37';
const RASPBERRY = '#7A1E4A';
const ROSE = '#E8B4CE';

export default function PartyTypeGateClient(): ReactElement {
  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: NAVY }}
    >
      {/* Blurred background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/destinations/lake-travis-boats.webp"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover blur-lg scale-110"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(10,15,25,0.55) 0%, rgba(10,15,25,0.85) 60%, rgba(10,15,25,0.95) 100%)',
          }}
        />
      </div>

      {/* Permanent centered modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6"
      >
        <div
          className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: '#FFFFFF',
            border: `2px solid ${NAVY}`,
            boxShadow: `0 20px 60px rgba(10,15,25,0.5)`,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 text-center"
            style={{
              background: NAVY,
              color: '#FFFFFF',
              borderBottom: `3px solid ${GOLD}`,
            }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.24em] mb-1"
              style={{ color: GOLD }}
            >
              PREMIER CONCIERGE · AUSTIN
            </div>
            <h1
              id="gate-title"
              className="font-heading text-2xl md:text-3xl font-bold tracking-tight leading-tight"
            >
              What kind of party are you planning?
            </h1>
            <p className="text-xs opacity-80 mt-2 max-w-xs mx-auto">
              Pick one to unlock the right planner. You can change your
              mind on the next page.
            </p>
          </div>

          {/* Buttons */}
          <div className="p-5 sm:p-6 space-y-3">
            {/* Bachelor */}
            <Link
              href="/austin-bachelor-concierge"
              prefetch
              onClick={() =>
                trackCTAClick(
                  'Plan the guys weekend',
                  '/austin-bachelor-concierge',
                  'choose_path',
                )
              }
              className="block rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: NAVY,
                color: '#FFFFFF',
                border: `2px solid ${NAVY}`,
                boxShadow: `0 4px 0 ${NAVY}`,
              }}
            >
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: GOLD }}
                  aria-hidden
                >
                  🥃
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-[10px] font-bold tracking-widest mb-0.5"
                    style={{ color: GOLD }}
                  >
                    BACHELOR PARTY
                  </div>
                  <div className="font-heading text-lg sm:text-xl font-bold tracking-tight">
                    Plan the guys&apos; weekend
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    Boats, brewery tours, ATVs, gun range
                  </div>
                </div>
                <div
                  className="flex-shrink-0 text-2xl font-bold"
                  style={{ color: GOLD }}
                  aria-hidden
                >
                  →
                </div>
              </div>
            </Link>

            {/* Bachelorette */}
            <Link
              href="/austin-bachelorette-concierge"
              prefetch
              onClick={() =>
                trackCTAClick(
                  'Plan the girls weekend',
                  '/austin-bachelorette-concierge',
                  'choose_path',
                )
              }
              className="block rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: RASPBERRY,
                color: '#FFFFFF',
                border: `2px solid ${RASPBERRY}`,
                boxShadow: `0 4px 0 ${RASPBERRY}`,
              }}
            >
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: ROSE }}
                  aria-hidden
                >
                  🥂
                </div>
                <div className="flex-1 text-left">
                  <div
                    className="text-[10px] font-bold tracking-widest mb-0.5"
                    style={{ color: ROSE }}
                  >
                    BACHELORETTE PARTY
                  </div>
                  <div className="font-heading text-lg sm:text-xl font-bold tracking-tight">
                    Plan the girls&apos; weekend
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    Boats, bubbly, brunch, wineries, spa
                  </div>
                </div>
                <div
                  className="flex-shrink-0 text-2xl font-bold"
                  style={{ color: ROSE }}
                  aria-hidden
                >
                  →
                </div>
              </div>
            </Link>
          </div>

          {/* Footer */}
          <div
            className="px-6 pb-5 text-center text-xs text-gray-500"
          >
            Corporate or something else? Call{' '}
            <a
              href={GATE_PHONE}
              onClick={() =>
                trackContactClick('phone', 'final_cta', undefined, GATE_PHONE)
              }
              className="font-bold underline"
              style={{ color: NAVY }}
            >
              (737) 371-9700
            </a>
            .
          </div>
        </div>
      </div>
    </main>
  );
}
