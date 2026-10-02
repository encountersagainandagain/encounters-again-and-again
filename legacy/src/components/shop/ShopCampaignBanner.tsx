'use client';

import { SHOP_CAMPAIGN_OPEN_EVENT, type PublicShopCampaign } from '@/lib/shopCampaigns';

export function ShopCampaignBanner({ campaign }: { campaign: PublicShopCampaign }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SHOP_CAMPAIGN_OPEN_EVENT))}
      className="group relative flex h-9 w-full overflow-hidden bg-terracotta text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
      aria-label={`${campaign.bannerText}. Open newsletter signup.`}
    >
      <span className="shop-campaign-marquee flex min-w-max items-center whitespace-nowrap font-body text-[11px] font-semibold uppercase tracking-[0.16em] motion-reduce:mx-auto motion-reduce:transform-none">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="px-8">
            {campaign.bannerText} <span aria-hidden="true">·</span> Tap to join
          </span>
        ))}
      </span>
    </button>
  );
}
