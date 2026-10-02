import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import {
  buildNewsletterEmailLayout,
  escapeHtml,
  getManualOrderNotificationEmail,
  getNewsletterReplyToEmail,
  getSiteUrl,
  sendResendEmail,
} from '@/lib/email';
import { getCustomerOrderNumber } from '@/lib/ecommerceOrderIdentity';
import { MANUAL_FULFILLMENT_REMINDER_THRESHOLDS } from '@/lib/manualFulfillmentReminders';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type {
  EcommerceOrder,
  EcommerceOrderStatus,
  EcommerceProvider,
  OrderItem,
  OrderOperationalIncident,
} from '@/lib/ecommerceTypes';

export const runtime = 'nodejs';

const MANUAL_REMINDER_STATUSES: EcommerceOrderStatus[] = [
  'awaiting_manual_fulfillment',
  'submitted',
  'in_production',
];

type ReminderCandidate = EcommerceOrder & {
  providerRecord: EcommerceProvider;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Costa_Rica',
  }).format(new Date(value));
}

function getReminderStage(order: EcommerceOrder, now = Date.now()) {
  const ageMs = now - new Date(order.created_at).getTime();
  return (
    MANUAL_FULFILLMENT_REMINDER_THRESHOLDS.filter(
      (threshold) => threshold.statuses.includes(order.status) && ageMs >= threshold.ageMs
    ).at(-1) ?? null
  );
}

function formatOrderAddress(order: EcommerceOrder) {
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

function buildReminderEmail({
  order,
  items,
  stageLabel,
}: {
  order: ReminderCandidate;
  items: OrderItem[];
  stageLabel: string;
}) {
  const orderNumber = getCustomerOrderNumber(order);
  const adminUrl = `${getSiteUrl()}/admin/orders#order-${order.id}`;
  const itemLines = items.map(
    (item) => `${item.quantity} × ${item.color} / ${item.size} (${item.product_variant_id})`
  );

  const html = buildNewsletterEmailLayout({
    preview: `Manual order reminder: ${orderNumber}`,
    bodyHtml: `
      <p style="margin:0 0 8px;color:#0f6f7c;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Manual fulfillment reminder</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#111;">${escapeHtml(orderNumber)} needs attention</h1>
      <p style="margin:0 0 16px;">This manual-provider order is still <strong>${escapeHtml(order.status.replaceAll('_', ' '))}</strong> and has reached the ${escapeHtml(stageLabel)} reminder.</p>
      <p style="margin:0 0 16px;"><strong>Next step:</strong> open the order, place it with ${escapeHtml(order.providerRecord.name)} if it has not been placed yet, or add tracking and mark it shipped if the provider has already shipped it.</p>
      <p style="margin:0 0 16px;"><a href="${escapeHtml(adminUrl)}" style="color:#0f6f7c;text-decoration:underline;">Open this order in admin</a></p>
      <h2 style="margin:22px 0 8px;font-size:18px;">Items</h2>
      <ul style="margin:0 0 16px;padding-left:20px;">${itemLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      <h2 style="margin:22px 0 8px;font-size:18px;">Shipping address</h2>
      <pre style="white-space:pre-wrap;margin:0 0 16px;font-family:Arial,sans-serif;">${escapeHtml(formatOrderAddress(order) || 'No shipping address saved.')}</pre>
      <h2 style="margin:22px 0 8px;font-size:18px;">Provider</h2>
      <p style="margin:0 0 16px;">${escapeHtml(order.providerRecord.name)} · ${escapeHtml(order.providerRecord.contact_email || order.providerRecord.contact_url || order.providerRecord.contact_notes || 'No provider contact saved.')}</p>
    `,
  });

  const text = [
    `Manual fulfillment reminder: ${orderNumber}`,
    '',
    `This manual-provider order is still ${order.status.replaceAll('_', ' ')} and has reached the ${stageLabel} reminder.`,
    '',
    `Next step: open the order, place it with ${order.providerRecord.name} if it has not been placed yet, or add tracking and mark it shipped if the provider has already shipped it.`,
    '',
    `Admin: ${adminUrl}`,
    '',
    'Items:',
    ...itemLines.map((line) => `- ${line}`),
    '',
    'Shipping address:',
    formatOrderAddress(order) || 'No shipping address saved.',
    '',
    'Provider:',
    `${order.providerRecord.name} · ${order.providerRecord.contact_email || order.providerRecord.contact_url || order.providerRecord.contact_notes || 'No provider contact saved.'}`,
  ].join('\n');

  return {
    subject: `Manual order reminder: ${orderNumber}`,
    html,
    text,
  };
}

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const { data: providersData, error: providersError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('*')
    .eq('fulfillment_mode', 'manual');

  if (providersError) {
    return NextResponse.json({ error: 'Unable to load manual providers.' }, { status: 500 });
  }

  const providers = (providersData ?? []) as EcommerceProvider[];
  const providersByCode = new Map(providers.map((provider) => [provider.code, provider]));
  const providerCodes = [...providersByCode.keys()];

  if (providerCodes.length === 0) {
    return NextResponse.json({
      checked: 0,
      remindersRecorded: 0,
      emailsSent: 0,
      emailsFailed: 0,
      skippedAlreadyRecorded: 0,
    });
  }

  const oldestThresholdMs = Math.min(
    ...MANUAL_FULFILLMENT_REMINDER_THRESHOLDS.map((threshold) => threshold.ageMs)
  );
  const candidateCutoff = new Date(Date.now() - oldestThresholdMs).toISOString();

  const { data: ordersData, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .in('provider', providerCodes)
    .in('status', MANUAL_REMINDER_STATUSES)
    .lte('created_at', candidateCutoff)
    .order('created_at', { ascending: true })
    .limit(50);

  if (ordersError) {
    return NextResponse.json({ error: 'Unable to load manual orders.' }, { status: 500 });
  }

  const candidates = ((ordersData ?? []) as EcommerceOrder[])
    .map((order) => {
      const providerRecord = providersByCode.get(order.provider);
      return providerRecord ? ({ ...order, providerRecord } satisfies ReminderCandidate) : null;
    })
    .filter((order): order is ReminderCandidate => Boolean(order));

  const orderIds = candidates.map((order) => order.id);
  const [itemsResult, incidentsResult] =
    orderIds.length > 0
      ? await Promise.all([
          supabaseAdmin.from('order_items').select('*').in('order_id', orderIds),
          supabaseAdmin
            .from('order_operational_incidents')
            .select('*')
            .in('order_id', orderIds)
            .eq('incident_type', 'manual_fulfillment_reminder'),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (itemsResult.error) {
    return NextResponse.json({ error: 'Unable to load order items.' }, { status: 500 });
  }
  if (incidentsResult.error) {
    return NextResponse.json({ error: 'Unable to load reminder history.' }, { status: 500 });
  }

  const itemsByOrderId = new Map<string, OrderItem[]>();
  ((itemsResult.data ?? []) as OrderItem[]).forEach((item) => {
    itemsByOrderId.set(item.order_id, [...(itemsByOrderId.get(item.order_id) ?? []), item]);
  });

  const existingReminderKeys = new Set(
    ((incidentsResult.data ?? []) as OrderOperationalIncident[])
      .map((incident) => `${incident.order_id}:${String(incident.metadata?.reminder_key ?? '')}`)
      .filter((value) => !value.endsWith(':'))
  );

  let remindersRecorded = 0;
  let emailsSent = 0;
  let emailsFailed = 0;
  let skippedAlreadyRecorded = 0;

  for (const order of candidates) {
    const stage = getReminderStage(order);
    if (!stage) continue;

    const dedupeKey = `${order.id}:${stage.key}`;
    if (existingReminderKeys.has(dedupeKey)) {
      skippedAlreadyRecorded += 1;
      continue;
    }

    const reason = `Manual fulfillment reminder: ${stage.label}. Katie should review this paid order and advance fulfillment or contact the customer.`;
    const { error: incidentError } = await supabaseAdmin.from('order_operational_incidents').insert({
      order_id: order.id,
      incident_type: 'manual_fulfillment_reminder',
      reason,
      metadata: {
        reminder_key: stage.key,
        reminder_label: stage.label,
        severity: stage.severity,
        status: order.status,
        created_at: order.created_at,
        checked_at: new Date().toISOString(),
        next_step:
          order.status === 'awaiting_manual_fulfillment'
            ? 'Place the order with the manual provider, then mark it submitted.'
            : 'Check provider status; if shipped, add tracking and mark it shipped.',
      },
    });

    if (incidentError) {
      if (incidentError.code === '23505') {
        skippedAlreadyRecorded += 1;
        continue;
      }

      console.warn('[manual-fulfillment-reminders] incident_record_failed', {
        orderId: order.id,
        reminderKey: stage.key,
        reason: incidentError.message,
      });
      continue;
    }

    remindersRecorded += 1;

    const email = buildReminderEmail({
      order,
      items: itemsByOrderId.get(order.id) ?? [],
      stageLabel: stage.label,
    });

    try {
      await sendResendEmail({
        to: getManualOrderNotificationEmail(),
        replyTo: getNewsletterReplyToEmail(),
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      emailsSent += 1;
    } catch (error) {
      emailsFailed += 1;
      console.warn('[manual-fulfillment-reminders] email_failed', {
        orderId: order.id,
        reminderKey: stage.key,
        reason: error instanceof Error ? error.message : 'Unknown email error',
      });
    }
  }

  console.info('[manual-fulfillment-reminders] completed', {
    checked: candidates.length,
    remindersRecorded,
    emailsSent,
    emailsFailed,
    skippedAlreadyRecorded,
    ranAt: formatDateTime(new Date().toISOString()),
  });

  return NextResponse.json({
    checked: candidates.length,
    remindersRecorded,
    emailsSent,
    emailsFailed,
    skippedAlreadyRecorded,
  });
}
