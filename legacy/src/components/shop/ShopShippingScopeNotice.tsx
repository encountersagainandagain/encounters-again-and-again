'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SHOP_US_ONLY_FALLBACK_NOTICE } from '@/lib/shopShipping';

type VisitorCountryResponse = {
  countryCode: string | null;
  countryName: string | null;
  isSupported: boolean | null;
  enabledCountryNames?: string[];
};

type ShopShippingScopeNoticeProps = {
  productName?: string;
  productSlug?: string;
  className?: string;
  compact?: boolean;
};

function buildContactHref({
  countryName,
  productName,
  productSlug,
}: {
  countryName?: string | null;
  productName?: string;
  productSlug?: string;
}) {
  const subject = 'International shipping inquiry';
  const lines = [
    'Hi Katie,',
    '',
    `I’m interested in international shipping${countryName ? ` to ${countryName}` : ''}.`,
    productName ? `Product: ${productName}` : '',
    productSlug ? `Product URL: /shop/${productSlug}` : '',
    countryName ? `Detected country: ${countryName}` : '',
    '',
    'Could you let me know if you plan to ship here?',
  ].filter(Boolean);

  const params = new URLSearchParams({
    subject,
    message: lines.join('\n'),
  });

  return `/contact?${params.toString()}`;
}

export function ShopShippingScopeNotice({
  productName,
  productSlug,
  className = '',
  compact = false,
}: ShopShippingScopeNoticeProps) {
  const [visitorCountry, setVisitorCountry] = useState<VisitorCountryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/shop/visitor-country', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VisitorCountryResponse | null) => {
        if (!isMounted) return;
        setVisitorCountry(payload);
      })
      .catch(() => {
        if (!isMounted) return;
        setVisitorCountry(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const contactHref = useMemo(
    () =>
      buildContactHref({
        countryName: visitorCountry?.countryName,
        productName,
        productSlug,
      }),
    [productName, productSlug, visitorCountry?.countryName]
  );
  const showInternationalMessage =
    visitorCountry?.isSupported === false && Boolean(visitorCountry.countryName);
  const enabledCountryNames = visitorCountry?.enabledCountryNames?.length
    ? visitorCountry.enabledCountryNames.join(', ')
    : 'United States';
  const scopeNotice =
    enabledCountryNames === 'United States'
      ? SHOP_US_ONLY_FALLBACK_NOTICE
      : `Ships to ${enabledCountryNames}.`;

  return (
    <div
      className={`border border-ocean/20 bg-sky-50 p-4 font-body text-sm leading-relaxed text-black/65 ${className}`}
    >
      <p className={compact ? 'text-xs' : ''}>
        <span className="font-semibold text-ocean">{scopeNotice}</span> Checkout only accepts
        shipping addresses in {enabledCountryNames}.
      </p>

      {showInternationalMessage && (
        <p className={`mt-2 ${compact ? 'text-xs' : ''}`}>
          It looks like you may be visiting from {visitorCountry?.countryName}. I don’t ship there
          yet, but you can{' '}
          <Link href={contactHref} className="font-semibold text-ocean underline">
            ask Katie about international shipping
          </Link>{' '}
          and the message will include this country and product context.
        </p>
      )}
    </div>
  );
}
