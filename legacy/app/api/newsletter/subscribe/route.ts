import { after, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  buildShopCampaignSignupNotification,
  buildNewsletterUnsubscribeHeaders,
  buildWelcomeNewsletterEmail,
  getNewsletterNotificationEmail,
  getNewsletterReplyToEmail,
  sendResendEmail,
} from '@/lib/email';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type SubscribeResult = {
  email: string;
  status: string;
  unsubscribe_token: string;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const newsletterSchema = z.object({
  email: z.string().trim().email().max(160),
  source: z.string().trim().max(80).optional().default('unknown'),
  website: z.string().trim().max(120).optional().default(''),
  campaignId: z.uuid().optional(),
  pagePath: z.string().trim().max(500).optional().default(''),
  productSlug: z.string().trim().max(160).optional(),
});

type CampaignRow = {
  id: string;
  internal_code: string;
  name: string;
  discount_percent: number;
  code_valid_days: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  popup_enabled: boolean;
  banner_enabled: boolean;
};

type DiscountCodeRow = {
  code: string;
  discount_percent: number;
  expires_at: string;
  redeemed_at: string | null;
};

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function isCampaignCurrentlyActive(campaign: CampaignRow) {
  const now = Date.now();
  const startsAt = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;
  return (
    campaign.is_active &&
    (campaign.popup_enabled || campaign.banner_enabled) &&
    (startsAt === null || startsAt <= now) &&
    (endsAt === null || endsAt > now)
  );
}

function generateDiscountCode() {
  return `WKS-${randomBytes(4).toString('hex').toUpperCase()}`;
}

async function issueCampaignCode({
  campaign,
  subscriberId,
  source,
  pagePath,
  productSlug,
}: {
  campaign: CampaignRow;
  subscriberId: string;
  source: string;
  pagePath: string;
  productSlug?: string;
}) {
  if (!supabaseAdmin) throw new Error('Shop campaign service is not configured.');

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('shop_discount_codes')
    .select('code,discount_percent,expires_at,redeemed_at')
    .eq('campaign_id', campaign.id)
    .eq('subscriber_id', subscriberId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return { code: existing as DiscountCodeRow, wasCreated: false };

  const expiresAt = new Date(
    Date.now() + campaign.code_valid_days * 24 * 60 * 60 * 1000
  ).toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from('shop_discount_codes')
      .insert({
        campaign_id: campaign.id,
        subscriber_id: subscriberId,
        code: generateDiscountCode(),
        discount_percent: campaign.discount_percent,
        acquisition_source: source,
        acquisition_path: pagePath,
        product_slug: productSlug || null,
        expires_at: expiresAt,
      })
      .select('code,discount_percent,expires_at,redeemed_at')
      .single();

    if (!error && data) {
      return { code: data as DiscountCodeRow, wasCreated: true };
    }

    if (error?.code === '23505') {
      const { data: concurrentCode, error: concurrentError } = await supabaseAdmin
        .from('shop_discount_codes')
        .select('code,discount_percent,expires_at,redeemed_at')
        .eq('campaign_id', campaign.id)
        .eq('subscriber_id', subscriberId)
        .maybeSingle();
      if (concurrentError) throw concurrentError;
      if (concurrentCode) {
        return { code: concurrentCode as DiscountCodeRow, wasCreated: false };
      }
      continue;
    }

    throw error;
  }

  throw new Error('Unable to create a unique promotion code.');
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Newsletter is not configured yet.' },
      { status: 503 }
    );
  }

  let campaign: CampaignRow | null = null;
  if (parsed.data.campaignId) {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Shop campaign is not configured yet.' }, { status: 503 });
    }

    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from('shop_marketing_campaigns')
      .select(
        'id,internal_code,name,discount_percent,code_valid_days,starts_at,ends_at,is_active,popup_enabled,banner_enabled'
      )
      .eq('id', parsed.data.campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error('[newsletter] campaign_lookup_failed', { reason: campaignError.message });
      return NextResponse.json({ error: 'Unable to load the shop offer right now.' }, { status: 500 });
    }

    campaign = (campaignData as CampaignRow | null) ?? null;
    if (!campaign || !isCampaignCurrentlyActive(campaign)) {
      return NextResponse.json(
        { error: 'This shop newsletter offer is no longer active.' },
        { status: 410 }
      );
    }
  }

  const subscriberSource = campaign
    ? `shop-campaign:${campaign.internal_code}`.slice(0, 80)
    : parsed.data.source;

  const { data, error } = await supabase.rpc('subscribe_to_newsletter', {
    subscriber_email: parsed.data.email,
    subscriber_source: subscriberSource,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Unable to subscribe right now.' },
      { status: 502 }
    );
  }

  const subscriber = Array.isArray(data) ? (data[0] as SubscribeResult | undefined) : undefined;

  if (!subscriber?.email || !subscriber.unsubscribe_token) {
    return NextResponse.json(
      { error: 'Unable to subscribe right now.' },
      { status: 502 }
    );
  }

  let campaignOffer: DiscountCodeRow | null = null;
  let wasCampaignCodeCreated = false;

  if (campaign) {
    const { data: subscriberRow, error: subscriberLookupError } = await supabaseAdmin!
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', subscriber.email)
      .single();

    if (subscriberLookupError || !subscriberRow?.id) {
      console.error('[newsletter] campaign_subscriber_lookup_failed', {
        reason: subscriberLookupError?.message ?? 'Subscriber id missing.',
      });
      return NextResponse.json(
        { error: 'Subscribed, but the shop code could not be created right now.' },
        { status: 202 }
      );
    }

    try {
      const issued = await issueCampaignCode({
        campaign,
        subscriberId: subscriberRow.id,
        source: subscriberSource,
        pagePath: parsed.data.pagePath,
        productSlug: parsed.data.productSlug,
      });
      campaignOffer = issued.code;
      wasCampaignCodeCreated = issued.wasCreated;
    } catch (campaignCodeError) {
      console.error('[newsletter] campaign_code_issue_failed', {
        reason:
          campaignCodeError instanceof Error
            ? campaignCodeError.message
            : 'Unknown campaign code error.',
      });
      return NextResponse.json(
        { error: 'Subscribed, but the shop code could not be created right now.' },
        { status: 202 }
      );
    }
  }

  const usableOffer =
    campaignOffer &&
    !campaignOffer.redeemed_at &&
    new Date(campaignOffer.expires_at).getTime() > Date.now()
      ? campaignOffer
      : null;
  const welcomeEmail = buildWelcomeNewsletterEmail(
    subscriber.unsubscribe_token,
    usableOffer
      ? {
          code: usableOffer.code,
          discountPercent: usableOffer.discount_percent,
          expiresAt: usableOffer.expires_at,
        }
      : undefined
  );

  if (campaign && wasCampaignCodeCreated) {
    const notification = buildShopCampaignSignupNotification({
      subscriberEmail: subscriber.email,
      campaignName: campaign.name,
      campaignCode: campaign.internal_code,
      acquisitionPath: parsed.data.pagePath,
      productSlug: parsed.data.productSlug,
    });

    after(async () => {
      await sendResendEmail({
        to: getNewsletterNotificationEmail(),
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        replyTo: getNewsletterReplyToEmail(),
      }).catch((notificationError) => {
        console.warn('[newsletter] campaign_admin_notification_failed', {
          campaignCode: campaign?.internal_code,
          reason:
            notificationError instanceof Error
              ? notificationError.message
              : 'Unknown notification error.',
        });
      });
    });
  }

  try {
    await sendResendEmail({
      to: subscriber.email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      text: welcomeEmail.text,
      replyTo: getNewsletterReplyToEmail(),
      headers: buildNewsletterUnsubscribeHeaders(subscriber.unsubscribe_token),
    });
  } catch (welcomeError) {
    console.warn('[newsletter] welcome_email_failed', {
      campaignCode: campaign?.internal_code,
      reason:
        welcomeError instanceof Error ? welcomeError.message : 'Unknown welcome email error.',
    });
    return NextResponse.json(
      { error: 'Subscribed, but the welcome email could not be sent right now.' },
      { status: 202 }
    );
  }

  return NextResponse.json({ ok: true, offerSent: Boolean(usableOffer) });
}
