/**
 * Lightweight identity for the Game Plan page. Both owners log in with the same
 * shared admin password, so the session can't tell Allan from Brian. Instead we
 * remember "who's working" in localStorage and stamp it on progress notes /
 * default owner. No change to the auth system (see plan: Identity).
 */

'use client';

import { useState, useEffect, ReactElement } from 'react';

const STORAGE_KEY = 'strategy_user';
export const PEOPLE = ['Allan', 'Brian'] as const;

/** Read/write the active viewer name from localStorage. */
export function useStrategyUser(): {
  user: string | null;
  ready: boolean;
  setUser: (name: string) => void;
} {
  const [user, setUserState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setUserState(localStorage.getItem(STORAGE_KEY));
    } catch {
      // localStorage unavailable — treat as unset
    }
    setReady(true);
  }, []);

  const setUser = (name: string): void => {
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // ignore persistence failure
    }
    setUserState(name);
  };

  return { user, ready, setUser };
}

/** Full-width prompt shown until the viewer says who they are. */
export function NamePrompt({ onPick }: { onPick: (name: string) => void }): ReactElement {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center">
        <h2 className="text-2xl font-heading tracking-[0.1em] text-gray-900">
          Who&apos;s working on this?
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          We stamp your name on progress notes and use it as the default owner. You can switch
          any time.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          {PEOPLE.map((name) => (
            <button key={name} onClick={() => onPick(name)} className="btn-primary px-8">
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact header control to switch the active viewer. */
export function NameSwitcher({
  user,
  onPick,
}: {
  user: string | null;
  onPick: (name: string) => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Working as</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {PEOPLE.map((name) => (
          <button
            key={name}
            onClick={() => onPick(name)}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
              user === name
                ? 'bg-brand-blue text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
