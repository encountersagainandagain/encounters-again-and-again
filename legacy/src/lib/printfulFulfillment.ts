import 'server-only';

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
  getCustomerOrderNumber,
} from '@/lib/ecommerceOrderIdentity';
import type { ProviderPolicySnapshot } from '@/lib/ecommerceProviderPolicy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { EcommerceOrderStatus } from '@/lib/ecommerceTypes';

type PrintfulOrderRecord = {
  id: string;
  customer_order_number?: string | null;
  status: EcommerceOrderStatus;
  provider: string;
  provider_order_id: string | null;
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

type ProviderRecord = {
  code: string;
  name: string;
  fulfillment_mode: 'api' | 'manual';
};

type OrderItemRecord = {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
};

type OrderRefundRecord = {
  order_item_id: string | null;
  amount_cents: number;
  quantity: number | null;
};

type ProductVariantRecord = {
  id: string;
  product_id: string;
  provider_variant_id: number | null;
};

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
};

type ProductFileRecord = {
  product_id: string;
  placement: string;
  file_url: string;
  provider_file_type: string;
  position: number;
};

type PrintfulNotificationItem = {
  productName: string;
  color: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
};

type PrintfulResponse = {
  code?: number;
  result?: {
    id?: number | string;
    external_id?: string;
    status?: string;
    costs?: Record<string, string | number | null | undefined>;
  };
  error?: {
    message?: string;
  };
};

type PrintfulOrderPayload = {
  external_id: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state_code?: string;
    country_code: string;
    zip: string;
    email?: string;
  };
  items: Array<{
    variant_id: number;
    quantity: number;
    retail_price: string;
    files: Array<{
      type: string;
      url: string;
    }>;
  }>;
  packing_slip: {
    store_name: string;
    email: string;
    message: string;
    custom_order_id: string;
  };
};

const PRINTFUL_API_BASE = 'https://api.printful.com';
const UUID_WITH_HYPHENS_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_WITHOUT_HYPHENS_PATTERN = /^[0-9a-f]{32}$/i;
const PRINTFUL_EXTERNAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const PRINTFUL_PACKING_SLIP_CUSTOM_ORDER_ID_MAX_LENGTH = 20;

export function getPrintfulExternalIdForOrderId(orderId: string) {
  if (!UUID_WITH_HYPHENS_PATTERN.test(orderId)) {
    throw new Error(`Order id ${orderId} is not a valid UUID.`);
  }

  // Printful order external_id is capped at 32 chars. A UUID with hyphens is 36 chars,
  // so we use the deterministic 32-char lowercase UUID form and can reconstruct it.
  return orderId.replaceAll('-', '').toLowerCase();
}

export function getOrderIdFromPrintfulExternalId(externalId: string) {
  const normalized = externalId.toLowerCase();
  if (!UUID_WITHOUT_HYPHENS_PATTERN.test(normalized)) return null;

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20),
  ].join('-');
}

export function getPrintfulPackingSlipOrderId({
  orderId,
  customerOrderNumber,
}: {
  orderId: string;
  customerOrderNumber?: string | null;
}) {
  if (
    customerOrderNumber &&
    /^WKS-[0-9]{4,}$/.test(customerOrderNumber) &&
    customerOrderNumber.length <= PRINTFUL_PACKING_SLIP_CUSTOM_ORDER_ID_MAX_LENGTH
  ) {
    return customerOrderNumber;
  }

  return `WKS-${getPrintfulExternalIdForOrderId(orderId).slice(0, 16)}`;
}

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function parseCostCents(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value !== 'string') return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function getPrintfulConfirmOrders() {
  return process.env.PRINTFUL_CONFIRM_ORDERS === 'true';
}

function requirePrintfulConfig() {
  const token = process.env.PRINTFUL_API_TOKEN;
  const storeId = process.env.PRINTFUL_STORE_ID;

  if (!token) throw new Error('PRINTFUL_API_TOKEN is not configured.');
  if (!storeId) throw new Error('PRINTFUL_STORE_ID is not configured.');

  return { token, storeId };
}

function formatShippingAddress(order: PrintfulOrderRecord) {
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

function getRequiredShippingFieldError(order: PrintfulOrderRecord) {
  const missing = [
    !order.shipping_name ? 'shipping name' : '',
    !order.shipping_address1 ? 'address line 1' : '',
    !order.shipping_city ? 'city' : '',
    !order.shipping_zip ? 'ZIP/postal code' : '',
    !order.shipping_country_code ? 'country code' : '',
  ].filter(Boolean);

  return missing.length > 0 ? `Missing dispatchable shipping fields: ${missing.join(', ')}.` : '';
}

function adminOrderUrl(orderId: string) {
  return `${getSiteUrl()}/admin/orders#order-${orderId}`;
}

function getPrintfulFileType(file: ProductFileRecord) {
  return file.provider_file_type && file.provider_file_type !== 'default'
    ? file.provider_file_type
    : file.placement;
}

function addRequiredStringError(errors: string[], field: string, value: string | undefined) {
  if (!value || value.trim().length === 0) {
    errors.push(`${field} is required.`);
  }
}

function validatePrintfulOrderPayload(payload: PrintfulOrderPayload) {
  const errors: string[] = [];

  addRequiredStringError(errors, 'external_id', payload.external_id);
  if (payload.external_id && !PRINTFUL_EXTERNAL_ID_PATTERN.test(payload.external_id)) {
    errors.push('external_id must be 1-32 characters and contain only Latin letters, numbers, dashes, or underscores.');
  }

  addRequiredStringError(errors, 'recipient.name', payload.recipient.name);
  addRequiredStringError(errors, 'recipient.address1', payload.recipient.address1);
  addRequiredStringError(errors, 'recipient.city', payload.recipient.city);
  addRequiredStringError(errors, 'recipient.country_code', payload.recipient.country_code);
  addRequiredStringError(errors, 'recipient.zip', payload.recipient.zip);

  if (!/^[A-Z]{2}$/.test(payload.recipient.country_code)) {
    errors.push('recipient.country_code must be a two-letter ISO 3166-1 alpha-2 code.');
  }
  if (payload.recipient.country_code === 'US' && !payload.recipient.state_code) {
    errors.push('recipient.state_code is required for US orders.');
  }
  if (payload.recipient.state_code && !/^[A-Z0-9-]{1,6}$/.test(payload.recipient.state_code)) {
    errors.push('recipient.state_code must be a short state/province code, not a full state name.');
  }
  if (payload.recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient.email)) {
    errors.push('recipient.email must be a valid email address.');
  }

  if (payload.items.length === 0) {
    errors.push('items must include at least one item.');
  }

  payload.items.forEach((item, itemIndex) => {
    const prefix = `items[${itemIndex}]`;
    if (!Number.isInteger(item.variant_id) || item.variant_id <= 0) {
      errors.push(`${prefix}.variant_id must be a positive integer.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      errors.push(`${prefix}.quantity must be an integer between 1 and 1000.`);
    }
    if (!/^\d+(\.\d{2})$/.test(item.retail_price)) {
      errors.push(`${prefix}.retail_price must be a decimal string like "32.00".`);
    }
    if (item.files.length === 0) {
      errors.push(`${prefix}.files must include at least one print file.`);
    }
    item.files.forEach((file, fileIndex) => {
      const filePrefix = `${prefix}.files[${fileIndex}]`;
      addRequiredStringError(errors, `${filePrefix}.url`, file.url);
      if (file.url && !/^https?:\/\//i.test(file.url)) {
        errors.push(`${filePrefix}.url must be an http(s) URL reachable by Printful.`);
      }
      addRequiredStringError(errors, `${filePrefix}.type`, file.type);
    });
  });

  addRequiredStringError(errors, 'packing_slip.email', payload.packing_slip.email);
  addRequiredStringError(errors, 'packing_slip.message', payload.packing_slip.message);
  addRequiredStringError(errors, 'packing_slip.store_name', payload.packing_slip.store_name);
  addRequiredStringError(errors, 'packing_slip.custom_order_id', payload.packing_slip.custom_order_id);
  if (
    payload.packing_slip.custom_order_id &&
    payload.packing_slip.custom_order_id.length > PRINTFUL_PACKING_SLIP_CUSTOM_ORDER_ID_MAX_LENGTH
  ) {
    errors.push(
      `packing_slip.custom_order_id must be at most ${PRINTFUL_PACKING_SLIP_CUSTOM_ORDER_ID_MAX_LENGTH} characters.`
    );
  }
  if (payload.packing_slip.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.packing_slip.email)) {
    errors.push('packing_slip.email must be a valid email address.');
  }

  if (errors.length > 0) {
    throw new Error(`Printful payload validation failed before API call: ${errors.join(' ')}`);
  }
}

async function markOrderFailure({
  orderId,
  message,
}: {
  orderId: string;
  message: string;
}) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'failed',
      provider_last_attempt_at: new Date().toISOString(),
      provider_last_error: message,
    })
    .eq('id', orderId)
    .is('provider_order_id', null);

  if (error) {
    console.error('[printful-fulfillment] failure_record_failed', {
      orderId,
      reason: error.message,
    });
  }
}

async function sendPrintfulFailureEmail({
  order,
  message,
}: {
  order: PrintfulOrderRecord;
  message: string;
}) {
  const recipient = getManualOrderNotificationEmail();
  const customerOrderNumber = getCustomerOrderNumber(order);
  const subject = `Printful order failed: ${customerOrderNumber}`;
  const orderUrl = adminOrderUrl(order.id);
  const html = buildNewsletterEmailLayout({
    preview: subject,
    bodyHtml: `
      <p style="margin:0 0 16px;">A paid Printful shop order could not be submitted automatically.</p>
      <p style="margin:0 0 16px;"><strong>Customer order number:</strong> ${escapeHtml(customerOrderNumber)}</p>
      <p style="margin:0 0 16px;"><strong>What happened:</strong> ${escapeHtml(message)}</p>
      <p style="margin:0 0 16px;">Katie already has the customer’s payment. Review the order, then either retry the Printful submission when the issue is fixed or refund the customer.</p>
      <p style="margin:0 0 18px;">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0f6f7c;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700;">Open order in admin</a>
      </p>
      <h2 style="margin:24px 0 8px;font-size:18px;">Ship to</h2>
      <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(formatShippingAddress(order) || 'No shipping address saved.')}</pre>
    `,
    footerHtml: `
      <p style="margin:0;">This is an internal What Katie Seas ecommerce alert.</p>
    `,
  });
  const text = [
    'A paid Printful shop order could not be submitted automatically.',
    '',
    `Customer order number: ${customerOrderNumber}`,
    '',
    `What happened: ${message}`,
    '',
    'Katie already has the customer payment. Review the order, then retry submission or refund the customer.',
    '',
    `Open order in admin: ${orderUrl}`,
    '',
    'Ship to:',
    formatShippingAddress(order) || 'No shipping address saved.',
  ].join('\n');

  try {
    await sendResendEmail({
      to: recipient,
      subject,
      html,
      text,
      replyTo: getNewsletterReplyToEmail(),
    });
  } catch (error) {
    console.error('[printful-fulfillment] failure_email_failed', {
      orderId: order.id,
      reason: error instanceof Error ? error.message : 'Unknown email error.',
    });
  }
}

async function recordCustomerNotification({
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
    console.warn('[printful-fulfillment] customer_notification_record_failed', {
      orderId,
      notificationType,
      status,
      reason: error.message,
    });
  }
}

function renderPrintfulNotificationItemsHtml({
  items,
  currency,
}: {
  items: PrintfulNotificationItem[];
  currency: string;
}) {
  return items
    .map(
      (item) => `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(item.productName)}</strong><br />
          ${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.quantity}<br />
          ${escapeHtml(formatMoney(item.unitPriceCents, currency))} each
        </li>
      `
    )
    .join('');
}

function renderPrintfulNotificationItemsText(items: PrintfulNotificationItem[]) {
  return items.map(
    (item) => `- ${item.productName} — ${item.color} / ${item.size} — qty ${item.quantity}`
  );
}

async function sendPrintfulSuccessAdminEmail({
  order,
  items,
  providerOrderId,
  providerCostCents,
  printfulStatus,
  confirm,
}: {
  order: PrintfulOrderRecord;
  items: PrintfulNotificationItem[];
  providerOrderId: string;
  providerCostCents: number;
  printfulStatus: string;
  confirm: boolean;
}) {
  const recipient = getManualOrderNotificationEmail();
  const orderUrl = adminOrderUrl(order.id);
  const customerOrderNumber = getCustomerOrderNumber(order);
  const subject = confirm
    ? `Printful order confirmed: ${customerOrderNumber}`
    : `Printful draft created: ${customerOrderNumber}`;
  const statusCopy = confirm
    ? 'Printful accepted the order and it was submitted for fulfillment.'
    : 'Printful accepted the order as a draft. This is safe test mode: Katie has not been charged by Printful and production has not started.';
  const itemsHtml = renderPrintfulNotificationItemsHtml({ items, currency: order.currency });
  const textItems = renderPrintfulNotificationItemsText(items);

  const html = buildNewsletterEmailLayout({
    preview: subject,
    bodyHtml: `
      <p style="margin:0 0 16px;">${escapeHtml(statusCopy)}</p>
      <div style="margin:0 0 18px;background:#eef8f7;padding:14px;">
        <p style="margin:0 0 6px;"><strong>Customer order number:</strong> ${escapeHtml(customerOrderNumber)}</p>
        <p style="margin:0 0 6px;"><strong>Internal order id:</strong> ${escapeHtml(order.id)}</p>
        <p style="margin:0 0 6px;"><strong>Printful order:</strong> ${escapeHtml(providerOrderId)}</p>
        <p style="margin:0 0 6px;"><strong>Printful status:</strong> ${escapeHtml(printfulStatus || 'unknown')}</p>
        <p style="margin:0;"><strong>Printful cost:</strong> ${escapeHtml(formatMoney(providerCostCents, order.currency))}</p>
      </div>
      <h2 style="margin:24px 0 8px;font-size:18px;">Items</h2>
      <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Order items.</li>'}</ul>
      <h2 style="margin:24px 0 8px;font-size:18px;">Ship to</h2>
      <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(formatShippingAddress(order) || 'No shipping address saved.')}</pre>
      <p style="margin:0 0 18px;">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0f6f7c;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700;">Open order in admin</a>
      </p>
    `,
    footerHtml: `
      <p style="margin:0;">This is an internal What Katie Seas ecommerce alert.</p>
    `,
  });
  const text = [
    statusCopy,
    '',
    `Customer order number: ${customerOrderNumber}`,
    `Internal order id: ${order.id}`,
    `Printful order: ${providerOrderId}`,
    `Printful status: ${printfulStatus || 'unknown'}`,
    `Printful cost: ${formatMoney(providerCostCents, order.currency)}`,
    '',
    'Items:',
    ...textItems,
    '',
    'Ship to:',
    formatShippingAddress(order) || 'No shipping address saved.',
    '',
    `Open order in admin: ${orderUrl}`,
  ].join('\n');

  try {
    await sendResendEmail({
      to: recipient,
      subject,
      html,
      text,
      replyTo: getNewsletterReplyToEmail(),
    });
  } catch (error) {
    console.error('[printful-fulfillment] success_admin_email_failed', {
      orderId: order.id,
      providerOrderId,
      reason: error instanceof Error ? error.message : 'Unknown email error.',
    });
  }
}

async function sendPrintfulSuccessCustomerEmail({
  order,
  items,
  providerOrderId,
}: {
  order: PrintfulOrderRecord;
  items: PrintfulNotificationItem[];
  providerOrderId: string;
}) {
  if (!order.customer_email) return;

  const customerOrderNumber = getCustomerOrderNumber(order);
  const subject = `Your What Katie Seas order ${customerOrderNumber} is confirmed`;
  const itemsHtml = renderPrintfulNotificationItemsHtml({ items, currency: order.currency });
  const textItems = renderPrintfulNotificationItemsText(items);
  const shippingAddress = formatShippingAddress(order);
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
  const html = buildNewsletterEmailLayout({
    preview: subject,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;">Quick update: production is confirmed and your order will be made for you. It has not shipped yet — I’ll send another note when it is on the way.</p>
      <p style="margin:0 0 16px;">Your order number is <strong>${escapeHtml(customerOrderNumber)}</strong>. Please use that number if you write to me about this order.</p>
      <h2 style="margin:24px 0 8px;font-size:18px;">What was confirmed</h2>
      <ul style="padding-left:20px;margin:0 0 16px;">${itemsHtml || '<li>Your order.</li>'}</ul>
      <h2 style="margin:24px 0 8px;font-size:18px;">Shipping to</h2>
      <pre style="margin:0 0 16px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(shippingAddress)}</pre>
      <div style="margin:24px 0 16px;background:#eef8f7;padding:14px;">${helpHtml}</div>
      <p style="margin:0 0 24px;">Katie</p>
    `,
    footerHtml: `
      <p style="margin:0;">You’re receiving this because you placed an order on What Katie Seas.</p>
      <p style="margin:8px 0 0;">Need help? Reply to this email.</p>
    `,
  });
  const text = [
    'Hi,',
    '',
    'Quick update: production is confirmed and your order will be made for you. It has not shipped yet — I’ll send another note when it is on the way.',
    '',
    `Your order number is ${customerOrderNumber}. Please use that number if you write to me about this order.`,
    '',
    'What was confirmed:',
    ...textItems,
    '',
    'Shipping to:',
    shippingAddress,
    '',
    helpText,
    '',
    'Katie',
  ].join('\n');

  try {
    const result = await sendResendEmail({
      to: order.customer_email,
      subject,
      html,
      text,
      replyTo: getNewsletterReplyToEmail(),
    });
    const resendEmailId =
      result && typeof result === 'object' && 'id' in result ? String(result.id) : null;

    await recordCustomerNotification({
      orderId: order.id,
      notificationType: 'api_provider_submitted',
      status: 'sent',
      recipientEmail: order.customer_email,
      subject,
      resendEmailId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error.';

    await recordCustomerNotification({
      orderId: order.id,
      notificationType: 'api_provider_submitted',
      status: 'failed',
      recipientEmail: order.customer_email,
      subject,
      errorMessage: message,
    });

    console.error('[printful-fulfillment] success_customer_email_failed', {
      orderId: order.id,
      providerOrderId,
      reason: message,
    });
  }
}

async function printfulRequest({
  path,
  method,
  body,
}: {
  path: string;
  method: string;
  body: unknown;
}) {
  const { token, storeId } = requirePrintfulConfig();
  const response = await fetch(`${PRINTFUL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-PF-Store-Id': storeId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  let payload: PrintfulResponse | null = null;

  try {
    payload = responseBody ? (JSON.parse(responseBody) as PrintfulResponse) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        responseBody ||
        `Printful request failed with status ${response.status}.`
    );
  }

  return payload;
}

async function buildPrintfulPayload(order: PrintfulOrderRecord) {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const shippingError = getRequiredShippingFieldError(order);
  if (shippingError) throw new Error(shippingError);

  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('id,product_variant_id,quantity,unit_price_cents,color,size')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error('Unable to load order items for Printful.');

  const items = (itemsData ?? []) as OrderItemRecord[];
  const { data: refundsData, error: refundsError } = await supabaseAdmin
    .from('order_refunds')
    .select('order_item_id,amount_cents,quantity')
    .eq('order_id', order.id);

  if (refundsError) throw new Error('Unable to load order refunds for Printful.');

  const effectiveOrder = getEffectiveOrderState({
    items,
    refunds: (refundsData ?? []) as OrderRefundRecord[],
    orderTotalCents: order.total_cents,
  });
  const effectiveItems = effectiveOrder.items.filter((item) => item.effectiveQuantity > 0);

  if (effectiveItems.length === 0) {
    return {
      hasItems: false,
      payload: null,
      notificationItems: [],
    };
  }

  const variantIds = [...new Set(effectiveItems.map((item) => item.product_variant_id))];
  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id,provider_variant_id')
    .in('id', variantIds);

  if (variantsError) throw new Error('Unable to load product variants for Printful.');

  const variants = (variantsData ?? []) as ProductVariantRecord[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  if (productIds.length === 0) {
    throw new Error('Unable to resolve products for Printful order items.');
  }

  const [productsResult, filesResult] = await Promise.all([
    supabaseAdmin.from('products').select('id,name,slug').in('id', productIds),
    supabaseAdmin
      .from('product_files')
      .select('product_id,placement,file_url,provider_file_type,position')
      .in('product_id', productIds)
      .order('placement', { ascending: true })
      .order('position', { ascending: true }),
  ]);

  if (productsResult.error) throw new Error('Unable to load products for Printful.');
  if (filesResult.error) throw new Error('Unable to load product print files for Printful.');

  const productsById = new Map(
    ((productsResult.data ?? []) as ProductRecord[]).map((product) => [product.id, product])
  );
  const filesByProductId = new Map<string, ProductFileRecord[]>();
  ((filesResult.data ?? []) as ProductFileRecord[]).forEach((file) => {
    filesByProductId.set(file.product_id, [...(filesByProductId.get(file.product_id) ?? []), file]);
  });

  const printfulExternalId = getPrintfulExternalIdForOrderId(order.id);
  const packingSlipOrderId = getPrintfulPackingSlipOrderId({
    orderId: order.id,
    customerOrderNumber: order.customer_order_number,
  });
  const notificationItems: PrintfulNotificationItem[] = [];
  const printfulItems = effectiveItems.map((item) => {
    const variant = variantsById.get(item.product_variant_id);
    if (!variant?.provider_variant_id) {
      throw new Error(`Missing Printful variant id for ${item.color} / ${item.size}.`);
    }
    const product = productsById.get(variant.product_id);

    const productFiles = filesByProductId.get(variant.product_id) ?? [];
    if (productFiles.length === 0) {
      throw new Error(`Missing print files for ${product?.name ?? 'product'} (${item.color} / ${item.size}).`);
    }

    notificationItems.push({
      productName: product?.name ?? 'Your item',
      color: item.color,
      size: item.size,
      quantity: item.effectiveQuantity,
      unitPriceCents: item.unit_price_cents,
    });

    return {
      variant_id: variant.provider_variant_id,
      quantity: item.effectiveQuantity,
      retail_price: centsToDollars(item.unit_price_cents),
      files: productFiles.map((file) => ({
        type: getPrintfulFileType(file),
        url: file.file_url,
      })),
    };
  });

  const payload: PrintfulOrderPayload = {
    external_id: printfulExternalId,
    recipient: {
      name: order.shipping_name,
      address1: order.shipping_address1,
      address2: order.shipping_address2 || undefined,
      city: order.shipping_city,
      state_code: order.shipping_state_code || undefined,
      country_code: order.shipping_country_code || 'US',
      zip: order.shipping_zip,
      email: order.customer_email || undefined,
    },
    items: printfulItems,
    packing_slip: {
      store_name: 'What Katie Seas',
      email: getNewsletterReplyToEmail(),
      message: 'Thank you so much for supporting What Katie Seas. I hope this piece brings a little ocean with you wherever you go.',
      custom_order_id: packingSlipOrderId,
    },
  };

  validatePrintfulOrderPayload(payload);

  return {
    hasItems: true,
    payload,
    notificationItems,
  };
}

export async function submitPrintfulOrder(orderId: string) {
  if (!supabaseAdmin) {
    console.error('[printful-fulfillment] missing_supabase_admin', { orderId });
    return;
  }

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    console.error('[printful-fulfillment] order_not_found', { orderId });
    return;
  }

  const order = orderData as PrintfulOrderRecord;

  if (order.provider_order_id) {
    console.info('[printful-fulfillment] provider_order_exists_skip', {
      orderId,
      providerOrderId: order.provider_order_id,
    });
    return;
  }

  const { data: providerData, error: providerError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('code,name,fulfillment_mode')
    .eq('code', order.provider)
    .single();

  if (providerError || !providerData) {
    await markOrderFailure({ orderId, message: 'Unable to validate fulfillment provider.' });
    await sendPrintfulFailureEmail({ order, message: 'Unable to validate fulfillment provider.' });
    return;
  }

  const provider = providerData as ProviderRecord;
  if (provider.fulfillment_mode !== 'api' || provider.code !== 'printful') {
    console.info('[printful-fulfillment] unsupported_provider_skip', {
      orderId,
      provider: provider.code,
      fulfillmentMode: provider.fulfillment_mode,
    });
    return;
  }

  if (!['paid', 'failed'].includes(order.status)) {
    console.info('[printful-fulfillment] status_skip', { orderId, status: order.status });
    return;
  }

  const now = new Date().toISOString();
  const { error: submittingError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'submitting',
      provider_last_attempt_at: now,
      provider_last_error: '',
    })
    .eq('id', orderId)
    .is('provider_order_id', null);

  if (submittingError) {
    console.error('[printful-fulfillment] mark_submitting_failed', {
      orderId,
      reason: submittingError.message,
    });
    return;
  }

  try {
    const { hasItems, payload, notificationItems } = await buildPrintfulPayload(order);

    if (!hasItems || !payload) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'canceled',
          provider_last_attempt_at: new Date().toISOString(),
          provider_last_error: 'No remaining items to submit after refunds.',
        })
        .eq('id', orderId)
        .is('provider_order_id', null);
      return;
    }

    const confirm = getPrintfulConfirmOrders();
    const printfulResponse = await printfulRequest({
      path: `/orders?confirm=${confirm ? 'true' : 'false'}`,
      method: 'POST',
      body: payload,
    });
    const result = printfulResponse?.result;
    const providerOrderId = result?.id ? String(result.id) : '';
    if (!providerOrderId) throw new Error('Printful did not return an order id.');

    const costs = result?.costs ?? {};
    const providerCostCents =
      parseCostCents(costs.total) ||
      parseCostCents(costs.subtotal) +
        parseCostCents(costs.shipping) +
        parseCostCents(costs.tax) +
        parseCostCents(costs.vat);
    const nextStatus: EcommerceOrderStatus =
      result?.status === 'inprocess' || result?.status === 'in_production'
        ? 'in_production'
        : 'submitted';
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: nextStatus,
        provider_order_id: providerOrderId,
        provider_cost_cents: providerCostCents,
        provider_submitted_at: new Date().toISOString(),
        provider_last_attempt_at: new Date().toISOString(),
        provider_last_error: '',
      })
      .eq('id', orderId)
      .is('provider_order_id', null);

    if (updateError) {
      throw new Error(
        `Printful order ${providerOrderId} was created, but local order update failed: ${updateError.message}. Do not retry blindly; reconcile this provider order id first.`
      );
    }

    console.info('[printful-fulfillment] submitted', {
      orderId,
      providerOrderId,
      confirm,
      printfulStatus: result?.status,
    });

    await sendPrintfulSuccessAdminEmail({
      order,
      items: notificationItems,
      providerOrderId,
      providerCostCents,
      printfulStatus: String(result?.status ?? ''),
      confirm,
    });

    if (confirm) {
      await sendPrintfulSuccessCustomerEmail({
        order,
        items: notificationItems,
        providerOrderId,
      });
    } else {
      console.info('[printful-fulfillment] customer_provider_confirmation_skipped_for_draft', {
        orderId,
        providerOrderId,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Printful submission error.';
    await markOrderFailure({ orderId, message });
    await sendPrintfulFailureEmail({ order, message });
    console.error('[printful-fulfillment] failed', {
      orderId,
      reason: message,
    });
  }
}
