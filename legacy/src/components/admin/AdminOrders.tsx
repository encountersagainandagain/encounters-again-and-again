'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SHOP_RETURN_POLICY_VERSION } from '@/lib/ecommercePolicy';
import { getEffectiveOrderState } from '@/lib/ecommerceOrderAccounting';
import { getCustomerOrderNumber } from '@/lib/ecommerceOrderIdentity';
import {
  ORDER_STATUSES,
  fetchAdminOrders,
  getManualOrderTransitions,
  getManualOrderStatusHelp,
  getManualStatusEmailWarning,
  getOrderRefundStatusLabel,
  getOrderRefundTotal,
  getOrderStatusLabel,
  isPendingStale,
  markAdminOrderReviewed,
  refundOrder,
  recoverStripePayment,
  requiresOrderAttention,
  retryProviderFulfillment,
  runManualFulfillmentReminders,
  updateManualOrderStatus,
  updateManualProviderOrderReference,
  type AdminOrderListItem,
} from '@/lib/ecommerceOrders';
import { getManualFulfillmentReminderStage } from '@/lib/manualFulfillmentReminders';
import { ROUTINE_ORDER_INCIDENT_TYPES, type EcommerceOrderStatus } from '@/lib/ecommerceTypes';

type StatusFilter = 'all' | 'attention' | EcommerceOrderStatus;

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function truncateId(value: string | null) {
  if (!value) return '—';
  return value.length > 18 ? `${value.slice(0, 12)}…${value.slice(-6)}` : value;
}

function formatEvidenceAddress(order: AdminOrderListItem) {
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

function formatEvidenceSnapshot(order: AdminOrderListItem) {
  const snapshots = Array.isArray(order.size_guide_snapshot)
    ? (order.size_guide_snapshot as Array<{
        product_name?: string;
        color?: string;
        size?: string;
        size_guide_unit?: string;
        measurements?: Array<{ label?: string; value?: string }>;
        tolerance?: string;
      }>)
    : [];

  if (snapshots.length === 0) return 'Missing size guide snapshot.';

  return snapshots
    .map((snapshot) => {
      const measurements =
        snapshot.measurements
          ?.map((measurement) => `${measurement.label}: ${measurement.value} ${snapshot.size_guide_unit}`)
          .join(' · ') || 'Measurements missing';

      return `${snapshot.product_name ?? 'Product'} — ${snapshot.color ?? 'Color'} / ${snapshot.size ?? 'Size'} — ${measurements}. Tolerance: ${snapshot.tolerance ?? 'not recorded'}`;
    })
    .join('\n');
}

function getEvidenceMissingFields(order: AdminOrderListItem) {
  return [
    !order.return_policy_version ? 'Return policy version' : '',
    !order.cart_terms_accepted ? 'Cart policy acceptance' : '',
    !order.terms_accepted ? 'Stripe terms acceptance' : '',
    !order.customer_purchase_ip ? 'Customer purchase IP' : '',
    !order.size_guide_snapshot ? 'Size guide snapshot' : '',
    !order.tracking_number ? 'Tracking number' : '',
  ].filter(Boolean);
}

function getStatusBadgeClass(order: AdminOrderListItem) {
  if (requiresOrderAttention(order)) {
    return 'border border-amber-300 bg-amber-50 text-amber-900';
  }

  if (order.status === 'paid' || order.status === 'delivered') {
    return 'border border-green-200 bg-green-50 text-green-800';
  }

  if (order.status === 'canceled' || order.status === 'refunded') {
    return 'border border-black/10 bg-gray-50 text-black/45';
  }

  return 'border border-ocean/20 bg-sky-50 text-ocean';
}

function getAttentionMessage(order: AdminOrderListItem) {
  if (order.status === 'on_hold') {
    return 'Needs review before fulfillment. Check the shipping address or payment context.';
  }

  if (order.status === 'failed') {
    return 'Failed order. Katie needs to inspect what went wrong.';
  }

  if (isPendingStale(order)) {
    return 'Pending for more than 2 hours. The Stripe webhook may not have arrived.';
  }

  const manualReminderStage = getManualFulfillmentReminderStage(order);
  if (manualReminderStage) {
    return `Manual fulfillment overdue: ${manualReminderStage.label}. Katie should review this order.`;
  }

  return '';
}

function countIncidentsSince(orders: AdminOrderListItem[], sinceMs: number) {
  const cutoff = Date.now() - sinceMs;
  return orders.reduce(
    (total, order) =>
      total +
      order.incidents.filter(
        (incident) =>
          new Date(incident.created_at).getTime() >= cutoff &&
          !ROUTINE_ORDER_INCIDENT_TYPES.has(incident.incident_type)
      ).length,
    0
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingOrderId, setIsUpdatingOrderId] = useState('');
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadOrders() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      setOrders(await fetchAdminOrders());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load orders.');
    } finally {
      setIsLoading(false);
    }
  }

  async function openOrder(order: AdminOrderListItem) {
    setExpandedOrderId(order.id);
    if (!order.stripe_payment_intent_id || order.admin_reviewed_at) return;

    try {
      const reviewed = await markAdminOrderReviewed(order.id);
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, admin_reviewed_at: reviewed.admin_reviewed_at } : item
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark order as reviewed.');
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  useEffect(() => {
    const orderIdFromHash = window.location.hash.match(/^#order-(.+)$/)?.[1];

    if (orderIdFromHash) {
      setExpandedOrderId(orderIdFromHash);
    }
  }, []);

  const filteredOrders = useMemo(() => {
    const paidOrders = orders.filter((order) => Boolean(order.stripe_payment_intent_id));
    const statusFiltered =
      statusFilter === 'all'
        ? paidOrders
        : statusFilter === 'attention'
          ? orders.filter(requiresOrderAttention)
          : orders.filter((order) => order.status === statusFilter);
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) return statusFiltered;

    return statusFiltered.filter((order) =>
      [
        getCustomerOrderNumber(order),
        order.customer_email,
        order.id,
        order.provider_order_id,
        order.stripe_session_id,
        order.stripe_payment_intent_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [orders, statusFilter, searchQuery]);

  const paidOrderCount = orders.filter((order) => Boolean(order.stripe_payment_intent_id)).length;
  const attentionCount = orders.filter(requiresOrderAttention).length;
  const incidentsLast7Days = countIncidentsSince(orders, 7 * 24 * 60 * 60 * 1000);
  const incidentsLast30Days = countIncidentsSince(orders, 30 * 24 * 60 * 60 * 1000);

  const handleManualStatusChange = async (
    order: AdminOrderListItem,
    nextStatus: EcommerceOrderStatus,
    tracking?: {
      carrier: string;
      number: string;
      url: string;
    }
  ) => {
    setIsUpdatingOrderId(order.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await updateManualOrderStatus({
        orderId: order.id,
        currentStatus: order.status,
        nextStatus,
        trackingCarrier: tracking?.carrier,
        trackingNumber: tracking?.number,
        trackingUrl: tracking?.url,
      });
      const updatedOrder = result.order;

      setOrders((current) =>
        current.map((item) =>
          item.id === updatedOrder.id
            ? {
                ...item,
                ...updatedOrder,
              }
            : item
        )
      );
      setSuccessMessage(
        result.notification.status === 'failed'
          ? `Order moved to ${getOrderStatusLabel(nextStatus)}, but the customer email failed: ${result.notification.message}`
          : result.notification.status === 'sent'
            ? `Order moved to ${getOrderStatusLabel(nextStatus)} and the customer email was sent.`
            : `Order moved to ${getOrderStatusLabel(nextStatus)}.`
      );
      void loadOrders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update order.');
    } finally {
      setIsUpdatingOrderId('');
    }
  };

  const handleProviderOrderReferenceChange = async (
    order: AdminOrderListItem,
    providerOrderId: string
  ) => {
    setIsUpdatingOrderId(order.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await updateManualProviderOrderReference({
        orderId: order.id,
        providerOrderId,
      });
      const updatedOrder = result.order;

      setOrders((current) =>
        current.map((item) =>
          item.id === updatedOrder.id
            ? {
                ...item,
                ...updatedOrder,
              }
            : item
        )
      );
      setSuccessMessage('Provider order reference saved.');
      void loadOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save provider order reference.'
      );
    } finally {
      setIsUpdatingOrderId('');
    }
  };

  const handleOrderRefund = async (
    order: AdminOrderListItem,
    input: {
      orderItemId?: string | null;
      quantity?: number | null;
      reason: string;
      cause: 'process_failure' | 'customer_request';
      idempotencyToken: string;
    }
  ): Promise<boolean> => {
    setIsUpdatingOrderId(order.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await refundOrder({
        orderId: order.id,
        orderItemId: input.orderItemId,
        quantity: input.quantity,
        reason: input.reason,
        cause: input.cause,
        idempotencyToken: input.idempotencyToken,
      });

      setOrders((current) =>
        current.map((item) =>
          item.id === result.order.id
            ? {
                ...item,
                ...result.order,
                refunds: [result.refund, ...item.refunds],
              }
            : item
        )
      );
      setSuccessMessage(
        result.notification.status === 'failed'
          ? `Refund created for ${formatMoney(result.refund.amount_cents, result.refund.currency)}, but the customer email failed: ${result.notification.message}`
          : result.notification.status === 'skipped'
            ? `Refund already recorded for ${formatMoney(result.refund.amount_cents, result.refund.currency)}. No duplicate refund or email was created.`
          : `Refund created for ${formatMoney(result.refund.amount_cents, result.refund.currency)} and the customer email was sent.`
      );
      void loadOrders();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refund order.');
      return false;
    } finally {
      setIsUpdatingOrderId('');
    }
  };

  const handleProviderRetry = async (order: AdminOrderListItem) => {
    setIsUpdatingOrderId(order.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await retryProviderFulfillment({ orderId: order.id });

      setOrders((current) =>
        current.map((item) =>
          item.id === result.order.id
            ? {
                ...item,
                ...result.order,
              }
            : item
        )
      );
      setSuccessMessage(result.message);
      void loadOrders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to retry provider.');
    } finally {
      setIsUpdatingOrderId('');
    }
  };

  const handleStripePaymentRecovery = async (order: AdminOrderListItem) => {
    setIsUpdatingOrderId(order.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await recoverStripePayment({ orderId: order.id });

      setOrders((current) =>
        current.map((item) =>
          item.id === result.order.id
            ? {
                ...item,
                ...result.order,
              }
            : item
        )
      );
      setSuccessMessage(result.message);
      void loadOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to recover Stripe payment.'
      );
    } finally {
      setIsUpdatingOrderId('');
    }
  };

  const handleRunManualReminders = async () => {
    setIsRunningReminders(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await runManualFulfillmentReminders();
      setSuccessMessage(
        `Manual fulfillment reminder check complete: ${result.remindersRecorded} reminder${result.remindersRecorded === 1 ? '' : 's'} recorded, ${result.emailsSent} email${result.emailsSent === 1 ? '' : 's'} sent, ${result.emailsFailed} failed, ${result.skippedAlreadyRecorded} already recorded.`
      );
      void loadOrders();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to run manual fulfillment reminders.'
      );
    } finally {
      setIsRunningReminders(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-4 inline-block font-body text-sm uppercase tracking-[0.18em] text-ocean transition-colors hover:text-ocean/70"
            >
              ← Dashboard
            </Link>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Ecommerce
            </span>
            <h1 className="font-display text-5xl text-black md:text-6xl">Orders</h1>
            <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-black/60">
              Monitor paid shop orders, webhook delays, provider fulfillment status, shipping
              details, and manual-provider work Katie needs to advance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRunManualReminders()}
              disabled={isRunningReminders}
              className="btn-ocean disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunningReminders ? 'Checking reminders...' : 'Run manual reminders'}
            </button>
            <button type="button" onClick={() => void loadOrders()} className="btn-secondary">
              Refresh
            </button>
          </div>
        </div>

        {attentionCount > 0 && (
          <div className="mb-6 border border-amber-300 bg-amber-50 p-5">
            <p className="font-body text-sm font-semibold text-amber-950">
              {attentionCount} item{attentionCount === 1 ? '' : 's'} require attention.
            </p>
            <p className="mt-1 font-body text-sm leading-relaxed text-amber-900">
              This includes paid orders on hold or failed, plus incomplete checkouts older than 2
              hours that may indicate a missing Stripe webhook. Manual orders that have not moved
              for the reminder window are included too.
            </p>
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="border border-black/10 bg-gray-50 p-5">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
              Manual interventions · last 7 days
            </p>
            <p className="mt-2 font-display text-4xl text-black">{incidentsLast7Days}</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
              Counts refunds, provider retries and consent or payment mismatches. Moving an order
              through its statuses is normal fulfilment work, so it is not counted here.
            </p>
          </div>
          <div className="border border-black/10 bg-gray-50 p-5">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
              Manual interventions · last 30 days
            </p>
            <p className="mt-2 font-display text-4xl text-black">{incidentsLast30Days}</p>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
              If this number climbs, treat it as a system signal, not one-off admin work.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
              Filter by status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="min-w-64 border border-black/15 bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-ocean"
            >
              <option value="all">All orders</option>
              <option value="attention">Needs attention</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getOrderStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
              Search order
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="WKS-1042 or buyer email"
              className="w-full border border-black/15 bg-white px-4 py-3 font-body text-sm text-black outline-none focus:border-ocean"
            />
            <span className="mt-1 block font-body text-xs leading-relaxed text-black/45">
              Use the order number from the buyer’s email, or the email used at checkout.
            </span>
          </label>
          <p className="font-body text-sm text-black/45">
            Showing {filteredOrders.length} of {paidOrderCount} paid orders.
          </p>
        </div>

        <div className="mb-6 border border-ocean/20 bg-sky-50 p-5">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
            Claim identity check
          </p>
          <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
            When a customer writes about an order, Katie should confirm two things: the message
            came from the same email used at checkout and the customer cites the matching WKS
            order number. If the email does not match, ask them to reply from the purchase email
            before sharing order details or making changes.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 border border-green-200 bg-green-50 p-4">
            <p className="font-body text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4">
            <p className="font-body text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="border border-black/10 bg-gray-50 p-8 text-center">
            <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
              Loading orders...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="border border-dashed border-black/15 bg-gray-50 p-8 text-center">
            <h2 className="font-display text-3xl text-black">No orders found</h2>
            <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-relaxed text-black/60">
              Orders will appear here after Stripe checkout creates them.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-black/10">
            <div className="hidden bg-gray-50 px-5 py-3 font-body text-xs font-semibold uppercase tracking-[0.16em] text-black/45 lg:grid lg:grid-cols-[0.75fr_1fr_0.75fr_0.75fr_0.7fr_1fr_0.55fr_0.65fr_88px] lg:items-center lg:gap-4">
              <span>Order</span>
              <span>Date</span>
              <span>Status</span>
              <span>Provider</span>
              <span>Total</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Attention</span>
              <span>Detail</span>
            </div>
            <div className="divide-y divide-black/10">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const attentionMessage = getAttentionMessage(order);

                return (
                  <article
                    key={order.id}
                    id={`order-${order.id}`}
                    className={requiresOrderAttention(order) ? 'bg-amber-50/55' : 'bg-white'}
                  >
                    <div className="grid gap-4 p-5 lg:grid-cols-[0.75fr_1fr_0.75fr_0.75fr_0.7fr_1fr_0.55fr_0.65fr_88px] lg:items-center">
                      <p className="font-body text-sm font-semibold text-black">
                        {getCustomerOrderNumber(order)}
                      </p>
                      <p className="font-body text-sm text-black/60">
                        {formatDateTime(order.created_at)}
                      </p>
                      <p>
                        <span
                          className={`inline-flex px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClass(order)}`}
                        >
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </p>
                      <p className="font-body text-sm text-black/60">
                        {order.providerRecord?.name ?? order.provider}
                      </p>
                      <p className="font-body text-sm font-semibold text-black">
                        {formatMoney(order.total_cents, order.currency)}
                      </p>
                      <p className="break-words font-body text-sm text-black/60">
                        {order.customer_email || '—'}
                      </p>
                      <p className="font-body text-sm text-black/60">
                        {order.itemCount}
                        {order.refundedItemCount > 0 && (
                          <span className="block text-xs text-black/40">
                            {order.purchasedItemCount} bought · {order.refundedItemCount} refunded
                          </span>
                        )}
                      </p>
                      <p className="font-body text-xs leading-relaxed text-amber-900">
                        {attentionMessage || '—'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (isExpanded) setExpandedOrderId('');
                          else void openOrder(order);
                        }}
                        className="font-body text-sm font-semibold text-ocean underline"
                      >
                        {isExpanded ? 'Close' : 'Open'}
                      </button>
                    </div>

                    {isExpanded && (
                      <OrderDetail
                        key={`${order.id}:${order.provider_order_id ?? ''}`}
                        order={order}
                        isUpdating={isUpdatingOrderId === order.id}
                        onStatusChange={handleManualStatusChange}
                        onRefund={handleOrderRefund}
                        onProviderRetry={handleProviderRetry}
                        onStripePaymentRecovery={handleStripePaymentRecovery}
                        onProviderOrderReferenceChange={handleProviderOrderReferenceChange}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function OrderDetail({
  order,
  isUpdating,
  onStatusChange,
  onRefund,
  onProviderRetry,
  onStripePaymentRecovery,
  onProviderOrderReferenceChange,
}: {
  order: AdminOrderListItem;
  isUpdating: boolean;
  onStatusChange: (
    order: AdminOrderListItem,
    nextStatus: EcommerceOrderStatus,
    tracking?: {
      carrier: string;
      number: string;
      url: string;
    }
  ) => void;
  onRefund: (
    order: AdminOrderListItem,
    input: {
      orderItemId?: string | null;
      quantity?: number | null;
      reason: string;
      cause: 'process_failure' | 'customer_request';
      idempotencyToken: string;
    }
  ) => Promise<boolean>;
  onProviderRetry: (order: AdminOrderListItem) => void;
  onStripePaymentRecovery: (order: AdminOrderListItem) => void;
  onProviderOrderReferenceChange: (order: AdminOrderListItem, providerOrderId: string) => void;
}) {
  const isManualProvider = order.providerRecord?.fulfillment_mode === 'manual';
  const canRetryProvider =
    order.providerRecord?.fulfillment_mode === 'api' &&
    order.providerRecord.api_fulfillment_enabled === true &&
    order.provider === 'printful' &&
    order.status === 'failed' &&
    !order.provider_order_id;
  const allowedTransitions = isManualProvider ? getManualOrderTransitions(order.status) : [];
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier ?? '');
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '');
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? '');
  const [providerOrderReference, setProviderOrderReference] = useState(
    order.provider_order_id ?? ''
  );
  const [refundReason, setRefundReason] = useState('');
  const [refundCause, setRefundCause] = useState<'process_failure' | 'customer_request'>(
    'process_failure'
  );
  const [refundQuantities, setRefundQuantities] = useState<Record<string, string>>({});
  const [refundOperationToken, setRefundOperationToken] = useState(() => crypto.randomUUID());
  const refundedTotalCents = getOrderRefundTotal(order);
  const refundableOrderCents = Math.max(order.total_cents - refundedTotalCents, 0);
  const refundStatusLabel = getOrderRefundStatusLabel(order);
  const isShippedOrDelivered = order.status === 'shipped' || order.status === 'delivered';
  const canRecoverStripePayment = order.status === 'pending' && Boolean(order.stripe_session_id);
  const effectiveOrder = useMemo(
    () =>
      getEffectiveOrderState({
        items: order.items,
        refunds: order.refunds,
        orderTotalCents: order.total_cents,
      }),
    [order.items, order.refunds, order.total_cents]
  );
  const effectiveItemsById = useMemo(
    () => new Map(effectiveOrder.items.map((item) => [item.id, item])),
    [effectiveOrder.items]
  );

  const handleStatusClick = (nextStatus: EcommerceOrderStatus) => {
    const emailWarning = getManualStatusEmailWarning(nextStatus);
    const shippedWithoutTracking =
      nextStatus === 'shipped' && !trackingNumber.trim() && !trackingUrl.trim();
    if (shippedWithoutTracking) {
      window.alert(
        'Add a tracking number or tracking URL before marking this order as shipped. The customer email needs tracking details.'
      );
      return;
    }

    const warningLines = [
      `Move this order to "${getOrderStatusLabel(nextStatus)}"?`,
      '',
      getManualOrderStatusHelp(nextStatus),
      emailWarning,
      nextStatus === 'submitted' && !providerOrderReference.trim()
        ? 'Provider order reference is still blank. If the provider gave Katie an order number, save it before or after this status change.'
        : '',
    ].filter(Boolean);

    if (!window.confirm(warningLines.join('\n'))) return;

    onStatusChange(order, nextStatus, {
      carrier: trackingCarrier,
      number: trackingNumber,
      url: trackingUrl,
    });
  };

  const handleRefundClick = async ({
    orderItemId = null,
    quantity = null,
    amountCents,
    label,
  }: {
    orderItemId?: string | null;
    quantity?: number | null;
    amountCents: number;
    label: string;
  }) => {
    const reason = refundReason.trim();

    if (!reason) {
      window.alert('Write the refund reason first. This exact text goes to the buyer.');
      return;
    }

    if (amountCents <= 0) {
      window.alert('There is no refundable amount left for this selection.');
      return;
    }

    const warningLines = [
      `Issue a ${formatMoney(amountCents, order.currency)} refund for ${label}?`,
      '',
      'This sends money back through Stripe and emails the customer.',
      refundCause === 'process_failure'
        ? 'This will count as an operational incident because the refund is caused by a process/provider failure.'
        : 'This is a normal customer-service refund and will not count as an operational incident.',
      'Reason sent to the customer:',
      `"${reason}"`,
      isShippedOrDelivered
        ? 'Warning: this order is already shipped/delivered. The customer may already receive the item.'
        : '',
    ].filter(Boolean);

    if (!window.confirm(warningLines.join('\n'))) return;

    const didRefund = await onRefund(order, {
      orderItemId,
      quantity,
      reason,
      cause: refundCause,
      idempotencyToken: refundOperationToken,
    });

    if (didRefund) {
      setRefundReason('');
      setRefundOperationToken(crypto.randomUUID());
    }
  };

  const handleProviderRetryClick = () => {
    const previousError = order.provider_last_error || 'No previous provider error saved.';
    const warningLines = [
      'Retry sending this order to Printful?',
      '',
      'Previous provider error:',
      previousError,
      '',
      'This will call Printful again using the same deterministic external_id and only works while no provider_order_id is saved.',
    ];

    if (!window.confirm(warningLines.join('\n'))) return;

    onProviderRetry(order);
  };

  const handleStripePaymentRecoveryClick = () => {
    const warningLines = [
      'Recover this Stripe payment?',
      '',
      'Use this only after checking Stripe and confirming the Checkout Session is paid.',
      `Stripe session: ${order.stripe_session_id || 'not saved'}`,
      '',
      'The server will verify Stripe again before changing anything. If Stripe confirms payment, it will run the normal payment-received flow: update the order, email the customer, and notify Katie.',
    ];

    if (!window.confirm(warningLines.join('\n'))) return;

    onStripePaymentRecovery(order);
  };

  return (
    <div className="border-t border-black/10 bg-white p-5">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <h3 className="font-display text-3xl text-black">Items</h3>
          <div className="mt-4 divide-y divide-black/10 border border-black/10">
            {order.items.length === 0 ? (
              <p className="p-4 font-body text-sm text-black/45">No items found.</p>
            ) : (
              order.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 p-4 font-body text-sm text-black/65 sm:grid-cols-[1fr_0.7fr_0.45fr_0.65fr]"
                >
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                      Product / variant
                    </span>
                    {item.productName ? `${item.productName} · ` : ''}
                    {item.color} / {item.size}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                      Variant ID
                    </span>
                    {truncateId(item.product_variant_id)}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                      Qty
                    </span>
                    {item.quantity}
                    {effectiveItemsById.get(item.id)?.refundedQuantity ? (
                      <span className="mt-1 block text-xs text-black/45">
                        {effectiveItemsById.get(item.id)?.refundedQuantity} refunded ·{' '}
                        {effectiveItemsById.get(item.id)?.effectiveQuantity} to send
                      </span>
                    ) : null}
                  </p>
                  <p>
                    <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                      Frozen price
                    </span>
                    {formatMoney(item.unit_price_cents, order.currency)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Shipping address</h3>
            <address className="mt-3 whitespace-pre-line font-body text-sm not-italic leading-relaxed text-black/65">
              {[
                order.shipping_name,
                order.shipping_address1,
                order.shipping_address2,
                [order.shipping_city, order.shipping_state_code, order.shipping_zip]
                  .filter(Boolean)
                  .join(', '),
                order.shipping_country_code,
              ]
                .filter(Boolean)
                .join('\n') || 'No shipping address saved.'}
            </address>
          </div>

          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Tracking</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
              For manual providers, fill this when the provider gives Katie tracking. Printful
              webhooks will use these same fields later.
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-amber-800">
              Tracking number or tracking URL is required before marking an order as shipped.
              Carrier is recommended but optional.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                  Carrier
                </span>
                <input
                  value={trackingCarrier}
                  onChange={(event) => setTrackingCarrier(event.target.value)}
                  placeholder="USPS, UPS, FedEx..."
                  className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                  Tracking number
                </span>
                <input
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                  Tracking URL
                </span>
                <input
                  value={trackingUrl}
                  onChange={(event) => setTrackingUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                />
              </label>
            </div>
          </div>

          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Payment / provider</h3>
            <dl className="mt-3 space-y-3 font-body text-sm text-black/65">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Customer order number
                </dt>
                <dd className="font-semibold text-black">{getCustomerOrderNumber(order)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Internal order id
                </dt>
                <dd className="break-all">{order.id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Stripe session
                </dt>
                <dd className="break-all">{order.stripe_session_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Stripe payment intent
                </dt>
                <dd className="break-all">{order.stripe_payment_intent_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Provider order
                </dt>
                <dd className="break-all">{order.provider_order_id || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Manual provider reference
                </dt>
                {isManualProvider ? (
                  <dd className="mt-2 space-y-2">
                    <input
                      value={providerOrderReference}
                      onChange={(event) => setProviderOrderReference(event.target.value)}
                      maxLength={80}
                      placeholder="Provider order number, PO, or reference"
                      className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                    />
                    <p className="font-body text-xs leading-relaxed text-black/45">
                      Use this for the order number the manual provider gives Katie. It is searchable
                      and appears in dispute evidence. Corrections are allowed but logged.
                    </p>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onProviderOrderReferenceChange(order, providerOrderReference)}
                      className="border border-ocean px-3 py-2 font-body text-xs font-semibold uppercase tracking-[0.12em] text-ocean transition-colors hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Save provider reference'}
                    </button>
                  </dd>
                ) : (
                  <dd className="mt-1 font-body text-xs leading-relaxed text-black/45">
                    API provider references are written by the fulfillment integration and cannot be
                    edited manually.
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Provider submitted
                </dt>
                <dd>
                  {order.provider_submitted_at ? formatDateTime(order.provider_submitted_at) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Latest provider attempt
                </dt>
                <dd>
                  {order.provider_last_attempt_at
                    ? formatDateTime(order.provider_last_attempt_at)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">
                  Provider cost
                </dt>
                <dd>{formatMoney(order.provider_cost_cents ?? 0, order.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-black/35">Provider</dt>
                <dd>
                  {order.providerRecord?.name ?? order.provider} ·{' '}
                  {order.providerRecord?.fulfillment_mode ?? 'unknown'}
                </dd>
              </div>
            </dl>
            {order.provider_last_error && (
              <div className="mt-4 border border-red-200 bg-red-50 p-3">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-red-800">
                  Provider error
                </p>
                <p className="mt-1 whitespace-pre-wrap font-body text-sm leading-relaxed text-red-900">
                  {order.provider_last_error}
                </p>
              </div>
            )}
            {canRetryProvider && (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                  Retry available
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-amber-900">
                  This order failed before Printful saved a provider order id. Katie can retry
                  after reviewing the previous error above.
                </p>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleProviderRetryClick}
                  className="btn-ocean mt-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdating ? 'Retrying Printful...' : 'Retry Printful fulfillment'}
                </button>
              </div>
            )}
            {order.status === 'pending' && (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                  Pending payment recovery
                </p>
                <p className="mt-1 font-body text-sm leading-relaxed text-amber-900">
                  This order is still pending. Before canceling it, Katie should open Stripe and
                  check whether the Checkout Session was paid. If Stripe shows the payment as paid,
                  use this recovery action to re-run the normal payment-received flow.
                </p>
                {order.stripe_session_id ? (
                  <>
                    <p className="mt-2 break-all font-body text-xs leading-relaxed text-amber-900/80">
                      Stripe session to check: {order.stripe_session_id}
                    </p>
                    <button
                      type="button"
                      disabled={isUpdating || !canRecoverStripePayment}
                      onClick={handleStripePaymentRecoveryClick}
                      className="btn-ocean mt-3 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? 'Checking Stripe...' : 'Recover paid Stripe session'}
                    </button>
                  </>
                ) : (
                  <p className="mt-2 font-body text-xs leading-relaxed text-amber-900/80">
                    No Stripe session id is saved on this order, so it cannot be recovered
                    automatically. Check Stripe manually before changing anything.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-ocean/20 bg-sky-50 p-4">
            <h3 className="font-display text-3xl text-black">Fulfillment status</h3>
            {getManualOrderStatusHelp(order.status) && (
              <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
                {getManualOrderStatusHelp(order.status)}
              </p>
            )}
            {isManualProvider ? (
              allowedTransitions.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {allowedTransitions.map((nextStatus) => (
                    <div key={nextStatus}>
                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          (nextStatus === 'shipped' &&
                            !trackingNumber.trim() &&
                            !trackingUrl.trim())
                        }
                        onClick={() => handleStatusClick(nextStatus)}
                        className="btn-ocean disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark {getOrderStatusLabel(nextStatus)}
                      </button>
                      {nextStatus === 'shipped' &&
                        !trackingNumber.trim() &&
                        !trackingUrl.trim() && (
                          <p className="mt-2 max-w-xs font-body text-xs leading-relaxed text-amber-800">
                            Add a tracking number or URL first.
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 font-body text-sm text-black/60">
                  No manual status action is available from this state.
                </p>
              )
            ) : (
              <p className="mt-3 font-body text-sm leading-relaxed text-black/60">
                API provider order status will be advanced by the system in Etapa 6/7. Avoid
                manual changes unless there is a production incident.
              </p>
            )}
          </div>

          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Refunds</h3>
            <div className="mt-3 grid gap-3 font-body text-sm text-black/65 sm:grid-cols-3">
              <p>
                <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                  Refund status
                </span>
                {refundStatusLabel}
              </p>
              <p>
                <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                  Refunded
                </span>
                {formatMoney(refundedTotalCents, order.currency)} of{' '}
                {formatMoney(order.total_cents, order.currency)}
              </p>
              <p>
                <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                  Remaining
                </span>
                {formatMoney(refundableOrderCents, order.currency)}
              </p>
            </div>

            {isShippedOrDelivered && (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
                <p className="font-body text-xs leading-relaxed text-amber-900">
                  This order is already {getOrderStatusLabel(order.status)}. A refund is allowed,
                  but Katie should confirm what the customer will still receive before issuing it.
                </p>
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-1 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
                Refund reason
              </span>
              <textarea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                rows={3}
                placeholder="Example: I could not get this color from the provider, so I refunded that item."
                className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
              />
              <span className="mt-1 block font-body text-xs leading-relaxed text-amber-800">
                This exact text is emailed to the buyer. Do not write an internal note here.
              </span>
            </label>

            <fieldset className="mt-4 border border-black/10 bg-white p-3">
              <legend className="px-1 font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
                Refund cause
              </legend>
              <div className="mt-2 space-y-2">
                <label className="flex gap-3 font-body text-sm text-black/70">
                  <input
                    type="radio"
                    name={`refund-cause-${order.id}`}
                    value="process_failure"
                    checked={refundCause === 'process_failure'}
                    onChange={() => setRefundCause('process_failure')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-black">Process / provider failure</span>
                    <span className="block text-xs leading-relaxed text-black/50">
                      Something in our automatic flow or provider fulfillment failed. Counts as an
                      operational incident.
                    </span>
                  </span>
                </label>
                <label className="flex gap-3 font-body text-sm text-black/70">
                  <input
                    type="radio"
                    name={`refund-cause-${order.id}`}
                    value="customer_request"
                    checked={refundCause === 'customer_request'}
                    onChange={() => setRefundCause('customer_request')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-black">Customer request</span>
                    <span className="block text-xs leading-relaxed text-black/50">
                      Size issue, changed mind, damaged item, or normal support case. Logged as a
                      refund, but not counted as an incident.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                disabled={isUpdating || !refundReason.trim() || refundableOrderCents <= 0}
                onClick={() =>
                  handleRefundClick({
                    amountCents: refundableOrderCents,
                    label: 'the remaining order balance',
                  })
                }
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refund remaining order balance (
                {formatMoney(refundableOrderCents, order.currency)})
              </button>

              {effectiveOrder.items.length > 0 && (
                <div className="space-y-3">
                  <p className="font-body text-xs uppercase tracking-[0.14em] text-black/35">
                    Refund one item
                  </p>
                  {effectiveOrder.items.map((item) => {
                    const remainingQuantity = item.effectiveQuantity;
                    const quantityValue = refundQuantities[item.id] ?? '1';
                    const parsedQuantity = Number(quantityValue);
                    const isQuantityValid =
                      Number.isInteger(parsedQuantity) &&
                      parsedQuantity > 0 &&
                      parsedQuantity <= remainingQuantity;
                    const refundQuantity = isQuantityValid ? parsedQuantity : 1;
                    const itemRefundCents = item.unit_price_cents * refundQuantity;

                    return (
                      <div key={item.id} className="border border-black/10 bg-white p-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_96px_168px] sm:items-end">
                          <p className="font-body text-sm text-black/65">
                            <span className="block text-xs uppercase tracking-[0.12em] text-black/35">
                              Item
                            </span>
                            {item.color} / {item.size} · {formatMoney(item.unit_price_cents, order.currency)} each
                            {item.productName && (
                              <span className="mt-1 block text-xs text-black/55">
                                {item.productName}
                              </span>
                            )}
                            <span className="mt-1 block text-xs text-black/45">
                              {remainingQuantity} of {item.quantity} unit
                              {item.quantity === 1 ? '' : 's'} still refundable.
                            </span>
                          </p>
                          <label>
                            <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/35">
                              Qty
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={remainingQuantity || 1}
                              value={quantityValue}
                              disabled={remainingQuantity <= 0}
                              onChange={(event) =>
                                setRefundQuantities((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              className="w-full border border-black/15 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean disabled:opacity-50"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              !refundReason.trim() ||
                              remainingQuantity <= 0 ||
                              !isQuantityValid
                            }
                            onClick={() =>
                              handleRefundClick({
                                orderItemId: item.id,
                                quantity: refundQuantity,
                                amountCents: itemRefundCents,
                                label: `${refundQuantity} × ${item.color} / ${item.size}`,
                              })
                            }
                            className="btn-ocean disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Refund {formatMoney(itemRefundCents, order.currency)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-black/10 pt-4">
              <h4 className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/35">
                Refund history
              </h4>
              {order.refunds.length === 0 ? (
                <p className="mt-3 font-body text-sm text-black/45">No refunds recorded yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="border border-black/10 bg-white p-3">
                      <p className="font-body text-sm font-semibold text-black">
                        {formatMoney(refund.amount_cents, refund.currency)}
                        {refund.quantity ? ` · qty ${refund.quantity}` : ' · order balance'}
                      </p>
                      <p className="mt-1 font-body text-xs text-black/45">
                        {formatDateTime(refund.created_at)} · Stripe refund{' '}
                        {truncateId(refund.stripe_refund_id)}
                      </p>
                      <p className="mt-1 font-body text-xs text-black/45">
                        Cause:{' '}
                        {refund.cause === 'customer_request'
                          ? 'customer request'
                          : 'process / provider failure'}
                      </p>
                      <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
                        {refund.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Customer notifications</h3>
            {order.notifications.length === 0 ? (
              <p className="mt-3 font-body text-sm text-black/45">
                No customer status emails recorded yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {order.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border p-3 font-body text-sm ${
                      notification.status === 'sent'
                        ? 'border-green-200 bg-green-50 text-green-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <p className="font-semibold">
                      {notification.notification_type.replaceAll('_', ' ')} ·{' '}
                      {notification.status}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {formatDateTime(notification.created_at)}
                    </p>
                    <p className="mt-1 break-words">To: {notification.recipient_email || '—'}</p>
                    <p className="mt-1 break-words">Subject: {notification.subject || '—'}</p>
                    {notification.error_message && (
                      <p className="mt-2 break-words text-xs">
                        Error: {notification.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-ocean/20 bg-sky-50 p-4">
            <h3 className="font-display text-3xl text-black">Dispute evidence package</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
              Read-only fields to copy into Stripe if this order becomes a dispute. Use the{' '}
              <Link href="/admin/shop-disputes" className="text-ocean underline">
                dispute playbook
              </Link>{' '}
              before deciding whether to fight or refund.
            </p>
            {getEvidenceMissingFields(order).length > 0 ? (
              <div className="mt-3 border border-amber-200 bg-amber-50 p-3">
                <p className="font-body text-sm font-semibold text-amber-900">
                  Missing or weak evidence:
                </p>
                <p className="mt-1 font-body text-sm text-amber-900/80">
                  {getEvidenceMissingFields(order).join(', ')}
                </p>
              </div>
            ) : (
              <p className="mt-3 font-body text-sm text-green-800">
                Core checkout disclosure evidence is present.
              </p>
            )}
            <div className="mt-4 grid gap-3">
              {[
                {
                  label: 'customer_order_number',
                  value: getCustomerOrderNumber(order),
                },
                {
                  label: 'provider_order_reference',
                  value:
                    order.provider_order_id ||
                    'Not recorded. For manual providers, save this when Katie places the order.',
                },
                {
                  label: 'refund_policy file',
                  value: `/shop-policies/${order.return_policy_version ?? SHOP_RETURN_POLICY_VERSION}.md`,
                },
                {
                  label: 'refund_policy_disclosure',
                  value: `Customer-facing order number: ${getCustomerOrderNumber(order)}. The buyer saw the return policy on the product page, cart, and hosted Stripe Checkout before paying. Cart acceptance: ${order.cart_terms_accepted ? 'accepted' : 'not recorded'} at ${order.cart_terms_accepted_at ?? 'not recorded'} with text version ${order.cart_terms_version ?? 'not recorded'}. Stripe terms acceptance: ${order.terms_accepted ? 'accepted' : 'not recorded'} at ${order.terms_accepted_at ?? 'not recorded'}. Policy version: ${order.return_policy_version ?? 'not recorded'} (${order.return_policy_url ?? 'URL not recorded'}).`,
                },
                {
                  label: 'refund_refusal_explanation',
                  value:
                    'This was a made-to-order product. The buyer accepted that size changes, color changes, and buyer’s remorse are final sale when the item arrives correct. Damaged, defective, wrong, or out-of-tolerance garments are covered.',
                },
                {
                  label: 'product_description',
                  value: formatEvidenceSnapshot(order),
                },
                {
                  label: 'customer_purchase_ip',
                  value: order.customer_purchase_ip || 'Not recorded',
                },
                {
                  label: 'shipping_address',
                  value: formatEvidenceAddress(order) || 'Not recorded',
                },
                {
                  label: 'shipping_tracking_number',
                  value: order.tracking_number || 'Not recorded',
                },
                {
                  label: 'customer_communication',
                  value:
                    order.notifications
                      .map(
                        (notification) =>
                          `${notification.notification_type} ${notification.status} — ${formatDateTime(notification.created_at)} — ${notification.subject}`
                      )
                      .join('\n') || 'No customer emails recorded.',
                },
              ].map((field) => (
                <div key={field.label} className="border border-black/10 bg-white p-3">
                  <p className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-ocean">
                    {field.label}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-body text-xs leading-relaxed text-black/70">
                    {field.value}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-black/10 bg-gray-50 p-4">
            <h3 className="font-display text-3xl text-black">Operational incidents</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
              Manual refunds, provider retries, and manual status changes are logged here so
              repeated operational problems are visible.
            </p>
            {order.incidents.length === 0 ? (
              <p className="mt-3 font-body text-sm text-black/45">
                No manual interventions recorded for this order.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {order.incidents.map((incident) => (
                  <div key={incident.id} className="border border-black/10 bg-white p-3">
                    <p className="font-body text-sm font-semibold text-black">
                      {incident.incident_type.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 font-body text-xs text-black/45">
                      {formatDateTime(incident.created_at)}
                    </p>
                    <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
                      {incident.reason || 'No reason recorded.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
