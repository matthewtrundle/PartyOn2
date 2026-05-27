'use client';

import Script from 'next/script';

/**
 * Google Ads global site tag (gtag.js for an AW-XXXXXXXXX account).
 *
 * Loaded alongside GoogleAnalytics so the same window.gtag function
 * services both GA4 and Google Ads. GA4 is responsible for declaring
 * the gtag function + dataLayer; this component only calls gtag('config').
 *
 * No-ops if NEXT_PUBLIC_GOOGLE_ADS_ID is unset OR we are not in production.
 * That way dev sessions don't load tracking and missing env vars in any
 * environment are a silent no-op rather than a runtime error.
 */
export default function GoogleAdsTag() {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  if (!adsId || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="lazyOnload"
      />
      <Script id="google-ads-tag" strategy="lazyOnload">
        {`
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
