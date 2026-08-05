/**
 * The concierge questionnaire is the main destination for the paid Bachelor /
 * Bachelorette Search campaigns, and until PR #363's analysis nothing in this
 * funnel fired a lead conversion — so Google Ads received ZERO signal from the
 * 23% of traffic it sends here and Smart Bidding bought the cheapest clicks.
 *
 * These tests pin the fix: a successful submit MUST fire
 * fireLeadConversionAndFlush exactly once, tagged with the lander's occasion,
 * and a FAILED submit must fire nothing (or we teach Ads that junk converts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConciergeQuestionnaireModal from '../ConciergeQuestionnaireModal';

const mocks = vi.hoisted(() => ({
  fireLeadConversionAndFlush: vi.fn(() => Promise.resolve()),
  getAttribution: vi.fn(() => undefined),
}));

vi.mock('@/lib/leads/fireLeadConversion', () => ({
  fireLeadConversionAndFlush: mocks.fireLeadConversionAndFlush,
}));
vi.mock('@/lib/analytics/attribution', () => ({
  getAttribution: mocks.getAttribution,
}));

/** Walk the 6-step form to the contact step and submit with valid contact. */
async function completeAndSubmit() {
  // Steps 1–5 all satisfy canAdvanceFrom() with their defaults (headcount 10,
  // default dates, party type from variant, budget, two activities), so five
  // "Continue" clicks reach the contact step.
  for (let i = 0; i < 5; i++) {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  }
  fireEvent.change(screen.getByPlaceholderText('First name'), {
    target: { value: 'Jordan' },
  });
  fireEvent.change(screen.getByPlaceholderText('Email'), {
    target: { value: 'jordan@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send my plan/i }));
}

function mockLeadApi(response: { ok: boolean; error?: string }, httpOk = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: httpOk,
    json: async () => response,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConciergeQuestionnaireModal — lead conversion firing', () => {
  it('fires the conversion once with occasion=bachelor on a successful submit', async () => {
    mockLeadApi({ ok: true });
    render(
      <ConciergeQuestionnaireModal
        variant="bachelor"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await completeAndSubmit();

    await waitFor(() =>
      expect(mocks.fireLeadConversionAndFlush).toHaveBeenCalledTimes(1),
    );
    expect(mocks.fireLeadConversionAndFlush).toHaveBeenCalledWith({
      occasion: 'bachelor',
      placement: 'concierge-quiz',
    });
  });

  it('carries occasion=bachelorette for the bachelorette lander', async () => {
    mockLeadApi({ ok: true });
    render(
      <ConciergeQuestionnaireModal
        variant="bachelorette"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await completeAndSubmit();

    await waitFor(() =>
      expect(mocks.fireLeadConversionAndFlush).toHaveBeenCalledWith({
        occasion: 'bachelorette',
        placement: 'concierge-quiz',
      }),
    );
  });

  it('calls onSuccess only AFTER the conversion has flushed', async () => {
    mockLeadApi({ ok: true });
    const onSuccess = vi.fn();
    render(
      <ConciergeQuestionnaireModal
        variant="bachelor"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    await completeAndSubmit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    // The flush must have run before the modal was told to unmount, or the
    // beacon races the teardown and the hit is lost.
    expect(mocks.fireLeadConversionAndFlush).toHaveBeenCalled();
    expect(mocks.fireLeadConversionAndFlush.mock.invocationCallOrder[0]).toBeLessThan(
      onSuccess.mock.invocationCallOrder[0],
    );
  });

  it('fires NOTHING when the lead API reports failure', async () => {
    mockLeadApi({ ok: false, error: 'nope' });
    const onSuccess = vi.fn();
    render(
      <ConciergeQuestionnaireModal
        variant="bachelor"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    await completeAndSubmit();

    await waitFor(() => expect(screen.getByText('nope')).toBeInTheDocument());
    expect(mocks.fireLeadConversionAndFlush).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('fires NOTHING when the request returns a non-2xx status', async () => {
    // The other half of the same guard as the ok:false case: an HTTP error
    // (e.g. 500) must not be reported to Ads as a conversion either.
    mockLeadApi({ ok: true }, /* httpOk */ false);
    const onSuccess = vi.fn();
    render(
      <ConciergeQuestionnaireModal
        variant="bachelor"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    await completeAndSubmit();

    await waitFor(() =>
      expect(
        screen.getByText('Something went wrong. Try again?'),
      ).toBeInTheDocument(),
    );
    expect(mocks.fireLeadConversionAndFlush).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
