import type { ReactElement } from 'react';
import Image from 'next/image';

interface PartnerLogoProps {
  /** Logo URL — committed /images path or remote (bulk-import) URL. */
  logo: string | null;
  businessName: string;
  /** Classes applied to the logo <Image> (sizing per template). */
  imgClassName: string;
  /** Wrap the logo in a white chip (light-background logos on dark heros). */
  lightChip?: boolean;
}

/**
 * Partner-page masthead: the partner's logo when we have one, otherwise
 * an all-caps business-name wordmark so a freshly bulk-created page
 * always looks finished and is safe to send to clients immediately.
 *
 * Remote logos (Affiliate.logoUrl — scraped from the partner site or
 * Clearbit) render with `unoptimized` so next/image serves them
 * directly instead of proxying arbitrary hosts through the image
 * optimizer (no remotePatterns entry needed, no server-side fetch).
 */
export default function PartnerLogo({
  logo,
  businessName,
  imgClassName,
  lightChip = false,
}: PartnerLogoProps): ReactElement {
  if (!logo) {
    return (
      <div className="mb-6">
        <span className="block font-heading uppercase text-white text-4xl md:text-5xl tracking-[0.1em] leading-tight drop-shadow-2xl">
          {businessName}
        </span>
      </div>
    );
  }

  const img = (
    <Image
      src={logo}
      alt={`${businessName} logo`}
      width={240}
      height={240}
      className={imgClassName}
      unoptimized={logo.startsWith('http')}
    />
  );

  return (
    <div className="mb-6">
      {lightChip ? (
        <div className="inline-block bg-white rounded-2xl p-4 md:p-5 shadow-xl">{img}</div>
      ) : (
        img
      )}
    </div>
  );
}
