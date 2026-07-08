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

    // Manual trigger: any code can dispatch 'lead-magnet:open' to force it.
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
