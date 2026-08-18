import { describe, it, expect } from 'vitest';
import { splitTitle, sizeTypeOf } from '../KegProductGrid';

/**
 * The keg grid renders live from the `kegs` collection, so the only thing
 * standing between a catalog title and what a customer reads on the card is
 * splitTitle(). These cases are the 23 real sellable titles in that collection
 * as of 2026-08-18, plus the shapes that broke naive parsing.
 */
describe('splitTitle', () => {
  it('splits the standard "Brand • Size" shape', () => {
    expect(splitTitle('Coors Light Keg • 1/2 Barrel')).toEqual({
      name: 'Coors Light Keg',
      size: '1/2 Barrel',
    });
    expect(splitTitle('Zilker Marco IPA • 1/6 Barrel')).toEqual({
      name: 'Zilker Marco IPA',
      size: '1/6 Barrel',
    });
    expect(splitTitle('Dos Equis Keg • Slim Keg (20L)')).toEqual({
      name: 'Dos Equis Keg',
      size: 'Slim Keg (20L)',
    });
  });

  it('handles legacy titles with no bullet separator', () => {
    // The one real row in the collection without a bullet.
    expect(splitTitle('Yuengling Slim Keg 1/4 Barrel')).toEqual({
      name: 'Yuengling',
      size: 'Slim Keg 1/4 Barrel',
    });
  });

  it('peels a trailing barrel size off an unseparated title', () => {
    expect(splitTitle('Karbach Hopadillo 1/6 Barrel')).toEqual({
      name: 'Karbach Hopadillo',
      size: '1/6 Barrel',
    });
  });

  it('falls back to the whole title when no size is recognizable', () => {
    expect(splitTitle('Mystery Brew')).toEqual({
      name: 'Mystery Brew',
      size: 'Keg',
    });
  });

  it('trims stray whitespace around the separator', () => {
    expect(splitTitle('Lone Star Keg   •   1/2 Barrel')).toEqual({
      name: 'Lone Star Keg',
      size: '1/2 Barrel',
    });
  });
});

describe('sizeTypeOf', () => {
  it('classifies half barrels as half', () => {
    expect(sizeTypeOf('1/2 Barrel')).toBe('half');
  });

  it('classifies every smaller format as slim', () => {
    expect(sizeTypeOf('1/6 Barrel')).toBe('slim');
    expect(sizeTypeOf('1/4 Barrel')).toBe('slim');
    expect(sizeTypeOf('Slim Keg (20L)')).toBe('slim');
    expect(sizeTypeOf('Slim Keg 1/4 Barrel')).toBe('slim');
  });

  it('does not mistake a quarter barrel for a half barrel', () => {
    // Guards the tab split: "1/4" must never land in the 1/2 Barrels tab.
    expect(sizeTypeOf('1/4 Barrel')).not.toBe('half');
  });
});
