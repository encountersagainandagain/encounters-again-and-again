import 'server-only';

import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const STALE_PENDING_WITHOUT_SESSION_HOURS = 2;
const STALE_PENDING_WITH_SESSION_HOURS = 48;
const MAX_STALE_PENDING_ORDERS_PER_SWEEP = 12;

type StalePendingOrder = {
  id: string;
  customer_order_number: string | null;
  stripe_session_id: string | null;
  created_at: string;
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function retrieveStripeSession(sessionId: string, stripeSecretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : `Stripe session lookup failed with ${response.status}.`
    );
  }

  return (await response.json()) as {
    id: string;
    status?: string | null;
    payment_status?: string | null;
    expires_at?: number | null;
  };
}

async function cancelPendingOrder(orderId: string, reason: string) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'canceled',
      cancellation_reason: reason,
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  if (error) {
    console.warn('[shop-pending-orders] cancel_failed', {
      orderId,
      reason: error.message,
    });
  }
}

async function recordMissingSessionIncidentOnce(orders: StalePendingOrder[]) {
  if (!supabaseAdmin || orders.length === 0) return;

  const orderIds = orders.map((order) => order.id);
  const { data: existingIncidents, error } = await supabaseAdmin
    .from('order_operational_incidents')
    .select('order_id')
    .eq('incident_type', 'pending_order_missing_stripe_session')
    .in('order_id', orderIds);

  if (error) {
    console.warn('[shop-pending-orders] missing_session_incident_lookup_failed', {
      reason: error.message,
    });
    return;
  }

  const alreadyRecorded = new Set((existingIncidents ?? []).map((incident) => incident.order_id));

  await Promise.all(
    orders
      .filter((order) => !alreadyRecorded.has(order.id))
      .map((order) =>
        recordOrderOperationalIncident({
          orderId: order.id,
          incidentType: 'pending_order_missing_stripe_session',
          reason:
            'Pending checkout order has no Stripe session id after the safe attachment window. The system did not cancel it because it cannot prove the customer did not pay.',
          metadata: {
            severity: 'high',
            customer_order_number: order.customer_order_number,
            created_at: order.created_at,
            stale_after_hours: STALE_PENDING_WITHOUT_SESSION_HOURS,
          },
        })
      )
  );
}

async function loadPendingOrdersWithoutSession() {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,customer_order_number,stripe_session_id,created_at')
    .eq('status', 'pending')
    .is('stripe_session_id', null)
    .lt('created_at', hoursAgo(STALE_PENDING_WITHOUT_SESSION_HOURS))
    .order('created_at', { ascending: true })
    .limit(MAX_STALE_PENDING_ORDERS_PER_SWEEP);

  if (error) {
    console.warn('[shop-pending-orders] missing_session_load_failed', {
      reason: error.message,
    });
    return [];
  }

  return (data ?? []) as StalePendingOrder[];
}

async function loadPendingOrdersWithExpiredSessionCandidates() {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,customer_order_number,stripe_session_id,created_at')
    .eq('status', 'pending')
    .not('stripe_session_id', 'is', null)
    .lt('created_at', hoursAgo(STALE_PENDING_WITH_SESSION_HOURS))
    .order('created_at', { ascending: true })
    .limit(MAX_STALE_PENDING_ORDERS_PER_SWEEP);

  if (error) {
    console.warn('[shop-pending-orders] expired_session_candidate_load_failed', {
      reason: error.message,
    });
    return [];
  }

  return (data ?? []) as StalePendingOrder[];
}

export async function cleanupStalePendingShopOrders(stripeSecretKey: string) {
  if (!supabaseAdmin || !stripeSecretKey) return;

  const missingSessionOrders = await loadPendingOrdersWithoutSession();
  await recordMissingSessionIncidentOnce(missingSessionOrders);

  const staleOrders = await loadPendingOrdersWithExpiredSessionCandidates();

  for (const order of staleOrders) {
    try {
      if (!order.stripe_session_id) continue;

      const session = await retrieveStripeSession(order.stripe_session_id, stripeSecretKey);

      if (session.payment_status === 'paid') {
        console.warn('[shop-pending-orders] paid_session_still_pending', {
          orderId: order.id,
          customerOrderNumber: order.customer_order_number,
          sessionId: session.id,
        });
        continue;
      }

      // Use Checkout Session status, not payment_status. `payment_status=unpaid` is normal
      // for an open Checkout Session; cancel only when Stripe says the session itself expired.
      if (session.status === 'expired') {
        await cancelPendingOrder(
          order.id,
          `Abandoned Stripe Checkout session ${session.id} expired without payment.`
        );
      }
    } catch (lookupError) {
      console.warn('[shop-pending-orders] stripe_lookup_failed', {
        orderId: order.id,
        sessionId: order.stripe_session_id,
        reason: lookupError instanceof Error ? lookupError.message : 'Unknown Stripe lookup error.',
      });
    }
  }
}
