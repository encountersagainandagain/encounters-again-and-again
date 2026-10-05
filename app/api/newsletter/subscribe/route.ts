import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { modules } from '@/config/modules';
export const runtime = 'nodejs';
const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  source: z.string().trim().max(80).default('unknown'),
  website: z.string().max(120).default(''),
  campaignId: z.unknown().optional(),
  consent: z.literal(true),
});
const limits = new Map<string, { count: number; expires: number }>();
export async function POST(request: Request) {
  if (!modules.newsletter) return NextResponse.json({error:'Not found'}, {status:404});
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:'Please enter a valid email address.'}, {status:400});
  if (parsed.data.campaignId !== undefined) return NextResponse.json({error:'Campaigns are unavailable.'}, {status:404});
  if (parsed.data.website) return NextResponse.json({ok:true});
  if (!supabaseAdmin) return NextResponse.json({error:'Newsletter subscriptions are not available yet.'}, {status:503});
  const now = Date.now();
  for (const [key,value] of limits) if (value.expires <= now) limits.delete(key);
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const entry = limits.get(key) || {count:0,expires:now + 15 * 60 * 1000};
  if (++entry.count > 5) return NextResponse.json({error:'Please try again later.'}, {status:429});
  limits.set(key,entry);
  const {error} = await supabaseAdmin.rpc('subscribe_to_newsletter', {subscriber_email:parsed.data.email,subscriber_source:parsed.data.source,consent:parsed.data.consent});
  if (error) return NextResponse.json({error:'Unable to subscribe right now.'}, {status:502});
  // No subscription details/tokens in public response; no automatic email sends.
  return NextResponse.json({ok:true});
}
