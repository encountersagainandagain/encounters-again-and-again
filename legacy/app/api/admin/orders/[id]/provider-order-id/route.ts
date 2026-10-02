import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { recordOrderOperationalIncident } from '@/lib/orderOperationalIncidents';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { id: orderId } = await context.params;

  if (!isUuid(orderId)) {
    return NextResponse.json({ error: 'Invalid order id.' }, { status: 400 });
  }

  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const providerOrderId = String(body?.providerOrderId ?? '').trim();

  if (providerOrderId.length > 80) {
    return NextResponse.json(
      { error: 'Provider order reference must be 80 characters or fewer.' },
      { status: 400 }
    );
  }

  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,provider,provider_order_id')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { data: providerData, error: providerError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('fulfillment_mode')
    .eq('code', orderData.provider)
    .single();

  if (providerError || !providerData) {
    return NextResponse.json({ error: 'Unable to validate order provider.' }, { status: 500 });
  }

  if (providerData.fulfillment_mode !== 'manual') {
    return NextResponse.json(
      { error: 'Provider order references can only be edited for manual-provider orders.' },
      { status: 400 }
    );
  }

  const nextProviderOrderId = providerOrderId || null;

  if ((orderData.provider_order_id ?? null) === nextProviderOrderId) {
    return NextResponse.json({ order: orderData });
  }

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ provider_order_id: nextProviderOrderId })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateError || !updatedOrder) {
    return NextResponse.json({ error: 'Unable to save provider order reference.' }, { status: 500 });
  }

  await recordOrderOperationalIncident({
    orderId,
    incidentType: 'manual_provider_order_reference_change',
    reason: 'Admin updated the manual provider order reference.',
    metadata: {
      previous_provider_order_id_present: Boolean(orderData.provider_order_id),
      next_provider_order_id_present: Boolean(nextProviderOrderId),
      provider: orderData.provider,
    },
  });

  return NextResponse.json({ order: updatedOrder });
}
