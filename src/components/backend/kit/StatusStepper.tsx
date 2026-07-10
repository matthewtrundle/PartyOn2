import { ReactElement } from 'react';
import HqBadge from './Badge';

/**
 * Order status stepper: PAID → PACKING → OUT → DELIVERED. `currentIndex` is
 * the active step (done steps sit before it); pass `failed` to overlay the
 * FAILED state as a red badge per the design (the stepper itself freezes).
 */
export default function StatusStepper({
  steps,
  currentIndex,
  failed = false,
}: {
  steps: string[];
  currentIndex: number;
  failed?: boolean;
}): ReactElement {
  return (
    <div>
      {failed && (
        <div className="mb-2">
          <HqBadge variant="solid-red">Delivery failed</HqBadge>
        </div>
      )}
      <div className="flex items-start">
        {steps.map((label, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={label} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  className={`absolute top-[13px] right-1/2 w-full h-0.5 -translate-x-0 ${
                    i <= currentIndex ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                  style={{ left: '-50%' }}
                />
              )}
              <div
                className={`relative z-10 w-[26px] h-[26px] rounded-full flex items-center justify-center ${
                  done
                    ? 'bg-green-600'
                    : current
                      ? 'bg-brand-blue ring-4 ring-brand-blue/15'
                      : 'bg-white border-2 border-gray-300'
                }`}
              >
                {done && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {current && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div
                className={`mt-1.5 text-[11px] font-bold tracking-[0.05em] uppercase ${
                  done || current ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
