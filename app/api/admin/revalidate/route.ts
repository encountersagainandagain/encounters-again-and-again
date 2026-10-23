import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { modules } from '@/config/modules';
import { PUBLIC_CONTENT_TAG } from '@/features/encounters/public-content';
const inputSchema = z.object({scope:z.enum(['posts','settings']),slugs:z.array(z.string().min(1).max(200).regex(/^[^/\\?#]+$/)).max(100).default([])});
// Called by the admin after every save, publish or unpublish. Public pages and their data are cached for 5 minutes
// (app/layout.tsx); a change can touch any of them (lists, Home, related content, settings in the footer), so every
// public page and every public read expires at once instead of guessing which ones changed.
export async function POST(request: Request) {
  if (!modules.cms) return NextResponse.json({error:'Not found'}, {status:404});
  if (!await verifyAdminRequest(request)) return NextResponse.json({error:'Unauthorized'}, {status:401});
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({error:'Unsupported revalidation request.'}, {status:400});
  revalidateTag(PUBLIC_CONTENT_TAG, {expire:0});
  revalidatePath('/', 'layout');
  return NextResponse.json({revalidated:true});
}
