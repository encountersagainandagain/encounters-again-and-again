import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const checkoutSchema = z.object({
  amount: z.coerce.number().min(1).max(5000),
});

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

function getOrigin(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const origin = request.headers.get('origin');
  if (origin) return origin;

  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return host ? `${protocol}://${host}` : 'https://www.whatkatieseas.com';
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please choose a valid support amount.' },
      { status: 400 }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet.' },
      { status: 503 }
    );
  }

  const origin = getOrigin(request);
  const amountInCents = Math.round(parsed.data.amount * 100);
  const body = new URLSearchParams();

  body.set('mode', 'payment');
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(amountInCents));
  body.set('line_items[0][price_data][product_data][name]', 'Support What Katie Seas');
  body.set(
    'line_items[0][price_data][product_data][description]',
    "One-time contribution to support Katie's travel and diving blog."
  );
  body.set('metadata[source]', 'support_us');
  body.set('payment_intent_data[metadata][source]', 'support_us');
  body.set('success_url', `${origin}/support-us?support=success&session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${origin}/support-us?support=cancelled`);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const session = await response.json().catch(() => null);

  if (!response.ok || !session?.url) {
    return NextResponse.json(
      { error: 'Unable to start checkout right now.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: session.url });
}
