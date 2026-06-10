'use client';

import Script from 'next/script';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '488628150269702';

/**
 * Meta Pixel component for tracking conversions and page views.
 * Fires PageView on every page load.
 *
 * Use trackMetaEvent() to fire custom events:
 * - 'Lead' - Form submissions
 * - 'ViewContent' - Product/calculator views
 * - 'AddToCart' - Cart additions
 * - 'Purchase' - Completed purchases
 */
export default function MetaPixel() {
  return (
    <>
      <Script
        id="meta-pixel"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

/**
 * Helper function to track Meta Pixel events.
 * Call this from any component to fire conversion events.
 *
 * @example
 * trackMetaEvent('Lead', { content_name: 'Corporate Holiday Party Inquiry' });
 * trackMetaEvent('ViewContent', { content_name: 'Event Calculator' });
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  }
}

// Add fbq to Window interface
declare global {
  interface Window {
    fbq: (
      action: string,
      eventName: string,
      params?: Record<string, string | number | boolean>
    ) => void;
  }
}
