'use client';

/**
 * /admin/emails/followups — control panel for the site-wide follow-up email
 * system: master kill switch + per-journey flags, upcoming queue, sent log,
 * suppression management, conversion stats, and test sends.
 *
 * Auth comes from the shared /admin layout (ops session); every API route
 * this page calls also gates itself with requireOpsAuth.
 */

import type { ReactElement } from 'react';
import EmailHubBand from '@/components/admin/emails/EmailHubBand';
import CopyEditorPanel from '@/components/admin/followups/CopyEditorPanel';
import FlagsPanel from '@/components/admin/followups/FlagsPanel';
import QueuePanel from '@/components/admin/followups/QueuePanel';
import SentLogPanel from '@/components/admin/followups/SentLogPanel';
import SuppressionsPanel from '@/components/admin/followups/SuppressionsPanel';
import StatsPanel from '@/components/admin/followups/StatsPanel';
import TestSendPanel from '@/components/admin/followups/TestSendPanel';

export default function FollowupsAdminPage(): ReactElement {
  return (
    <div className="bg-gray-50 min-h-screen">
      <EmailHubBand active="followups" />
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="font-heading text-3xl tracking-[0.1em] text-gray-900">Follow-Ups</h1>
          <p className="text-sm text-gray-500">
            Automated follow-up emails (2-touch max, 9am–7pm CT, personal voice from info@).
            Engine runs every 15 minutes.
          </p>
        </div>

        <FlagsPanel />
        <StatsPanel />
        <QueuePanel />
        <SentLogPanel />
        <CopyEditorPanel />
        <TestSendPanel />
        <SuppressionsPanel />
      </div>
    </div>
  );
}
