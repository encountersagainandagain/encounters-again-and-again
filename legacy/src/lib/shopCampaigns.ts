export const SHOP_CAMPAIGN_OPEN_EVENT = 'what-katie-seas-shop-campaign-open';
export const SHOP_PROMOTION_STORAGE_KEY = 'what-katie-seas-promotion-v1';

export type PublicShopCampaign = {
  id: string;
  discountPercent: number;
  codeValidDays: number;
  popupEnabled: boolean;
  bannerEnabled: boolean;
  popupTitle: string;
  popupMessage: string;
  bannerText: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type AppliedShopPromotion = {
  code: string;
  reservationToken: string;
  campaignId: string;
  discountPercent: number;
  expiresAt: string;
};

export function normalizeShopPromotionCode(value: string) {
  return value.trim().toUpperCase();
}

export function calculateDiscountedUnitPriceCents(
  originalUnitPriceCents: number,
  discountPercent: number
) {
  const safePrice = Math.max(0, Math.round(originalUnitPriceCents));
  const safePercent = Math.min(100, Math.max(0, Math.round(discountPercent)));
  const discountCents = Math.round((safePrice * safePercent) / 100);

  return {
    originalUnitPriceCents: safePrice,
    discountCents,
    discountedUnitPriceCents: Math.max(safePrice - discountCents, 0),
  };
}

export function calculateShopPromotionDiscountCents(
  items: Array<{ unitPriceCents: number; quantity: number }>,
  discountPercent: number
) {
  return items.reduce((total, item) => {
    const unit = calculateDiscountedUnitPriceCents(item.unitPriceCents, discountPercent);
    return total + unit.discountCents * Math.max(0, Math.floor(item.quantity));
  }, 0);
}

export function createPromotionReservationToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getStoredShopPromotion(): AppliedShopPromotion | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SHOP_PROMOTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppliedShopPromotion>;
    if (
      typeof parsed.code !== 'string' ||
      typeof parsed.reservationToken !== 'string' ||
      typeof parsed.campaignId !== 'string' ||
      typeof parsed.discountPercent !== 'number' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null;
    }
    return parsed as AppliedShopPromotion;
  } catch {
    return null;
  }
}

export function storeShopPromotion(promotion: AppliedShopPromotion | null) {
  if (typeof window === 'undefined') return;
  if (!promotion) {
    window.localStorage.removeItem(SHOP_PROMOTION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SHOP_PROMOTION_STORAGE_KEY, JSON.stringify(promotion));
}
