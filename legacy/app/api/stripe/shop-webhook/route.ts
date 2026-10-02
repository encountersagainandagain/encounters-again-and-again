import { createHmac, timingSafeEqual } from 'crypto';
import { after, NextResponse } from 'next/server';
import {
  buildNewsletterEmailLayout,
  escapeHtml,
  getManualOrderNotificationEmail,
  getNewsletterReplyToEmail,
  getSiteUrl,
  sendResendEmail,
} from '@/lib/email';
import { getEffectiveOrderState } from '@/lib/ecommerceOrderAccounting';
import {
  buildCustomerHelpText,
  formatCustomerOrderNumbers,
  getCustomerOrderNumber,
} from '@/lib/ecommerceOrderIdentity';
import {
  formatSizeGuideMeasurements,
  getReturnPolicyUrl,
  sanitizeCustomerGarmentText,
  SHOP_RETURN_POLICY_PATH,
  SHOP_RETURN_POLICY_VERSION,
  type SizeGuideSnapshotItem,
} from '@/lib/ecommercePolicy';
import {
  redactFulfillmentIdentity,
  type ProviderPolicySnapshot,
} from '@/lib/ecommerceProviderPolicy';
import { submitPrintfulOrder } from '@/lib/printfulFulfillment';
import {
  recordOrderOperationalIncident,
  recordOrderOperationalIncidentOnce,
} from '@/lib/orderOperationalIncidents';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const POST_PAYMENT_WEBHOOK_STATUSES = new Set([
  'paid',
  'awaiting_manual_fulfillment',
  'on_hold',
  'submitting',
  'submitted',
  'in_production',
  'shipped',
  'delivered',
]);

type StripeEvent = {
  id: string;
  type: string;
  created?: number;
  data: {
    object: unknown;
  };
};

type StripeCheckoutSession = {
  id: string;
  object: 'checkout.session';
  amount_total?: number | null;
  currency?: string | null;
  collected_information?: {
    shipping_details?: {
      name?: string | null;
      address?: StripeAddress | null;
    } | null;
  } | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    address?: StripeAddress | null;
  } | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  payment_intent?: string | { id?: string | null } | null;
  consent?: {
    terms_of_service?: 'accepted' | string | null;
  } | null;
  shipping_details?: {
    name?: string | null;
    address?: StripeAddress | null;
  } | null;
};

type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type ShopOrderForWebhook = {
  id: string;
  customer_order_number?: string | null;
  provider: string;
  status: string;
  discount_code_id?: string | null;
  marketing_campaign_id?: string | null;
};

type EcommerceProviderForWebhook = {
  code: string;
  name: string;
  fulfillment_mode: 'api' | 'manual';
  contact_email: string | null;
  contact_url: string | null;
  contact_notes: string | null;
};

type ManualOrder = {
  id: string;
  customer_order_number?: string | null;
  provider: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
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
  return_policy_version?: string | null;
  return_policy_url?: string | null;
  size_guide_version?: string | null;
  size_guide_snapshot?: SizeGuideSnapshotItem[] | null;
  provider_policy_snapshot?: ProviderPolicySnapshot[] | null;
};

type CustomerOrder = ManualOrder & {
  status: string;
};

type ManualOrderItem = {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
};

type OrderRefundForWebhook = {
  order_id: string;
  order_item_id: string | null;
  amount_cents: number;
  quantity: number | null;
};

type ManualProductVariant = {
  id: string;
  product_id: string;
};

type ManualProduct = {
  id: string;
  name: string;
  slug: string;
};

type ManualProductFile = {
  product_id: string;
  placement: string;
  file_url: string;
  position: number;
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

function parseOrderIds(value?: string | null) {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item
      )
    );
}

function logShopWebhook(
  message: string,
  metadata: Record<string, string | number | boolean | string[] | undefined> = {}
) {
  console.info('[stripe-shop-webhook]', message, metadata);
}

function warnShopWebhook(
  message: string,
  metadata: Record<string, string | number | boolean | string[] | undefined> = {}
) {
  console.warn('[stripe-shop-webhook]', message, metadata);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `${trimmed.replace(/[.!?]+$/g, '')}.`;
}

function formatPaymentBreakdown(orders: Array<Pick<ManualOrder, 'subtotal_cents' | 'discount_cents' | 'shipping_cents' | 'total_cents' | 'currency'>>) {
  const currency = orders[0]?.currency || 'USD';
  const subtotalCents = orders.reduce((total, order) => total + (order.subtotal_cents ?? 0), 0);
  const discountCents = orders.reduce((total, order) => total + (order.discount_cents ?? 0), 0);
  const originalSubtotalCents = subtotalCents + discountCents;
  const shippingCents = orders.reduce((total, order) => total + (order.shipping_cents ?? 0), 0);
  const totalCents = orders.reduce((total, order) => total + (order.total_cents ?? 0), 0);

  return {
    currency,
    subtotalCents,
    discountCents,
    originalSubtotalCents,
    shippingCents,
    totalCents,
    subtotal: formatMoney(originalSubtotalCents, currency),
    discount: formatMoney(discountCents, currency),
    shipping:
      shippingCents > 0 ? formatMoney(shippingCents, currency) : 'Included in item price',
    total: formatMoney(totalCents, currency),
  };
}

function paymentBreakdownHtml(
  breakdown: ReturnType<typeof formatPaymentBreakdown>,
  title = 'Payment summary'
) {
  return `
    <h2 style="margin:24px 0 8px;font-size:18px;">${escapeHtml(title)}</h2>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      <tbody>
        <tr>
          <td style="padding:6px 0;color:#5f6f72;">Items</td>
          <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(breakdown.subtotal)}</td>
        </tr>
        ${
          breakdown.discountCents > 0
            ? `<tr><td style="padding:6px 0;color:#187354;">Newsletter discount</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#187354;">−${escapeHtml(breakdown.discount)}</td></tr>`
            : ''
        }
        <tr>
          <td style="padding:6px 0;color:#5f6f72;">Shipping</td>
          <td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(breakdown.shipping)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #d6ebe8;font-weight:700;">Total paid</td>
          <td style="padding:8px 0;border-top:1px solid #d6ebe8;text-align:right;font-weight:700;">${escapeHtml(breakdown.total)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function paymentBreakdownText(breakdown: ReturnType<typeof formatPaymentBreakdown>) {
  return [
    'Payment summary:',
    `Items: ${breakdown.subtotal}`,
    ...(breakdown.discountCents > 0 ? [`Newsletter discount: -${breakdown.discount}`] : []),
    `Shipping: ${breakdown.shipping}`,
    `Total paid: ${breakdown.total}`,
  ];
}

function formatShippingAddress(order: ManualOrder) {
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

function adminOrderUrl(orderId: string) {
  return `${getSiteUrl()}/admin/orders#order-${orderId}`;
}

function productUrl(slug: string) {
  return `${getSiteUrl()}/shop/${slug}`;
}

function resolveReturnPolicyUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return getReturnPolicyUrl();
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const parsedUrl = new URL(pathOrUrl);
      if (parsedUrl.pathname === SHOP_RETURN_POLICY_PATH) return getReturnPolicyUrl();
    } catch {
      return getReturnPolicyUrl();
    }

    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (normalizedPath === SHOP_RETURN_POLICY_PATH) return getReturnPolicyUrl();
  return `${getSiteUrl()}${normalizedPath}`;
}

function getPaymentIntentId(session: StripeCheckoutSession) {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  if (session.payment_intent && typeof session.payment_intent.id === 'string') {
    return session.payment_intent.id;
  }

  return null;
}

function getShippingDetails(session: StripeCheckoutSession) {
  const candidates = [
    {
      source: 'collected_information.shipping_details',
      name: session.collected_information?.shipping_details?.name,
      address: session.collected_information?.shipping_details?.address,
    },
    {
      source: 'shipping_details',
      name: session.shipping_details?.name,
      address: session.shipping_details?.address,
    },
    {
      source: 'customer_details',
      name: session.customer_details?.name,
      address: session.customer_details?.address,
    },
  ];

  return (
    candidates.find((candidate) => Boolean(candidate.address)) ?? {
      source: 'missing',
      name: null,
      address: null,
    }
  );
}

function getMissingShippingFields(address: StripeAddress | null | undefined) {
  const missingFields: string[] = [];

  if (!address?.line1) missingFields.push('line1');
  if (!address?.city) missingFields.push('city');
  if (!address?.postal_code) missingFields.push('postal_code');
  if (!address?.country) missingFields.push('country');

  return missingFields;
}

async function buildManualOrderNotification(orderId: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured.');
  }

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(
      'id,customer_order_number,provider,subtotal_cents,discount_cents,shipping_cents,total_cents,currency,customer_email,shipping_name,shipping_address1,shipping_address2,shipping_city,shipping_state_code,shipping_zip,shipping_country_code'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    throw new Error('Unable to load manual order for notification.');
  }

  const order = orderData as ManualOrder;

  const { data: providerData, error: providerError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('code,name,fulfillment_mode,contact_email,contact_url,contact_notes')
    .eq('code', order.provider)
    .single();

  if (providerError || !providerData) {
    throw new Error('Unable to load manual provider for notification.');
  }

  const provider = providerData as EcommerceProviderForWebhook;

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id,product_variant_id,quantity,unit_price_cents,color,size')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw new Error('Unable to load manual order items for notification.');
  }

  const items = (itemsData ?? []) as ManualOrderItem[];
  const { data: refundsData, error: refundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('order_id,order_item_id,amount_cents,quantity')
    .eq('order_id', order.id);

  if (refundsError) {
    throw new Error('Unable to load manual order refunds for notification.');
  }

  const effectiveOrder = getEffectiveOrderState({
    items,
    refunds: (refundsData ?? []) as OrderRefundForWebhook[],
    orderTotalCents: order.total_cents,
  });
  const effectiveItems = effectiveOrder.items.filter((item) => item.effectiveQuantity > 0);

  if (effectiveItems.length === 0) {
    throw new Error('Manual order has no remaining items after refunds.');
  }

  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id')
    .in('id', [...new Set(effectiveItems.map((item) => item.product_variant_id))]);

  if (variantsError) {
    throw new Error('Unable to load manual order variants for notification.');
  }

  const variants = (variantsData ?? []) as ManualProductVariant[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];

  const [productsResult, filesResult] = await Promise.all([
    supabaseAdmin.from('products').select('id,name,slug').in('id', productIds),
    supabaseAdmin
      .from('product_files')
      .select('product_id,placement,file_url,position')
      .in('product_id', productIds)
      .order('placement', { ascending: true })
      .order('position', { ascending: true }),
  ]);

  if (productsResult.error) {
    throw new Error('Unable to load manual order products for notification.');
  }

  if (filesResult.error) {
    throw new Error('Unable to load manual order print files for notification.');
  }

  const products = (productsResult.data ?? []) as ManualProduct[];
  const files = (filesResult.data ?? []) as ManualProductFile[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const filesByProductId = new Map<string, ManualProductFile[]>();

  files.forEach((file) => {
    filesByProductId.set(file.product_id, [...(filesByProductId.get(file.product_id) ?? []), file]);
  });

  const itemRows = effectiveItems.map((item) => {
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : undefined;

    return {
      ...item,
      product,
      files: variant ? filesByProductId.get(variant.product_id) ?? [] : [],
    };
  });

  const address = formatShippingAddress(order);
  const customerOrderNumber = getCustomerOrderNumber(order);
  const orderUrl = adminOrderUrl(order.id);
  const recipientEmail = getManualOrderNotificationEmail();
  const subject = `Manual order needed: ${provider.name} (${customerOrderNumber})`;
  const breakdown = formatPaymentBreakdown([order]);

  const itemsHtml = itemRows
    .map((item) => {
      const productName = item.product?.name ?? 'Unknown product';
      const shopUrl = item.product?.slug ? productUrl(item.product.slug) : '';

      return `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(productName)}</strong><br />
          ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#0f6f7c;">View product</a><br />` : ''}
          Color: ${escapeHtml(item.color)} · Size: ${escapeHtml(item.size)} · Qty: ${item.effectiveQuantity}<br />
          Customer paid: ${escapeHtml(formatMoney(item.unit_price_cents, order.currency))} each
        </li>
      `;
    })
    .join('');

  const filesHtml = itemRows
    .flatMap((item) =>
      item.files.map((file) => ({
        productName: item.product?.name ?? 'Unknown product',
        ...file,
      }))
    )
    .filter(
      (file, index, allFiles) =>
        allFiles.findIndex(
          (candidate) =>
            candidate.product_id === file.product_id &&
            candidate.placement === file.placement &&
            candidate.position === file.position &&
            candidate.file_url === file.file_url
        ) === index
    )
    .map(
      (file) => `
        <li style="margin:0 0 12px;">
          <strong>${escapeHtml(file.productName)}</strong> — ${escapeHtml(file.placement)}<br />
          <a href="${escapeHtml(file.file_url)}" style="color:#0f6f7c;word-break:break-all;">${escapeHtml(file.file_url)}</a>
        </li>
      `
    )
    .join('');

  const providerContactHtml = [
    provider.contact_email
      ? `Email: <a href="mailto:${escapeHtml(provider.contact_email)}" style="color:#0f6f7c;">${escapeHtml(provider.contact_email)}</a>`
      : '',
    provider.contact_url
      ? `URL: <a href="${escapeHtml(provider.contact_url)}" style="color:#0f6f7c;word-break:break-all;">${escapeHtml(provider.contact_url)}</a>`
      : '',
    provider.contact_notes ? `Notes: ${escapeHtml(provider.contact_notes).replace(/\n/g, '<br />')}` : '',
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 8px;">${line}</p>`)
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;background:#f4faf9;color:#172121;font-family:Arial,sans-serif;font-size:16px;line-height:1.55;">
        <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
          <div style="background:#ffffff;border:1px solid #d6ebe8;border-top:5px solid #0f6f7c;padding:22px;">
            <p style="margin:0 0 8px;color:#0f6f7c;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Manual fulfillment needed</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Place this ${escapeHtml(provider.name)} order</h1>
            <p style="margin:0 0 16px;">A shop order was paid and needs to be placed manually with the provider.</p>
            <p style="margin:0 0 16px;"><strong>Customer order number:</strong> ${escapeHtml(customerOrderNumber)}</p>
            <p style="margin:0 0 18px;">
              <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0f6f7c;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700;">Open order in admin</a>
            </p>

            <h2 style="margin:24px 0 8px;font-size:18px;">Ship to</h2>
            <pre style="margin:0 0 8px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(address)}</pre>
            <p style="margin:0 0 16px;">Customer email: <a href="mailto:${escapeHtml(order.customer_email)}" style="color:#0f6f7c;">${escapeHtml(order.customer_email || 'missing')}</a></p>

            <h2 style="margin:24px 0 8px;font-size:18px;">Items</h2>
            <ul style="padding-left:20px;margin:0;">${itemsHtml || '<li>No items found.</li>'}</ul>

            ${paymentBreakdownHtml(breakdown, 'Customer payment')}

            <h2 style="margin:24px 0 8px;font-size:18px;">Print-ready files</h2>
            <ul style="padding-left:20px;margin:0;">${filesHtml || '<li>No print files found for this order.</li>'}</ul>

            <h2 style="margin:24px 0 8px;font-size:18px;">Provider contact</h2>
            <p style="margin:0 0 8px;"><strong>${escapeHtml(provider.name)}</strong> (${escapeHtml(provider.code)})</p>
            ${providerContactHtml || '<p style="margin:0 0 8px;">No provider contact details saved.</p>'}

            <hr style="border:0;border-top:1px solid #d6ebe8;margin:24px 0;" />
            <p style="margin:0;color:#5f6f72;font-size:13px;">Customer order number: ${escapeHtml(customerOrderNumber)}. Internal order id: ${escapeHtml(order.id)}.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    `Manual fulfillment needed: ${provider.name}`,
    `Customer order number: ${customerOrderNumber}`,
    '',
    `Open order in admin: ${orderUrl}`,
    '',
    'Ship to:',
    address || 'No shipping address saved.',
    '',
    `Customer email: ${order.customer_email || 'missing'}`,
    '',
    'Items:',
    ...itemRows.map((item) => {
      const productName = item.product?.name ?? 'Unknown product';
      const shopUrl = item.product?.slug ? productUrl(item.product.slug) : '';
      return [
        `- ${productName} — ${item.color} / ${item.size} — qty ${item.effectiveQuantity} — ${formatMoney(item.unit_price_cents, order.currency)} each`,
        shopUrl ? `  Product page: ${shopUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }),
    '',
    ...paymentBreakdownText(breakdown),
    '',
    'Print-ready files:',
    ...itemRows.flatMap((item) =>
      item.files.map(
        (file) =>
          `- ${item.product?.name ?? 'Unknown product'} — ${file.placement}: ${file.file_url}`
      )
    ),
    '',
    'Provider contact:',
    `${provider.name} (${provider.code})`,
    provider.contact_email ? `Email: ${provider.contact_email}` : '',
    provider.contact_url ? `URL: ${provider.contact_url}` : '',
    provider.contact_notes ? `Notes: ${provider.contact_notes}` : '',
    '',
    `Customer order number: ${customerOrderNumber}`,
    `Internal order id: ${order.id}`,
  ].join('\n');

  return {
    to: recipientEmail,
    subject,
    html,
    text,
  };
}

async function sendManualOrderNotification(orderId: string) {
  const email = await buildManualOrderNotification(orderId);

  await sendResendEmail({
    ...email,
    replyTo: getNewsletterReplyToEmail(),
  });
}

async function buildCustomerOrderConfirmation(orderIds: string[]) {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured.');
  }

  const { data: ordersData, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(
      'id,customer_order_number,status,provider,subtotal_cents,discount_cents,shipping_cents,total_cents,currency,customer_email,shipping_name,shipping_address1,shipping_address2,shipping_city,shipping_state_code,shipping_zip,shipping_country_code,return_policy_version,return_policy_url,size_guide_version,size_guide_snapshot,provider_policy_snapshot'
    )
    .in('id', orderIds)
    .order('created_at', { ascending: true });

  if (ordersError) {
    throw new Error('Unable to load customer order confirmation.');
  }

  const orders = (ordersData ?? []) as CustomerOrder[];
  if (orders.length === 0) {
    throw new Error('No orders found for customer confirmation.');
  }

  const customerEmail = orders.find((order) => order.customer_email)?.customer_email ?? '';
  if (!customerEmail) {
    throw new Error('Customer email is missing.');
  }

  const providerCodes = [...new Set(orders.map((order) => order.provider))];
  const orderIdsForItems = orders.map((order) => order.id);
  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id,product_variant_id,quantity,unit_price_cents,color,size')
    .in('order_id', orderIdsForItems)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw new Error('Unable to load items for customer confirmation.');
  }

  const items = (itemsData ?? []) as (ManualOrderItem & { order_id: string })[];
  const { data: refundsData, error: refundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('order_id,order_item_id,amount_cents,quantity')
    .in('order_id', orderIdsForItems);

  if (refundsError) {
    throw new Error('Unable to load refunds for customer confirmation.');
  }

  const refundsByOrderId = new Map<string, OrderRefundForWebhook[]>();
  ((refundsData ?? []) as OrderRefundForWebhook[]).forEach((refund) => {
    refundsByOrderId.set(refund.order_id, [
      ...(refundsByOrderId.get(refund.order_id) ?? []),
      refund,
    ]);
  });

  const itemsByOrderId = new Map<string, (ManualOrderItem & { order_id: string })[]>();
  items.forEach((item) => {
    itemsByOrderId.set(item.order_id, [...(itemsByOrderId.get(item.order_id) ?? []), item]);
  });

  const orderById = new Map(orders.map((order) => [order.id, order]));
  const effectiveItems = orders.flatMap((order) => {
    const effectiveOrder = getEffectiveOrderState({
      items: itemsByOrderId.get(order.id) ?? [],
      refunds: refundsByOrderId.get(order.id) ?? [],
      orderTotalCents: order.total_cents,
    });

    return effectiveOrder.items
      .filter((item) => item.effectiveQuantity > 0)
      .map((item) => ({
        ...item,
        order_id: order.id,
      }));
  });
  const variantIds = [...new Set(effectiveItems.map((item) => item.product_variant_id))];
  const variantsResult =
    variantIds.length > 0
      ? await supabaseAdmin.from('product_variants').select('id,product_id').in('id', variantIds)
      : { data: [], error: null };
  const { data: variantsData, error: variantsError } = variantsResult;

  if (variantsError) {
    throw new Error('Unable to load variants for customer confirmation.');
  }

  const variants = (variantsData ?? []) as ManualProductVariant[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  const productsResult =
    productIds.length > 0
      ? await supabaseAdmin.from('products').select('id,name,slug').in('id', productIds)
      : { data: [], error: null };
  const { data: productsData, error: productsError } = productsResult;

  if (productsError) {
    throw new Error('Unable to load products for customer confirmation.');
  }

  const productsById = new Map(
    ((productsData ?? []) as ManualProduct[]).map((product) => [product.id, product])
  );
  const firstOrder = orders[0];
  const customerOrderNumber = formatCustomerOrderNumbers(orders);
  const address = formatShippingAddress(firstOrder);
  const breakdown = formatPaymentBreakdown(orders);
  const totalCents = breakdown.totalCents;
  const currency = breakdown.currency;
  const hasMultipleShipments = providerCodes.length > 1;
  const packageLabelByProvider = new Map(
    providerCodes.map((providerCode, index) => [
      providerCode,
      hasMultipleShipments ? `Package ${index + 1} of ${providerCodes.length}` : 'Package',
    ])
  );
  const hasOnHoldOrder = orders.some((order) => order.status === 'on_hold');
  const policyVersion = firstOrder.return_policy_version || SHOP_RETURN_POLICY_VERSION;
  const policyUrl = resolveReturnPolicyUrl(firstOrder.return_policy_url);
  const providerPolicySnapshots = orders.flatMap((order) =>
    (order.provider_policy_snapshot ?? []).map((snapshot) => ({
      snapshot,
      packageLabel: packageLabelByProvider.get(order.provider) ?? 'Package',
    }))
  );
  const providerPolicyHtml = providerPolicySnapshots
    .map(
      ({ snapshot, packageLabel }) => {
        const customerText = (value: string) =>
          redactFulfillmentIdentity(value, {
            name: snapshot.provider_name,
            code: snapshot.provider_code,
          });
        const shippingText =
          snapshot.shipping_time_status === 'not_published'
            ? 'Transit estimate is not published; tracking will be shared when the order ships.'
            : `Estimated shipping/transit: ${normalizeSentence(customerText(snapshot.shipping_time_description))}`;
        const recommendedText = snapshot.recommended_issue_report_window_days
          ? ` Please report defects within ${snapshot.recommended_issue_report_window_days} days when possible.`
          : '';
        const eligibleReturnText = snapshot.eligible_return_request_window_days
          ? ` Approved eligible returns can be requested up to ${snapshot.eligible_return_request_window_days} days; this is not a general return window.`
          : '';
        const finalSaleText = snapshot.accepts_size_color_remorse_returns
          ? 'Size/color returns follow the saved item terms.'
          : 'Size/color remorse returns are final sale when the item arrives correct.';

        return `
        <li style="margin:0 0 10px;">
          <strong>${escapeHtml(packageLabel)}</strong><br />
          Claims: damaged, defective, or wrong items within ${snapshot.damaged_claim_window_days} days; lost packages within ${snapshot.lost_package_claim_window_days} days from ${escapeHtml(customerText(snapshot.lost_package_window_basis))}.${escapeHtml(recommendedText)}${escapeHtml(eligibleReturnText)}<br />
          ${escapeHtml(finalSaleText)} Estimated production: ${escapeHtml(normalizeSentence(customerText(snapshot.production_time_description)))} ${escapeHtml(shippingText)}
        </li>
      `;
      }
    )
    .join('');
  const providerPolicyText = providerPolicySnapshots.map(
    ({ snapshot, packageLabel }) => {
      const customerText = (value: string) =>
        redactFulfillmentIdentity(value, {
          name: snapshot.provider_name,
          code: snapshot.provider_code,
        });
      const shippingText =
        snapshot.shipping_time_status === 'not_published'
          ? 'transit estimate not published; tracking will be shared when shipped'
          : `estimated shipping/transit ${normalizeSentence(customerText(snapshot.shipping_time_description))}`;
      const recommendedText = snapshot.recommended_issue_report_window_days
        ? ` please report defects within ${snapshot.recommended_issue_report_window_days} days when possible;`
        : '';
      const eligibleReturnText = snapshot.eligible_return_request_window_days
        ? ` eligible approved return requests up to ${snapshot.eligible_return_request_window_days} days, not a general return window;`
        : '';

      return `${packageLabel}: damaged/wrong item claims ${snapshot.damaged_claim_window_days} days;${recommendedText} lost package claims ${snapshot.lost_package_claim_window_days} days from ${customerText(snapshot.lost_package_window_basis)};${eligibleReturnText} ${snapshot.accepts_size_color_remorse_returns ? 'size/color remorse returns follow saved item terms' : 'size/color remorse returns are final sale when the item arrives correct'}; estimated production ${normalizeSentence(customerText(snapshot.production_time_description))} ${shippingText}`;
    }
  );
  const supportEmail = getNewsletterReplyToEmail();
  const helpText = buildCustomerHelpText({
    orderNumber: customerOrderNumber,
    supportEmail,
    providerPolicySnapshots: providerPolicySnapshots.map(({ snapshot }) => snapshot),
  });
  const helpHtml = helpText
    .split('\n')
    .map((line, index) =>
      index === 0
        ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(line)}</strong></p>`
        : `<p style="margin:0 0 6px;">${escapeHtml(line)}</p>`
    )
    .join('');
  const snapshotsByVariantId = new Map<string, SizeGuideSnapshotItem>();
  orders.forEach((order) => {
    (order.size_guide_snapshot ?? []).forEach((snapshot) => {
      snapshotsByVariantId.set(snapshot.product_variant_id, snapshot);
    });
  });

  const itemRows = effectiveItems.map((item) => {
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : undefined;
    const order = orderById.get(item.order_id);

    return {
      ...item,
      product,
      packageLabel: order ? packageLabelByProvider.get(order.provider) ?? 'Package' : 'Package',
      sizeGuideSnapshot: snapshotsByVariantId.get(item.product_variant_id) ?? null,
    };
  });

  const itemsHtml = itemRows
    .map((item) => {
      const productName = item.product?.name ?? 'Your item';
      const shopUrl = item.product?.slug ? productUrl(item.product.slug) : '';
      const baseGarmentName = item.sizeGuideSnapshot?.base_garment_name
        ? sanitizeCustomerGarmentText(
            item.sizeGuideSnapshot.base_garment_name,
            item.sizeGuideSnapshot.base_garment_provider_identifier ?? ''
          )
        : '';

      return `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(productName)}</strong><br />
          ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#0f6f7c;">View product</a><br />` : ''}
          ${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.effectiveQuantity}<br />
          ${
            item.sizeGuideSnapshot
              ? `${escapeHtml(formatSizeGuideMeasurements(item.sizeGuideSnapshot.measurements, item.sizeGuideSnapshot.size_guide_unit))}<br />${baseGarmentName ? `Garment: ${escapeHtml(baseGarmentName)}<br />` : ''}Tolerance: ${escapeHtml(item.sizeGuideSnapshot.tolerance)}<br />`
              : ''
          }
          ${escapeHtml(item.packageLabel)}
        </li>
      `;
    })
    .join('');

  const textItems = itemRows.map((item) => {
    const productName = item.product?.name ?? 'Your item';
    const baseGarmentName = item.sizeGuideSnapshot?.base_garment_name
      ? sanitizeCustomerGarmentText(
          item.sizeGuideSnapshot.base_garment_name,
          item.sizeGuideSnapshot.base_garment_provider_identifier ?? ''
        )
      : '';
    const measurements = item.sizeGuideSnapshot
      ? ` — ${formatSizeGuideMeasurements(
          item.sizeGuideSnapshot.measurements,
          item.sizeGuideSnapshot.size_guide_unit
        )}${
          baseGarmentName
            ? ` — Garment: ${baseGarmentName}`
            : ''
        } — Tolerance: ${item.sizeGuideSnapshot.tolerance}`
      : '';
    const shopUrl = item.product?.slug ? productUrl(item.product.slug) : '';
    return [
      `- ${productName} — ${item.color} / ${item.size} — qty ${item.effectiveQuantity}${measurements} — ${item.packageLabel}`,
      shopUrl ? `  Product page: ${shopUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">Thank you for your order. I received your payment of <strong>${escapeHtml(formatMoney(totalCents, currency))}</strong>.</p>
    <p style="margin:0 0 16px;">Your order number is <strong>${escapeHtml(customerOrderNumber)}</strong>. Please use that number if you write to me about this order.</p>
    ${paymentBreakdownHtml(breakdown)}
    <p style="margin:0 0 16px;">This is made-to-order merch, so the next step is getting your item made before it ships. I’ll send another note when production is confirmed, and another one when it’s on the way.</p>
    <p style="margin:0 0 16px;">You accepted the made-to-order return policy at checkout. Size changes, color changes, and buyer’s remorse are final sale when the item was made correctly. If the garment arrives outside the published garment measurements beyond the stated tolerance, that is treated as a defect and is covered. <a href="${escapeHtml(policyUrl)}" style="color:#0f6f7c;">View the What Katie Seas return policy (${escapeHtml(policyVersion)})</a>.</p>
    ${providerPolicyHtml ? `<h2 style="margin:24px 0 8px;font-size:18px;">Order issue and claim terms</h2><ul style="padding-left:20px;margin:0 0 16px;">${providerPolicyHtml}</ul>` : ''}
    ${
      hasMultipleShipments
        ? '<p style="margin:0 0 16px;">A quick note: your order will arrive in separate packages, which may arrive at different times.</p>'
        : ''
    }
    ${
      hasOnHoldOrder
        ? '<p style="margin:0 0 16px;"><strong>One thing needs attention before I can send it out:</strong> I need your shipping address. Your payment is received, but I won’t start fulfillment until I have the right address.</p>'
        : ''
    }
    <h2 style="margin:24px 0 8px;font-size:18px;">What you ordered</h2>
    <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Your order items are being confirmed.</li>'}</ul>
    ${
      hasOnHoldOrder
        ? `
          <h2 style="margin:24px 0 8px;font-size:18px;">Please reply with your shipping address</h2>
          <p style="margin:0 0 10px;">Just reply to this email with:</p>
          <ul style="padding-left:20px;margin:0 0 16px;">
            <li>Full name</li>
            <li>Street address</li>
            <li>Apartment/unit, if any</li>
            <li>City, state, ZIP code</li>
            <li>Country</li>
          </ul>
        `
        : `
          <h2 style="margin:24px 0 8px;font-size:18px;">Shipping to</h2>
          <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(address)}</pre>
          <p style="margin:0 0 16px;">If anything looks wrong, just reply to this email and I’ll help fix it quickly.</p>
        `
    }
    <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
    <p style="margin:0 0 24px;">Katie</p>
  `;

  const html = buildNewsletterEmailLayout({
    preview: `I received your What Katie Seas order.`,
    bodyHtml,
    footerHtml: `
      <p style="margin:0;">You’re receiving this because you placed an order on What Katie Seas.</p>
      <p style="margin:8px 0 0;">Need help? Reply to this email.</p>
    `,
  });

  const text = [
    'Hi,',
    '',
    `Thank you for your order. I received your payment of ${formatMoney(totalCents, currency)}.`,
    '',
    `Your order number is ${customerOrderNumber}. Please use that number if you write to me about this order.`,
    '',
    ...paymentBreakdownText(breakdown),
    '',
    "This is made-to-order merch, so the next step is getting your item made before it ships. I'll send another note when production is confirmed, and another one when it's on the way.",
    '',
    `You accepted the made-to-order return policy at checkout. Size changes, color changes, and buyer's remorse are final sale when the item was made correctly. If the garment arrives outside the published garment measurements beyond the stated tolerance, that is treated as a defect and is covered. What Katie Seas return policy: ${policyVersion} (${policyUrl}).`,
    providerPolicyText.length > 0 ? '' : '',
    providerPolicyText.length > 0 ? 'Order issue and claim terms:' : '',
    ...providerPolicyText,
    '',
    hasMultipleShipments
      ? 'Your order will arrive in separate packages, which may arrive at different times.'
      : '',
    hasOnHoldOrder
      ? "One thing needs attention before I can send it out: I need your shipping address. Your payment is received, but I won't start fulfillment until I have the right address."
      : '',
    '',
    'What you ordered:',
    ...textItems,
    '',
    hasOnHoldOrder ? 'Please reply with your shipping address:' : 'Shipping to:',
    hasOnHoldOrder
      ? 'Full name, street address, apartment/unit if any, city, state, ZIP code, and country.'
      : address,
    '',
    hasOnHoldOrder
      ? 'Reply to this email with those details and I will take it from there.'
      : "If anything looks wrong, just reply to this email and I'll help fix it quickly.",
    '',
    helpText,
    '',
    'Katie',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    to: customerEmail,
    subject: `I received your What Katie Seas order ${customerOrderNumber}`,
    html,
    text,
  };
}

async function sendCustomerOrderConfirmation(orderIds: string[]) {
  const email = await buildCustomerOrderConfirmation(orderIds);

  const result = await sendResendEmail({
    ...email,
    replyTo: getNewsletterReplyToEmail(),
  });

  const resendEmailId =
    result && typeof result === 'object' && 'id' in result ? String(result.id) : null;

  return {
    recipientEmail: String(email.to),
    subject: email.subject,
    resendEmailId,
  };
}

async function sendCustomerPaymentReviewNotice({
  orderIds,
  customerEmail,
  customerOrderNumber,
  amountTotalCents,
  currency,
}: {
  orderIds: string[];
  customerEmail: string;
  customerOrderNumber: string;
  amountTotalCents?: number | null;
  currency?: string | null;
}) {
  if (!customerEmail) {
    throw new Error('Customer email is missing.');
  }

  const supportEmail = getNewsletterReplyToEmail();
  const amountText =
    typeof amountTotalCents === 'number'
      ? ` of ${formatMoney(amountTotalCents, currency || 'USD')}`
      : '';
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">I received your payment${escapeHtml(amountText)} for order <strong>${escapeHtml(customerOrderNumber)}</strong>.</p>
    <p style="margin:0 0 16px;">One part of the order needs a manual review before I can confirm fulfillment. I’m checking it from my side and will follow up by email with the next step.</p>
    <p style="margin:0 0 16px;">You do not need to place the order again. If you have any questions, reply to this email or write to <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0f6f7c;">${escapeHtml(supportEmail)}</a> and include your order number.</p>
    <p style="margin:0 0 24px;">Katie</p>
  `;

  const html = buildNewsletterEmailLayout({
    preview: `I received your What Katie Seas payment and I’m reviewing your order.`,
    bodyHtml,
    footerHtml: `
      <p style="margin:0;">You’re receiving this because you placed an order on What Katie Seas.</p>
      <p style="margin:8px 0 0;">Need help? Reply to this email.</p>
    `,
  });
  const text = [
    'Hi,',
    '',
    `I received your payment${amountText} for order ${customerOrderNumber}.`,
    '',
    'One part of the order needs a manual review before I can confirm fulfillment. I’m checking it from my side and will follow up by email with the next step.',
    '',
    `You do not need to place the order again. If you have any questions, reply to this email or write to ${supportEmail} and include your order number.`,
    '',
    'Katie',
  ].join('\n');

  const subject = `I received your What Katie Seas payment for ${customerOrderNumber}`;
  const result = await sendResendEmail({
    to: customerEmail,
    subject,
    html,
    text,
    replyTo: supportEmail,
  });
  const resendEmailId =
    result && typeof result === 'object' && 'id' in result ? String(result.id) : null;

  return {
    orderIds,
    recipientEmail: customerEmail,
    subject,
    resendEmailId,
  };
}

async function recordCustomerNotificationForOrders({
  orderIds,
  notificationType,
  status,
  recipientEmail,
  subject,
  resendEmailId,
  errorMessage,
}: {
  orderIds: string[];
  notificationType: string;
  status: 'sent' | 'failed';
  recipientEmail: string;
  subject: string;
  resendEmailId?: string | null;
  errorMessage?: string;
}) {
  if (!supabaseAdmin || orderIds.length === 0) return;

  const { error } = await supabaseAdmin.from('order_customer_notifications').insert(
    orderIds.map((orderId) => ({
      order_id: orderId,
      notification_type: notificationType,
      status,
      recipient_email: recipientEmail,
      subject,
      resend_email_id: resendEmailId ?? null,
      error_message: errorMessage ?? '',
    }))
  );

  if (error) {
    warnShopWebhook('customer_notification_record_failed', {
      orderIds,
      notificationType,
      status,
      reason: error.message,
    });
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get('stripe-signature');

  if (!webhookSecret) {
    warnShopWebhook('missing_webhook_secret');
    return NextResponse.json({ error: 'Stripe shop webhook is not configured.' }, { status: 500 });
  }

  if (!supabaseAdmin) {
    warnShopWebhook('missing_supabase_admin');
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  if (!signatureHeader) {
    warnShopWebhook('missing_signature_header');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  // Stripe signature verification must use the raw body. Do not call request.json() here.
  const payload = await request.text();
  const isValidSignature = verifyStripeSignature({
    payload,
    signatureHeader,
    webhookSecret,
  });

  if (!isValidSignature) {
    warnShopWebhook('invalid_signature');
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    warnShopWebhook('invalid_json_payload');
    return NextResponse.json({ error: 'Invalid Stripe payload.' }, { status: 400 });
  }

  // Una sesión de Checkout expira a las 24 h. Sin este manejo la orden queda en
  // `pending` para siempre y a las 2 h empieza a contar como "requiere atención",
  // así que cada carrito abandonado se vuelve una alerta permanente y el aviso
  // pierde sentido justo cuando hace falta que signifique algo.
  if (event.type === 'checkout.session.expired') {
    const expiredSession = event.data.object;

    if (!isCheckoutSession(expiredSession) || expiredSession.metadata?.source !== 'shop') {
      logShopWebhook('ignored_expired_non_shop_session', { eventId: event.id });
      return NextResponse.json({ received: true, ignored: true });
    }

    // Nunca cancelar algo que se pagó. Stripe puede emitir `expired` en carreras
    // raras, y perder una orden pagada es mucho peor que dejar una alerta de más.
    if (expiredSession.payment_status === 'paid') {
      warnShopWebhook('expired_session_was_paid', {
        eventId: event.id,
        sessionId: expiredSession.id,
      });
      return NextResponse.json({ received: true, ignored: true });
    }

    const expiredOrderIds = parseOrderIds(expiredSession.metadata?.order_ids);
    if (expiredOrderIds.length === 0) {
      logShopWebhook('ignored_expired_without_order_ids', {
        eventId: event.id,
        sessionId: expiredSession.id,
      });
      return NextResponse.json({ received: true, ignored: true });
    }

    // El filtro por `pending` hace la operación idempotente: si el barrido de
    // checkout ya la cerró, o si Stripe reintenta el evento, no pisa nada.
    const { data: canceledOrders, error: cancelError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'canceled',
        cancellation_reason: `Stripe Checkout session ${expiredSession.id} expired without payment.`,
      })
      .in('id', expiredOrderIds)
      .eq('status', 'pending')
      .select('id');

    if (cancelError) {
      warnShopWebhook('expired_session_cancel_failed', {
        eventId: event.id,
        sessionId: expiredSession.id,
        reason: cancelError.message,
      });
      return NextResponse.json({ error: 'Unable to cancel expired orders.' }, { status: 500 });
    }

    logShopWebhook('expired_session_orders_canceled', {
      eventId: event.id,
      sessionId: expiredSession.id,
      canceledCount: (canceledOrders ?? []).length,
    });
    return NextResponse.json({ received: true, canceled: (canceledOrders ?? []).length });
  }

  if (event.type !== 'checkout.session.completed') {
    logShopWebhook('ignored_event_type', {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data.object;
  if (!isCheckoutSession(session)) {
    logShopWebhook('ignored_non_checkout_session', {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  if (session.metadata?.source !== 'shop') {
    logShopWebhook('ignored_metadata_source', {
      eventId: event.id,
      eventType: event.type,
      sessionId: session.id,
      metadataSource: session.metadata?.source,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  if (session.payment_status !== 'paid') {
    logShopWebhook('ignored_payment_status', {
      eventId: event.id,
      eventType: event.type,
      sessionId: session.id,
      paymentStatus: session.payment_status ?? 'missing',
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderIds = parseOrderIds(session.metadata?.order_ids);
  if (orderIds.length === 0) {
    warnShopWebhook('missing_order_ids', {
      eventId: event.id,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'Missing shop order ids.' }, { status: 400 });
  }

  const { data: existingEvent, error: existingEventError } = await supabaseAdmin
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existingEventError) {
    warnShopWebhook('idempotency_check_failed', {
      eventId: event.id,
      sessionId: session.id,
    });
    return NextResponse.json({ error: 'Unable to check webhook idempotency.' }, { status: 500 });
  }

  if (existingEvent) {
    logShopWebhook('duplicate_event_ignored', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  const shippingDetails = getShippingDetails(session);
  const shippingAddress = shippingDetails.address;
  const missingShippingFields = getMissingShippingFields(shippingAddress);
  const hasDispatchableShippingAddress = missingShippingFields.length === 0;
  const customerEmail = session.customer_details?.email || session.customer_email || '';
  const shippingName = shippingDetails.name || session.customer_details?.name || '';
  const paymentIntentId = getPaymentIntentId(session);
  const sessionId = session.id;
  const termsAccepted = session.consent?.terms_of_service === 'accepted';
  const termsAcceptedAt = termsAccepted
    ? new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
    : null;

  logShopWebhook('shipping_details_source_selected', {
    eventId: event.id,
    sessionId: session.id,
    shippingSource: shippingDetails.source,
    hasDispatchableShippingAddress,
    missingShippingFields,
  });

  if (!hasDispatchableShippingAddress) {
    warnShopWebhook('missing_dispatchable_shipping_address', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
      shippingSource: shippingDetails.source,
      missingShippingFields,
    });
  }

  const { data: ordersForWebhookData, error: ordersForWebhookError } = await supabaseAdmin
    .from('orders')
    .select('id,customer_order_number,provider,status,discount_code_id,marketing_campaign_id')
    .in('id', orderIds);

  if (ordersForWebhookError) {
    warnShopWebhook('load_orders_for_provider_split_failed', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
    });
    return NextResponse.json({ error: 'Unable to load shop orders.' }, { status: 500 });
  }

  const ordersForWebhook = (ordersForWebhookData ?? []) as ShopOrderForWebhook[];
  if (ordersForWebhook.length !== orderIds.length) {
    warnShopWebhook('order_ids_not_found', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
      foundOrders: ordersForWebhook.length,
    });
    return NextResponse.json({ error: 'Unable to find all shop orders.' }, { status: 404 });
  }

  const metadataDiscountCodeId = session.metadata?.discount_code_id ?? null;
  const metadataCampaignId = session.metadata?.marketing_campaign_id ?? null;
  const orderDiscountCodeIds = [
    ...new Set(ordersForWebhook.map((order) => order.discount_code_id).filter(Boolean)),
  ];
  const orderCampaignIds = [
    ...new Set(ordersForWebhook.map((order) => order.marketing_campaign_id).filter(Boolean)),
  ];
  const hasPromotionEvidence = Boolean(
    metadataDiscountCodeId || metadataCampaignId || orderDiscountCodeIds.length || orderCampaignIds.length
  );

  if (hasPromotionEvidence) {
    const promotionMatchesOrders =
      Boolean(metadataDiscountCodeId) &&
      Boolean(metadataCampaignId) &&
      orderDiscountCodeIds.length === 1 &&
      orderDiscountCodeIds[0] === metadataDiscountCodeId &&
      orderCampaignIds.length === 1 &&
      orderCampaignIds[0] === metadataCampaignId;

    if (!promotionMatchesOrders) {
      await Promise.all(
        ordersForWebhook.map((order) =>
          recordOrderOperationalIncidentOnce({
            orderId: order.id,
            incidentType: 'paid_checkout_promotion_mismatch',
            reason:
              'Stripe confirmed payment, but the promotion metadata does not match the frozen order. The payment and fulfillment continue. Next step: verify the discount in Stripe and this order, then mark the code as used manually if needed before issuing any replacement code.',
            metadata: {
              severity: 'high',
              stripe_session_id: session.id,
              stripe_event_id: event.id,
              metadata_discount_code_id: metadataDiscountCodeId,
              order_discount_code_id: order.discount_code_id ?? null,
            },
          })
        )
      );
      warnShopWebhook('paid_checkout_promotion_mismatch', {
        eventId: event.id,
        sessionId: session.id,
        orderIds,
      });
    } else {
      const customerOrderNumber = formatCustomerOrderNumbers(ordersForWebhook);
      const { data: redemptionStatus, error: redemptionError } = await supabaseAdmin.rpc(
        'redeem_shop_discount_code',
        {
          requested_discount_code_id: metadataDiscountCodeId,
          requested_stripe_session_id: session.id,
          requested_customer_order_number: customerOrderNumber,
        }
      );

      if (redemptionError) {
        warnShopWebhook('promotion_redemption_database_failed', {
          eventId: event.id,
          sessionId: session.id,
          orderIds,
          reason: redemptionError.message,
        });
        return NextResponse.json({ error: 'Unable to redeem promotion code.' }, { status: 500 });
      }

      if (
        redemptionStatus === 'redeemed' ||
        redemptionStatus === 'redeemed_after_session_mismatch' ||
        redemptionStatus === 'already_redeemed_same_session'
      ) {
        logShopWebhook('promotion_redeemed', {
          eventId: event.id,
          sessionId: session.id,
          orderIds,
          redemptionStatus,
        });
        if (redemptionStatus === 'redeemed_after_session_mismatch') {
          await Promise.all(
            ordersForWebhook.map((order) =>
              recordOrderOperationalIncidentOnce({
                orderId: order.id,
                incidentType: 'paid_checkout_promotion_session_reconciled',
                reason:
                  'Stripe confirmed payment, but the discount code had a different checkout session attached. The paid session was treated as authoritative and the code was consumed so it cannot be reused. Next step: compare the two Stripe sessions and confirm the other session did not also collect payment.',
                metadata: {
                  severity: 'high',
                  stripe_session_id: session.id,
                  stripe_event_id: event.id,
                  discount_code_id: metadataDiscountCodeId,
                },
              })
            )
          );
        }
      } else {
        await Promise.all(
          ordersForWebhook.map((order) =>
            recordOrderOperationalIncidentOnce({
              orderId: order.id,
              incidentType: 'paid_checkout_promotion_redemption_failed',
              reason:
                'Stripe confirmed payment with a discount, but its one-use code could not be marked as redeemed. Fulfillment continues. Next step: verify this session in Stripe and prevent the discount code from being reused before issuing any replacement.',
              metadata: {
                severity: 'high',
                stripe_session_id: session.id,
                stripe_event_id: event.id,
                discount_code_id: metadataDiscountCodeId,
                redemption_status: String(redemptionStatus),
              },
            })
          )
        );
        warnShopWebhook('promotion_redemption_permanent_mismatch', {
          eventId: event.id,
          sessionId: session.id,
          orderIds,
          redemptionStatus: String(redemptionStatus),
        });
      }
    }
  }

  const providerCodes = [...new Set(ordersForWebhook.map((order) => order.provider))];
  const { data: providersData, error: providersError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('code,name,fulfillment_mode,contact_email,contact_url,contact_notes')
    .in('code', providerCodes);

  if (providersError) {
    warnShopWebhook('load_providers_for_order_split_failed', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
    });
    return NextResponse.json({ error: 'Unable to load fulfillment providers.' }, { status: 500 });
  }

  const providersByCode = new Map(
    ((providersData ?? []) as EcommerceProviderForWebhook[]).map((provider) => [
      provider.code,
      provider,
    ])
  );
  const missingProviderCodes = providerCodes.filter((code) => !providersByCode.has(code));

  if (missingProviderCodes.length > 0) {
    warnShopWebhook('missing_order_provider_records', {
      eventId: event.id,
      sessionId: session.id,
      orderIds,
      providerCodes: missingProviderCodes,
    });
    return NextResponse.json({ error: 'Unable to validate fulfillment providers.' }, { status: 500 });
  }

  const manualOrderIds = hasDispatchableShippingAddress
    ? ordersForWebhook
        .filter((order) => providersByCode.get(order.provider)?.fulfillment_mode === 'manual')
        .map((order) => order.id)
    : [];
  const apiOrderIds = hasDispatchableShippingAddress
    ? ordersForWebhook
        .filter((order) => providersByCode.get(order.provider)?.fulfillment_mode !== 'manual')
        .map((order) => order.id)
    : [];

  const orderUpdate = {
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      terms_accepted: termsAccepted,
      terms_accepted_at: termsAcceptedAt,
      customer_email: customerEmail,
      shipping_name: shippingName,
      shipping_address1: shippingAddress?.line1 ?? '',
      shipping_address2: shippingAddress?.line2 ?? '',
      shipping_city: shippingAddress?.city ?? '',
      shipping_state_code: shippingAddress?.state ?? '',
      shipping_zip: shippingAddress?.postal_code ?? '',
      shipping_country_code: shippingAddress?.country ?? 'US',
  };

  async function updateOrdersStatus(ids: string[], status: string) {
    if (ids.length === 0) {
      return {
        error: null,
        updatedOrAlreadyHandledIds: [] as string[],
        mismatchedIds: [] as string[],
      };
    }

    const { data, error } = await supabaseAdmin!
      .from('orders')
      .update({
        ...orderUpdate,
        status,
      })
      .in('id', ids)
      .eq('status', 'pending')
      .select('id,status');

    if (error) {
      return {
        error,
        updatedOrAlreadyHandledIds: [] as string[],
        mismatchedIds: [] as string[],
      };
    }

    const updatedIds = new Set(((data ?? []) as Array<{ id: string }>).map((order) => order.id));
    const alreadyHandledIds = new Set(
      ordersForWebhook
        .filter(
          (order) =>
            ids.includes(order.id) &&
            (order.status === status || POST_PAYMENT_WEBHOOK_STATUSES.has(order.status))
        )
        .map((order) => order.id)
    );
    const updatedOrAlreadyHandledIds = ids.filter(
      (id) => updatedIds.has(id) || alreadyHandledIds.has(id)
    );
    const mismatchedIds = ids.filter((id) => !updatedIds.has(id) && !alreadyHandledIds.has(id));

    if (mismatchedIds.length > 0) {
      await Promise.all(
        mismatchedIds.map((orderId) => {
          const order = ordersForWebhook.find((candidate) => candidate.id === orderId);
          return recordOrderOperationalIncidentOnce({
            orderId,
            incidentType: 'paid_webhook_order_update_mismatch',
            reason:
              'Stripe confirmed payment, but this order was no longer pending, so the webhook could not move it to the expected post-payment status. Next step: compare this order against the Stripe payment, then either restore it to the correct paid/on-hold fulfillment state or issue a refund before contacting the customer.',
            metadata: {
              severity: 'high',
              stripe_session_id: sessionId,
              stripe_event_id: event.id,
              expected_status: status,
              current_status_at_webhook_start: order?.status ?? null,
              customer_order_number: order?.customer_order_number ?? null,
            },
          });
        })
      );
      warnShopWebhook('paid_webhook_order_update_mismatch', {
        eventId: event.id,
        sessionId,
        orderIds: mismatchedIds,
        expectedStatus: status,
      });
    }

    return {
      error: null,
      updatedOrAlreadyHandledIds,
      mismatchedIds,
    };
  }

  const onHoldUpdateError = hasDispatchableShippingAddress
    ? { error: null, updatedOrAlreadyHandledIds: [] as string[], mismatchedIds: [] as string[] }
    : await updateOrdersStatus(orderIds, 'on_hold');
  const paidUpdateError = await updateOrdersStatus(apiOrderIds, 'paid');
  const manualUpdateError = await updateOrdersStatus(
    manualOrderIds,
    'awaiting_manual_fulfillment'
  );
  const updateError = onHoldUpdateError.error || paidUpdateError.error || manualUpdateError.error;
  const permanentlyMismatchedOrderIds = [
    ...onHoldUpdateError.mismatchedIds,
    ...paidUpdateError.mismatchedIds,
    ...manualUpdateError.mismatchedIds,
  ];
  const safeNotificationOrderIds = [
    ...onHoldUpdateError.updatedOrAlreadyHandledIds,
    ...paidUpdateError.updatedOrAlreadyHandledIds,
    ...manualUpdateError.updatedOrAlreadyHandledIds,
  ];
  const safeManualOrderIds = manualOrderIds.filter((orderId) =>
    safeNotificationOrderIds.includes(orderId)
  );
  const safeApiOrderIds = apiOrderIds.filter((orderId) => safeNotificationOrderIds.includes(orderId));

  if (updateError) {
    warnShopWebhook('mark_shop_orders_failed', {
      eventId: event.id,
      sessionId,
      orderIds,
    });
    return NextResponse.json({ error: 'Unable to update shop orders.' }, { status: 500 });
  }

  const { error: processedEventError } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({
      source: 'stripe',
      event_id: event.id,
    });

  if (processedEventError && processedEventError.code !== '23505') {
    warnShopWebhook('processed_event_record_failed', {
      eventId: event.id,
      sessionId,
      orderIds,
    });
    return NextResponse.json({ error: 'Unable to record processed webhook.' }, { status: 500 });
  }

  if (processedEventError?.code === '23505') {
    logShopWebhook('duplicate_event_after_order_update', {
      eventId: event.id,
      sessionId,
      orderIds,
    });
  } else {
    logShopWebhook('orders_status_updated', {
      eventId: event.id,
      sessionId,
      orderIds,
      paidOrderIds: safeApiOrderIds,
      awaitingManualFulfillmentOrderIds: safeManualOrderIds,
      onHoldOrderIds: hasDispatchableShippingAddress ? [] : safeNotificationOrderIds,
      mismatchedOrderIds: permanentlyMismatchedOrderIds,
    });
  }

  if (!processedEventError) {
    if (!termsAccepted && safeNotificationOrderIds.length > 0) {
      await Promise.all(
        safeNotificationOrderIds.map((orderId) =>
          recordOrderOperationalIncident({
            orderId,
            incidentType: 'missing_terms_consent',
            reason:
              'Stripe Checkout completed without terms_of_service consent marked as accepted. Fulfillment continued because the payment was already captured; keep this order in mind if a dispute happens.',
            metadata: {
              severity: 'high',
              stripe_session_id: sessionId,
              stripe_event_id: event.id,
              consent_terms_of_service: session.consent?.terms_of_service ?? null,
            },
          })
        )
      );
      warnShopWebhook('terms_consent_missing_after_payment', {
        eventId: event.id,
        sessionId,
        orderIds: safeNotificationOrderIds,
      });
    }

    if (safeNotificationOrderIds.length > 0) {
      try {
        const customerEmailResult = await sendCustomerOrderConfirmation(safeNotificationOrderIds);
        await recordCustomerNotificationForOrders({
          orderIds: safeNotificationOrderIds,
          notificationType: 'payment_received',
          status: 'sent',
          recipientEmail: customerEmailResult.recipientEmail,
          subject: customerEmailResult.subject,
          resendEmailId: customerEmailResult.resendEmailId,
        });
        logShopWebhook('customer_order_confirmation_sent', {
          eventId: event.id,
          sessionId,
          orderIds: safeNotificationOrderIds,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown customer order confirmation error.';
        await recordCustomerNotificationForOrders({
          orderIds: safeNotificationOrderIds,
          notificationType: 'payment_received',
          status: 'failed',
          recipientEmail: customerEmail,
          subject: 'I received your What Katie Seas order',
          errorMessage: message,
        });
        warnShopWebhook('customer_order_confirmation_failed', {
          eventId: event.id,
          sessionId,
          orderIds: safeNotificationOrderIds,
          reason: message,
        });
      }
    }

    if (permanentlyMismatchedOrderIds.length > 0) {
      const customerOrderNumber = formatCustomerOrderNumbers(
        ordersForWebhook.filter((order) => permanentlyMismatchedOrderIds.includes(order.id))
      );

      try {
        const reviewEmailResult = await sendCustomerPaymentReviewNotice({
          orderIds: permanentlyMismatchedOrderIds,
          customerEmail,
          customerOrderNumber,
          amountTotalCents: session.amount_total,
          currency: session.currency,
        });
        await recordCustomerNotificationForOrders({
          orderIds: permanentlyMismatchedOrderIds,
          notificationType: 'payment_received',
          status: 'sent',
          recipientEmail: reviewEmailResult.recipientEmail,
          subject: reviewEmailResult.subject,
          resendEmailId: reviewEmailResult.resendEmailId,
        });
        logShopWebhook('customer_payment_review_notice_sent', {
          eventId: event.id,
          sessionId,
          orderIds: permanentlyMismatchedOrderIds,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown customer payment review notice error.';
        await recordCustomerNotificationForOrders({
          orderIds: permanentlyMismatchedOrderIds,
          notificationType: 'payment_received',
          status: 'failed',
          recipientEmail: customerEmail,
          subject: 'I received your What Katie Seas payment',
          errorMessage: message,
        });
        warnShopWebhook('customer_payment_review_notice_failed', {
          eventId: event.id,
          sessionId,
          orderIds: permanentlyMismatchedOrderIds,
          reason: message,
        });
      }
    }
  }

  if (!processedEventError && safeManualOrderIds.length > 0) {
    const manualEmailResults = await Promise.allSettled(
      safeManualOrderIds.map((orderId) => sendManualOrderNotification(orderId))
    );

    manualEmailResults.forEach((result, index) => {
      const orderId = safeManualOrderIds[index];

      if (result.status === 'fulfilled') {
        logShopWebhook('manual_order_notification_sent', {
          eventId: event.id,
          sessionId,
          orderId,
        });
        return;
      }

      warnShopWebhook('manual_order_notification_failed', {
        eventId: event.id,
        sessionId,
        orderId,
        reason:
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown manual order notification error.',
      });
    });
  }

  if (!processedEventError && safeApiOrderIds.length > 0) {
    after(async () => {
      const results = await Promise.allSettled(
        safeApiOrderIds.map((orderId) => submitPrintfulOrder(orderId))
      );

      results.forEach((result, index) => {
        const orderId = safeApiOrderIds[index];

        if (result.status === 'rejected') {
          warnShopWebhook('api_order_fulfillment_after_failed', {
            eventId: event.id,
            sessionId,
            orderId,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : 'Unknown API fulfillment error.',
          });
        }
      });
    });
  }

  return NextResponse.json({
    received: true,
    paid: hasDispatchableShippingAddress && safeApiOrderIds.length > 0,
    awaitingManualFulfillment: safeManualOrderIds.length > 0,
    onHold: !hasDispatchableShippingAddress,
    needsManualReview: permanentlyMismatchedOrderIds.length > 0,
    orderIds,
  });
}
