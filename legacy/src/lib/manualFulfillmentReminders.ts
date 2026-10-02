import type { EcommerceOrderStatus, EcommerceProvider } from '@/lib/ecommerceTypes';

export const MANUAL_FULFILLMENT_REMINDER_THRESHOLDS = [
  {
    key: 'awaiting-48h',
    label: '48h awaiting manual fulfillment',
    statuses: ['awaiting_manual_fulfillment'] as EcommerceOrderStatus[],
    ageMs: 48 * 60 * 60 * 1000,
    severity: 'medium' as const,
  },
  {
    key: 'awaiting-96h',
    label: '96h awaiting manual fulfillment',
    statuses: ['awaiting_manual_fulfillment'] as EcommerceOrderStatus[],
    ageMs: 96 * 60 * 60 * 1000,
    severity: 'high' as const,
  },
  {
    key: 'awaiting-168h',
    label: '7d awaiting manual fulfillment',
    statuses: ['awaiting_manual_fulfillment'] as EcommerceOrderStatus[],
    ageMs: 168 * 60 * 60 * 1000,
    severity: 'critical' as const,
  },
  {
    key: 'submitted-7d',
    label: '7d submitted but not shipped',
    statuses: ['submitted', 'in_production'] as EcommerceOrderStatus[],
    ageMs: 7 * 24 * 60 * 60 * 1000,
    severity: 'high' as const,
  },
  {
    key: 'submitted-14d',
    label: '14d submitted but not shipped',
    statuses: ['submitted', 'in_production'] as EcommerceOrderStatus[],
    ageMs: 14 * 24 * 60 * 60 * 1000,
    severity: 'critical' as const,
  },
];

export function getManualFulfillmentReminderStage(
  order: {
    status: EcommerceOrderStatus;
    created_at: string;
    providerRecord?: Pick<EcommerceProvider, 'fulfillment_mode'> | null;
  },
  now = Date.now()
) {
  if (order.providerRecord?.fulfillment_mode !== 'manual') return null;

  const ageMs = now - new Date(order.created_at).getTime();
  return (
    MANUAL_FULFILLMENT_REMINDER_THRESHOLDS.filter(
      (threshold) => threshold.statuses.includes(order.status) && ageMs >= threshold.ageMs
    ).at(-1) ?? null
  );
}
