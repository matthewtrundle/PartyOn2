'use client';

/**
 * Package card with itemized "what's inside" dropdown — extracted from
 * LandingPageTemplate so the template stays readable. One card per
 * occasion package; the featured card scales up with a "MOST BOOKED" tag.
 */

import { useState } from 'react';
import Image from 'next/image';
import type { Package, PackageLineItem, ThemeColors } from '../types';
import { CheckIcon, StarIcon, ChevronDownIcon } from './icons';

export default function PackageCard({
  pkg,
  theme: T,
  onCta,
  onBuyNow,
}: {
  pkg: Package;
  theme: ThemeColors;
  /** Opens the "Build my own" Package Builder modal. */
  onCta: () => void;
  /** Opens the Quick-Buy modal pre-loaded with this package. */
  onBuyNow: (pkg: Package) => void;
}) {
  const [open, setOpen] = useState(false);

  // Modern packages use lineItems + packagePrice + freebiesValue.
  // Legacy/static packages use items + price + save (string).
  const isLive = !!pkg.lineItems && pkg.packagePrice != null;

  const priceLabel = isLive ? `$${pkg.packagePrice}` : pkg.price ?? '';
  // Frame the freebie value as an included bundle, not an abstract discount.
  const saveLabel = isLive
    ? pkg.freebiesValue
      ? `$${pkg.freebiesValue} bundle FREE`
      : ''
    : pkg.save ?? '';
  const perPerson =
    isLive && pkg.defaultPeople && pkg.defaultPeople > 0
      ? Math.round((pkg.packagePrice ?? 0) / pkg.defaultPeople)
      : null;

  const alcoholItems = (pkg.lineItems ?? []).filter((i) => !i.freebie);
  const freebieItems = (pkg.lineItems ?? []).filter((i) => i.freebie);

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col bg-white border-2 transition-all"
      style={{
        borderColor: pkg.featured ? T.primary : '#E5E7EB',
        boxShadow: pkg.featured
          ? '0 25px 50px -12px rgba(0,0,0,0.18)'
          : '0 1px 3px rgba(0,0,0,0.05)',
        transform: pkg.featured ? 'scale(1.03)' : 'none',
      }}
    >
      {pkg.featured && (
        <div
          className="absolute top-4 right-4 z-10 text-xs font-bold tracking-widest px-3 py-1 rounded-lg"
          style={{ background: T.primary, color: T.primaryText }}
        >
          MOST BOOKED
        </div>
      )}
      <div className="relative w-full flex-shrink-0" style={{ height: '208px' }}>
        <Image
          src={pkg.image}
          alt={pkg.name}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading text-2xl font-bold leading-tight" style={{ color: T.navy }}>
            {pkg.name}
          </h3>
          {saveLabel && (
            <span
              className="text-xs font-bold px-2 py-1 rounded whitespace-nowrap"
              style={{ background: '#10B98119', color: '#047857' }}
            >
              {saveLabel}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="font-heading text-4xl font-bold" style={{ color: T.blue }}>
            {priceLabel}
          </span>
          {perPerson != null && (
            <span className="text-sm font-semibold" style={{ color: T.navy }}>
              ≈ ${perPerson}/person
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 mb-3">{pkg.serves}</div>
        <p className="text-gray-600 mb-4 leading-relaxed">{pkg.blurb}</p>

        {/* Summary bullets — category roll-ups, not item names. The detailed
            list lives in the "See what's inside" dropdown below. */}
        {isLive && pkg.lineItems && pkg.lineItems.length > 0 && (
          <ul className="mb-4 space-y-1.5 text-sm text-gray-700">
            {summarizeAlcohol(alcoholItems).map((line, i) => (
              <li key={`sum-${i}`} className="flex items-start gap-2">
                {/* Brand blue, not theme yellow — yellow-on-white fails contrast. */}
                <span className="mt-0.5 flex-shrink-0" style={{ color: T.blue }}>
                  <CheckIcon className="w-4 h-4" />
                </span>
                <span>{line}</span>
              </li>
            ))}
            {freebieItems.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: '#047857' }}>
                  <StarIcon className="w-4 h-4" />
                </span>
                <span style={{ color: '#047857' }}>
                  <strong>Free party bundle:</strong>{' '}
                  {freebieItems
                    .map((f) => f.name.split(' • ')[0].replace(/^\d+\s*/, ''))
                    .slice(0, 4)
                    .join(', ')}
                  {freebieItems.length > 4 ? '…' : ''}
                </span>
              </li>
            )}
          </ul>
        )}

        {/* Itemized dropdown */}
        {isLive ? (
          <div className="mb-5 flex-1">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between text-left font-bold text-sm py-2 border-b transition-colors"
              style={{ color: T.navy, borderColor: '#E5E7EB' }}
              aria-expanded={open}
            >
              <span>
                {open ? 'Hide' : 'See'} what&apos;s inside ({pkg.lineItems!.length} items)
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="text-xs font-bold tracking-widest text-gray-500 mb-1.5">
                    INCLUDED ALCOHOL
                  </div>
                  <ul className="space-y-1.5">
                    {alcoholItems.map((it, i) => (
                      <li
                        key={`a-${i}`}
                        className="flex justify-between gap-3 text-gray-700"
                      >
                        <span className="flex-1">
                          <span className="font-semibold" style={{ color: T.navy }}>
                            {it.qty}×
                          </span>{' '}
                          {it.name}
                        </span>
                        <span className="text-gray-500 whitespace-nowrap">
                          ${(it.unitPrice * it.qty).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {freebieItems.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div
                      className="text-xs font-bold tracking-widest mb-1.5"
                      style={{ color: '#047857' }}
                    >
                      FREE PARTY SUPPLIES (BUNDLED IN)
                    </div>
                    <ul className="space-y-1.5">
                      {freebieItems.map((it, i) => (
                        <li
                          key={`f-${i}`}
                          className="flex justify-between gap-3 text-gray-700"
                        >
                          <span className="flex-1">
                            <span className="font-semibold" style={{ color: T.navy }}>
                              {it.qty}×
                            </span>{' '}
                            {it.name}
                          </span>
                          <span className="whitespace-nowrap font-semibold" style={{ color: '#047857' }}>
                            FREE (${(it.unitPrice * it.qty).toFixed(2)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : pkg.items ? (
          <ul className="space-y-2 mb-7 text-sm text-gray-700 flex-1">
            {pkg.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: T.blue }}>
                  <CheckIcon className="w-4 h-4" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onBuyNow(pkg)}
            className="block text-center font-bold py-4 px-6 rounded-lg tracking-[0.08em] transition-all w-full hover:scale-[1.01] shadow-md"
            style={{ background: T.primary, color: T.primaryText }}
          >
            BUY THIS PACKAGE NOW →
          </button>
          <button
            type="button"
            onClick={onCta}
            className="block text-center font-bold py-3 px-6 rounded-lg tracking-[0.08em] transition-colors w-full"
            style={{
              background: '#FFFFFF',
              color: T.navy,
              border: `2px solid ${T.navy}`,
            }}
          >
            Build my own
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- summarizeAlcohol: roll line items up into category-level bullets ----

/**
 * Reads the package's alcohol line items and returns 3–4 punchy summary
 * bullets the customer can scan in a second, e.g. "5 beer + seltzer packs
 * (108 cans)" / "3 premium spirit bottles" / "Wine & champagne for toasts".
 *
 * Heuristic-only — uses title patterns rather than productType so it works
 * for any future recipe additions.
 */
export function summarizeAlcohol(items: PackageLineItem[]): string[] {
  const out: string[] = [];
  type Bucket = { qty: number; cans: number; bottles: number };
  const buckets: Record<string, Bucket> = {
    beer: { qty: 0, cans: 0, bottles: 0 },
    seltzer: { qty: 0, cans: 0, bottles: 0 },
    spirits: { qty: 0, cans: 0, bottles: 0 },
    wine: { qty: 0, cans: 0, bottles: 0 },
    mixer: { qty: 0, cans: 0, bottles: 0 },
  };

  for (const it of items) {
    const t = it.name.toLowerCase();
    const packMatch = it.name.match(/(\d+)\s*pack/i);
    const cans = packMatch ? parseInt(packMatch[1], 10) * it.qty : 0;
    if (
      /\b(beer|ipa|lager|hefe|pilsner|modelo|miller|coors|corona|michelob|lone star)\b/.test(t)
    ) {
      buckets.beer.qty += it.qty;
      buckets.beer.cans += cans;
    } else if (/\b(seltzer|high noon|white claw|truly|surfside)\b/.test(t)) {
      buckets.seltzer.qty += it.qty;
      buckets.seltzer.cans += cans;
    } else if (
      /\b(vodka|tequila|whiskey|whisky|bourbon|gin|rum|jameson|tito|espolon|casamigos|jack daniels|bulleit)\b/.test(t)
    ) {
      buckets.spirits.qty += it.qty;
      buckets.spirits.bottles += it.qty;
    } else if (
      /\b(wine|champagne|prosecco|rosé|rose|sauv|cab|pinot|veuve|chandon|whispering angel|josh cellars|14 hands|bogle|oyster bay|dark horse)\b/.test(t)
    ) {
      buckets.wine.qty += it.qty;
      buckets.wine.bottles += it.qty;
    } else {
      buckets.mixer.qty += it.qty;
    }
  }

  if (buckets.beer.qty + buckets.seltzer.qty > 0) {
    const totalPacks = buckets.beer.qty + buckets.seltzer.qty;
    const totalCans = buckets.beer.cans + buckets.seltzer.cans;
    const label = buckets.seltzer.qty > 0 && buckets.beer.qty > 0
      ? 'beer + seltzer packs'
      : buckets.seltzer.qty > 0
        ? 'hard-seltzer packs'
        : 'beer packs';
    out.push(
      totalCans > 0
        ? `${totalPacks} ${label} (${totalCans} cans)`
        : `${totalPacks} ${label}`,
    );
  }
  if (buckets.spirits.qty > 0) {
    out.push(`${buckets.spirits.qty} premium spirit bottle${buckets.spirits.qty !== 1 ? 's' : ''}`);
  }
  if (buckets.wine.qty > 0) {
    out.push(`${buckets.wine.qty} bottle${buckets.wine.qty !== 1 ? 's' : ''} of wine + champagne`);
  }
  if (buckets.mixer.qty > 0) {
    out.push('Mixers, juices, and chasers');
  }
  return out.slice(0, 4);
}
