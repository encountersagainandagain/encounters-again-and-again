import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import {
  escapeHtml,
  getDonationNotificationEmail,
  getNewsletterReplyToEmail,
  sendResendEmail,
} from '@/lib/email';

export const runtime = 'nodejs';

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  created: number;
  data: {
    object: unknown;
  };
};

type StripeCheckoutSession = {
  id: string;
  object: 'checkout.session';
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
  metadata?: Record<string, string> | null;
  mode?: string | null;
  payment_intent?: string | null;
  payment_status?: string | null;
};

function parseStripeSignature(header: string) {
  return header.split(',').reduce(
    (current, part) => {
      const [key, value] = part.split('=');
      if (key === 't') current.timestamp = value;
      if (key === 'v1' && value) current.signatures.push(value);
      return current;
    },
    { timestamp: '', signatures: [] as string[] }
  );
}

function verifyStripeSignature({
  payload,
  signatureHeader,
  webhookSecret,
}: {
  payload: string;
  signatureHeader: string;
  webhookSecret: string;
}) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const timestampNumber = Number(timestamp);

  if (!timestamp || !Number.isFinite(timestampNumber) || signatures.length === 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNumber) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    );
  });
}

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    (value as StripeCheckoutSession).object === 'checkout.session' &&
    typeof (value as StripeCheckoutSession).id === 'string'
  );
}

function formatCurrency(amountTotal?: number | null, currency?: string | null) {
  if (typeof amountTotal !== 'number') return 'Unknown amount';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'USD',
  }).format(amountTotal / 100);
}

function buildDonationNotificationEmail(session: StripeCheckoutSession, event: StripeEvent) {
  const amount = formatCurrency(session.amount_total, session.currency);
  const customerName = session.customer_details?.name || 'Unknown name';
  const customerEmail =
    session.customer_details?.email || session.customer_email || 'Unknown email';
  const stripeDashboardUrl = `https://dashboard.stripe.com/${
    event.livemode ? '' : 'test/'
  }payments/${session.payment_intent ?? ''}`;

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#ffffff;color:#111111;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
        <div style="max-width:620px;margin:0 auto;padding:24px 20px;">
          <p style="margin:0 0 16px;">Katie received a new What Katie Seas support payment.</p>
          <p style="margin:0 0 12px;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
          <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(customerName)}</p>
          <p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p style="margin:0 0 12px;"><strong>Stripe session:</strong> ${escapeHtml(session.id)}</p>
          ${
            session.payment_intent
              ? `<p style="margin:0 0 12px;"><a href="${stripeDashboardUrl}" style="color:#0f6f7c;text-decoration:underline;">Open payment in Stripe</a></p>`
              : ''
          }
        </div>
      </body>
    </html>
  `;
  const text = [
    'Katie received a new What Katie Seas support payment.',
    '',
    `Amount: ${amount}`,
    `Name: ${customerName}`,
    `Email: ${customerEmail}`,
    `Stripe session: ${session.id}`,
    session.payment_intent ? `Stripe payment: ${stripeDashboardUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `New support payment: ${amount}`,
    html,
    text,
  };
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get('stripe-signature');

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 500 });
  }

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const payload = await request.text();
  const isValidSignature = verifyStripeSignature({
    payload,
    signatureHeader,
    webhookSecret,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data.object;
  if (!isCheckoutSession(session) || session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (session.metadata?.source !== 'support_us') {
    return NextResponse.json({ received: true, ignored: true });
  }

  const email = buildDonationNotificationEmail(session, event);

  await sendResendEmail({
    to: getDonationNotificationEmail(),
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: getNewsletterReplyToEmail(),
  });

  return NextResponse.json({ received: true, notified: true });
}
