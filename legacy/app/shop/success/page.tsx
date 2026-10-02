import type { Metadata } from 'next';
import Link from 'next/link';
import { ClearCartOnSuccess } from '@/components/shop/ClearCartOnSuccess';
import { ShopPurchaseTracker } from '@/components/shop/ShopPurchaseTracker';
import type { ShopPurchaseAnalytics } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const metadata: Metadata = {
  title: 'Order received',
  description: 'Your What Katie Seas shop order status.',
  robots: {
    index: false,
    follow: false,
  },
};

type ShopSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

type SuccessOrder = {
  id: string;
  customer_order_number: string | null;
  status: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  net_cents: number;
  currency: string;
};

type SuccessOrderItem = {
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
};

type SuccessProductVariant = {
  id: string;
  product_id: string;
};

type SuccessProduct = {
  id: string;
  name: string;
};

const POST_PAYMENT_STATUSES = new Set([
  'paid',
  'awaiting_manual_fulfillment',
  'submitting',
  'submitted',
  'in_production',
  'shipped',
  'delivered',
  'on_hold',
  'refunded',
]);

function formatUsd(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function isStripeSessionId(value: string | undefined): value is string {
  return Boolean(value && /^cs_(test|live)_[A-Za-z0-9]+$/.test(value));
}

async function fetchOrdersForSession(sessionId: string): Promise<SuccessOrder[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id,customer_order_number,status,subtotal_cents,shipping_cents,tax_cents,total_cents,currency'
    )
    .eq('stripe_session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return [];

  const orders = (data ?? []) as Omit<SuccessOrder, 'refunded_cents' | 'net_cents'>[];
  if (orders.length === 0) return [];

  const { data: refundsData } = await supabaseAdmin
    .from('order_refunds')
    .select('order_id,amount_cents')
    .in(
      'order_id',
      orders.map((order) => order.id)
    );
  const refundedByOrderId = new Map<string, number>();

  (refundsData ?? []).forEach((refund) => {
    refundedByOrderId.set(
      String(refund.order_id),
      (refundedByOrderId.get(String(refund.order_id)) ?? 0) + Number(refund.amount_cents ?? 0)
    );
  });

  return orders.map((order) => {
    const refundedCents = Math.min(refundedByOrderId.get(order.id) ?? 0, order.total_cents);

    return {
      ...order,
      refunded_cents: refundedCents,
      net_cents: Math.max(order.total_cents - refundedCents, 0),
    };
  });
}

async function fetchPurchaseAnalytics(
  orders: SuccessOrder[],
  transactionId: string
): Promise<ShopPurchaseAnalytics | null> {
  if (!supabaseAdmin || orders.length === 0) return null;

  const orderIds = orders.map((order) => order.id);
  const { data: itemsData, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('product_variant_id,quantity,unit_price_cents,color,size')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true });

  if (itemsError) return null;

  const orderItems = (itemsData ?? []) as SuccessOrderItem[];
  const variantIds = [...new Set(orderItems.map((item) => item.product_variant_id))];
  if (variantIds.length === 0) return null;

  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id')
    .in('id', variantIds);

  if (variantsError) return null;

  const variants = (variantsData ?? []) as SuccessProductVariant[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  if (productIds.length === 0) return null;

  const { data: productsData, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id,name')
    .in('id', productIds);

  if (productsError) return null;

  const products = (productsData ?? []) as SuccessProduct[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items = orderItems.flatMap((item) => {
    const variant = variantsById.get(item.product_variant_id);
    const product = variant ? productsById.get(variant.product_id) : null;
    if (!variant || !product) return [];

    return [
      {
        item_id: product.id,
        item_name: product.name,
        affiliation: 'What Katie Seas Shop' as const,
        item_brand: 'What Katie Seas' as const,
        item_variant: `${item.color} / ${item.size}`,
        price: item.unit_price_cents / 100,
        quantity: item.quantity,
      },
    ];
  });

  if (items.length !== orderItems.length) return null;

  const currencies = [...new Set(orders.map((order) => order.currency.toUpperCase()))];
  if (currencies.length !== 1) return null;

  return {
    transaction_id: transactionId,
    currency: currencies[0],
    value:
      orderItems.reduce(
        (total, item) => total + item.unit_price_cents * item.quantity,
        0
      ) / 100,
    shipping: orders.reduce((total, order) => total + order.shipping_cents, 0) / 100,
    tax: orders.reduce((total, order) => total + order.tax_cents, 0) / 100,
    items,
  };
}

export default async function ShopSuccessPage({ searchParams }: ShopSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const orders = isStripeSessionId(sessionId) ? await fetchOrdersForSession(sessionId) : [];
  const hasOnHoldOrder = orders.some((order) => order.status === 'on_hold');
  const hasPaidOrder = orders.some((order) =>
    ['paid', 'awaiting_manual_fulfillment', 'on_hold'].includes(order.status)
  );
  const isProcessing = orders.length === 0 || orders.some((order) => order.status === 'pending');
  const totalCents = orders.reduce((total, order) => total + order.total_cents, 0);
  const refundedCents = orders.reduce((total, order) => total + order.refunded_cents, 0);
  const netCents = orders.reduce((total, order) => total + order.net_cents, 0);
  const currency = orders[0]?.currency ?? 'USD';
  const customerOrderNumber =
    orders.find((order) => order.customer_order_number)?.customer_order_number ?? null;
  const isConfirmedPurchase =
    orders.length > 0 && orders.every((order) => POST_PAYMENT_STATUSES.has(order.status));
  const purchaseAnalytics =
    isConfirmedPurchase && customerOrderNumber
      ? await fetchPurchaseAnalytics(orders, customerOrderNumber)
      : null;

  return (
    <main className="min-h-screen bg-white pt-24">
      <ClearCartOnSuccess />
      {purchaseAnalytics && <ShopPurchaseTracker purchase={purchaseAnalytics} />}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center md:px-8 md:py-24">
        <span className="font-body text-sm uppercase tracking-[0.18em] text-ocean">
          What Katie Seas shop
        </span>
        <h1 className="mt-4 font-display text-5xl leading-none text-black md:text-6xl">
          {hasPaidOrder ? 'Order received.' : 'Thanks for your order.'}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-black/62">
          {hasOnHoldOrder
            ? 'Payment was confirmed, but Katie needs to review the shipping details before fulfillment can start. Please check your email and reply with the requested address details.'
            : hasPaidOrder
            ? 'Payment was confirmed. Katie has the order details and will keep you posted as your purchase moves forward.'
            : 'Your payment is being confirmed. You will receive an email shortly with your order details and the next steps.'}
        </p>

        {customerOrderNumber && (
          <p className="mx-auto mt-4 max-w-2xl font-body text-sm font-semibold uppercase tracking-[0.14em] text-ocean">
            Order number: {customerOrderNumber}
          </p>
        )}

        {orders.length > 0 && (
          <div className="mt-8 border border-ocean/20 bg-sky-50 p-6 text-left">
            <h2 className="font-display text-3xl text-black">Order status</h2>
            <div className="mt-4 divide-y divide-ocean/10">
              {orders.map((order, index) => (
                <div key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-body text-sm font-semibold text-black">
                      {orders.length > 1 ? `Package ${index + 1} of ${orders.length}` : 'Package'}
                    </p>
                    <p className="font-body text-xs uppercase tracking-[0.12em] text-black/45">
                      {order.status}
                    </p>
                  </div>
                  <p className="font-body text-sm font-semibold text-black">
                    {formatUsd(order.net_cents, order.currency)}
                  </p>
                  {order.refunded_cents > 0 && (
                    <p className="font-body text-xs text-black/45">
                      {formatUsd(order.refunded_cents, order.currency)} refunded
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ocean/15 pt-4">
              <span className="font-body text-sm uppercase tracking-[0.14em] text-black/50">
                Current net total
              </span>
              <span className="font-body text-lg font-semibold text-black">
                {formatUsd(netCents, currency)}
              </span>
            </div>
            {refundedCents > 0 && (
              <p className="mt-2 font-body text-xs text-black/45">
                Original payment: {formatUsd(totalCents, currency)} · Refunded:{' '}
                {formatUsd(refundedCents, currency)}
              </p>
            )}
          </div>
        )}

        {isProcessing && (
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-relaxed text-amber-800">
            If you do not receive an email soon, please contact Katie with your order number so she
            can check the purchase status.
          </p>
        )}

        {hasOnHoldOrder && (
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-relaxed text-amber-800">
            Your payment is received. Fulfillment is paused only until the shipping address is
            confirmed.
          </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn-ocean justify-center">
            Back to shop
          </Link>
          <Link href="/" className="btn-secondary justify-center">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
