import { ReactElement, ReactNode } from 'react';

/**
 * Sticky bottom action bar for a screen's primary action. Sits above the
 * bottom tab bar via the shell's --pod-tab-h CSS var (0 on desktop and in
 * print), so it is correct at every breakpoint by construction. z-30 per the
 * shell z-scale (chrome 40 / page bars 30 / sheets 50 / overlays 60).
 */
export default function StickyActionBar({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={`fixed left-0 right-0 bottom-[var(--pod-tab-h,0px)] z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3 md:left-[232px] print:hidden ${className}`}
    >
      <div className="flex items-center gap-2 max-w-3xl mx-auto">{children}</div>
    </div>
  );
}
