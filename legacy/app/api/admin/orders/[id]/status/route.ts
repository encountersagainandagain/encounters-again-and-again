import { NextResponse } from 'next/server';
import {
  buildNewsletterEmailLayout,
  escapeHtml,
  getNewsletterReplyToEmail,
  getSiteUrl,
  sendResendEmail,
} from '@/lib/email';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import {
  buildCustomerHelpText,
  getCustomerOrderNumber,
} from '@/lib/ecommerceOrderIdentity';
import type { ProviderPolicySnapshot } from '@/lib/ecommerceProviderPolicy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveOrderState } from '@/lib/ecommerceOrderAccounting';
import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import type { EcommerceOrderStatus } from '@/lib/ecommerceTypes';
import { createProductReviewInvitations } from '@/lib/productReviewServer';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OrderForEmail = {
  id: string;
  customer_order_number?: string | null;
  status: EcommerceOrderStatus;
  provider: string;
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
  tracking_carrier: string;
  tracking_number: string;
  tracking_url: string;
  provider_policy_snapshot?: ProviderPolicySnapshot[] | null;
};

type OrderItemForEmail = {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
};

type OrderRefundForEmail = {
  order_item_id: string | null;
  amount_cents: number;
  quantity: number | null;
};

type ProductVariantForEmail = {
  id: string;
  product_id: string;
};

type ProductForEmail = {
  id: string;
  name: string;
  slug: string;
  example_images: string[];
};

type ProductImageForEmail = {
  product_id: string;
  image_url: string;
  color: string | null;
  position: number;
};

const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAllowedManualTransitions(status: EcommerceOrderStatus): EcommerceOrderStatus[] {
  switch (status) {
    case 'paid':
    case 'awaiting_manual_fulfillment':
    case 'on_hold':
      return ['submitted'];
    case 'submitted':
      return ['shipped', 'in_production'];
    case 'in_production':
      return ['shipped'];
    case 'shipped':
      return ['delivered'];
    case 'failed':
      return ['on_hold'];
    default:
      return [];
  }
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatShippingAddress(order: OrderForEmail) {
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

function normalizeColor(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('en-US');
}

function toEmailImageUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${getSiteUrl()}${value.startsWith('/') ? value : `/${value}`}`;
}

async function loadOrderItems(order: Pick<OrderForEmail, 'id' | 'total_cents'>) {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id,product_variant_id,quantity,unit_price_cents,color,size')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error('Unable to load order items.');

  const items = (itemsData ?? []) as OrderItemForEmail[];
  const variantIds = [...new Set(items.map((item) => item.product_variant_id))];
  const { data: refundsData, error: refundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('order_item_id,amount_cents,quantity')
    .eq('order_id', order.id);

  if (refundsError) throw new Error('Unable to load order refunds.');

  if (variantIds.length === 0) return [];

  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id')
    .in('id', variantIds);

  if (variantsError) throw new Error('Unable to load order variants.');

  const variants = (variantsData ?? []) as ProductVariantForEmail[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  if (productIds.length === 0) return [];

  const [productsResult, imagesResult] = await Promise.all([
    supabaseAdmin.from('products').select('id,name,slug,example_images').in('id', productIds),
    supabaseAdmin
      .from('product_images')
      .select('product_id,image_url,color,position')
      .in('product_id', productIds)
      .order('position', { ascending: true }),
  ]);

  if (productsResult.error) throw new Error('Unable to load order products.');
  if (imagesResult.error) throw new Error('Unable to load order product images.');

  const productsById = new Map(
    ((productsResult.data ?? []) as ProductForEmail[]).map((product) => [product.id, product])
  );
  const imagesByProductId = new Map<string, ProductImageForEmail[]>();
  ((imagesResult.data ?? []) as ProductImageForEmail[]).forEach((image) => {
    imagesByProductId.set(image.product_id, [
      ...(imagesByProductId.get(image.product_id) ?? []),
      image,
    ]);
  });

  const effectiveOrder = getEffectiveOrderState({
    items,
    refunds: (refundsData ?? []) as OrderRefundForEmail[],
    orderTotalCents: order.total_cents,
  });

  return effectiveOrder.items.filter((item) => item.effectiveQuantity > 0).map((item) => {
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : undefined;
    const productImages = product ? imagesByProductId.get(product.id) ?? [] : [];
    const selectedColor = normalizeColor(item.color);
    const reviewImage =
      productImages.find((image) => normalizeColor(image.color) === selectedColor) ??
      productImages.find((image) => !image.color) ??
      productImages[0];

    return {
      ...item,
      product,
      reviewImageUrl: reviewImage?.image_url ?? product?.example_images[0] ?? null,
    };
  });
}

async function buildCustomerStatusEmail({
  order,
  nextStatus,
}: {
  order: OrderForEmail;
  nextStatus: EcommerceOrderStatus;
}) {
  const items = await loadOrderItems(order);
  const reviewLinks =
    nextStatus === 'delivered'
      ? await createProductReviewInvitations({
          orderId: order.id,
          products: items.flatMap((item) => (item.product ? [item.product] : [])),
        })
      : new Map<string, string>();
  const itemsHtml = items
    .map(
      (item) => `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(item.product?.name ?? 'Your item')}</strong><br />
          ${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.effectiveQuantity}<br />
          ${escapeHtml(formatMoney(item.unit_price_cents, order.currency))} each
        </li>
      `
    )
    .join('');
  const textItems = items.map(
    (item) =>
      `- ${item.product?.name ?? 'Your item'} — ${item.color} / ${item.size} — qty ${item.effectiveQuantity}`
  );
  const reviewProducts = items.reduce<
    Array<ProductForEmail & { color: string; imageUrl: string | null }>
  >((products, item) => {
    if (
      !item.product ||
      !reviewLinks.has(item.product.id) ||
      products.some((product) => product.id === item.product?.id)
    ) {
      return products;
    }

    products.push({
      ...item.product,
      color: item.color,
      imageUrl: item.reviewImageUrl,
    });
    return products;
  }, []);
  const reviewsHtml = reviewProducts.length
    ? `
      <div style="margin:24px 0;background:#eef8f7;border:1px solid #d6ebe8;padding:18px;">
        <p style="margin:0 0 8px;color:#0f6f7c;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Share your experience</p>
        <p style="margin:0 0 14px;">Your honest review helps Katie improve the shop and helps other ocean people choose with confidence.</p>
        ${reviewProducts
          .map((product) => {
            const reviewUrl = reviewLinks.get(product.id);
            return reviewUrl
              ? `<div style="margin:16px 0 0;padding-top:16px;border-top:1px solid #d6ebe8;">
                  ${
                    product.imageUrl
                      ? `<img src="${escapeHtml(toEmailImageUrl(product.imageUrl))}" alt="${escapeHtml(`${product.name} in ${product.color}`)}" width="180" style="display:block;width:180px;max-width:100%;height:auto;margin:0 0 12px;background:#ffffff;object-fit:contain;" />`
                      : ''
                  }
                  <p style="margin:0 0 10px;"><strong>${escapeHtml(product.name)}</strong><br /><span style="color:#5f6b6d;">${escapeHtml(product.color)}</span></p>
                  <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#0f6f7c;color:#ffffff;padding:10px 14px;text-decoration:none;font-weight:700;">Review ${escapeHtml(product.name)}</a>
                </div>`
              : '';
          })
          .join('')}
      </div>
    `
    : '';
  const reviewText = reviewProducts.flatMap((product) => {
    const reviewUrl = reviewLinks.get(product.id);
    return reviewUrl ? [`Review ${product.name} (${product.color}): ${reviewUrl}`] : [];
  });
  const shippingAddress = formatShippingAddress(order);
  const customerOrderNumber = getCustomerOrderNumber(order);
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
  const trackingParts = [
    order.tracking_carrier ? `Carrier: ${order.tracking_carrier}` : '',
    order.tracking_number ? `Tracking number: ${order.tracking_number}` : '',
    order.tracking_url ? `Tracking link: ${order.tracking_url}` : '',
  ].filter(Boolean);

  const isShipped = nextStatus === 'shipped';
  const isDelivered = nextStatus === 'delivered';
  const subject = isShipped
    ? `Your What Katie Seas order ${customerOrderNumber} is on the way`
    : isDelivered
      ? `Your What Katie Seas order ${customerOrderNumber} was delivered`
    : `Your What Katie Seas order ${customerOrderNumber} is confirmed`;

  const bodyHtml = isShipped
    ? `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;">Good news — your order is on the way.</p>
      <p style="margin:0 0 16px;">Order number: <strong>${escapeHtml(customerOrderNumber)}</strong>.</p>
      ${
        trackingParts.length > 0
          ? `<div style="margin:0 0 18px;background:#eef8f7;padding:14px;">${trackingParts
              .map((part) => `<p style="margin:0 0 6px;">${escapeHtml(part)}</p>`)
              .join('')}</div>`
          : '<p style="margin:0 0 16px;">I do not have a tracking number to share yet, but I wanted to let you know it has shipped.</p>'
      }
      <h2 style="margin:24px 0 8px;font-size:18px;">What shipped</h2>
      <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Your order.</li>'}</ul>
      <h2 style="margin:24px 0 8px;font-size:18px;">Shipping to</h2>
      <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(shippingAddress)}</pre>
      <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
      <p style="margin:0 0 24px;">Katie</p>
    `
    : isDelivered
      ? `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;">Tracking shows your package as delivered. I hope it made it to you safely and that you love it.</p>
      <p style="margin:0 0 16px;">Order number: <strong>${escapeHtml(customerOrderNumber)}</strong>.</p>
      <p style="margin:0 0 16px;">Thank you for supporting What Katie Seas — every order helps keep the ocean stories and artwork going.</p>
      <h2 style="margin:24px 0 8px;font-size:18px;">Delivered items</h2>
      <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Your order.</li>'}</ul>
      ${reviewsHtml}
      <p style="margin:0 0 16px;">If something looks damaged, defective, wrong, or if the package was marked delivered but you did not receive it, reply to this email as soon as you can and include your order number.</p>
      <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
      <p style="margin:0 0 24px;">Katie</p>
    `
    : `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;">Quick update: production is confirmed for your order. It has not shipped yet, and I’ll send another update when it is on the way.</p>
      <p style="margin:0 0 16px;">Order number: <strong>${escapeHtml(customerOrderNumber)}</strong>.</p>
      <p style="margin:0 0 16px;">I’ll send another note when it is on the way.</p>
      <h2 style="margin:24px 0 8px;font-size:18px;">What I confirmed</h2>
      <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Your order.</li>'}</ul>
      <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
      <p style="margin:0 0 24px;">Katie</p>
    `;

  const text = isShipped
    ? [
        'Hi,',
        '',
        'Good news — your order is on the way.',
        '',
        `Order number: ${customerOrderNumber}.`,
        '',
        ...trackingParts,
        trackingParts.length === 0
          ? 'I do not have a tracking number to share yet, but I wanted to let you know it has shipped.'
          : '',
        '',
        'What shipped:',
        ...textItems,
        '',
        'Shipping to:',
        shippingAddress,
        '',
        helpText,
        '',
        'Katie',
      ]
        .filter((line) => line !== '')
        .join('\n')
    : isDelivered
      ? [
          'Hi,',
          '',
          'Tracking shows your package as delivered. I hope it made it to you safely and that you love it.',
          '',
          `Order number: ${customerOrderNumber}.`,
          '',
          'Thank you for supporting What Katie Seas — every order helps keep the ocean stories and artwork going.',
          '',
          'Delivered items:',
          ...textItems,
          '',
          ...(reviewText.length > 0
            ? [
                'Share your experience:',
                'Your honest review helps Katie improve the shop and helps other ocean people choose with confidence.',
                ...reviewText,
                '',
              ]
            : []),
          'If something looks damaged, defective, wrong, or if the package was marked delivered but you did not receive it, reply to this email as soon as you can and include your order number.',
          '',
          helpText,
          '',
          'Katie',
        ].join('\n')
    : [
        'Hi,',
        '',
        'Quick update: production is confirmed for your order. It has not shipped yet, and I’ll send another update when it is on the way.',
        '',
        `Order number: ${customerOrderNumber}.`,
        '',
        'I’ll send another note when it is on the way.',
        '',
        'What I confirmed:',
        ...textItems,
        '',
        helpText,
        '',
        'Katie',
      ].join('\n');

  return {
    notificationType: isShipped ? 'shipped' : isDelivered ? 'delivered' : 'manual_provider_submitted',
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
  };
}

async function recordNotification({
  orderId,
  notificationType,
  status,
  recipientEmail,
  subject,
  resendEmailId,
  errorMessage,
}: {
  orderId: string;
  notificationType: string;
  status: 'sent' | 'failed';
  recipientEmail: string;
  subject: string;
  resendEmailId?: string | null;
  errorMessage?: string;
}) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.from('order_customer_notifications').insert({
    order_id: orderId,
    notification_type: notificationType,
    status,
    recipient_email: recipientEmail,
    subject,
    resend_email_id: resendEmailId ?? null,
    error_message: errorMessage ?? '',
  });

  if (error) {
    console.warn('[admin-order-status] unable_to_record_customer_notification', {
      orderId,
      notificationType,
      status,
      reason: error.message,
    });
  }
}

async function maybeSendCustomerStatusEmail({
  order,
  nextStatus,
}: {
  order: OrderForEmail;
  nextStatus: EcommerceOrderStatus;
}) {
  if (!['submitted', 'shipped', 'delivered'].includes(nextStatus)) {
    return {
      attempted: false,
      status: 'skipped' as const,
      message: 'No customer email is sent for this status.',
    };
  }

  if (!order.customer_email) {
    return {
      attempted: true,
      status: 'failed' as const,
      message: 'Order has no customer email, so no email was sent.',
    };
  }

  const email = await buildCustomerStatusEmail({ order, nextStatus });

  try {
    const result = await sendResendEmail({
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: getNewsletterReplyToEmail(),
    });
    const resendEmailId =
      result && typeof result === 'object' && 'id' in result ? String(result.id) : null;

    await recordNotification({
      orderId: order.id,
      notificationType: email.notificationType,
      status: 'sent',
      recipientEmail: email.to,
      subject: email.subject,
      resendEmailId,
    });

    return {
      attempted: true,
      status: 'sent' as const,
      message: 'Customer email sent.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error.';

    await recordNotification({
      orderId: order.id,
      notificationType: email.notificationType,
      status: 'failed',
      recipientEmail: email.to,
      subject: email.subject,
      errorMessage: message,
    });

    return {
      attempted: true,
      status: 'failed' as const,
      message,
    };
  }
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
  const currentStatus = body?.currentStatus as EcommerceOrderStatus | undefined;
  const nextStatus = body?.nextStatus as EcommerceOrderStatus | undefined;
  const trackingCarrier = String(body?.trackingCarrier ?? '').trim();
  const trackingNumber = String(body?.trackingNumber ?? '').trim();
  const trackingUrl = String(body?.trackingUrl ?? '').trim();

  if (!currentStatus || !nextStatus) {
    return NextResponse.json({ error: 'Current and next status are required.' }, { status: 400 });
  }

  if (!getAllowedManualTransitions(currentStatus).includes(nextStatus)) {
    return NextResponse.json({ error: 'That order status transition is not allowed.' }, { status: 400 });
  }

  if (nextStatus === 'shipped' && !trackingNumber && !trackingUrl) {
    return NextResponse.json(
      { error: 'Tracking number or tracking URL is required before marking shipped.' },
      { status: 400 }
    );
  }

  const { data: existingOrderData, error: existingOrderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('status', currentStatus)
    .single();

  if (existingOrderError || !existingOrderData) {
    return NextResponse.json(
      { error: 'Order status changed or order was not found. Refresh and try again.' },
      { status: 409 }
    );
  }

  const existingOrder = existingOrderData as OrderForEmail;
  const { data: providerData, error: providerError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('fulfillment_mode')
    .eq('code', existingOrder.provider)
    .single();

  if (providerError || !providerData) {
    return NextResponse.json({ error: 'Unable to validate order provider.' }, { status: 500 });
  }

  if (providerData.fulfillment_mode !== 'manual') {
    return NextResponse.json(
      { error: 'Manual status changes are only available for manual providers.' },
      { status: 400 }
    );
  }

  if (['submitted', 'shipped'].includes(nextStatus)) {
    const effectiveItems = await loadOrderItems(existingOrder);

    if (effectiveItems.length === 0) {
      return NextResponse.json(
        {
          error:
            'This order has no remaining items to fulfill after refunds. It should stay canceled instead of being submitted or shipped.',
        },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, string> = {
    status: nextStatus,
  };

  if (nextStatus === 'shipped' || trackingCarrier || trackingNumber || trackingUrl) {
    updatePayload.tracking_carrier = trackingCarrier;
    updatePayload.tracking_number = trackingNumber;
    updatePayload.tracking_url = trackingUrl;
  }

  const { data: updatedOrderData, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('status', currentStatus)
    .select('*')
    .single();

  if (updateError || !updatedOrderData) {
    return NextResponse.json({ error: 'Unable to update order.' }, { status: 500 });
  }

  const updatedOrder = updatedOrderData as OrderForEmail;
  const notification = await maybeSendCustomerStatusEmail({
    order: updatedOrder,
    nextStatus,
  });

  await recordOrderOperationalIncident({
    orderId,
    incidentType: 'manual_status_change',
    reason: `Admin changed manual provider order status from ${currentStatus} to ${nextStatus}.`,
    metadata: {
      previous_status: currentStatus,
      next_status: nextStatus,
      provider: updatedOrder.provider,
      tracking_carrier: trackingCarrier,
      tracking_number_present: Boolean(trackingNumber),
      tracking_url_present: Boolean(trackingUrl),
      customer_email_notification_status: notification.status,
    },
  });

  return NextResponse.json({
    order: updatedOrder,
    notification,
  });
}
