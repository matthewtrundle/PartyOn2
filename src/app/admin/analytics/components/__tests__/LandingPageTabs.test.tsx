/**
 * The analytics hub's nav: core funnels stay pills, everything else lives in
 * the "More pages" picker. Guards the two regressions that matter — a
 * secondary page becoming unreachable, and the picker losing the active
 * page's identity when you're on one.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPageTabs from '../LandingPageTabs';
import { primaryLandingPages, secondaryLandingPageGroups } from '@/lib/analytics/landing-pages';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
});

describe('LandingPageTabs', () => {
  it('renders one pill per primary page and no pill for secondary pages', () => {
    render(<LandingPageTabs active="home" />);

    for (const p of primaryLandingPages()) {
      expect(screen.getByRole('link', { name: p.displayName })).toBeTruthy();
    }
    // Secondary pages are options, never links.
    expect(screen.queryByRole('link', { name: 'Partners · Bartenders' })).toBeNull();
  });

  it('offers every secondary page in the picker, grouped', () => {
    render(<LandingPageTabs active="home" />);
    const select = screen.getByRole('combobox', { name: 'More landing pages' });

    const optionValues = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    for (const g of secondaryLandingPageGroups()) {
      for (const p of g.pages) expect(optionValues).toContain(p.key);
    }
    const groupLabels = Array.from(select.querySelectorAll('optgroup')).map((g) =>
      g.getAttribute('label'),
    );
    expect(groupLabels).toEqual(['Other landing pages', 'Partner pages (B2B)']);
  });

  it('navigates when a secondary page is picked', () => {
    render(<LandingPageTabs active="home" />);
    fireEvent.change(screen.getByRole('combobox', { name: 'More landing pages' }), {
      target: { value: 'partners-bartenders' },
    });
    expect(push).toHaveBeenCalledWith('/admin/analytics?page=partners-bartenders', {
      scroll: false,
    });
  });

  it('shows the active secondary page as the picker value', () => {
    render(<LandingPageTabs active="partners-vacation-rentals" />);
    const select = screen.getByRole('combobox', {
      name: 'More landing pages',
    }) as HTMLSelectElement;
    expect(select.value).toBe('partners-vacation-rentals');
  });

  it('leaves the picker unselected while a tab is active', () => {
    render(<LandingPageTabs active="weddings" />);
    const select = screen.getByRole('combobox', {
      name: 'More landing pages',
    }) as HTMLSelectElement;
    expect(select.value).toBe('');
  });
});
