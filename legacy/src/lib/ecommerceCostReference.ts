export const PRINTFUL_COST_REFERENCE_VERIFIED_AT = '2026-07-29';

export const PRINTFUL_COST_REFERENCE_SOURCE =
  'Printful Catalog V1, Catalog V2 pricing, and official Printful US flat-rate shipping CSV';

export const PRINTFUL_BASE_COST_BY_SIZE_CENTS: Record<string, number> = {
  S: 944,
  M: 944,
  L: 944,
  XL: 944,
  '2XL': 1144,
  '3XL': 1344,
};

export const PRINTFUL_PLACEMENT_ADDITIONAL_COST_CENTS: Record<string, number> = {
  front: 0,
  back: 595,
  label_inside: 99,
  label_outside: 249,
  sleeve_left: 249,
  sleeve_right: 249,
  embroidery_chest_left: 295,
  embroidery_chest_center: 295,
  embroidery_sleeve_left_top: 295,
  embroidery_sleeve_right_top: 295,
};

export const PRINTFUL_UNLIMITED_COLOR_EMBROIDERY_ADDITIONAL_CENTS = 350;

export const PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS = 475;
export const PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS = 220;

// Estimated from the validated US draft order sample:
// Gildan Kelly Green/M = $9.44 product + $4.75 shipping + $1.01 tax.
export const PRINTFUL_US_TAX_ESTIMATE_BPS = 712;

export const STRIPE_PERCENT_FEE_BPS = 290;
export const STRIPE_FIXED_FEE_CENTS = 30;

export const PRODUCT_MARGIN_WARNING_THRESHOLD_CENTS = 800;

export function formatUsd(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function calculateStripeFeeCents(chargeAmountCents: number) {
  return Math.ceil((chargeAmountCents * STRIPE_PERCENT_FEE_BPS) / 10000) + STRIPE_FIXED_FEE_CENTS;
}

export function calculateEstimatedPrintfulTaxCents(printfulSubtotalCents: number) {
  return Math.ceil((printfulSubtotalCents * PRINTFUL_US_TAX_ESTIMATE_BPS) / 10000);
}

export function getUniquePlacementAdditionalCostCents(placements: string[]) {
  const uniquePlacements = [...new Set(placements)];

  return uniquePlacements.reduce(
    (total, placement) => total + (PRINTFUL_PLACEMENT_ADDITIONAL_COST_CENTS[placement] ?? 0),
    0
  );
}

export function getPlacementLabel(placement: string) {
  return placement.replaceAll('_', ' ');
}

export function calculateEstimatedMargin({
  retailPriceCents,
  printfulProductCostCents,
  quantity,
  shippingFirstItemCents = PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS,
  shippingAdditionalItemCents = PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS,
}: {
  retailPriceCents: number;
  printfulProductCostCents: number;
  quantity: number;
  shippingFirstItemCents?: number;
  shippingAdditionalItemCents?: number;
}) {
  const shippingCents =
    shippingFirstItemCents + Math.max(0, quantity - 1) * shippingAdditionalItemCents;
  const printfulSubtotalCents = printfulProductCostCents * quantity + shippingCents;
  const taxCents = calculateEstimatedPrintfulTaxCents(printfulSubtotalCents);
  const stripeFeeCents = calculateStripeFeeCents(retailPriceCents * quantity);
  const totalCostCents = printfulSubtotalCents + taxCents + stripeFeeCents;
  const marginCents = retailPriceCents * quantity - totalCostCents;

  return {
    quantity,
    shippingCents,
    taxCents,
    stripeFeeCents,
    totalCostCents,
    marginCents,
    shippingPerUnitCents: Math.round(shippingCents / quantity),
    taxPerUnitCents: Math.round(taxCents / quantity),
    stripeFeePerUnitCents: Math.round(stripeFeeCents / quantity),
    totalCostPerUnitCents: Math.round(totalCostCents / quantity),
    marginPerUnitCents: Math.round(marginCents / quantity),
  };
}
