import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import { submitPrintfulOrder } from '@/lib/printfulFulfillment';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { EcommerceOrderStatus } from '@/lib/ecommerceTypes';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RetryOrderRecord = {
  id: string;
  status: EcommerceOrderStatus;
  provider: string;
  provider_order_id: string | null;
  provider_last_error: string;
};

type ProviderRecord = {
  code: string;
  fulfillment_mode: 'api' | 'manual';
  api_fulfillment_enabled: boolean;
};

const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const order = orderData as RetryOrderRecord;

  if (order.provider_order_id) {
    return NextResponse.json(
      { error: 'This order already has a provider order id and cannot be retried.' },
      { status: 400 }
    );
  }

  if (order.status !== 'failed') {
    return NextResponse.json(
      { error: 'Provider retry is only available for failed orders.' },
      { status: 400 }
    );
  }

  const { data: providerData, error: providerError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('code,fulfillment_mode,api_fulfillment_enabled')
    .eq('code', order.provider)
    .single();

  if (providerError || !providerData) {
    return NextResponse.json({ error: 'Unable to validate order provider.' }, { status: 500 });
  }

  const provider = providerData as ProviderRecord;

  if (provider.fulfillment_mode !== 'api' || provider.code !== 'printful') {
    return NextResponse.json(
      { error: 'Provider retry is currently only available for failed Printful API orders.' },
      { status: 400 }
    );
  }

  if (!provider.api_fulfillment_enabled) {
    return NextResponse.json(
      {
        error:
          'Printful API fulfillment is locked for production. Manual providers are the only production path right now.',
      },
      { status: 400 }
    );
  }

  await submitPrintfulOrder(order.id);

  const { data: latestOrderData, error: latestOrderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', order.id)
    .single();

  if (latestOrderError || !latestOrderData) {
    return NextResponse.json({ error: 'Retry ran, but the order could not be reloaded.' }, { status: 500 });
  }

  const latestOrder = latestOrderData as RetryOrderRecord;
  await recordOrderOperationalIncident({
    orderId: order.id,
    incidentType: 'manual_provider_retry',
    reason: 'Admin retried failed Printful fulfillment.',
    metadata: {
      provider: provider.code,
      previous_status: order.status,
      previous_error: order.provider_last_error,
      result_status: latestOrder.status,
      result_provider_order_id: latestOrder.provider_order_id,
      result_error: latestOrder.provider_last_error,
    },
  });

  return NextResponse.json({
    order: latestOrderData,
    message:
      latestOrder.status === 'failed'
        ? `Retry finished, but the order is still failed: ${latestOrder.provider_last_error || 'unknown provider error'}`
        : 'Provider retry finished.',
  });
}
