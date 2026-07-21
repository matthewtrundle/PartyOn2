/**
 * WF statement CSV parser — the sign flip (WF debit=negative / Plaid outflow=
 * positive) is the load-bearing correctness property; the descriptor→PFC hints
 * keep owner draws off the meals line; the dedupe key must be identical for the
 * same transaction whether it came from a PDF statement or the activity CSV.
 */

import { describe, it, expect } from 'vitest';
import {
  parseWfActivityCsv,
  parseCsvLine,
  toIsoDate,
  parseWfAmountCents,
  normalizeDescriptor,
} from '@/lib/finance/wf-statement-parser';

const HEADER = '"DATE","DESCRIPTION","AMOUNT","CHECK #","STATUS"';

describe('parseCsvLine', () => {
  it('handles quoted fields with embedded commas', () => {
    expect(parseCsvLine('"07/17/2026","SQ *CANTRIP, INC gosq.com","-150.00","","Posted"')).toEqual([
      '07/17/2026',
      'SQ *CANTRIP, INC gosq.com',
      '-150.00',
      '',
      'Posted',
    ]);
  });

  it('handles doubled-quote escapes', () => {
    expect(parseCsvLine('"a ""b"" c","1.00"')).toEqual(['a "b" c', '1.00']);
  });
});

describe('toIsoDate', () => {
  it('converts MM/DD/YYYY to ISO', () => {
    expect(toIsoDate('01/02/2024')).toBe('2024-01-02');
    expect(toIsoDate('7/9/2024')).toBe('2024-07-09');
  });
  it('rejects junk', () => {
    expect(toIsoDate('not a date')).toBeNull();
    expect(toIsoDate('13/40/2024')).toBeNull();
  });
});

describe('parseWfAmountCents', () => {
  it('parses signed money with commas and $', () => {
    expect(parseWfAmountCents('-3,750.00')).toBe(-375000);
    expect(parseWfAmountCents('629.84')).toBe(62984);
    expect(parseWfAmountCents('$16,959.43')).toBe(1695943);
  });
  it('rejects non-money', () => {
    expect(parseWfAmountCents('CHECK')).toBeNull();
    expect(parseWfAmountCents('')).toBeNull();
  });
});

describe('parseWfActivityCsv — sign convention (the critical mapping)', () => {
  it('flips WF sign to Plaid convention: deposit (+) → inflow (Plaid −), withdrawal (−) → outflow (Plaid +)', () => {
    const csv = [
      HEADER,
      '"01/03/2024","STRIPE TRANSFER ST-C3O2F7I8Y6T3","667.72","","Posted"', // WF + = deposit
      '"01/02/2024","PURCHASE RISER BILLING","-30.21","","Posted"', // WF − = withdrawal
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows).toHaveLength(2);
    const deposit = rows.find((r) => r.descriptor.includes('STRIPE'))!;
    const withdrawal = rows.find((r) => r.descriptor.includes('RISER'))!;
    expect(deposit.plaidAmountCents).toBe(-66772); // inflow → negative in Plaid
    expect(deposit.isInflow).toBe(true);
    expect(withdrawal.plaidAmountCents).toBe(3021); // outflow → positive in Plaid
    expect(withdrawal.isInflow).toBe(false);
  });
});

describe('parseWfActivityCsv — structure', () => {
  it('skips the header row and blank lines', () => {
    const csv = [HEADER, '', '"01/02/2024","PURCHASE","-10.00","","Posted"', ''].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].dateISO).toBe('2024-01-02');
  });

  it('captures the check number and the ISO date', () => {
    const csv = [HEADER, '"07/17/2026","CHECK","-392.71","100117","Posted"'].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].checkNumber).toBe('100117');
    expect(rows[0].dateISO).toBe('2026-07-17');
    expect(rows[0].plaidAmountCents).toBe(39271); // outflow
  });

  it('collects malformed rows in skipped[] instead of throwing', () => {
    const csv = [
      HEADER,
      '"bad-date","PURCHASE","-10.00","","Posted"',
      '"01/02/2024","ZERO","0.00","","Posted"',
      '"01/02/2024","PURCHASE","not-money","","Posted"',
      '"01/03/2024","GOOD","-5.00","","Posted"',
    ].join('\n');
    const { rows, skipped } = parseWfActivityCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].descriptor).toBe('GOOD');
    expect(skipped).toHaveLength(3);
    expect(skipped.map((s) => s.reason)).toEqual([
      expect.stringContaining('date'),
      'zero amount',
      expect.stringContaining('amount'),
    ]);
  });
});

describe('parseWfActivityCsv — PFC hints for statement rows (no real PFC)', () => {
  it('hints TRANSFER_OUT for an owner-draw transfer so it is not booked as a meal', () => {
    // Brian's LLC and Allan's USAA are the owners' known linked accounts.
    for (const desc of [
      'Online Transfer to B Hill Entertainment LLC Business Checking',
      'Online Transfer to USAA Federal Savings Bank Chk xxxxx4514 A. Henslee',
    ]) {
      const { rows } = parseWfActivityCsv([HEADER, `"02/14/2024","${desc}","-20000.00","","Posted"`].join('\n'));
      expect(rows[0].pfcPrimaryHint).toBe('TRANSFER_OUT');
    }
  });

  it('does NOT hint a transfer to a NON-owner recipient (a real bill via linked transfer stays an expense)', () => {
    // The anchored hint must not sweep a genuine vendor payment into non_operating.
    const csv = [
      HEADER,
      '"02/14/2024","Online Transfer to Riverside Property Management LLC Rent","-4500.00","","Posted"',
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].pfcPrimaryHint).toBeNull();
  });

  it('hints LOAN_PAYMENTS for a PeopleFund payment outflow', () => {
    const csv = [
      HEADER,
      '"03/21/2024","Peoplefund Pymt Web Pmts 032124 Party on Delivery","-6178.46","","Posted"',
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].pfcPrimaryHint).toBe('LOAN_PAYMENTS');
  });

  it('does NOT hint on an inflow (inflows are classified by descriptor, not PFC)', () => {
    // A PeopleFund ADVANCE is an inflow → no PFC hint; classifyBankInflow handles it.
    const csv = [
      HEADER,
      '"02/14/2024","Peoplefund Advance 0006957 Full and Final Funding","201660.00","","Posted"',
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].isInflow).toBe(true);
    expect(rows[0].pfcPrimaryHint).toBeNull();
  });

  it('leaves an ordinary purchase unhinted', () => {
    const csv = [HEADER, '"01/02/2024","PURCHASE HEB CURBSIDE","-201.81","","Posted"'].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].pfcPrimaryHint).toBeNull();
  });
});

describe('parseWfActivityCsv — dedupe key stability (PDF ↔ CSV overlap)', () => {
  it('produces the SAME dedupe key for the same txn from a PDF (Title Case, single spaces) and the CSV (UPPER, padded)', () => {
    const pdf = [
      HEADER,
      '"06/20/2024","Purchase authorized on 06/18 SQ *Cantrip, INC gosq.com MA S384170565898946 Card 9853","-150.00","","Posted"',
    ].join('\n');
    const csvPadded = [
      HEADER,
      '"06/20/2024","PURCHASE                 AUTHORIZED ON   06/18 SQ *CANTRIP, INC          gosq.com      MA  S384170565898946   CARD 9853","-150.00","","Posted"',
    ].join('\n');
    const a = parseWfActivityCsv(pdf).rows[0];
    const b = parseWfActivityCsv(csvPadded).rows[0];
    expect(a.dedupeKey).toBe(b.dedupeKey);
  });

  it('keeps two genuinely-identical rows (duplicate ATM fees) as DISTINCT keys, not one', () => {
    // Older statements have rows with no unique auth code — two $5 ATM fees on
    // the same day are two real fees and must not collapse (would undercount).
    const csv = [
      HEADER,
      '"09/29/2023","Non-Wells Fargo ATM Transaction Fee","-5.00","","Posted"',
      '"09/29/2023","Non-Wells Fargo ATM Transaction Fee","-5.00","","Posted"',
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].dedupeKey).not.toBe(rows[1].dedupeKey);
    // First occurrence keeps the BARE key (prior imports stay idempotent); only
    // the second gets a suffix.
    expect(rows[0].dedupeKey).not.toContain('|#');
    expect(rows[1].dedupeKey).toContain('|#1');
  });

  it('distinguishes two same-day same-amount checks by check number', () => {
    const csv = [
      HEADER,
      '"07/01/2024","CHECK","-3750.00","100117","Posted"',
      '"07/01/2024","CHECK","-3750.00","100118","Posted"',
    ].join('\n');
    const { rows } = parseWfActivityCsv(csv);
    expect(rows[0].dedupeKey).not.toBe(rows[1].dedupeKey);
  });
});

describe('normalizeDescriptor', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeDescriptor('  Purchase   AUTHORIZED  on ')).toBe('purchase authorized on');
  });
});
