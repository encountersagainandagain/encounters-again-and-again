'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { NewsletterSignupForm } from '@/components/public/NewsletterSignupForm';
import {
  SHOP_CAMPAIGN_OPEN_EVENT,
  type PublicShopCampaign,
} from '@/lib/shopCampaigns';

const DISMISSAL_PREFIX = 'what-katie-seas-campaign-dismissed:';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function getDismissedUntil(campaignId: string) {
  try {
    return Number(window.localStorage.getItem(`${DISMISSAL_PREFIX}${campaignId}`) ?? 0);
  } catch {
    return 0;
  }
}

function rememberDismissal(campaignId: string, durationMs: number) {
  try {
    window.localStorage.setItem(
      `${DISMISSAL_PREFIX}${campaignId}`,
      String(Date.now() + durationMs)
    );
  } catch {
    // Storage can be unavailable in privacy modes. The signup still works.
  }
}

export function ShopNewsletterCampaignPopup({
  campaign,
}: {
  campaign: PublicShopCampaign;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isShopContext = pathname === '/cart' || pathname.startsWith('/shop');
  const productSlug = pathname.startsWith('/shop/')
    ? pathname.slice('/shop/'.length).split('/')[0]
    : undefined;

  useEffect(() => {
    const handleManualOpen = () => setIsOpen(true);
    window.addEventListener(SHOP_CAMPAIGN_OPEN_EVENT, handleManualOpen);
    return () => window.removeEventListener(SHOP_CAMPAIGN_OPEN_EVENT, handleManualOpen);
  }, []);

  useEffect(() => {
    if (!campaign.popupEnabled || !isShopContext) return;
    if (getDismissedUntil(campaign.id) > Date.now()) return;

    const timeout = window.setTimeout(() => setIsOpen(true), 9000);
    return () => window.clearTimeout(timeout);
  }, [campaign.id, campaign.popupEnabled, isShopContext]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const close = () => {
    rememberDismissal(campaign.id, DISMISS_FOR_MS);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Newsletter first-order offer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-lg rounded-t-[18px] border border-white/20 bg-cream p-6 shadow-2xl sm:rounded-[18px] sm:p-9">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 p-2 text-black/45 transition-colors hover:text-black"
          aria-label="Close newsletter offer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">
          A little thank-you from Katie
        </p>
        <NewsletterSignupForm
          source="shop-popup"
          title={campaign.popupTitle}
          description={`${campaign.popupMessage} The code is valid for ${campaign.codeValidDays} days and can be used once.`}
          campaignId={campaign.id}
          pagePath={pathname}
          productSlug={productSlug}
          className="mt-4"
          onSubscribed={() => {
            rememberDismissal(campaign.id, 365 * 24 * 60 * 60 * 1000);
          }}
        />
        <p className="mt-3 font-body text-xs leading-relaxed text-black/48">
          By subscribing, you agree to receive the What Katie Seas newsletter. Unsubscribe any
          time. The discount applies to merchandise, not shipping.
        </p>
      </div>
    </div>
  );
}
