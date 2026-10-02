'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type GoogleAnalyticsPageViewProps = {
  measurementId: string;
};

const productionHosts = new Set(['whatkatieseas.com', 'www.whatkatieseas.com']);

function shouldTrackPath(pathname: string) {
  return !pathname.startsWith('/admin');
}

function shouldTrackHost(hostname: string) {
  return productionHosts.has(hostname.toLowerCase());
}

export function GoogleAnalyticsPageView({ measurementId }: GoogleAnalyticsPageViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!measurementId || !pathname || !shouldTrackPath(pathname)) return;
    if (!window.gtag || !shouldTrackHost(window.location.hostname)) return;

    const analyticsSearchParams = new URLSearchParams(search);
    analyticsSearchParams.delete('session_id');
    const analyticsSearch = analyticsSearchParams.toString();
    const pagePath = analyticsSearch ? `${pathname}?${analyticsSearch}` : pathname;
    const pageLocation = `${window.location.origin}${pagePath}`;

    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: document.title,
    });
  }, [measurementId, pathname, search]);

  return null;
}
