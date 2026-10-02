export const SHOP_RETURN_POLICY_VERSION = 'returns-v8-2026-08-29';
export const SHOP_RETURN_POLICY_EFFECTIVE_DATE = 'August 29, 2026';
export const SHOP_RETURN_POLICY_PATH = '/shop/returns';

export const SHOP_TERMS_ACCEPTANCE_TEXT =
  'I understand this is made-to-order merch. Size changes, color changes, and buyer’s remorse are final sale when the item arrives correct; the published damage and loss terms apply.';

export const SHOP_CHECKOUT_SUBMIT_TEXT =
  'Please check your size and shipping address before paying. Shipping is either included in each item price or shown separately before payment.';

export const SHOP_CART_POLICY_ACCEPTANCE_VERSION = 'cart-policy-v7-2026-08-29';
export const SHOP_CART_POLICY_ACCEPTANCE_TEXT =
  'I understand this item is made to order and final sale for size or color when it arrives correct.';
export const SHOP_RETURN_POLICY_CONTENT_SHA256 =
  'd97e4f2090978a3d923d92de1dc41013a51ff9b6584c859d231dc458c0855e4e';

const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.whatkatieseas.com'
).replace(/\/$/, '');

export const PRINTFUL_GILDAN_64000_SIZE_GUIDE_VERSION =
  'printful-12-gildan-64000-2026-08-09-fb48b691';

export const PRINTFUL_GILDAN_64000_SIZE_GUIDE_SOURCE_URL =
  'https://api.printful.com/products/12/sizes';

export type SizeGuideMeasurementValue = {
  size: string;
  value?: string;
  min_value?: string;
  max_value?: string;
};

export type SizeGuideMeasurement = {
  type_label: string;
  values: SizeGuideMeasurementValue[];
};

export type SizeGuideTable = {
  type: string;
  unit: string;
  description: string;
  measurements: SizeGuideMeasurement[];
};

export type EcommerceSizeGuide = {
  id: string;
  provider?: string;
  product_id?: string;
  provider_catalog_product_id?: number | null;
  base_garment_name?: string | null;
  base_garment_provider_identifier?: string | null;
  version: string;
  unit: string;
  measurement_type: string;
  title: string;
  tolerance: string;
  source_url: string;
  source_checked_at: string;
  guide: {
    tables: SizeGuideTable[];
  };
};

export type CustomerSizeGuide = Pick<
  EcommerceSizeGuide,
  'unit' | 'measurement_type' | 'tolerance' | 'base_garment_name' | 'guide'
>;

export function sanitizeCustomerGarmentText(text: string, identifier: string) {
  if (!identifier) return text;

  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text
    .replace(new RegExp(`\\s*\\(${escapedIdentifier}\\)`, 'gi'), '')
    .replace(new RegExp(escapedIdentifier, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function toCustomerSizeGuide(
  sizeGuide: EcommerceSizeGuide | null | undefined
): CustomerSizeGuide | null {
  if (!sizeGuide) return null;

  const identifier = sizeGuide.base_garment_provider_identifier?.trim() ?? '';
  const clean = (value: string) => sanitizeCustomerGarmentText(value, identifier);

  return {
    unit: sizeGuide.unit,
    measurement_type: sizeGuide.measurement_type,
    tolerance: clean(sizeGuide.tolerance),
    base_garment_name: sizeGuide.base_garment_name
      ? clean(sizeGuide.base_garment_name)
      : null,
    guide: {
      tables: sizeGuide.guide.tables.map((table) => ({
        ...table,
        description: clean(table.description),
      })),
    },
  };
}

export type SizeGuideSnapshotItem = {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_variant_id: string;
  color: string;
  size: string;
  size_guide_version: string;
  size_guide_unit: string;
  size_guide_measurement_type: string;
  base_garment_name?: string | null;
  base_garment_provider_identifier?: string | null;
  measurements: Array<{
    label: string;
    value: string;
  }>;
  tolerance: string;
};

export function getReturnPolicyUrl() {
  return `${PUBLIC_SITE_URL}${SHOP_RETURN_POLICY_PATH}`;
}

export function getSizeGuideTable(
  sizeGuide:
    | Pick<EcommerceSizeGuide, 'guide' | 'measurement_type' | 'unit'>
    | null
    | undefined
) {
  if (!sizeGuide) return null;

  const table =
    sizeGuide.guide?.tables?.find(
      (candidate) =>
        candidate.type === sizeGuide.measurement_type && candidate.unit === sizeGuide.unit
    ) ?? null;

  return table;
}

export function assertValidSizeGuide(sizeGuide: EcommerceSizeGuide) {
  const table = getSizeGuideTable(sizeGuide);

  if (!table) {
    throw new Error(
      `Size guide ${sizeGuide.version} declares ${sizeGuide.measurement_type}/${sizeGuide.unit}, but no matching table exists.`
    );
  }

  return table;
}

export function getMeasurementsForSize(
  sizeGuide: EcommerceSizeGuide | null | undefined,
  size: string
) {
  const table = getSizeGuideTable(sizeGuide);
  if (!table) return [];

  return table.measurements
    .map((measurement) => {
      const value = measurement.values.find((candidate) => candidate.size === size);
      if (!value) return null;

      const displayValue =
        value.value ??
        (value.min_value && value.max_value ? `${value.min_value}–${value.max_value}` : '');

      if (!displayValue) return null;

      return {
        label: measurement.type_label,
        value: displayValue.trim(),
      };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

export function formatSizeGuideMeasurements(
  measurements: Array<{ label: string; value: string }>,
  unit: string
) {
  if (measurements.length === 0) return 'Size guide measurements unavailable.';

  return measurements.map((item) => `${item.label}: ${item.value} ${unit}`).join(' · ');
}
