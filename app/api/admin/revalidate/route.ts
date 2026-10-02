import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { modules } from '@/config/modules';
import { routes } from '@/config/routes';
const inputSchema = z.object({scope:z.enum(['posts','settings']),slugs:z.array(z.string().min(1).max(200).regex(/^[^/\\?#]+$/)).max(100).default([])});
export async function POST(request: Request) {
  if (!modules.cms) return NextResponse.json({error:'Not found'}, {status:404});
  if (!await verifyAdminRequest(request)) return NextResponse.json({error:'Unauthorized'}, {status:401});
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({error:'Unsupported revalidation request.'}, {status:400});
  const paths = ['/', '/about','/contact','/crew','/art','/expeditions','/workshops','/meaningful-messages','/sitemap.xml'];
  for (const slug of input.data.slugs) paths.push(routes.post(slug));
  if (input.data.scope === 'settings') revalidatePath('/', 'layout');
  for (const path of paths) revalidatePath(path);
  return NextResponse.json({revalidated:true,paths});
}
