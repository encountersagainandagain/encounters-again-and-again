import { modules } from '@/config/modules';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { isAllowedAdminEmail } from '@/lib/adminAccess';
import {
  buildAdminNewsletterEmail,
  buildNewsletterUnsubscribeHeaders,
  getNewsletterReplyToEmail,
  sendResendEmailBatch,
} from '@/lib/email';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sendNewsletterSchema = z.object({
  subject: z.string().trim().min(1).max(140),
  body: z
    .string()
    .trim()
    .min(1)
    .max(6000),
});

type NewsletterSubscriberRow = {
  email: string;
  unsubscribe_token: string;
};

type NewsletterSendFailure = {
  email: string;
  reason: string;
};

const resendBatchSize = 100;
const reservedTestDomains = new Set(['example.com', 'example.net', 'example.org']);

function isReservedTestAddress(email: string) {
  const domain = email.trim().toLowerCase().split('@').at(-1);
  return Boolean(domain && reservedTestDomains.has(domain));
}

function buildBatchIdempotencyKey(
  subscribers: NewsletterSubscriberRow[],
  subject: string,
  body: string
) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ subscribers, subject, body }))
    .digest('hex');

  return `newsletter/${digest}`;
}

function getToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
}

async function getAdminClient(request: Request) {
  const token = getToken(request);

  if (!supabaseUrl || !supabaseAnonKey || !token) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || !isAllowedAdminEmail(data.user.email)) return null;

  return supabase;
}

async function sendInBatches(
  subscribers: NewsletterSubscriberRow[],
  subject: string,
  body: string
) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const failures: NewsletterSendFailure[] = [];
  const skippedRecipients: NewsletterSendFailure[] = [];
  const deliverableSubscribers = subscribers.filter((subscriber) => {
    if (!isReservedTestAddress(subscriber.email)) return true;

    skipped += 1;
    skippedRecipients.push({
      email: subscriber.email,
      reason: 'Testing-only addresses such as example.com cannot receive email.',
    });
    return false;
  });

  for (let index = 0; index < deliverableSubscribers.length; index += resendBatchSize) {
    const batch = deliverableSubscribers.slice(index, index + resendBatchSize);
    const emails = batch.map((subscriber) => {
      const email = buildAdminNewsletterEmail({
        subject,
        body,
        unsubscribeToken: subscriber.unsubscribe_token,
      });

      return {
        to: subscriber.email,
        subject,
        html: email.html,
        text: email.text,
        replyTo: getNewsletterReplyToEmail(),
        headers: buildNewsletterUnsubscribeHeaders(subscriber.unsubscribe_token),
      };
    });

    try {
      await sendResendEmailBatch(emails, {
        idempotencyKey: buildBatchIdempotencyKey(batch, subject, body),
      });
      sent += batch.length;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown send error';
      failed += batch.length;
      batch.forEach((subscriber) => failures.push({ email: subscriber.email, reason }));
    }
  }

  return { sent, failed, skipped, failures, skippedRecipients };
}

export async function POST(request: Request) {
  if (!modules.newsletter) return NextResponse.json({error:'Not found'}, {status:404});
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM_EMAIL) return NextResponse.json({error:'Newsletter delivery is not configured.'}, {status:503});
  const supabase = await getAdminClient(request);

  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = sendNewsletterSchema.safeParse(json);

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json(
      { error: firstError || 'Please check the newsletter and try again.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token')
    .eq('status', 'subscribed')
    .order('subscribed_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Unable to load newsletter subscribers.' },
      { status: 502 }
    );
  }

  const subscribers = (data ?? []) as NewsletterSubscriberRow[];

  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  const result = await sendInBatches(subscribers, parsed.data.subject, parsed.data.body);

  return NextResponse.json({
    ok: result.failed === 0,
    total: subscribers.length,
    ...result,
  });
}
