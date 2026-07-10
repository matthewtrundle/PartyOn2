import { ReactElement } from 'react';

export const metadata = {
  title: 'Offline — Party On HQ',
  robots: { index: false, follow: false },
};

/**
 * Precached offline fallback (see public/sw.js). Static, no auth, no data —
 * shown when a navigation fails with no network in the installed app.
 */
export default function OfflinePage(): ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-6">
      <div className="text-center text-white max-w-sm">
        <div className="font-heading font-bold text-3xl tracking-[0.12em]">
          PARTY ON <span className="text-gold">HQ</span>
        </div>
        <p className="mt-4 text-sm text-[#8FA3B5]">
          You&apos;re offline. The command center needs a connection — check your
          signal and pull to refresh.
        </p>
      </div>
    </div>
  );
}
