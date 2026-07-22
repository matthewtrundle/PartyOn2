'use client';

/**
 * Lead-magnet trigger controller.
 *
 * Mounted in the root layout. On every page load:
 *   1. Reads LEAD_MAGNETS from config
 *   2. Filters down to magnets that apply to the current pathname
 *   3. Wires up triggers (time-on-page, scroll depth)
 *   4. First trigger that fires → opens the LeadMagnetModal
 *
 * Cooldown lives in localStorage as `lm_seen_<id>` (timestamp). If the
 * magnet was last shown < cooldownDays ago, it stays suppressed.
 *
 * Anything else on the site can also force-open a magnet by dispatching a
 *   window.dispatchEvent(new CustomEvent('lead-magnet:open', { detail: { id } }))
 * (used by the flyer page's "preview" button).
 */
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LEAD_MAGNETS, pathMatches, type LeadMagnet } from '@/lib/leadMagnet/config';
import LeadMagnetModal from './LeadMagnetModal';

function cooldownKey(id: string) {
  return `pod_lm_seen_${id}`;
}

function isOnCooldown(magnet: LeadMagnet): boolean {
  if (typeof window === 'undefined') return true;
  if (magnet.cooldownDays <= 0) return false;
  try {
    const raw = localStorage.getItem(cooldownKey(magnet.id));
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    const ageMs = Date.now() - last;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays < magnet.cooldownDays;
  } catch {
    return false;
  }
}

function markShown(id: string) {
  try {
    localStorage.setItem(cooldownKey(id), String(Date.now()));
  } catch {
    /* swallow */
  }
}

/**
 * Has the visitor cleared the site-wide 21+ age gate? AgeVerification stamps
 * `age_verified` in localStorage on accept — this matches the truthy check
 * DeliveryWindowGate uses, so both entrance gates read the flag identically.
 * On a read error we return false: better to skip a non-essential marketing
 * popup than risk painting it over a still-open gate.
 */
function isAgeVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem('age_verified');
  } catch {
    return false;
  }
}

export default function LeadMagnetController() {
  const pathname = usePathname();
  const [activeMagnet, setActiveMagnet] = useState<LeadMagnet | null>(null);

  // Pick the highest-priority magnet that applies to this path (first match
  // in the LEAD_MAGNETS array wins, so order them most-specific-first).
  const candidate = useMemo<LeadMagnet | null>(() => {
    if (!pathname) return null;
    for (const m of LEAD_MAGNETS) {
      if (!m.enabled) continue;
      if (m.excludePages && pathMatches(pathname, m.excludePages)) continue;
      if (!pathMatches(pathname, m.pages)) continue;
      return m;
    }
    return null;
  }, [pathname]);

  useEffect(() => {
    if (!candidate) return;
    if (typeof window === 'undefined') return;
    if (isOnCooldown(candidate)) return;

    let fired = false;
    const cleanupFns: Array<() => void> = [];
    const fire = (source: string) => {
      if (fired) return;
      fired = true;
      cleanupFns.forEach((fn) => fn());
      setActiveMagnet(candidate);
      // Tag the trigger so we can analyze conversion later.
      try {
        window.dispatchEvent(
          new CustomEvent('lead-magnet:fired', {
            detail: { id: candidate.id, source, path: pathname },
          }),
        );
      } catch {
        /* swallow */
      }
    };

    // Automatic triggers (time-on-page, scroll depth) must NOT fire until the
    // visitor has cleared the 21+ age gate. AgeVerification (z-100) and
    // DeliveryWindowGate (z-210) are the required entrance gates; this modal
    // renders at z-200, so firing on a timer while the age gate is still open
    // would drop a marketing popup ON TOP of a legally-required gate — and
    // before the visitor has made the gating choice. Poll for `age_verified`
    // before wiring the triggers, mirroring how DeliveryWindowGate/DashboardTour
    // wait on their prerequisite flag.
    //
    // Every page the current LEAD_MAGNETS target ('/', '/services/*', '/flyer')
    // is age-gated, and the config excludes '/dashboard/*' and never lists
    // '/order', so the delivery-window gate is never in play here. If you ever
    // point a magnet at an age-gate-EXEMPT page, its automatic triggers won't
    // fire until `age_verified` exists — rely on a manual trigger there.
    const wireAutoTriggers = () => {
      if (fired) return;
      for (const t of candidate.triggers) {
        if (t.type === 'time') {
          const id = window.setTimeout(() => fire('time'), t.seconds * 1000);
          cleanupFns.push(() => clearTimeout(id));
        } else if (t.type === 'scroll') {
          const onScroll = () => {
            const doc = document.documentElement;
            const total = doc.scrollHeight - window.innerHeight;
            if (total <= 0) return;
            const pct = (window.scrollY / total) * 100;
            if (pct >= t.percent) fire('scroll');
          };
          window.addEventListener('scroll', onScroll, { passive: true });
          cleanupFns.push(() => window.removeEventListener('scroll', onScroll));
        }
      }
    };

    // Never auto-fire on the magnet's own reward page. A visitor on '/flyer'
    // is already looking at the thing the popup gives away, so a timer/scroll
    // popup there is pure friction. The manual trigger below stays live, so the
    // flyer page's "EMAIL ME THE PDF" button still opens the email-capture modal.
    const onRewardPage = !!candidate.rewardUrl && pathname === candidate.rewardUrl;

    if (onRewardPage) {
      // skip auto triggers entirely
    } else if (isAgeVerified()) {
      wireAutoTriggers();
    } else {
      const poll = window.setInterval(() => {
        if (isAgeVerified()) {
          clearInterval(poll);
          wireAutoTriggers();
        }
      }, 300);
      cleanupFns.push(() => clearInterval(poll));
    }

    // Manual trigger stays live regardless of the age gate: it only fires on an
    // explicit user action (e.g. the flyer page's "preview" button dispatches
    // 'lead-magnet:open'), so it can never queue-jump a gate.
    const onManual = (ev: Event) => {
      const ce = ev as CustomEvent<{ id?: string }>;
      if (!ce.detail?.id || ce.detail.id === candidate.id) {
        fire('manual');
      }
    };
    window.addEventListener('lead-magnet:open', onManual as EventListener);
    cleanupFns.push(() =>
      window.removeEventListener('lead-magnet:open', onManual as EventListener),
    );

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [candidate, pathname]);

  if (!activeMagnet) return null;

  return (
    <LeadMagnetModal
      magnet={activeMagnet}
      open
      onClose={() => {
        markShown(activeMagnet.id);
        setActiveMagnet(null);
      }}
    />
  );
}
