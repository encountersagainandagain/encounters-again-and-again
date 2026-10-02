import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  subject: z.string().trim().max(140).optional().default(''),
  message: z.string().trim().min(1).max(3000),
  website: z.string().trim().max(120).optional().default(''),
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(input: z.infer<typeof contactSchema>) {
  const subject = input.subject || 'Contact form message';
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');
  const preview = `${input.name} sent a message from What Katie Seas.`;

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#ffffff;color:#111111;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
        <div style="max-width:620px;margin:0 auto;padding:24px 20px;">
          <p style="margin:0 0 16px;">New message from ${escapeHtml(input.name)}.</p>
          <p style="margin:0 0 16px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
          <p style="margin:0 0 16px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <p style="margin:0 0 16px;">${safeMessage}</p>
        </div>
      </body>
    </html>
  `;
}

function buildEmailText(input: z.infer<typeof contactSchema>) {
  return [
    'New message from What Katie Seas',
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject || 'Contact form message'}`,
    '',
    input.message,
  ].join('\n');
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(json);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];

    return NextResponse.json(
      { error: firstError || 'Please check the form and try again.' },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.website) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || 'whatkatieseas@gmail.com';
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Contact email is not configured yet.' },
      { status: 503 }
    );
  }

  const subject = input.subject
    ? `What Katie Seas contact: ${input.subject}`
    : 'What Katie Seas contact form message';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: input.email,
      subject,
      html: buildEmailHtml(input),
      text: buildEmailText(input),
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Unable to send this message right now.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
