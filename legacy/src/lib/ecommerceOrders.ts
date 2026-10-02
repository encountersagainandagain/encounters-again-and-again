import { supabase } from '@/lib/supabase';
import { getEffectiveOrderState } from '@/lib/ecommerceOrderAccounting';
import { getManualFulfillmentReminderStage } from '@/lib/manualFulfillmentReminders';
import type {
  EcommerceOrder,
  EcommerceOrderStatus,
  EcommerceProvider,
  OrderCustomerNotification,
  OrderOperationalIncident,
  OrderRefund,
  OrderItem,
} from '@/lib/ecommerceTypes';

export type AdminOrderItem = OrderItem & {
  productName?: string;
};

export type AdminOrderListItem = EcommerceOrder & {
  providerRecord: EcommerceProvider | null;
  items: AdminOrderItem[];
  notifications: OrderCustomerNotification[];
  incidents: OrderOperationalIncident[];
  refunds: OrderRefund[];
  itemCount: number;
  purchasedItemCount: number;
  refundedItemCount: number;
};

export const ORDER_STATUSES: EcommerceOrderStatus[] = [
  'pending',
  'paid',
  'awaiting_manual_fulfillment',
  'submitting',
  'submitted',
  'in_production',
  'shipped',
  'delivered',
  'on_hold',
  'failed',
  'canceled',
  'refunded',
];

export const ATTENTION_ORDER_STATUSES = new Set<EcommerceOrderStatus>([
  'on_hold',
  'failed',
]);

const PENDING_ATTENTION_AFTER_MS = 2 * 60 * 60 * 1000;


function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export function isPendingStale(order: Pick<EcommerceOrder, 'status' | 'created_at'>) {
  return (
    order.status === 'pending' &&
    Date.now() - new Date(order.created_at).getTime() > PENDING_ATTENTION_AFTER_MS
  );
}

export function requiresOrderAttention(
  order: Pick<EcommerceOrder, 'status' | 'created_at'> & {
    providerRecord?: Pick<EcommerceProvider, 'fulfillment_mode'> | null;
    incidents?: OrderOperationalIncident[];
  }
) {
  return (
    ATTENTION_ORDER_STATUSES.has(order.status) ||
    isPendingStale(order) ||
    Boolean(getManualFulfillmentReminderStage(order)) ||
    (order.incidents ?? []).some(
      (incident) =>
        incident.incident_type === 'missing_terms_consent' &&
        (incident.metadata as { severity?: unknown })?.severity === 'high'
    )
  );
}

export function getManualOrderTransitions(status: EcommerceOrderStatus): EcommerceOrderStatus[] {
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

export function getOrderStatusLabel(status: EcommerceOrderStatus) {
  if (status === 'pending') return 'incomplete checkout';
  return status.replaceAll('_', ' ');
}

export function getManualOrderStatusHelp(status: EcommerceOrderStatus) {
  switch (status) {
    case 'awaiting_manual_fulfillment':
      return 'Paid and waiting for Katie to place the order with the manual provider.';
    case 'submitted':
      return 'Katie already placed the order with the provider.';
    case 'in_production':
      return 'The provider confirmed it is being made. Optional for manual providers.';
    case 'shipped':
      return 'The provider says the package is on the way.';
    case 'delivered':
      return 'The order arrived with the customer.';
    case 'on_hold':
      return 'Needs review before fulfillment can continue.';
    case 'paid':
      return 'Payment is confirmed, but manual fulfillment has not started yet.';
    default:
      return '';
  }
}

export function getManualStatusEmailWarning(status: EcommerceOrderStatus) {
  switch (status) {
    case 'submitted':
      return 'This will email the customer that Katie placed the order with the provider and will send another update when it ships.';
    case 'shipped':
      return 'This will email the customer that the order is on the way.';
    case 'delivered':
      return 'This will email the customer that the provider reported the package as delivered.';
    default:
      return '';
  }
}

export function getOrderRefundTotal(order: { refunds: OrderRefund[] }) {
  return order.refunds.reduce((total, refund) => total + refund.amount_cents, 0);
}

export function getOrderRefundStatus(order: { total_cents: number; refunds: OrderRefund[] }) {
  const totalRefunded = getOrderRefundTotal(order);

  if (totalRefunded <= 0) return 'none';
  if (totalRefunded >= order.total_cents) return 'total';
  return 'partial';
}

export function getOrderRefundStatusLabel(order: { total_cents: number; refunds: OrderRefund[] }) {
  const status = getOrderRefundStatus(order);

  if (status === 'none') return 'No refunds';
  if (status === 'total') return 'Total refund';
  return 'Partial refund';
}

export async function fetchAdminOrders(): Promise<AdminOrderListItem[]> {
  const client = requireSupabase();

  const stalePendingCutoff = new Date(Date.now() - PENDING_ATTENTION_AFTER_MS).toISOString();
  const [paidOrdersResult, staleCheckoutResult] = await Promise.all([
    client
      .from('orders')
      .select('*')
      .not('stripe_payment_intent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', stalePendingCutoff)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (paidOrdersResult.error) throw paidOrdersResult.error;
  if (staleCheckoutResult.error) throw staleCheckoutResult.error;

  const orders = [
    ...new Map(
      [
        ...((paidOrdersResult.data ?? []) as EcommerceOrder[]),
        ...((staleCheckoutResult.data ?? []) as EcommerceOrder[]),
      ].map((order) => [order.id, order])
    ).values(),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);
  const providerCodes = [...new Set(orders.map((order) => order.provider))];

  const [itemsResult, providersResult, notificationsResult, refundsResult, incidentsResult] =
    await Promise.all([
      client
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true }),
      client.from('ecommerce_providers').select('*').in('code', providerCodes),
      client
        .from('order_customer_notifications')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false }),
      client
        .from('order_refunds')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false }),
      client
        .from('order_operational_incidents')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false }),
    ]);

  if (itemsResult.error) throw itemsResult.error;
  if (providersResult.error) throw providersResult.error;
  if (notificationsResult.error) throw notificationsResult.error;
  if (refundsResult.error) throw refundsResult.error;
  if (incidentsResult.error) {
    console.warn('[ecommerce-orders] unable_to_load_operational_incidents', {
      reason: incidentsResult.error.message,
    });
  }

  const rawItems = (itemsResult.data ?? []) as OrderItem[];
  const variantIds = [...new Set(rawItems.map((item) => item.product_variant_id))];
  const variantProductsById = new Map<string, string>();
  const productNamesById = new Map<string, string>();

  if (variantIds.length > 0) {
    const { data: variantsData, error: variantsError } = await client
      .from('product_variants')
      .select('id, product_id')
      .in('id', variantIds);

    if (variantsError) throw variantsError;

    (variantsData ?? []).forEach((variant) => {
      if (variant.id && variant.product_id) {
        variantProductsById.set(String(variant.id), String(variant.product_id));
      }
    });

    const productIds = [...new Set([...variantProductsById.values()])];
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await client
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsError) throw productsError;

      (productsData ?? []).forEach((product) => {
        if (product.id && product.name) {
          productNamesById.set(String(product.id), String(product.name));
        }
      });
    }
  }

  const itemsByOrder = new Map<string, AdminOrderItem[]>();
  rawItems.forEach((item) => {
    const productId = variantProductsById.get(item.product_variant_id);
    const adminItem: AdminOrderItem = {
      ...item,
      productName: productId ? productNamesById.get(productId) : undefined,
    };

    itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), adminItem]);
  });

  const notificationsByOrder = new Map<string, OrderCustomerNotification[]>();
  ((notificationsResult.data ?? []) as OrderCustomerNotification[]).forEach((notification) => {
    notificationsByOrder.set(notification.order_id, [
      ...(notificationsByOrder.get(notification.order_id) ?? []),
      notification,
    ]);
  });

  const refundsByOrder = new Map<string, OrderRefund[]>();
  ((refundsResult.data ?? []) as OrderRefund[]).forEach((refund) => {
    refundsByOrder.set(refund.order_id, [...(refundsByOrder.get(refund.order_id) ?? []), refund]);
  });

  const incidentsByOrder = new Map<string, OrderOperationalIncident[]>();
  ((incidentsResult.data ?? []) as OrderOperationalIncident[]).forEach((incident) => {
    incidentsByOrder.set(incident.order_id, [
      ...(incidentsByOrder.get(incident.order_id) ?? []),
      incident,
    ]);
  });

  const providersByCode = new Map(
    ((providersResult.data ?? []) as EcommerceProvider[]).map((provider) => [
      provider.code,
      provider,
    ])
  );

  return orders.map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const refunds = refundsByOrder.get(order.id) ?? [];
    const effectiveOrder = getEffectiveOrderState({
      items,
      refunds,
      orderTotalCents: order.total_cents,
    });

    return {
      ...order,
      providerRecord: providersByCode.get(order.provider) ?? null,
      items,
      notifications: notificationsByOrder.get(order.id) ?? [],
      incidents: incidentsByOrder.get(order.id) ?? [],
      refunds,
      itemCount: effectiveOrder.effectiveItemCount,
      purchasedItemCount: effectiveOrder.purchasedItemCount,
      refundedItemCount: effectiveOrder.refundedItemCount,
    };
  });
}

export async function fetchNewAdminPaidOrderCount(): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .not('stripe_payment_intent_id', 'is', null)
    .is('admin_reviewed_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function markAdminOrderReviewed(orderId: string) {
  const client = requireSupabase();
  const reviewedAt = new Date().toISOString();
  const { data, error } = await client
    .from('orders')
    .update({ admin_reviewed_at: reviewedAt })
    .eq('id', orderId)
    .is('admin_reviewed_at', null)
    .select('id,admin_reviewed_at')
    .single();

  if (error) throw error;
  return data as { id: string; admin_reviewed_at: string };
}

export async function updateManualOrderStatus({
  orderId,
  currentStatus,
  nextStatus,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
}: {
  orderId: string;
  currentStatus: EcommerceOrderStatus;
  nextStatus: EcommerceOrderStatus;
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}) {
  const client = requireSupabase();
  const allowedTransitions = getManualOrderTransitions(currentStatus);

  if (!allowedTransitions.includes(nextStatus)) {
    throw new Error('That order status transition is not allowed.');
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to update orders.');
  }

  const response = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentStatus,
      nextStatus,
      trackingCarrier,
      trackingNumber,
      trackingUrl,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to update order.');
  }

  return payload as {
    order: EcommerceOrder;
    notification: {
      attempted: boolean;
      status: 'sent' | 'failed' | 'skipped';
      message: string;
    };
  };
}

export async function updateManualProviderOrderReference({
  orderId,
  providerOrderId,
}: {
  orderId: string;
  providerOrderId: string;
}) {
  const client = requireSupabase();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to update provider order references.');
  }

  const response = await fetch(`/api/admin/orders/${orderId}/provider-order-id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      providerOrderId,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to update provider order reference.');
  }

  return payload as {
    order: EcommerceOrder;
  };
}

export async function refundOrder({
  orderId,
  orderItemId,
  quantity,
  reason,
  cause,
  idempotencyToken,
}: {
  orderId: string;
  orderItemId?: string | null;
  quantity?: number | null;
  reason: string;
  cause: 'process_failure' | 'customer_request';
  idempotencyToken: string;
}) {
  const client = requireSupabase();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to refund orders.');
  }

  const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderItemId,
      quantity,
      reason,
      cause,
      idempotencyToken,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to refund order.');
  }

  return payload as {
    refund: OrderRefund;
    order: EcommerceOrder;
    refundStatus: 'partial' | 'total';
    notification: {
      attempted: boolean;
      status: 'sent' | 'failed' | 'skipped';
      message: string;
    };
  };
}

export async function retryProviderFulfillment({ orderId }: { orderId: string }) {
  const client = requireSupabase();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to retry provider fulfillment.');
  }

  const response = await fetch(`/api/admin/orders/${orderId}/retry-provider`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to retry provider fulfillment.');
  }

  return payload as {
    order: EcommerceOrder;
    message: string;
  };
}

export async function recoverStripePayment({ orderId }: { orderId: string }) {
  const client = requireSupabase();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to recover Stripe payments.');
  }

  const response = await fetch(`/api/admin/orders/${orderId}/recover-stripe-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to recover Stripe payment.');
  }

  return payload as {
    order: EcommerceOrder;
    message: string;
  };
}

export async function runManualFulfillmentReminders() {
  const client = requireSupabase();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session is required to run manual fulfillment reminders.');
  }

  const response = await fetch('/api/admin/orders/manual-reminders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to run manual fulfillment reminders.');
  }

  return payload as {
    checked: number;
    remindersRecorded: number;
    emailsSent: number;
    emailsFailed: number;
    skippedAlreadyRecorded: number;
  };
}
