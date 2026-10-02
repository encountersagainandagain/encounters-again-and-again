import { modules } from '@/config/modules';
type GtagEventParams = {
  event_category?: string;
  event_label?: string;
  page_path?: string;
  page_location?: string;
  page_title?: string;
  link_url?: string;
  link_text?: string;
  post_slug?: string;
  block_type?: string;
  block_id?: string;
  link_sponsored?: string;
  currency?: string;
  value?: number;
  support_amount?: number;
  support_amount_type?: string;
  support_status?: string;
  error_message?: string;
  share_method?: string;
  post_title?: string;
  transaction_id?: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
  items?: ShopAnalyticsItem[];
};

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: GtagEventParams) => void;
  }
}

export type RecommendationClickEvent = {
  href: string;
  label: string;
  postSlug: string;
  blockType: string;
  blockId: string;
  isSponsored: boolean;
};

export type InlineOutboundClickEvent = {
  href: string;
  label: string;
  postSlug: string;
  blockType: string;
  blockId: string;
};

export type SupportEvent = {
  eventName:
    | 'support_amount_select'
    | 'support_checkout_start'
    | 'support_checkout_redirect'
    | 'support_checkout_error'
    | 'support_return_status';
  amount?: number;
  amountType?: 'preset' | 'custom';
  status?: 'success' | 'cancelled';
  errorMessage?: string;
};

export type PostShareEvent = {
  href: string;
  title: string;
  slug: string;
  method: 'native_share' | 'copy_link';
};

export type ShopAnalyticsItem = {
  item_id: string;
  item_name: string;
  affiliation: string;
  item_brand: string;
  item_variant: string;
  price: number;
  quantity: number;
  discount?: number;
};

export type ShopBeginCheckoutAnalytics = {
  currency: string;
  value: number;
  coupon?: string;
  items: ShopAnalyticsItem[];
};

export type ShopPurchaseAnalytics = ShopBeginCheckoutAnalytics & {
  transaction_id: string;
  shipping: number;
  tax: number;
};

export function trackRecommendationClick({
  href,
  label,
  postSlug,
  blockType,
  blockId,
  isSponsored,
}: RecommendationClickEvent) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag || href.startsWith('/')) return;

  window.gtag('event', isSponsored ? 'affiliate_click' : 'outbound_recommendation_click', {
    event_category: 'recommended_links',
    event_label: label,
    link_url: href,
    link_text: label,
    post_slug: postSlug,
    block_type: blockType,
    block_id: blockId,
    link_sponsored: isSponsored ? 'yes' : 'no',
  });
}

export function trackInlineOutboundClick({
  href,
  label,
  postSlug,
  blockType,
  blockId,
}: InlineOutboundClickEvent) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag || href.startsWith('/')) return;

  window.gtag('event', 'inline_outbound_click', {
    event_category: 'inline_links',
    event_label: label,
    link_url: href,
    link_text: label,
    post_slug: postSlug,
    block_type: blockType,
    block_id: blockId,
  });
}

export function trackSupportEvent({
  eventName,
  amount,
  amountType,
  status,
  errorMessage,
}: SupportEvent) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', eventName, {
    event_category: 'support',
    event_label: status ?? amountType,
    currency: amount ? 'USD' : undefined,
    value: amount,
    support_amount: amount,
    support_amount_type: amountType,
    support_status: status,
    error_message: errorMessage,
  });
}

export function trackPostShareClick({ href, title, slug, method }: PostShareEvent) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'post_share_click', {
    event_category: 'post_share',
    event_label: title,
    link_url: href,
    post_slug: slug,
    post_title: title,
    share_method: method,
  });
}

export function trackShopBeginCheckout(payload: ShopBeginCheckoutAnalytics) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag) return false;

  window.gtag('event', 'begin_checkout', payload);
  return true;
}

export function trackShopPurchase(payload: ShopPurchaseAnalytics) {
  if (!modules.analytics || typeof window === 'undefined' || !window.gtag) return false;

  window.gtag('event', 'purchase', payload);
  return true;
}
