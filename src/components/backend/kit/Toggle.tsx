'use client';

import { ReactElement } from 'react';

/**
 * Accessible switch. `size="master"` is the 64×36 kill-switch variant;
 * `size="row"` the 52×30 per-item variant. Green = on.
 */
export default function Toggle({
  checked,
  onChange,
  size = 'row',
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: 'master' | 'row';
  label?: string;
  disabled?: boolean;
}): ReactElement {
  const dims =
    size === 'master'
      ? { track: 'w-16 h-9', knob: 'w-7 h-7', shift: 'translate-x-7' }
      : { track: 'w-[52px] h-[30px]', knob: 'w-6 h-6', shift: 'translate-x-[22px]' };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors touch-manipulation ${dims.track} ${
        checked ? 'bg-green-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-1 left-1 rounded-full bg-white shadow transition-transform ${dims.knob} ${
          checked ? dims.shift : ''
        }`}
      />
    </button>
  );
}
