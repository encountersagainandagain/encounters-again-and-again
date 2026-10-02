import 'server-only';

import { supabase } from '@/lib/supabase';
import type { PublicShopCampaign } from '@/lib/shopCampaigns';

type PublicCampaignRow = {
  id: string;
  discount_percent: number;
  code_valid_days: number;
  popup_enabled: boolean;
  banner_enabled: boolean;
  popup_title: string;
  popup_message: string;
  banner_text: string;
  starts_at: string | null;
  ends_at: string | null;
};

export async function fetchActivePublicShopCampaign(): Promise<PublicShopCampaign | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('ecommerce_public_shop_campaign')
    .select(
      'id,discount_percent,code_valid_days,popup_enabled,banner_enabled,popup_title,popup_message,banner_text,starts_at,ends_at'
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as PublicCampaignRow;

  return {
    id: row.id,
    discountPercent: row.discount_percent,
    codeValidDays: row.code_valid_days,
    popupEnabled: row.popup_enabled,
    bannerEnabled: row.banner_enabled,
    popupTitle: row.popup_title,
    popupMessage: row.popup_message,
    bannerText: row.banner_text,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}
