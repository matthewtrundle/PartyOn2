import { ReactElement } from 'react';
import NavyBand from '@/components/backend/shell/NavyBand';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';

const SEGMENTS = [
  { key: 'affiliates', label: 'Affiliates', href: '/admin/affiliates' },
  { key: 'promotions', label: 'Promotions', href: '/admin/promotions' },
  { key: 'premiere-credits', label: 'Premiere Credits', href: '/admin/premiere-credits' },
  { key: 'str-prospects', label: 'STR Prospects', href: '/admin/affiliates/prospects/str' },
  { key: 'bartending-prospects', label: 'Bartending Prospects', href: '/admin/affiliates/prospects/bartending' },
  { key: 'playbook', label: 'Outreach Playbook', href: '/admin/affiliates/prospects/playbook' },
];

/**
 * Navy band + segmented control shared by the Partners hub views
 * (affiliate program, discount codes, and the partner-prospect
 * databases with enrichment + outreach). Segments are links.
 */
export default function PartnersHubBand({
  active,
}: {
  active: 'affiliates' | 'promotions' | 'premiere-credits' | 'str-prospects' | 'bartending-prospects' | 'playbook';
}): ReactElement {
  return (
    <NavyBand>
      <SegmentedControl segments={SEGMENTS} active={active} className="max-w-2xl" />
    </NavyBand>
  );
}
