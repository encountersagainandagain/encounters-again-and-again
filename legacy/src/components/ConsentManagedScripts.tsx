'use client';

import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { useSyncExternalStore } from 'react';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import {
  getCookieConsentForBrowser,
  subscribeCookieConsent,
} from '@/components/CookieConsentBanner';

type ConsentManagedScriptsProps = {
  googleAnalyticsMeasurementId?: string;
  metaPixelId?: string;
  enableTravelpayouts?: boolean;
};

export function ConsentManagedScripts({
  googleAnalyticsMeasurementId,
  metaPixelId,
  enableTravelpayouts = false,
}: ConsentManagedScriptsProps) {
  const consent = useSyncExternalStore(
    subscribeCookieConsent,
    getCookieConsentForBrowser,
    () => null
  );
  const hasAnalyticsConsent = consent === 'accepted';

  if (!hasAnalyticsConsent) return null;

  return (
    <>
      {enableTravelpayouts && (
        <Script
          id="travelpayouts-tracking"
          src="https://emrldco.com/NTMxNTg0.js?t=531584"
          strategy="afterInteractive"
        />
      )}

      <GoogleAnalytics measurementId={googleAnalyticsMeasurementId} />
      <Analytics />

      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
