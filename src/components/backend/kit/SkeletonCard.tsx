import { ReactElement } from 'react';

/**
 * Loading skeletons that mirror final layout (never spinners for lists).
 * `variant="tile"` mirrors a KPITile; `variant="rows"` mirrors a card list.
 */
export default function SkeletonCard({
  variant = 'rows',
  rows = 3,
}: {
  variant?: 'tile' | 'rows';
  rows?: number;
}): ReactElement {
  if (variant === 'tile') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-[14px] animate-pulse">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded mt-2" />
        <div className="h-3 w-16 bg-gray-100 rounded mt-2" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-[14px] animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 min-h-[52px] border-t border-gray-100 first:border-t-0">
          <div className="w-14 h-5 bg-gray-200 rounded" />
          <div className="flex-1 h-4 bg-gray-100 rounded" />
          <div className="w-16 h-8 bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
