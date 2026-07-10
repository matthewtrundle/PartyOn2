import { ReactElement } from 'react';
import NavyBand from '@/components/backend/shell/NavyBand';
import SegmentedControl from '@/components/backend/kit/SegmentedControl';

const SEGMENTS = [
  { key: 'affiliates', label: 'Affiliates', href: '/admin/affiliates' },
  { key: 'promotions', label: 'Promotions', href: '/admin/promotions' },
];

/**
 * Navy band + segmented control shared by the Partners hub views
 * (affiliate program + discount codes). Segments are links.
 */
export default function PartnersHubBand({
  active,
}: {
  active: 'affiliates' | 'promotions';
}): ReactElement {
  return (
    <NavyBand>
      <SegmentedControl segments={SEGMENTS} active={active} className="max-w-md" />
    </NavyBand>
  );
}
