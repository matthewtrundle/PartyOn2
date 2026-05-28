import Link from 'next/link';
import type { ReactElement } from 'react';

/**
 * Stripped footer for paid-ad landing pages (currently used on
 * /wedding-drink-calculator). The full site footer has 20+ links that
 * function as exit paths — wrong choice for cold paid traffic where
 * single-conversion-goal is the rule. This footer keeps only what's
 * required (TABC compliance, business hours, contact info, terms link)
 * and skips the navigation/sitemap content.
 *
 * Visual: espresso background to match the wedding-page palette;
 * minimal type, two-column on desktop, single-column on mobile.
 */
export default function WeddingFooter(): ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1410] text-white/85">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Contact + business hours */}
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-[#C8A96A] font-light mb-4">
              Get in touch
            </p>
            <div className="space-y-1.5 text-sm font-light">
              <p>
                Call or text:{' '}
                <a
                  href="tel:7373719700"
                  className="text-white hover:text-[#C8A96A] transition-colors"
                >
                  (737) 371-9700
                </a>
              </p>
              <p>
                Email:{' '}
                <a
                  href="mailto:info@partyondelivery.com"
                  className="text-white hover:text-[#C8A96A] transition-colors"
                >
                  info@partyondelivery.com
                </a>
              </p>
              <p className="text-white/65">
                Daily delivery across the Austin area, Lake Travis, and Hill
                Country.
              </p>
            </div>
          </div>

          {/* Compliance + legal */}
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-[#C8A96A] font-light mb-4">
              Compliance
            </p>
            <div className="space-y-1.5 text-sm font-light text-white/75">
              <p>
                <Link
                  href="/tabc"
                  className="hover:text-[#C8A96A] transition-colors"
                >
                  TABC-Licensed Retailer
                </Link>{' '}
                · Must be 21+ to order · ID required at delivery.
              </p>
              <p>
                <Link
                  href="/terms"
                  className="hover:text-[#C8A96A] transition-colors"
                >
                  Terms
                </Link>
                {' · '}
                <Link
                  href="/privacy"
                  className="hover:text-[#C8A96A] transition-colors"
                >
                  Privacy
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-xs font-light text-white/55 tracking-wide">
          © {currentYear} Party On Delivery LLC. Austin, Texas.
        </div>
      </div>
    </footer>
  );
}
