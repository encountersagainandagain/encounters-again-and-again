import { NextResponse } from 'next/server';
import { z } from 'zod';
import { modules } from '@/config/modules';
import { contactFromEmail, contactSendingReady } from '@/lib/contactEmail';
import { escapeHtml, sendResendEmail } from '@/lib/email';
import { editorialData } from '@/features/encounters/editorial-data';
import { contactOf } from '@/features/encounters/contact';
export const runtime = 'nodejs';
const inputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  topic: z.string().trim().max(120).default(''),
  place: z.string().trim().max(160).default(''),
  when: z.string().trim().max(160).default(''),
  message: z.string().trim().max(5000).default(''),
  website: z.string().max(120).default(''),
});
const limits = new Map<string, { count: number; expires: number }>();
export async function POST(request: Request) {
  if (!modules.contactForm) return NextResponse.json({error:'Not found'}, {status:404});
  // Not configured: the form opens the visitor's email app instead (fallback), as before.
  if (!contactSendingReady()) return NextResponse.json({fallback:true}, {status:503});
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:'We need your name and a valid email to write back. Nothing was sent.'}, {status:400});
  if (parsed.data.website) return NextResponse.json({ok:true});
  const now = Date.now();
  for (const [key,value] of limits) if (value.expires <= now) limits.delete(key);
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const entry = limits.get(key) || {count:0,expires:now + 15 * 60 * 1000};
  if (++entry.count > 5) return NextResponse.json({error:'Too many messages in a short time. Please try again in a few minutes. Nothing was sent.'}, {status:429});
  limits.set(key,entry);
  const to = contactOf((await editorialData()).settings).email;
  if (!to) return NextResponse.json({fallback:true}, {status:503});
  const {name,email,topic,place,when,message} = parsed.data;
  const lines = [['Name',name],['Email',email],['Topic',topic],['Where from',place],['When',when]].filter(([,v]) => v);
  const text = `${lines.map(([k,v]) => `${k}: ${v}`).join('\n')}\n\n${message}\n\n— Sent from the contact form of the website. Reply to this email to answer ${name}.`;
  const html = `<table cellpadding="4">${lines.map(([k,v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}</table><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p style="color:#667">Sent from the contact form of the website. Reply to this email to answer ${escapeHtml(name)}.</p>`;
  try {
    await sendResendEmail({from:contactFromEmail(),to,replyTo:email,subject:`${topic||'Hello from the website'} · ${name}`,text,html});
  } catch {
    return NextResponse.json({error:'Your message could not be sent right now.',fallback:true}, {status:502});
  }
  return NextResponse.json({ok:true});
}
