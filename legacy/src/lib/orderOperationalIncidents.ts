import 'server-only';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type OrderOperationalIncidentType =
  | 'manual_refund'
  | 'manual_provider_retry'
  | 'manual_status_change'
  | 'manual_provider_order_reference_change'
  | 'manual_fulfillment_reminder'
  | 'missing_terms_consent'
  | 'pending_order_missing_stripe_session'
  | 'paid_webhook_order_update_mismatch'
  | 'paid_checkout_promotion_mismatch'
  | 'paid_checkout_promotion_session_reconciled'
  | 'paid_checkout_promotion_redemption_failed';

export async function recordOrderOperationalIncident({
  orderId,
  incidentType,
  reason,
  metadata = {},
}: {
  orderId: string;
  incidentType: OrderOperationalIncidentType;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.from('order_operational_incidents').insert({
    order_id: orderId,
    incident_type: incidentType,
    reason,
    metadata,
  });

  if (error) {
    console.warn('[order-operational-incidents] record_failed', {
      orderId,
      incidentType,
      reason: error.message,
    });
  }
}

export async function recordOrderOperationalIncidentOnce({
  orderId,
  incidentType,
  reason,
  metadata = {},
}: {
  orderId: string;
  incidentType: OrderOperationalIncidentType;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  if (!supabaseAdmin) return;

  const { data, error: lookupError } = await supabaseAdmin
    .from('order_operational_incidents')
    .select('id')
    .eq('order_id', orderId)
    .eq('incident_type', incidentType)
    .limit(1);

  if (lookupError) {
    console.warn('[order-operational-incidents] dedupe_lookup_failed', {
      orderId,
      incidentType,
      reason: lookupError.message,
    });
    return recordOrderOperationalIncident({ orderId, incidentType, reason, metadata });
  }

  if ((data ?? []).length > 0) return;

  return recordOrderOperationalIncident({ orderId, incidentType, reason, metadata });
}
