'use client';

/**
 * Microsoft Clarity analytics initializer.
 *
 * Renders nothing — its only job is to fire `Clarity.init()` once on the
 * client after hydration in production. Dev sessions stay out of the data
 * because we gate on NODE_ENV. The project ID is read from
 * NEXT_PUBLIC_CLARITY_PROJECT_ID (Vercel env + local .env.local only).
 */

import { useEffect, type ReactElement } from 'react';
import Clarity from '@microsoft/clarity';

export default function ClarityInit(): ReactElement | null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) {
      // Don't warn loudly in prod — just bail silently so we don't fill the console.
      return;
    }

    Clarity.init(projectId);
  }, []);

  return null;
}
