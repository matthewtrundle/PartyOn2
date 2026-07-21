import { ReactElement } from 'react';
import NavyBand from '@/components/backend/shell/NavyBand';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';

const SEGMENTS = [
  { key: 'affiliates', label: 'Affiliates', href: '/admin/affiliates' },
  { key: 'promotions', label: 'Promotions', href: '/admin/promotions' },
  { key: 'str-prospects', label: 'STR Prospects', href: '/admin/affiliates/prospects/str' },
  { key: 'bartending-prospects', label: 'Bartending Prospects', href: '/admin/affiliates/prospects/bartending' },
];

/**
 * Navy band + segmented control shared by the Partners hub views
 * (affiliate program, discount codes, and the partner-prospect
 * databases with enrichment + outreach). Segments are links.
 */
export default function PartnersHubBand({
  active,
}: {
  active: 'affiliates' | 'promotions' | 'str-prospects' | 'bartending-prospects';
}): ReactElement {
  return (
    <NavyBand>
      <SegmentedControl segments={SEGMENTS} active={active} className="max-w-2xl" />
    </NavyBand>
  );
}
