'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import Image from 'next/image';
import type { Package, PackageLineItem, ThemeColors } from '../types';

type Props = {
  packages: Package[];
  theme: ThemeColors;
  /** Eyebrow shown above the grid. Optional. */
  eyebrow?: string;
  /** Headline shown above the grid. Optional. */
  headline?: string;
  /** Subhead shown above the grid. Optional. */
  blurb?: string;
  /** Optional content rendered below the grid (e.g. the "Need something custom?" line). */
  footer?: ReactNode;
  /**
   * Primary CTA shown on every card. Defaults to "BUY THIS PACKAGE NOW →".
   * Wes-template pages pass an `onBuyNow` that opens QuickBuyModal; the
   * wedding calculator passes a scroll-to-quote-form handler with a custom
   * label.
   */
  primaryCtaLabel?: string;
  onPrimaryCta: (pkg: Package) => void;
  /**
   * Optional secondary CTA (e.g. "Build my own") shown below the primary.
   * If `onSecondaryCta` is omitted the secondary button is not rendered.
   */
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
};

export default function PackageCardGrid({
  packages,
  theme: T,
  eyebrow,
  headline,
  blurb,
  primaryCtaLabel = 'BUY THIS PACKAGE NOW →',
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  footer,
}: Props): ReactElement {
  return (
    <section id="packages" className="py-24 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {(eyebrow || headline || blurb) && (
          <div className="text-center mb-20 max-w-3xl mx-auto">
            {eyebrow && (
              <p
                className="font-bold tracking-[0.15em] text-sm mb-4"
                style={{ color: T.blue }}
              >
                {eyebrow}
              </p>
            )}
            {headline && (
              <h2
                className="font-heading text-4xl md:text-5xl font-bold mb-6 leading-tight"
                style={{ color: T.navy }}
              >
                {headline}
              </h2>
            )}
            {blurb && (
              <p className="text-lg text-gray-600 leading-relaxed">{blurb}</p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.name}
              pkg={pkg}
              theme={T}
              primaryCtaLabel={primaryCtaLabel}
              onPrimaryCta={onPrimaryCta}
              secondaryCtaLabel={secondaryCtaLabel}
              onSecondaryCta={onSecondaryCta}
            />
          ))}
        </div>

        {footer}
      </div>
    </section>
  );
}

function PackageCard({
  pkg,
  theme: T,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
}: {
  pkg: Package;
  theme: ThemeColors;
  primaryCtaLabel: string;
  onPrimaryCta: (pkg: Package) => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);

  const isLive = !!pkg.lineItems && pkg.packagePrice != null;

  const priceLabel = isLive ? `$${pkg.packagePrice}` : pkg.price ?? '';
  const saveLabel = isLive
    ? `Save $${pkg.freebiesValue ?? 0}`
    : pkg.save ?? '';

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
          className="absolute top-4 right-4 z-10 text-xs font-bold tracking-widest px-3 py-1 rounded-full"
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
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-heading text-4xl font-bold" style={{ color: T.blue }}>
            {priceLabel}
          </span>
          <span className="text-sm text-gray-500">{pkg.serves}</span>
        </div>
        <p className="text-gray-600 mb-4 leading-relaxed">{pkg.blurb}</p>

        {isLive && pkg.lineItems && pkg.lineItems.length > 0 && (
          <ul className="mb-4 space-y-1.5 text-sm text-gray-700">
            {summarizeAlcohol(alcoholItems).map((line, i) => (
              <li key={`sum-${i}`} className="flex items-start gap-2">
                <span className="mt-0.5 font-bold" style={{ color: T.primary }}>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
            {freebieItems.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold" style={{ color: '#047857' }}>
                  ★
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
              <span className="text-xs" style={{ color: T.blue }}>
                {open ? '▲' : '▼'}
              </span>
            </button>
            {open && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-gray-500 mb-1.5">
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
                      className="text-[10px] font-bold tracking-widest mb-1.5"
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
                <span className="mt-0.5 font-bold" style={{ color: T.primary }}>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onPrimaryCta(pkg)}
            className="block text-center font-bold py-4 px-6 rounded-md tracking-wide transition-all w-full hover:scale-[1.01] shadow-md"
            style={{ background: T.primary, color: T.primaryText }}
          >
            {primaryCtaLabel}
          </button>
          {secondaryCtaLabel && onSecondaryCta && (
            <button
              type="button"
              onClick={onSecondaryCta}
              className="block text-center font-bold py-3 px-6 rounded-md tracking-wide transition-colors w-full"
              style={{
                background: '#FFFFFF',
                color: T.navy,
                border: `2px solid ${T.navy}`,
              }}
            >
              {secondaryCtaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function summarizeAlcohol(items: PackageLineItem[]): string[] {
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
