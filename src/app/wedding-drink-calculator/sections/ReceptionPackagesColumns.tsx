'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Package } from '@/components/landing/types';
import { RECEPTION_PACKAGES } from './receptionPackages';

type Props = {
  onPrimaryCta: () => void;
};

/**
 * Wedding-calculator-specific package layout. Editorial three-column
 * presentation — no boxy cards, no scaling. The featured column gets a
 * gold hairline frame and a soft cream background. Prices are
 * monumental, items are quiet text columns.
 */
export default function ReceptionPackagesColumns({ onPrimaryCta }: Props): ReactElement {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section heading */}
        <div className="text-center mb-20 md:mb-24 max-w-2xl mx-auto">
          <div className="h-px w-12 bg-[#C8A96A] mx-auto mb-8" />
          <p className="text-xs tracking-[0.5em] text-[#7E5A40] uppercase font-light mb-8">
            Sample Bar Packages · 100 Guests
          </p>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-[#2A2218] font-light leading-[1.05] tracking-tight mb-6">
            Three tiers.
            <span className="block italic font-extralight text-[#7E5A40]">
              Same 100-guest reception.
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed font-light">
            Same crowd, three price points — so you can compare apples to
            apples. Your final quote scales to your actual guest count + bar style.
          </p>
        </div>

        {/* Three columns */}
        <div className="grid md:grid-cols-3 gap-0">
          {RECEPTION_PACKAGES.map((pkg, i) => (
            <PackageColumn
              key={pkg.name}
              pkg={pkg}
              index={i}
              onCta={onPrimaryCta}
            />
          ))}
        </div>

        {/* Cross-link to weekend page */}
        <div className="text-center mt-20 md:mt-24">
          <div className="h-px w-12 bg-[#C8A96A]/40 mx-auto mb-8" />
          <p className="text-sm text-gray-600 mb-3 font-light tracking-wide">
            Coordinating welcome reception → ceremony → after-party?
          </p>
          <Link
            href="/austin-wedding-weekend-delivery"
            className="inline-flex items-center text-sm tracking-[0.2em] uppercase text-[#7E5A40] hover:text-[#C8A96A] transition-colors font-light border-b border-[#C8A96A]/30 hover:border-[#C8A96A] pb-1"
          >
            Build your full weekend
          </Link>
        </div>
      </div>
    </section>
  );
}

function PackageColumn({
  pkg,
  index,
  onCta,
}: {
  pkg: Package;
  index: number;
  onCta: () => void;
}): ReactElement {
  const featured = pkg.featured === true;

  return (
    <div
      className={[
        'relative flex flex-col p-8 md:p-10 transition-colors',
        featured
          ? 'bg-[#FBF6EC] md:-mt-6 md:-mb-6 border-y md:border md:border-[#C8A96A] z-10'
          : 'bg-white',
        // Hairline separators between columns on desktop. Skipped between
        // the middle (featured) column and its neighbors because the
        // featured column's full border replaces them.
        !featured && index === 0 ? 'md:border-r md:border-r-gray-100' : '',
        !featured && index === 2 ? 'md:border-l md:border-l-gray-100' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {featured && (
        <p className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C8A96A] text-[#1a1410] text-[10px] tracking-[0.4em] uppercase font-medium px-4 py-1.5 rounded-sm whitespace-nowrap">
          Most Booked
        </p>
      )}

      {/* Image — quiet, framed loosely */}
      <div className="relative w-full aspect-[4/3] mb-8 overflow-hidden">
        <Image
          src={pkg.image}
          alt={pkg.name}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </div>

      {/* Tier marker */}
      <p className="text-[10px] tracking-[0.5em] uppercase text-[#7E5A40] font-light mb-4">
        {pkg.save /* "Best price" / "Most booked" / "Premium tier" */}
      </p>

      {/* Tier name */}
      <h3 className="font-heading text-2xl md:text-3xl text-[#2A2218] font-light leading-[1.15] tracking-tight mb-6">
        {pkg.name}
      </h3>

      {/* Price — monumental */}
      <div className="mb-8">
        <p className="font-heading text-5xl md:text-6xl font-extralight text-[#2A2218] leading-none italic">
          {pkg.price}
        </p>
        <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mt-3 font-light">
          {pkg.serves}
        </p>
      </div>

      {/* Blurb */}
      <p className="text-base text-gray-700 leading-relaxed font-light mb-8">
        {pkg.blurb}
      </p>

      {/* Inclusions — no checkmarks, just hairline-divided rows */}
      <ul className="space-y-3 mb-10 flex-1">
        {(pkg.items ?? []).map((item) => (
          <li
            key={item}
            className="text-sm text-gray-700 leading-relaxed font-light pb-3 border-b border-[#2A2218]/8 last:border-0"
          >
            {item}
          </li>
        ))}
      </ul>

      {/* CTA — bottom-anchored. Featured gets solid espresso; others gold-outline ghost. */}
      <button
        type="button"
        onClick={onCta}
        className={[
          'w-full rounded-lg py-4 text-xs tracking-[0.35em] uppercase font-light transition-colors duration-300',
          featured
            ? 'bg-[#2A2218] text-[#C8A96A] hover:bg-[#C8A96A] hover:text-[#2A2218]'
            : 'border border-[#2A2218] text-[#2A2218] hover:bg-[#2A2218] hover:text-[#C8A96A]',
        ].join(' ')}
      >
        Request This Quote
      </button>
    </div>
  );
}
