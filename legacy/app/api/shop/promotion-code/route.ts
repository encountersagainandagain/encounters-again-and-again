import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeShopPromotionCode } from '@/lib/shopCampaigns';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const requestSchema = z.object({
  code: z.string().trim().min(1).max(40),
  reservationToken: z.uuid(),
});

function getClientKey(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: 'Too many code attempts. Please try again later.' },
      { status: 429 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Shop discounts are not configured.' }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid promotion code.' }, { status: 400 });
  }

  const code = normalizeShopPromotionCode(parsed.data.code);
  const { data, error } = await supabaseAdmin
    .from('shop_discount_codes')
    .select(
      'id,campaign_id,code,discount_percent,expires_at,reservation_token,reserved_until,redeemed_at'
    )
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('[shop-promotion] validation_failed', { reason: error.message });
    return NextResponse.json({ error: 'Unable to check that code right now.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'That promotion code was not found.' }, { status: 404 });
  }

  if (data.redeemed_at) {
    return NextResponse.json({ error: 'That promotion code has already been used.' }, { status: 409 });
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'That promotion code has expired.' }, { status: 410 });
  }

  const reservedUntil = data.reserved_until ? new Date(data.reserved_until).getTime() : 0;
  if (
    reservedUntil > Date.now() &&
    data.reservation_token &&
    data.reservation_token !== parsed.data.reservationToken
  ) {
    return NextResponse.json(
      { error: 'That code is currently attached to another checkout. Try again in an hour.' },
      { status: 409 }
    );
  }

  return NextResponse.json({
    promotion: {
      code: data.code,
      reservationToken: parsed.data.reservationToken,
      campaignId: data.campaign_id,
      discountPercent: data.discount_percent,
      expiresAt: data.expires_at,
    },
  });
}
