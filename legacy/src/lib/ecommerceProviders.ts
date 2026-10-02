import { supabase } from '@/lib/supabase';
import type { EcommerceProvider, FulfillmentMode, ProviderPolicyFieldStatus } from '@/lib/ecommerceTypes';

export type UpsertManualProviderInput = {
  code: string;
  name: string;
  is_active: boolean;
  shipping_countries: string[];
  shipping_first_item_cents: number;
  shipping_additional_item_cents: number;
  provider_shipping_rates?: ProviderShippingRateInput[];
  shipping_cost_status: ProviderPolicyFieldStatus;
  contact_notes: string;
  contact_email: string;
  contact_url: string;
  damaged_claim_window_days: number;
  recommended_issue_report_window_days: number | null;
  photo_evidence_required: boolean;
  photo_evidence_description: string;
  lost_package_claim_window_days: number;
  lost_package_window_basis: string;
  eligible_return_request_window_days: number | null;
  delivered_not_received_policy: string;
  address_change_status: ProviderPolicyFieldStatus;
  address_change_cutoff: string;
  wrong_address_reship_status: ProviderPolicyFieldStatus;
  wrong_address_reship_policy: string;
  accepts_size_color_remorse_returns: boolean;
  production_time_description: string;
  shipping_time_status: ProviderPolicyFieldStatus;
  shipping_time_description: string;
  return_shipping_payer: string;
  return_authorization_required: boolean;
  claim_review_time_description: string;
  cancellation_cutoff: string;
  non_returnable_categories: string;
  refund_method_description: string;
  production_delay_compensation: string;
  customs_responsibility: string;
  support_contact: string;
  claim_submission_instructions: string;
  return_address_status: ProviderPolicyFieldStatus;
  return_address: string;
  policy_source_url: string;
  policy_source_urls: string[];
  policy_source_note: string;
  policy_verified_at: string;
};

export type ProviderShippingRateInput = {
  country_code: string;
  first_item_cents: number;
  additional_item_cents: number;
  is_active: boolean;
};

export type AdminProviderShippingRate = ProviderShippingRateInput & {
  provider: string;
  currency: string;
  source_note: string;
  verified_at: string | null;
};

export type UpsertProviderPolicyInput = Omit<
  UpsertManualProviderInput,
  'code' | 'contact_notes' | 'contact_email' | 'contact_url'
> & {
  contact_notes?: string;
  contact_email?: string;
  contact_url?: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export function normalizeProviderCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function centsFromDollars(value: string) {
  const amount = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Shipping cost must be zero or greater.');
  }

  return Math.round(amount * 100);
}

export function dollarsFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

async function syncProviderDefaultShippingRates(
  provider: Pick<
    UpsertManualProviderInput,
    | 'shipping_countries'
    | 'shipping_first_item_cents'
    | 'shipping_additional_item_cents'
    | 'provider_shipping_rates'
    | 'shipping_cost_status'
  > & { code: string }
) {
  const client = requireSupabase();
  const providerCode = normalizeProviderCode(provider.code);

  const { error: deactivateError } = await client
    .from('ecommerce_provider_shipping_rates')
    .update({ is_active: false })
    .eq('provider', providerCode);

  if (deactivateError) throw deactivateError;

  const explicitRates = provider.provider_shipping_rates ?? [];
  const rows =
    explicitRates.length > 0
      ? explicitRates.map((rate) => ({
          provider: providerCode,
          country_code: rate.country_code.trim().toUpperCase(),
          first_item_cents: rate.first_item_cents,
          additional_item_cents: rate.additional_item_cents,
          currency: 'USD',
          source_note:
            'Default provider shipping rate maintained from the admin provider form. Override per product only when this provider charges differently for that product.',
          verified_at: new Date().toISOString().slice(0, 10),
          is_active: provider.shipping_cost_status === 'published' && rate.is_active,
        }))
      : provider.shipping_countries.map((countryCode) => ({
          provider: providerCode,
          country_code: countryCode.trim().toUpperCase(),
          first_item_cents: provider.shipping_first_item_cents,
          additional_item_cents: provider.shipping_additional_item_cents,
          currency: 'USD',
          source_note:
            'Default provider shipping rate maintained from the admin provider form. Override per product only when this provider charges differently for that product.',
          verified_at: new Date().toISOString().slice(0, 10),
          is_active: provider.shipping_cost_status === 'published',
        }));

  if (rows.length === 0) return;

  const { error } = await client
    .from('ecommerce_provider_shipping_rates')
    .upsert(rows, { onConflict: 'provider,country_code' });

  if (error) throw error;
}

export async function fetchAdminProviderShippingRates(): Promise<AdminProviderShippingRate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ecommerce_provider_shipping_rates')
    .select(
      'provider,country_code,first_item_cents,additional_item_cents,currency,source_note,verified_at,is_active'
    )
    .order('provider', { ascending: true })
    .order('country_code', { ascending: true });

  if (error) throw error;

  return (data ?? []) as AdminProviderShippingRate[];
}

export async function fetchAdminProviders(): Promise<EcommerceProvider[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ecommerce_providers')
    .select('*')
    .order('fulfillment_mode', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []) as EcommerceProvider[];
}

export async function createManualProvider(input: UpsertManualProviderInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ecommerce_providers')
    .insert({
      ...input,
      code: normalizeProviderCode(input.code),
      fulfillment_mode: 'manual' satisfies FulfillmentMode,
    })
    .select('*')
    .single();

  if (error) throw error;

  await syncProviderDefaultShippingRates(input);

  return data as EcommerceProvider;
}

export async function updateManualProvider(
  code: string,
  input: Omit<UpsertManualProviderInput, 'code'>
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ecommerce_providers')
    .update(input)
    .eq('code', code)
    .eq('fulfillment_mode', 'manual')
    .select('*')
    .single();

  if (error) throw error;

  await syncProviderDefaultShippingRates({ ...input, code });

  return data as EcommerceProvider;
}

export async function updateProviderPolicy(code: string, input: UpsertProviderPolicyInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ecommerce_providers')
    .update(input)
    .eq('code', code)
    .select('*')
    .single();

  if (error) throw error;

  await syncProviderDefaultShippingRates({ ...input, code });

  return data as EcommerceProvider;
}
