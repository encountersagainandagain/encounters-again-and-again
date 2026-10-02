import { NextResponse } from 'next/server';
import {
  buildNewsletterEmailLayout,
  escapeHtml,
  getNewsletterReplyToEmail,
  sendResendEmail,
} from '@/lib/email';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import {
  buildCustomerHelpText,
  getCustomerOrderNumber,
} from '@/lib/ecommerceOrderIdentity';
import {
  getEffectiveOrderState,
  willItemRefundLeaveNoEffectiveItems,
} from '@/lib/ecommerceOrderAccounting';
import type { ProviderPolicySnapshot } from '@/lib/ecommerceProviderPolicy';
import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { EcommerceOrderStatus } from '@/lib/ecommerceTypes';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OrderRecord = {
  id: string;
  customer_order_number?: string | null;
  status: EcommerceOrderStatus;
  provider: string;
  stripe_payment_intent_id: string | null;
  total_cents: number;
  currency: string;
  customer_email: string;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2: string;
  shipping_city: string;
  shipping_state_code: string;
  shipping_zip: string;
  shipping_country_code: string;
  provider_policy_snapshot?: ProviderPolicySnapshot[] | null;
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
};

type OrderRefundRecord = {
  id: string;
  order_id: string;
  order_item_id: string | null;
  amount_cents: number;
  currency: string;
  quantity: number | null;
  cause: 'process_failure' | 'customer_request';
  reason: string;
  stripe_refund_id: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};

type ProductVariantRecord = {
  id: string;
  product_id: string;
};

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
};

const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFUND_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POST_PAYMENT_STATUSES = new Set<EcommerceOrderStatus>([
  'paid',
  'awaiting_manual_fulfillment',
  'submitted',
  'in_production',
  'shipped',
  'delivered',
  'on_hold',
  'failed',
  'canceled',
  'refunded',
]);

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatShippingAddress(order: OrderRecord) {
  return [
    order.shipping_name,
    order.shipping_address1,
    order.shipping_address2,
    [order.shipping_city, order.shipping_state_code, order.shipping_zip].filter(Boolean).join(', '),
    order.shipping_country_code,
  ]
    .filter(Boolean)
    .join('\n');
}

async function loadOrderItems(orderId: string) {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error('Unable to load order items.');

  const items = (itemsData ?? []) as OrderItemRecord[];
  const variantIds = [...new Set(items.map((item) => item.product_variant_id))];
  if (variantIds.length === 0) {
    return {
      items,
      rows: [],
    };
  }

  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id')
    .in('id', variantIds);

  if (variantsError) throw new Error('Unable to load order variants.');

  const variants = (variantsData ?? []) as ProductVariantRecord[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  if (productIds.length === 0) {
    return {
      items,
      rows: items.map((item) => ({
        ...item,
        product: undefined,
      })),
    };
  }

  const { data: productsData, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id,name,slug')
    .in('id', productIds);

  if (productsError) throw new Error('Unable to load products.');

  const productsById = new Map(
    ((productsData ?? []) as ProductRecord[]).map((product) => [product.id, product])
  );

  return {
    items,
    rows: items.map((item) => {
      const variant = variantsById.get(item.product_variant_id);
      const product = variant ? productsById.get(variant.product_id) : undefined;

      return {
        ...item,
        product,
      };
    }),
  };
}

async function recordNotification({
  orderId,
  status,
  recipientEmail,
  subject,
  resendEmailId,
  errorMessage,
}: {
  orderId: string;
  status: 'sent' | 'failed';
  recipientEmail: string;
  subject: string;
  resendEmailId?: string | null;
  errorMessage?: string;
}) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.from('order_customer_notifications').insert({
    order_id: orderId,
    notification_type: 'refund',
    status,
    recipient_email: recipientEmail,
    subject,
    resend_email_id: resendEmailId ?? null,
    error_message: errorMessage ?? '',
  });

  if (error) {
    console.warn('[admin-order-refund] unable_to_record_customer_notification', {
      orderId,
      status,
      reason: error.message,
    });
  }
}

async function sendRefundEmail({
  order,
  amountCents,
  reason,
  description,
  refundStatus,
}: {
  order: OrderRecord;
  amountCents: number;
  reason: string;
  description: string;
  refundStatus: 'partial' | 'total';
}) {
  if (!supabaseAdmin) {
    return {
      attempted: true,
      status: 'failed' as const,
      message: 'Supabase service role is not configured.',
    };
  }

  if (!order.customer_email) {
    return {
      attempted: true,
      status: 'failed' as const,
      message: 'Order has no customer email, so no email was sent.',
    };
  }

  const { rows: itemRows } = await loadOrderItems(order.id);
  const { data: refundsData, error: refundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('order_item_id,amount_cents,quantity')
    .eq('order_id', order.id);

  if (refundsError) {
    console.warn('[admin-order-refund] unable_to_load_refunds_for_email', {
      orderId: order.id,
      reason: refundsError.message,
    });
  }

  const effectiveOrder = getEffectiveOrderState({
    items: itemRows,
    refunds: (refundsData ?? []) as OrderRefundRecord[],
    orderTotalCents: order.total_cents,
  });
  const remainingItemRows = effectiveOrder.items.filter((item) => item.effectiveQuantity > 0);
  const textItems = remainingItemRows.map(
    (item) =>
      `- ${item.product?.name ?? 'Your item'} — ${item.color} / ${item.size} — qty ${item.effectiveQuantity}`
  );
  const itemsHtml = remainingItemRows
    .map(
      (item) => `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(item.product?.name ?? 'Your item')}</strong><br />
          ${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.effectiveQuantity}
        </li>
      `
    )
    .join('');
  const customerOrderNumber = getCustomerOrderNumber(order);
  const subject = `Refund update for your What Katie Seas order ${customerOrderNumber}`;
  const helpText = buildCustomerHelpText({
    orderNumber: customerOrderNumber,
    supportEmail: getNewsletterReplyToEmail(),
    providerPolicySnapshots: order.provider_policy_snapshot ?? [],
  });
  const helpHtml = helpText
    .split('\n')
    .map((line, index) =>
      index === 0
        ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(line)}</strong></p>`
        : `<p style="margin:0 0 6px;">${escapeHtml(line)}</p>`
    )
    .join('');
  const stillComingText =
    refundStatus === 'total'
      ? 'This refund covers the full order, so this order has been canceled.'
      : 'The rest of your order is still moving forward unless I email you otherwise.';
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">Order number: <strong>${escapeHtml(customerOrderNumber)}</strong>.</p>
    <p style="margin:0 0 16px;">I issued a refund of <strong>${escapeHtml(formatMoney(amountCents, order.currency))}</strong> for ${escapeHtml(description)}.</p>
    <p style="margin:0 0 16px;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p style="margin:0 0 16px;">${escapeHtml(stillComingText)}</p>
    <p style="margin:0 0 16px;">Refunds can take a few business days to show up on your card or bank statement.</p>
    <h2 style="margin:24px 0 8px;font-size:18px;">${refundStatus === 'total' ? 'Order status' : 'What is still moving forward'}</h2>
    <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>This order has been fully refunded and canceled.</li>'}</ul>
    <h2 style="margin:24px 0 8px;font-size:18px;">Shipping address on the order</h2>
    <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(formatShippingAddress(order) || 'No shipping address saved.')}</pre>
    <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
    <p style="margin:0 0 24px;">Katie</p>
  `;
  const text = [
    'Hi,',
    '',
    `Order number: ${customerOrderNumber}.`,
    '',
    `I issued a refund of ${formatMoney(amountCents, order.currency)} for ${description}.`,
    '',
    `Reason: ${reason}`,
    '',
    stillComingText,
    '',
    'Refunds can take a few business days to show up on your card or bank statement.',
    '',
    refundStatus === 'total' ? 'Order status:' : 'What is still moving forward:',
    ...textItems,
    textItems.length === 0 ? 'This order has been fully refunded and canceled.' : '',
    '',
    'Shipping address on the order:',
    formatShippingAddress(order) || 'No shipping address saved.',
    '',
    helpText,
    '',
    'Katie',
  ].join('\n');

  try {
    const result = await sendResendEmail({
      to: order.customer_email,
      subject,
      html: buildNewsletterEmailLayout({
        preview: subject,
        bodyHtml,
        footerHtml: `
          <p style="margin:0;">You’re receiving this because you placed an order on What Katie Seas.</p>
          <p style="margin:8px 0 0;">Need help? Reply to this email.</p>
        `,
      }),
      text,
      replyTo: getNewsletterReplyToEmail(),
    });
    const resendEmailId =
      result && typeof result === 'object' && 'id' in result ? String(result.id) : null;

    await recordNotification({
      orderId: order.id,
      status: 'sent',
      recipientEmail: order.customer_email,
      subject,
      resendEmailId,
    });

    return {
      attempted: true,
      status: 'sent' as const,
      message: 'Customer refund email sent.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error.';

    await recordNotification({
      orderId: order.id,
      status: 'failed',
      recipientEmail: order.customer_email,
      subject,
      errorMessage: message,
    });

    return {
      attempted: true,
      status: 'failed' as const,
      message,
    };
  }
}

async function createStripeRefund({
  paymentIntentId,
  amountCents,
  orderId,
  orderItemId,
  reason,
  idempotencyKey,
}: {
  paymentIntentId: string;
  amountCents: number;
  orderId: string;
  orderItemId: string | null;
  reason: string;
  idempotencyKey: string;
}) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const body = new URLSearchParams();
  body.set('payment_intent', paymentIntentId);
  body.set('amount', String(amountCents));
  body.set('metadata[source]', 'shop_admin_refund');
  body.set('metadata[order_id]', orderId);
  if (orderItemId) body.set('metadata[order_item_id]', orderItemId);
  body.set('metadata[reason]', reason.slice(0, 450));
  body.set('metadata[idempotency_key]', idempotencyKey);

  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error?.message || 'Unable to create Stripe refund.');
  }

  return {
    id: String(payload.id),
    amount: Number(payload.amount ?? amountCents),
  };
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

  const body = await request.json().catch(() => null);
  const orderItemId =
    typeof body?.orderItemId === 'string' && ORDER_ID_PATTERN.test(body.orderItemId)
      ? body.orderItemId
      : null;
  const quantityInput = Number(body?.quantity ?? 0);
  const quantity = Number.isInteger(quantityInput) && quantityInput > 0 ? quantityInput : null;
  const reason = String(body?.reason ?? '').trim();
  const cause =
    body?.cause === 'customer_request' || body?.cause === 'process_failure'
      ? (body.cause as 'process_failure' | 'customer_request')
      : null;
  const idempotencyToken =
    typeof body?.idempotencyToken === 'string' && REFUND_TOKEN_PATTERN.test(body.idempotencyToken)
      ? body.idempotencyToken
      : '';

  if (!reason) {
    return NextResponse.json({ error: 'Refund reason is required.' }, { status: 400 });
  }

  if (!cause) {
    return NextResponse.json({ error: 'Refund cause is required.' }, { status: 400 });
  }

  if (!idempotencyToken) {
    return NextResponse.json({ error: 'Refund idempotency token is required.' }, { status: 400 });
  }

  if (body?.orderItemId && !orderItemId) {
    return NextResponse.json({ error: 'Invalid order item id.' }, { status: 400 });
  }

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const order = orderData as OrderRecord;
  const idempotencyKey = `shop-refund:${order.id}:${idempotencyToken}`;

  const { data: existingRefundData, error: existingRefundError } = await supabaseAdmin
    .from('order_refunds')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingRefundError) {
    return NextResponse.json({ error: 'Unable to verify refund idempotency.' }, { status: 500 });
  }

  if (existingRefundData) {
    const existingRefund = existingRefundData as OrderRefundRecord;
    const { data: latestOrderData } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();
    const latestOrder = (latestOrderData ?? order) as OrderRecord;
    const { data: latestRefundsData } = await supabaseAdmin
      .from('order_refunds')
      .select('amount_cents')
      .eq('order_id', order.id);
    const latestRefundedCents = (latestRefundsData ?? []).reduce(
      (total, refund) => total + Number(refund.amount_cents ?? 0),
      0
    );

    return NextResponse.json({
      refund: existingRefund,
      order: latestOrder,
      refundStatus: latestRefundedCents >= latestOrder.total_cents ? 'total' : 'partial',
      notification: {
        attempted: false,
        status: 'skipped',
        message: 'This refund operation was already recorded. No duplicate email was sent.',
      },
    });
  }

  if (!order.stripe_payment_intent_id || !POST_PAYMENT_STATUSES.has(order.status)) {
    return NextResponse.json(
      { error: 'Only paid/post-payment orders with a Stripe PaymentIntent can be refunded.' },
      { status: 400 }
    );
  }

  const { items } = await loadOrderItems(order.id);
  const item = orderItemId ? items.find((candidate) => candidate.id === orderItemId) : null;

  if (orderItemId && !item) {
    return NextResponse.json({ error: 'Refund item does not belong to this order.' }, { status: 400 });
  }

  const { data: paymentOrdersData, error: paymentOrdersError } = await supabaseAdmin
    .from('orders')
    .select('id,total_cents')
    .eq('stripe_payment_intent_id', order.stripe_payment_intent_id);

  if (paymentOrdersError) {
    return NextResponse.json({ error: 'Unable to validate payment refund limit.' }, { status: 500 });
  }

  const paymentOrderIds = (paymentOrdersData ?? []).map((paymentOrder) => paymentOrder.id);
  const paymentTotalCents = (paymentOrdersData ?? []).reduce(
    (total, paymentOrder) => total + Number(paymentOrder.total_cents ?? 0),
    0
  );
  const { data: paymentRefundsData, error: paymentRefundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('amount_cents')
    .in('order_id', paymentOrderIds);

  if (paymentRefundsError) {
    return NextResponse.json({ error: 'Unable to load existing refunds.' }, { status: 500 });
  }

  const paymentRefundedCents = (paymentRefundsData ?? []).reduce(
    (total, refund) => total + Number(refund.amount_cents ?? 0),
    0
  );
  const { data: orderRefundsData, error: orderRefundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('*')
    .eq('order_id', order.id);

  if (orderRefundsError) {
    return NextResponse.json({ error: 'Unable to load order refunds.' }, { status: 500 });
  }

  const orderRefundedCents = ((orderRefundsData ?? []) as OrderRefundRecord[]).reduce(
    (total, refund) => total + refund.amount_cents,
    0
  );
  const orderRemainingCents = Math.max(order.total_cents - orderRefundedCents, 0);
  let amountCents = orderRemainingCents;
  let refundQuantity: number | null = null;
  let description = 'the remaining order balance';

  if (item) {
    const itemRefunds = ((orderRefundsData ?? []) as OrderRefundRecord[]).filter(
      (refund) => refund.order_item_id === item.id
    );
    const itemRefundedQuantity = itemRefunds.reduce(
      (total, refund) => total + (refund.quantity ?? 0),
      0
    );
    const itemRemainingQuantity = item.quantity - itemRefundedQuantity;

    if (!quantity || quantity > itemRemainingQuantity) {
      return NextResponse.json(
        { error: `Refund quantity must be between 1 and ${itemRemainingQuantity}.` },
        { status: 400 }
      );
    }

    refundQuantity = quantity;
    const willHaveNoItemsLeftToFulfill = willItemRefundLeaveNoEffectiveItems({
      items,
      refunds: (orderRefundsData ?? []) as OrderRefundRecord[],
      orderItemId: item.id,
      quantity,
    });

    amountCents = willHaveNoItemsLeftToFulfill
      ? orderRemainingCents
      : item.unit_price_cents * quantity;
    description = `${quantity} × ${item.color} / ${item.size}`;
  }

  if (amountCents <= 0) {
    return NextResponse.json({ error: 'There is no refundable amount left.' }, { status: 400 });
  }

  if (paymentRefundedCents + amountCents > paymentTotalCents) {
    return NextResponse.json(
      { error: 'Refund would exceed the total amount collected for this Stripe payment.' },
      { status: 400 }
    );
  }

  let stripeRefund;

  try {
    stripeRefund = await createStripeRefund({
      paymentIntentId: order.stripe_payment_intent_id,
      amountCents,
      orderId: order.id,
      orderItemId,
      reason,
      idempotencyKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create Stripe refund.' },
      { status: 502 }
    );
  }

  const { data: refundData, error: refundInsertError } = await supabaseAdmin
    .from('order_refunds')
    .insert({
      order_id: order.id,
      order_item_id: item?.id ?? null,
      amount_cents: stripeRefund.amount || amountCents,
      currency: order.currency,
      quantity: refundQuantity,
      cause,
      reason,
      stripe_refund_id: stripeRefund.id,
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .single();

  if (refundInsertError || !refundData) {
    console.error('[admin-order-refund] stripe_refund_succeeded_local_record_failed', {
      orderId: order.id,
      stripeRefundId: stripeRefund.id,
      idempotencyKey,
      reason: refundInsertError?.message,
    });
    return NextResponse.json(
      {
        error: `Stripe refund ${stripeRefund.id} succeeded, but the local refund ledger failed to save. Do NOT retry blindly. Verify this refund in Stripe first, then reconcile the local ledger using this refund id before attempting another refund.`,
        stripeRefundId: stripeRefund.id,
      },
      { status: 500 }
    );
  }

  const refund = refundData as OrderRefundRecord;
  const effectiveOrderAfterRefund = getEffectiveOrderState({
    items,
    refunds: [...((orderRefundsData ?? []) as OrderRefundRecord[]), refund],
    orderTotalCents: order.total_cents,
  });
  const refundStatus = effectiveOrderAfterRefund.isFullyRefunded ? 'total' : 'partial';
  let updatedOrder = order;

  if (refundStatus === 'total' && order.status !== 'canceled') {
    const { data: canceledOrder, error: cancelError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'canceled' })
      .eq('id', order.id)
      .select('*')
      .single();

    if (!cancelError && canceledOrder) {
      updatedOrder = canceledOrder as OrderRecord;
    }
  }

  const notification = await sendRefundEmail({
    order: updatedOrder,
    amountCents: refund.amount_cents,
    reason,
    description,
    refundStatus,
  });

  if (cause === 'process_failure') {
    await recordOrderOperationalIncident({
      orderId: order.id,
      incidentType: 'manual_refund',
      reason,
      metadata: {
        refund_id: refund.id,
        stripe_refund_id: refund.stripe_refund_id,
        amount_cents: refund.amount_cents,
        currency: refund.currency,
        order_item_id: refund.order_item_id,
        quantity: refund.quantity,
        refund_status: refundStatus,
        refund_cause: cause,
        customer_email_notification_status: notification.status,
      },
    });
  }

  return NextResponse.json({
    refund,
    order: updatedOrder,
    refundStatus,
    notification,
  });
}
