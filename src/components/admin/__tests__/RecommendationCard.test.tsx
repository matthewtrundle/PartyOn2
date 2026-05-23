import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationCard } from '../RecommendationCard';
import type { RecommendationCardData } from '@/lib/recommendations/card-types';

function mkRec(overrides: Partial<RecommendationCardData> = {}): RecommendationCardData {
  return {
    id: 'r1',
    domain: 'marketing',
    source: 'director',
    generatedAt: '2026-05-15T00:00:00Z',
    title: 'Test rec',
    body: 'Body text',
    segment: null,
    metric: null,
    currentValue: null,
    targetValue: null,
    impactDollarsMonthly: 500,
    effortTier: 'm',
    riskTier: 'recommend',
    status: 'open',
    shippedAt: null,
    notes: null,
    resultMetricBefore: null,
    resultMetricAfter: null,
    actionPayload: null,
    ...overrides,
  };
}

describe('RecommendationCard', () => {
  it('does NOT render the inline action button when actionPayload is null (marketing)', () => {
    const onExecute = vi.fn();
    render(<RecommendationCard rec={mkRec()} onExecuteAction={onExecute} />);
    expect(screen.queryByText(/Run action/i)).not.toBeInTheDocument();
  });

  it('renders the inline action button when actionPayload is present (ops)', async () => {
    const onExecute = vi.fn();
    const rec = mkRec({
      domain: 'ops',
      actionPayload: {
        kind: 'navigate',
        label: 'Open receiving',
        params: { href: '/ops/inventory/receiving/x' },
      },
    });
    render(<RecommendationCard rec={rec} onExecuteAction={onExecute} />);
    const btn = await screen.findByText('Open receiving');
    fireEvent.click(btn);
    expect(onExecute).toHaveBeenCalledOnce();
  });

  it('falls back to "Run action" label when actionPayload.label is missing', () => {
    const rec = mkRec({
      actionPayload: { kind: 'apiCall', params: {} },
    });
    render(<RecommendationCard rec={rec} onExecuteAction={vi.fn()} />);
    expect(screen.getByText('Run action')).toBeInTheDocument();
  });

  it('shows the domain badge when showDomainBadge is true', () => {
    render(<RecommendationCard rec={mkRec({ domain: 'seo' })} showDomainBadge />);
    expect(screen.getByText('SEO')).toBeInTheDocument();
  });

  it('shows status badge using the open style', () => {
    render(<RecommendationCard rec={mkRec()} />);
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('renders Approve / Reject buttons for open recs', () => {
    render(<RecommendationCard rec={mkRec()} onRequestTransition={vi.fn()} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });
});
