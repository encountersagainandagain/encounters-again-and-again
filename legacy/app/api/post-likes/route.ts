import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const likeSchema = z.object({
  slug: z.string().trim().min(1).max(200),
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

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = likeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing post.' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Likes are not configured yet.' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('increment_post_like', {
    target_slug: parsed.data.slug,
  });

  if (error) {
    return NextResponse.json({ error: 'Unable to save your like right now.' }, { status: 502 });
  }

  return NextResponse.json({ likeCount: data as number });
}
