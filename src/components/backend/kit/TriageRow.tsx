import { ReactElement, ReactNode } from 'react';
import Link from 'next/link';

/**
 * One "needs attention" row: status badge + one-line title + an inline
 * outline action that deep-links to the surface where the item gets fixed.
 */
export default function TriageRow({
  badge,
  title,
  actionLabel,
  actionHref,
  onAction,
}: {
  badge: ReactNode;
  title: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
}): ReactElement {
  const actionCls =
    'inline-flex items-center justify-center min-h-[36px] px-3 rounded-lg border border-brand-blue text-brand-blue font-heading font-bold text-xs tracking-[0.08em] uppercase whitespace-nowrap hover:bg-blue-50 transition-colors touch-manipulation';

  return (
    <div className="flex items-center gap-3 min-h-[52px] py-2 border-t border-gray-100 first:border-t-0">
      <div className="shrink-0">{badge}</div>
      <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">
        {title}
      </div>
      {actionHref ? (
        <Link href={actionHref} className={actionCls}>
          {actionLabel}
        </Link>
      ) : (
        <button type="button" onClick={onAction} className={actionCls}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
