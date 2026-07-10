import { ReactElement } from 'react';
import NavyBand from '@/components/backend/shell/NavyBand';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';

const SEGMENTS = [
  { key: 'templates', label: 'Templates', href: '/admin/emails' },
  { key: 'followups', label: 'Follow-Ups', href: '/admin/emails/followups' },
  { key: 'signups', label: 'Signups', href: '/admin/email-signups' },
];

/**
 * Navy band + segmented control shared by the three Email hub views.
 * Segments are links — each view is its own route under the hub.
 */
export default function EmailHubBand({
  active,
}: {
  active: 'templates' | 'followups' | 'signups';
}): ReactElement {
  return (
    <NavyBand>
      <SegmentedControl segments={SEGMENTS} active={active} className="max-w-xl" />
    </NavyBand>
  );
}
