import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { POST as handleShopWebhook } from '../../../../stripe/shop-webhook/route';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { EcommerceOrderStatus } from '@/lib/ecommerceTypes';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PendingOrderRecord = {
  id: string;
  customer_order_number: string | null;
  status: EcommerceOrderStatus;
  stripe_session_id: string | null;
};

type StripeEventRecord = {
  id: string;
  created?: number;
  type: string;
  data?: {
    object?: {
      id?: string;
    };
  };
};

const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? '';
}

function getWebhookSecret() {
  return process.env.STRIPE_SHOP_WEBHOOK_SECRET ?? '';
}

async function fetchStripeJson(path: string) {
  const stripeSecretKey = getStripeSecretKey();
  if (!stripeSecretKey) throw new Error('Stripe secret key is not configured.');

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'Stripe request failed.';
    throw new Error(message);
  }

  return payload;
}

async function findCompletedEventForSession(sessionId: string) {
  let startingAfter = '';

  for (let page = 0; page < 3; page += 1) {
    const params = new URLSearchParams({
      type: 'checkout.session.completed',
      limit: '100',
    });
    if (startingAfter) params.set('starting_after', startingAfter);

    const payload = (await fetchStripeJson(`events?${params.toString()}`)) as {
      data?: StripeEventRecord[];
      has_more?: boolean;
    };
    const events = payload.data ?? [];
    const matchingEvent = events.find((event) => event.data?.object?.id === sessionId);

    if (matchingEvent) return matchingEvent;
    if (!payload.has_more || events.length === 0) break;

    startingAfter = events[events.length - 1]?.id ?? '';
  }

  return null;
}

function buildStripeSignature(payload: string, webhookSecret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id: orderId } = await params;

  if (!ORDER_ID_PATTERN.test(orderId)) {
    return NextResponse.json({ error: 'Invalid order id.' }, { status: 400 });
  }

  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe shop webhook secret is not configured.' },
      { status: 500 }
    );
  }

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,customer_order_number,status,stripe_session_id')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const order = orderData as PendingOrderRecord;
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'Stripe payment recovery is only available for pending orders.' },
      { status: 400 }
    );
  }

  if (!order.stripe_session_id) {
    return NextResponse.json(
      {
        error:
          'This pending order does not have a Stripe session id saved. Check Stripe manually before changing anything.',
      },
      { status: 400 }
    );
  }

  let session: Record<string, unknown>;
  let completedEvent: StripeEventRecord | null;

  try {
    session = (await fetchStripeJson(
      `checkout/sessions/${encodeURIComponent(order.stripe_session_id)}`
    )) as Record<string, unknown>;
    completedEvent = await findCompletedEventForSession(order.stripe_session_id);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Stripe verification failed: ${error.message}`
            : 'Stripe verification failed.',
      },
      { status: 502 }
    );
  }

  const metadata = session.metadata as Record<string, string> | null | undefined;
  const orderIds = String(metadata?.order_ids ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (session.object !== 'checkout.session' || session.id !== order.stripe_session_id) {
    return NextResponse.json({ error: 'Stripe did not return the expected checkout session.' }, { status: 502 });
  }

  if (session.payment_status !== 'paid' || session.status !== 'complete') {
    return NextResponse.json(
      {
        error:
          'Stripe does not show this Checkout Session as paid and complete. Do not recover this order.',
      },
      { status: 400 }
    );
  }

  if (metadata?.source !== 'shop' || !orderIds.includes(order.id)) {
    return NextResponse.json(
      {
        error:
          'The paid Stripe session does not belong to this shop order. Do not recover this order.',
      },
      { status: 400 }
    );
  }

  if (!completedEvent) {
    return NextResponse.json(
      {
        error:
          'Stripe shows the session as paid, but the checkout.session.completed event was not found yet. Try again in a minute; if it still fails, review this order manually in Stripe.',
      },
      { status: 409 }
    );
  }

  const eventPayload = JSON.stringify({
    id: completedEvent.id,
    object: 'event',
    type: 'checkout.session.completed',
    created: completedEvent.created,
    data: {
      object: session,
    },
  });
  const response = await handleShopWebhook(
    new Request('http://localhost/api/stripe/shop-webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': buildStripeSignature(eventPayload, webhookSecret),
        'content-type': 'application/json',
      },
      body: eventPayload,
    })
  );
  const webhookPayload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          typeof webhookPayload?.error === 'string'
            ? `Recovery reached the webhook, but processing failed: ${webhookPayload.error}`
            : 'Recovery reached the webhook, but processing failed.',
      },
      { status: response.status }
    );
  }

  const { data: latestOrderData, error: latestOrderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', order.id)
    .single();

  if (latestOrderError || !latestOrderData) {
    return NextResponse.json(
      { error: 'Recovery ran, but the order could not be reloaded.' },
      { status: 500 }
    );
  }

  const latestOrder = latestOrderData as PendingOrderRecord;
  if (latestOrder.status === 'pending') {
    return NextResponse.json(
      {
        error:
          'Stripe payment was verified, but the order is still pending. Review the operational incidents before retrying.',
      },
      { status: 409 }
    );
  }

  await recordOrderOperationalIncident({
    orderId: order.id,
    incidentType: 'manual_status_change',
    reason:
      'Admin recovered a paid Stripe Checkout Session for an order that was still pending after checkout.',
    metadata: {
      action: 'stripe_payment_recovery',
      stripe_session_id: order.stripe_session_id,
      stripe_event_id: completedEvent.id,
      previous_status: order.status,
      recovered_status: latestOrder.status,
      customer_order_number: order.customer_order_number,
    },
  });

  return NextResponse.json({
    order: latestOrderData,
    message:
      'Stripe payment was verified and the normal payment-received flow was re-run for this order.',
  });
}
