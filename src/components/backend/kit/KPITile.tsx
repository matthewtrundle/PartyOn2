import { ReactElement } from 'react';

/**
 * KPI stat tile for the Today grid and dashboard rows. Value in Barlow
 * Condensed; delta line goes green for positive movement, red for alert
 * values, gray for plain context.
 */
export default function KPITile({
  label,
  value,
  delta,
  deltaTone = 'gray',
  valueTone = 'default',
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'green' | 'red' | 'gray';
  valueTone?: 'default' | 'red';
}): ReactElement {
  const deltaCls =
    deltaTone === 'green'
      ? 'text-green-600'
      : deltaTone === 'red'
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-[14px]">
      <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-500">
        {label}
      </div>
      <div
        className={`font-heading font-bold text-3xl leading-tight mt-1 ${
          valueTone === 'red' ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      {delta && (
        <div className={`text-xs font-semibold mt-0.5 ${deltaCls}`}>{delta}</div>
      )}
    </div>
  );
}
