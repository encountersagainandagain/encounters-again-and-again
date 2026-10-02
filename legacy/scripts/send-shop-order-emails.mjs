#!/usr/bin/env node
throw new Error('Archived source script. Adapt and authorize for Encounters before running.');

import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const orderId = process.argv[2];
const flags = new Set(process.argv.slice(3));
const customerOnly = flags.has('--customer-only');
const adminOnly = flags.has('--admin-only');

if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
  console.error('Usage: node scripts/send-shop-order-emails.mjs <order_id> [--customer-only|--admin-only]');
  process.exit(1);
}

if (customerOnly && adminOnly) {
  console.error('Use only one mode flag: --customer-only or --admin-only.');
  process.exit(1);
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.whatkatieseas.com').replace(
  /\/$/,
  ''
);
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
const replyToEmail =
  process.env.NEWSLETTER_REPLY_TO_EMAIL ||
  process.env.CONTACT_TO_EMAIL ||
  'whatkatieseas@gmail.com';
const manualOrderRecipient =
  process.env.MANUAL_ORDER_NOTIFICATION_EMAIL ||
  process.env.CONTACT_TO_EMAIL ||
  replyToEmail;

const requiredEnv = [
  ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
  ['RESEND_API_KEY', resendApiKey],
  ['NEWSLETTER_FROM_EMAIL or CONTACT_FROM_EMAIL', fromEmail],
];
const missingEnv = requiredEnv.filter(([, value]) => !value).map(([name]) => name);

if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(cents || 0) / 100);
}

function formatPaymentBreakdown(orders) {
  const currency = orders[0]?.currency || 'USD';
  const subtotalCents = orders.reduce((total, order) => total + Number(order.subtotal_cents || 0), 0);
  const shippingCents = orders.reduce((total, order) => total + Number(order.shipping_cents || 0), 0);
  const totalCents = orders.reduce((total, order) => total + Number(order.total_cents || 0), 0);

  return {
    subtotal: formatMoney(subtotalCents, currency),
    shipping: shippingCents > 0 ? formatMoney(shippingCents, currency) : 'Included in item price',
    total: formatMoney(totalCents, currency),
  };
}

function paymentBreakdownHtml(breakdown, title = 'Payment summary') {
  return `
    <h2 style="margin:24px 0 8px;font-size:18px;">${escapeHtml(title)}</h2>
    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      <tbody>
        <tr><td style="padding:6px 0;color:#5f6f72;">Items</td><td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(breakdown.subtotal)}</td></tr>
        <tr><td style="padding:6px 0;color:#5f6f72;">Shipping</td><td style="padding:6px 0;text-align:right;font-weight:700;">${escapeHtml(breakdown.shipping)}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #d6ebe8;font-weight:700;">Total paid</td><td style="padding:8px 0;border-top:1px solid #d6ebe8;text-align:right;font-weight:700;">${escapeHtml(breakdown.total)}</td></tr>
      </tbody>
    </table>
  `;
}

function paymentBreakdownText(breakdown) {
  return [
    'Payment summary:',
    `Items: ${breakdown.subtotal}`,
    `Shipping: ${breakdown.shipping}`,
    `Total paid: ${breakdown.total}`,
  ];
}

function getCustomerOrderNumber(order) {
  return order.customer_order_number || `WKS-${String(order.id).slice(0, 8).toUpperCase()}`;
}

function formatShippingAddress(order) {
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

function buildEmailLayout({ preview, bodyHtml, footerHtml = '' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(preview)}</title>
      </head>
      <body style="margin:0;background:#f4faf9;color:#111111;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
        <div style="max-width:620px;margin:0 auto;padding:34px 18px;">
          <div style="background:#ffffff;border:1px solid #d6ebe8;border-top:5px solid #0f6f7c;padding:28px 28px 0;">
            <p style="margin:0;color:#0f6f7c;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">What Katie Seas</p>
            <p style="margin:8px 0 28px;color:#5f7f82;font-size:13px;line-height:1.5;">Notes from the road and the water</p>
            <div style="color:#172121;font-size:16px;line-height:1.68;">
              ${bodyHtml}
            </div>
            ${
              footerHtml
                ? `<div style="margin:30px -28px 0;background:#eef8f7;border-top:1px solid #d6ebe8;padding:16px 28px;color:#5f6f72;font-size:12px;line-height:1.5;">${footerHtml}</div>`
                : ''
            }
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html, text }) {
  console.log(`Sending: ${subject}`);
  console.log(`  from: ${fromEmail}`);
  console.log(`  to:   ${Array.isArray(to) ? to.join(', ') : to}`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      reply_to: replyToEmail,
      subject,
      html,
      text,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`  failed: Resend ${response.status}`);
    console.error(JSON.stringify(payload, null, 2));
    throw new Error(`Resend ${response.status}: ${payload?.message || 'Unable to send email.'}`);
  }

  console.log(`  sent: ${payload?.id || 'no id returned'}`);
  return payload;
}

async function fetchOrderGroup(seedOrderId) {
  const { data: seedOrder, error: seedError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', seedOrderId)
    .single();

  if (seedError || !seedOrder) {
    throw new Error(`Unable to load order ${seedOrderId}: ${seedError?.message || 'not found'}`);
  }

  let ordersQuery = supabase.from('orders').select('*').order('created_at', { ascending: true });

  if (seedOrder.stripe_session_id) {
    ordersQuery = ordersQuery.eq('stripe_session_id', seedOrder.stripe_session_id);
  } else {
    ordersQuery = ordersQuery.eq('id', seedOrder.id);
  }

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) throw new Error(`Unable to load order group: ${ordersError.message}`);

  const orderIds = orders.map((order) => order.id);
  const providerCodes = [...new Set(orders.map((order) => order.provider))];

  const [providersResult, itemsResult] = await Promise.all([
    supabase.from('ecommerce_providers').select('*').in('code', providerCodes),
    supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true }),
  ]);

  if (providersResult.error) {
    throw new Error(`Unable to load providers: ${providersResult.error.message}`);
  }
  if (itemsResult.error) {
    throw new Error(`Unable to load order items: ${itemsResult.error.message}`);
  }

  const items = itemsResult.data ?? [];
  const variantIds = [...new Set(items.map((item) => item.product_variant_id))];
  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id,product_id')
    .in('id', variantIds);

  if (variantsError) throw new Error(`Unable to load variants: ${variantsError.message}`);

  const productIds = [...new Set((variants ?? []).map((variant) => variant.product_id))];
  const [productsResult, filesResult] = await Promise.all([
    supabase.from('products').select('id,name,slug').in('id', productIds),
    supabase
      .from('product_files')
      .select('product_id,placement,file_url,position')
      .in('product_id', productIds)
      .order('placement', { ascending: true })
      .order('position', { ascending: true }),
  ]);

  if (productsResult.error) {
    throw new Error(`Unable to load products: ${productsResult.error.message}`);
  }
  if (filesResult.error) {
    throw new Error(`Unable to load print files: ${filesResult.error.message}`);
  }

  return {
    seedOrder,
    orders,
    providers: providersResult.data ?? [],
    items,
    variants: variants ?? [],
    products: productsResult.data ?? [],
    files: filesResult.data ?? [],
  };
}

function indexGroup(group) {
  const ordersById = new Map(group.orders.map((order) => [order.id, order]));
  const providersByCode = new Map(group.providers.map((provider) => [provider.code, provider]));
  const variantsById = new Map(group.variants.map((variant) => [variant.id, variant]));
  const productsById = new Map(group.products.map((product) => [product.id, product]));
  const filesByProductId = new Map();

  group.files.forEach((file) => {
    filesByProductId.set(file.product_id, [...(filesByProductId.get(file.product_id) ?? []), file]);
  });

  return { ordersById, providersByCode, variantsById, productsById, filesByProductId };
}

function buildCustomerEmail(group) {
  const { ordersById, providersByCode, variantsById, productsById } = indexGroup(group);
  const firstOrder = group.orders[0];
  const customerEmail = group.orders.find((order) => order.customer_email)?.customer_email;

  if (!customerEmail) throw new Error('Customer email is missing on this order group.');

  const breakdown = formatPaymentBreakdown(group.orders);
  const totalCents = group.orders.reduce((total, order) => total + order.total_cents, 0);
  const currency = firstOrder.currency || 'USD';
  const providerCodes = [...new Set(group.orders.map((order) => order.provider))];
  const hasMultipleShipments = providerCodes.length > 1;
  const hasOnHoldOrder = group.orders.some((order) => order.status === 'on_hold');
  const address = formatShippingAddress(firstOrder);
  const customerOrderNumber = [
    ...new Set(group.orders.map((order) => getCustomerOrderNumber(order))),
  ].join(', ');

  const itemRows = group.items.map((item) => {
    const order = ordersById.get(item.order_id);
    const provider = order ? providersByCode.get(order.provider) : null;
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : null;

    return {
      ...item,
      product,
      providerName: provider?.name ?? order?.provider ?? 'Provider',
    };
  });

  const itemsHtml = itemRows
    .map((item) => {
      const productName = item.product?.name ?? 'Your item';
      const shopUrl = item.product?.slug ? `${SITE_URL}/shop/${item.product.slug}` : '';

      return `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(productName)}</strong><br />
          ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#0f6f7c;">View product</a><br />` : ''}
          ${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.quantity}<br />
          ${escapeHtml(item.providerName)}
        </li>
      `;
    })
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">Thank you for your order. I received your payment of <strong>${escapeHtml(formatMoney(totalCents, currency))}</strong>.</p>
    <p style="margin:0 0 16px;">Your order number is <strong>${escapeHtml(customerOrderNumber)}</strong>. Please use that number if you write to me about this order.</p>
    ${paymentBreakdownHtml(breakdown)}
    <p style="margin:0 0 16px;">This is print-on-demand merch, so the next step is getting the item made before it ships. I’ll send another note when the order is confirmed with the provider, and another one when it’s on the way.</p>
    ${
      hasMultipleShipments
        ? '<p style="margin:0 0 16px;">A quick note: your order includes items from more than one fulfillment provider, so they may arrive in separate packages and at different times.</p>'
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
    <p style="margin:0 0 24px;">Katie</p>
  `;

  const text = [
    'Hi,',
    '',
    `Thank you for your order. I received your payment of ${formatMoney(totalCents, currency)}.`,
    '',
    `Your order number is ${customerOrderNumber}. Please use that number if you write to me about this order.`,
    '',
    ...paymentBreakdownText(breakdown),
    '',
    "This is print-on-demand merch, so the next step is getting the item made before it ships. I'll send another note when the order is confirmed with the provider, and another one when it's on the way.",
    '',
    hasMultipleShipments
      ? 'Your order includes items from more than one fulfillment provider, so they may arrive in separate packages and at different times.'
      : '',
    hasOnHoldOrder
      ? "One thing needs attention before I can send it out: I need your shipping address. Your payment is received, but I won't start fulfillment until I have the right address."
      : '',
    '',
    'What you ordered:',
    ...itemRows.map((item) => {
      const shopUrl = item.product?.slug ? `${SITE_URL}/shop/${item.product.slug}` : '';
      return [
        `- ${item.product?.name ?? 'Your item'} — ${item.color} / ${item.size} — qty ${item.quantity} — ${item.providerName}`,
        shopUrl ? `  Product page: ${shopUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }),
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
    'Katie',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    to: customerEmail,
    subject: `I received your What Katie Seas order ${customerOrderNumber}`,
    html: buildEmailLayout({
      preview: 'I received your What Katie Seas order.',
      bodyHtml,
      footerHtml: `
        <p style="margin:0;">You’re receiving this because you placed an order on What Katie Seas.</p>
        <p style="margin:8px 0 0;">Need help? Reply to this email.</p>
      `,
    }),
    text,
  };
}

function buildManualEmail(order, group) {
  const { providersByCode, variantsById, productsById, filesByProductId } = indexGroup(group);
  const provider = providersByCode.get(order.provider);
  if (provider?.fulfillment_mode !== 'manual') return null;

  const address = formatShippingAddress(order);
  const customerOrderNumber = getCustomerOrderNumber(order);
  const orderItems = group.items.filter((item) => item.order_id === order.id);
  const orderUrl = `${SITE_URL}/admin/orders#order-${order.id}`;
  const breakdown = formatPaymentBreakdown([order]);
  const itemRows = orderItems.map((item) => {
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : null;

    return {
      ...item,
      product,
      files: variant ? filesByProductId.get(variant.product_id) ?? [] : [],
    };
  });

  const itemsHtml = itemRows
    .map((item) => {
      const shopUrl = item.product?.slug ? `${SITE_URL}/shop/${item.product.slug}` : '';

      return `
        <li style="margin:0 0 14px;">
          <strong>${escapeHtml(item.product?.name ?? 'Unknown product')}</strong><br />
          ${shopUrl ? `<a href="${escapeHtml(shopUrl)}" style="color:#0f6f7c;">View product</a><br />` : ''}
          Color: ${escapeHtml(item.color)} · Size: ${escapeHtml(item.size)} · Qty: ${item.quantity}<br />
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

  const contactHtml = [
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
        <title>Manual order needed: ${escapeHtml(provider.name)}</title>
      </head>
      <body style="margin:0;background:#f4faf9;color:#172121;font-family:Arial,sans-serif;font-size:16px;line-height:1.55;">
        <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
          <div style="background:#ffffff;border:1px solid #d6ebe8;border-top:5px solid #0f6f7c;padding:22px;">
            <p style="margin:0 0 8px;color:#0f6f7c;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Manual fulfillment needed</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Place this ${escapeHtml(provider.name)} order</h1>
            <p style="margin:0 0 16px;"><strong>Customer order number:</strong> ${escapeHtml(customerOrderNumber)}</p>
            <p style="margin:0 0 18px;"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#0f6f7c;color:#ffffff;padding:12px 16px;text-decoration:none;font-weight:700;">Open order in admin</a></p>
            <h2 style="margin:24px 0 8px;font-size:18px;">Ship to</h2>
            <pre style="margin:0 0 8px;white-space:pre-wrap;font-family:Arial,sans-serif;background:#eef8f7;padding:12px;">${escapeHtml(address || 'No shipping address saved.')}</pre>
            <p style="margin:0 0 16px;">Customer email: <a href="mailto:${escapeHtml(order.customer_email)}" style="color:#0f6f7c;">${escapeHtml(order.customer_email || 'missing')}</a></p>
            <h2 style="margin:24px 0 8px;font-size:18px;">Items</h2>
            <ul style="padding-left:20px;margin:0;">${itemsHtml || '<li>No items found.</li>'}</ul>
            ${paymentBreakdownHtml(breakdown, 'Customer payment')}
            <h2 style="margin:24px 0 8px;font-size:18px;">Print-ready files</h2>
            <ul style="padding-left:20px;margin:0;">${filesHtml || '<li>No print files found for this order.</li>'}</ul>
            <h2 style="margin:24px 0 8px;font-size:18px;">Provider contact</h2>
            <p style="margin:0 0 8px;"><strong>${escapeHtml(provider.name)}</strong> (${escapeHtml(provider.code)})</p>
            ${contactHtml || '<p style="margin:0 0 8px;">No provider contact details saved.</p>'}
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
      const shopUrl = item.product?.slug ? `${SITE_URL}/shop/${item.product.slug}` : '';
      return [
        `- ${item.product?.name ?? 'Unknown product'} — ${item.color} / ${item.size} — qty ${item.quantity}`,
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
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    to: manualOrderRecipient,
    subject: `Manual order needed: ${provider.name} (${customerOrderNumber})`,
    html,
    text,
  };
}

const group = await fetchOrderGroup(orderId);
const manualOrders = group.orders.filter((order) => {
  const provider = group.providers.find((item) => item.code === order.provider);
  return provider?.fulfillment_mode === 'manual';
});

console.log('Email configuration:');
console.log(`  RESEND_API_KEY: ${resendApiKey ? 'set' : 'missing'}`);
console.log(`  from: ${fromEmail}`);
console.log(`  reply-to: ${replyToEmail}`);
console.log(`  manual order recipient: ${manualOrderRecipient}`);
console.log('');
console.log('Order group:');
console.log(`  seed order: ${group.seedOrder.id}`);
console.log(`  stripe_session_id: ${group.seedOrder.stripe_session_id || 'missing'}`);
console.log(`  orders in group: ${group.orders.map((order) => `${order.id}:${order.provider}:${order.status}`).join(', ')}`);
console.log(`  manual orders: ${manualOrders.map((order) => order.id).join(', ') || 'none'}`);
console.log('');

try {
  if (!adminOnly) {
    await sendEmail(buildCustomerEmail(group));
  }

  if (!customerOnly) {
    for (const order of manualOrders) {
      const email = buildManualEmail(order, group);
      if (email) await sendEmail(email);
    }

    if (manualOrders.length === 0) {
      console.log('No manual-provider order found in this group; skipped Katie manual notification.');
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
