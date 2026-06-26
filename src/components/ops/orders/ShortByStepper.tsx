'use client';

import { ReactElement } from 'react';

/** −/value/+ stepper for "short by" counts. Touch-friendly 36px buttons. */
export default function ShortByStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): ReactElement {
  return (
    <div className="w-[104px] flex items-center justify-center gap-0.5 flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 touch-manipulation"
        aria-label="Decrease short by"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-9 h-9 text-center text-base border border-gray-300 rounded-lg py-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Short by"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 touch-manipulation"
        aria-label="Increase short by"
      >
        +
      </button>
    </div>
  );
}
