/**
 * Unit tests for the pick-sheet cruise-type + marina-address resolution:
 *  - isBoatAddress recognises every stored spelling of the Premier marina.
 *  - resolveCruiseType is authoritative (manifest → override), never guessing
 *    DISCO from a WEBHOOK source.
 *  - cruiseLabelForCard shows a label only for a marina delivery with a known type.
 */

import { describe, it, expect } from 'vitest';
import { isBoatAddress } from '../boat-address';
import { resolveCruiseType, type CoolerLike } from '../cooler-grouping';
import { cruiseLabelForCard } from '@/components/ops/orders/format';
import type { BoatScheduleRow } from '../cooler-grouping';
import type { OrderCardData } from '../orders-view-data';

const cooler = (over: Partial<CoolerLike>): CoolerLike => ({
  primaryName: '',
  address: '',
  source: 'DIRECT',
  partyType: null,
  manifestMatch: null,
  payments: [],
  cruiseType: null,
  ...over,
});
const tab = (sheetTab: string): BoatScheduleRow => ({ sheetTab } as unknown as BoatScheduleRow);

describe('isBoatAddress', () => {
  it('matches every stored spelling of the marina', () => {
    for (const a of [
      '13993 Farm to Market Rd 2769, Leander, TX 78641',
      '13993 FM 2769, Leander, TX 78641',
      '13993 Farm to Market 2769',
      'Rocky Hills Marina',
    ]) {
      expect(isBoatAddress(a)).toBe(true);
    }
  });

  it('rejects non-marina addresses and empties', () => {
    expect(isBoatAddress('123 Main St, Austin, TX 78704')).toBe(false);
    expect(isBoatAddress('')).toBe(false);
    expect(isBoatAddress(null)).toBe(false);
  });
});

describe('resolveCruiseType', () => {
  it('reads the boat manifest first (DSC/PVT tabs)', () => {
    expect(resolveCruiseType(cooler({ manifestMatch: tab('07-DSC') }))).toEqual({ type: 'DISCO', known: true });
    expect(resolveCruiseType(cooler({ manifestMatch: tab('08-PVT') }))).toEqual({ type: 'PRIVATE', known: true });
  });

  it('falls back to the operator override when no manifest match', () => {
    expect(resolveCruiseType(cooler({ cruiseType: 'PRIVATE' }))).toEqual({ type: 'PRIVATE', known: true });
    expect(resolveCruiseType(cooler({ cruiseType: 'DISCO' }))).toEqual({ type: 'DISCO', known: true });
  });

  it('does NOT guess DISCO from a WEBHOOK source — stays unknown', () => {
    expect(resolveCruiseType(cooler({ source: 'WEBHOOK' }))).toEqual({ type: null, known: false });
  });

  it('is unknown with neither manifest nor override', () => {
    expect(resolveCruiseType(cooler({}))).toEqual({ type: null, known: false });
  });

  it('manifest wins over a conflicting override', () => {
    expect(resolveCruiseType(cooler({ manifestMatch: tab('07-DSC'), cruiseType: 'PRIVATE' }))).toEqual({
      type: 'DISCO',
      known: true,
    });
  });
});

describe('cruiseLabelForCard', () => {
  const card = (over: Partial<OrderCardData>): OrderCardData => ({ address: '', cruiseType: null, ...over } as OrderCardData);

  it('labels a marina delivery with a known type', () => {
    expect(cruiseLabelForCard(card({ address: '13993 Farm to Market Rd 2769, Leander, TX', cruiseType: 'DISCO' }))).toBe('DISCO');
  });

  it('shows nothing for a non-marina delivery even with a type', () => {
    expect(cruiseLabelForCard(card({ address: '10 Elm St, Austin', cruiseType: 'PRIVATE' }))).toBeNull();
  });

  it('shows nothing when the type is unknown', () => {
    expect(cruiseLabelForCard(card({ address: '13993 FM 2769', cruiseType: null }))).toBeNull();
  });
});
