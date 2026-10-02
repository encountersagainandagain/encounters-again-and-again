import type { EcommerceProvider, PublicProviderPolicy } from '@/lib/ecommerceTypes';

export type ProviderPolicyLike = Pick<
  PublicProviderPolicy,
  | 'code'
  | 'name'
  | 'is_active'
  | 'provider_is_sellable'
  | 'provider_policy_version'
  | 'provider_policy_hash'
  | 'shipping_cost_status'
  | 'damaged_claim_window_days'
  | 'recommended_issue_report_window_days'
  | 'photo_evidence_required'
  | 'photo_evidence_description'
  | 'lost_package_claim_window_days'
  | 'lost_package_window_basis'
  | 'eligible_return_request_window_days'
  | 'delivered_not_received_policy'
  | 'address_change_status'
  | 'address_change_cutoff'
  | 'wrong_address_reship_status'
  | 'wrong_address_reship_policy'
  | 'accepts_size_color_remorse_returns'
  | 'production_time_description'
  | 'shipping_time_status'
  | 'shipping_time_description'
  | 'return_shipping_payer'
  | 'return_authorization_required'
  | 'claim_review_time_description'
  | 'cancellation_cutoff'
  | 'non_returnable_categories'
  | 'refund_method_description'
  | 'production_delay_compensation'
  | 'customs_responsibility'
  | 'policy_verified_at'
>;

export type ProviderPolicySnapshot = {
  provider_code: string;
  provider_name: string;
  provider_policy_version: string;
  provider_policy_hash: string;
  shipping_cost_status?: string | null;
  damaged_claim_window_days: number;
  recommended_issue_report_window_days?: number | null;
  photo_evidence_required: boolean;
  photo_evidence_description: string;
  lost_package_claim_window_days: number;
  lost_package_window_basis: string;
  eligible_return_request_window_days?: number | null;
  delivered_not_received_policy: string;
  address_change_status?: string | null;
  address_change_cutoff: string;
  wrong_address_reship_status?: string | null;
  wrong_address_reship_policy: string;
  accepts_size_color_remorse_returns: boolean;
  production_time_description: string;
  shipping_time_status?: string | null;
  shipping_time_description: string;
  return_shipping_payer?: string | null;
  return_authorization_required?: boolean | null;
  claim_review_time_description?: string | null;
  cancellation_cutoff?: string | null;
  non_returnable_categories?: string | null;
  refund_method_description?: string | null;
  production_delay_compensation?: string | null;
  customs_responsibility?: string | null;
  policy_verified_at: string;
};

export const PROVIDER_POLICY_MAX_LENGTHS = {
  photo_evidence_description: 280,
  lost_package_window_basis: 120,
  delivered_not_received_policy: 280,
  address_change_cutoff: 180,
  wrong_address_reship_policy: 220,
  production_time_description: 160,
  shipping_time_description: 160,
  return_shipping_payer: 180,
  claim_review_time_description: 180,
  cancellation_cutoff: 180,
  non_returnable_categories: 280,
  refund_method_description: 180,
  production_delay_compensation: 180,
  customs_responsibility: 220,
  support_contact: 240,
  claim_submission_instructions: 500,
  return_address: 300,
  policy_source_url: 500,
  policy_source_note: 500,
  contact_email: 240,
  contact_url: 500,
  contact_notes: 1000,
} as const;

export const PROVIDER_POLICY_REQUIRED_FIELDS: Array<{
  key:
    | keyof ProviderPolicyLike
    | keyof Pick<
        EcommerceProvider,
        'support_contact' | 'claim_submission_instructions' | 'return_address' | 'policy_source_note'
      >;
  label: string;
  help: string;
}> = [
  {
    key: 'damaged_claim_window_days',
    label: 'Damaged/wrong item claim window',
    help: 'How many days Katie has to report a damaged, defective, or wrong item.',
  },
  {
    key: 'photo_evidence_description',
    label: 'Photo evidence details',
    help: 'Exactly what photos Katie should ask the customer for.',
  },
	  {
	    key: 'lost_package_claim_window_days',
	    label: 'Lost package claim window',
	    help: 'How many days Katie has to report a package lost in transit.',
	  },
  {
    key: 'lost_package_window_basis',
    label: 'Lost package window starts from',
    help: 'Whether the window starts from estimated delivery, ship date, or another date.',
  },
  {
    key: 'delivered_not_received_policy',
    label: 'Delivered but not received',
    help: 'What the provider does when tracking says delivered but the customer cannot find it.',
  },
  {
    key: 'address_change_cutoff',
    label: 'Address change cutoff',
    help: 'Until when Katie can correct a shipping address.',
  },
  {
    key: 'wrong_address_reship_policy',
    label: 'Wrong address reship policy',
    help: 'Who pays if the package returns because the customer entered the wrong address.',
  },
	  {
	    key: 'production_time_description',
	    label: 'Production time',
	    help: 'Estimated time before the provider ships the item.',
	  },
  {
    key: 'support_contact',
    label: 'Provider support contact',
    help: 'Where Katie contacts the provider for claims.',
  },
  {
    key: 'claim_submission_instructions',
    label: 'Claim instructions',
    help: 'How Katie opens a claim with this provider.',
  },
  {
    key: 'return_address',
    label: 'Return address / not applicable note',
    help: 'Where returns go, or a clear note that customers should not ship returns directly.',
  },
  {
    key: 'policy_source_note',
    label: 'Source note',
    help: 'Where Katie found or verified these rules.',
  },
	  {
	    key: 'policy_verified_at',
	    label: 'Verification date',
	    help: 'Date Katie last checked this provider policy.',
	  },
	];

export const PROVIDER_POLICY_FIELD_STATUSES = ['published', 'not_published', 'unverified'] as const;

export function getPolicyStatusLabel(status: string | null | undefined) {
  if (status === 'published') return 'Published or confirmed by provider';
  if (status === 'not_published') return 'Verified as not published';
  return 'Not verified yet';
}

function getStatus(value: string | null | undefined) {
  return PROVIDER_POLICY_FIELD_STATUSES.includes(
    value as (typeof PROVIDER_POLICY_FIELD_STATUSES)[number]
  )
    ? value
    : 'unverified';
}

function isBlank(value: unknown) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function isMissingNumber(value: unknown) {
  return typeof value !== 'number' || !Number.isFinite(value) || value <= 0;
}

export function getProviderPolicyMissingFields(provider: Partial<EcommerceProvider>) {
  const missing = PROVIDER_POLICY_REQUIRED_FIELDS.filter((field) => {
    const value = provider[field.key];
    if (field.key === 'damaged_claim_window_days' || field.key === 'lost_package_claim_window_days') {
      return isMissingNumber(value);
    }
    return isBlank(value);
  }).map((field) => field.label);

  if (getStatus(provider.shipping_cost_status) !== 'published') {
    missing.push('Shipping cost');
  }
  if (getStatus(provider.shipping_time_status) === 'unverified') {
    missing.push('Shipping time publication status');
  }
  if (getStatus(provider.address_change_status) === 'unverified') {
    missing.push('Address change publication status');
  }
  if (getStatus(provider.wrong_address_reship_status) === 'unverified') {
    missing.push('Wrong-address reship publication status');
  }
  if (getStatus(provider.return_address_status) === 'unverified') {
    missing.push('Return address publication status');
  }

  return missing;
}

export function getProviderPolicyLengthErrors(provider: Partial<EcommerceProvider>) {
  return Object.entries(PROVIDER_POLICY_MAX_LENGTHS)
    .filter(([key, maxLength]) => {
      const value = provider[key as keyof EcommerceProvider];
      return typeof value === 'string' && value.length > maxLength;
    })
    .map(([key, maxLength]) => `${key} must be ${maxLength} characters or fewer.`);
}

export function getProviderPolicyFieldLimit(key: keyof typeof PROVIDER_POLICY_MAX_LENGTHS) {
  return PROVIDER_POLICY_MAX_LENGTHS[key];
}

export function isProviderSellable(
  provider: Pick<
    EcommerceProvider | PublicProviderPolicy,
    'is_active' | 'provider_is_sellable'
  > | null | undefined
) {
  if (!provider?.is_active || !provider.provider_is_sellable) return false;
  if (
    'fulfillment_mode' in provider &&
    provider.fulfillment_mode === 'api' &&
    'api_fulfillment_enabled' in provider &&
    !provider.api_fulfillment_enabled
  ) {
    return false;
  }
  return true;
}

export function buildProviderPolicySnapshot(
  provider: EcommerceProvider
): ProviderPolicySnapshot {
  return {
    provider_code: provider.code,
    provider_name: provider.name,
    provider_policy_version: provider.provider_policy_version,
    provider_policy_hash: provider.provider_policy_hash || '',
    shipping_cost_status: getStatus(provider.shipping_cost_status),
    damaged_claim_window_days: provider.damaged_claim_window_days,
    recommended_issue_report_window_days: provider.recommended_issue_report_window_days,
    photo_evidence_required: provider.photo_evidence_required,
    photo_evidence_description: provider.photo_evidence_description,
    lost_package_claim_window_days: provider.lost_package_claim_window_days,
    lost_package_window_basis: provider.lost_package_window_basis,
    eligible_return_request_window_days: provider.eligible_return_request_window_days,
    delivered_not_received_policy: provider.delivered_not_received_policy,
    address_change_status: getStatus(provider.address_change_status),
    address_change_cutoff: provider.address_change_cutoff,
    wrong_address_reship_status: getStatus(provider.wrong_address_reship_status),
    wrong_address_reship_policy: provider.wrong_address_reship_policy,
    accepts_size_color_remorse_returns: provider.accepts_size_color_remorse_returns,
    production_time_description: provider.production_time_description,
    shipping_time_status: getStatus(provider.shipping_time_status),
    shipping_time_description: provider.shipping_time_description,
    return_shipping_payer: provider.return_shipping_payer,
    return_authorization_required: provider.return_authorization_required,
    claim_review_time_description: provider.claim_review_time_description,
    cancellation_cutoff: provider.cancellation_cutoff,
    non_returnable_categories: provider.non_returnable_categories,
    refund_method_description: provider.refund_method_description,
    production_delay_compensation: provider.production_delay_compensation,
    customs_responsibility: provider.customs_responsibility,
    policy_verified_at: provider.policy_verified_at,
  };
}

function formatOptionalStatusText({
  status,
  publishedText,
  notPublishedText,
}: {
  status?: string | null;
  publishedText: string;
  notPublishedText: string;
}) {
  return getStatus(status) === 'published' ? publishedText : notPublishedText;
}

export function redactFulfillmentIdentity(
  text: string,
  identity: Pick<PublicProviderPolicy, 'name' | 'code'>
) {
  const identities = [identity.name, identity.code]
    .map((value) => value.trim())
    .filter((value) => value.length >= 3)
    .sort((a, b) => b.length - a.length);

  return identities.reduce((result, identity) => {
    const escapedIdentity = identity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(escapedIdentity, 'gi'), 'What Katie Seas');
  }, text);
}

export function formatProviderPolicySummary(provider: ProviderPolicyLike) {
  const summary = [
    'Made-to-order item.',
    provider.accepts_size_color_remorse_returns
      ? 'Eligible size, color, or change-of-mind returns follow the terms shown here.'
      : 'Size, color, and buyer’s remorse returns are final sale when the item arrives correct.',
	    `Damaged, defective, or wrong item claims: contact Katie within ${provider.damaged_claim_window_days} days. ${provider.photo_evidence_required ? `Photos required: ${provider.photo_evidence_description}` : 'Photos may not be required, but Katie may still ask for evidence.'}`,
    provider.recommended_issue_report_window_days
      ? `Please report misprints, damage, or defects within ${provider.recommended_issue_report_window_days} days when possible.`
      : '',
	    `Lost-in-transit claims: ${provider.lost_package_claim_window_days} days from ${provider.lost_package_window_basis}.`,
    provider.eligible_return_request_window_days
      ? `Eligible approved returns must be requested within ${provider.eligible_return_request_window_days} days; this is not a general return window for correctly made unwanted items.`
      : '',
	    `Delivered but not received: ${provider.delivered_not_received_policy}`,
    formatOptionalStatusText({
      status: provider.address_change_status,
      publishedText: `Address corrections: ${provider.address_change_cutoff}`,
      notPublishedText:
        'Address corrections: Katie cannot promise an address can be changed after checkout, so contact her immediately.',
    }),
    formatOptionalStatusText({
      status: provider.wrong_address_reship_status,
      publishedText: `Wrong-address reshipment: ${provider.wrong_address_reship_policy}`,
      notPublishedText:
        'Wrong-address reshipment: a free reshipment cannot be promised for an incorrect or incomplete customer address.',
    }),
    `Production estimate: ${provider.production_time_description}.`,
    formatOptionalStatusText({
      status: provider.shipping_time_status,
      publishedText: `Shipping estimate: ${provider.shipping_time_description}.`,
      notPublishedText:
        'Shipping estimate: tracking will be shared when the order ships.',
    }),
    provider.return_shipping_payer ? `Return shipping: ${provider.return_shipping_payer}.` : '',
    provider.return_authorization_required
      ? 'Returns require approval from What Katie Seas before anything is mailed back.'
      : '',
    provider.claim_review_time_description
      ? `Claim review time: ${provider.claim_review_time_description}.`
      : '',
    provider.cancellation_cutoff ? `Cancellation cutoff: ${provider.cancellation_cutoff}.` : '',
    provider.non_returnable_categories
      ? `Non-returnable items: ${provider.non_returnable_categories}.`
      : '',
    provider.refund_method_description
      ? `Refund method: ${provider.refund_method_description}.`
      : '',
    provider.production_delay_compensation
      ? `Production delay compensation: ${provider.production_delay_compensation}.`
      : '',
    provider.customs_responsibility
      ? `Customs/international: ${provider.customs_responsibility}.`
      : '',
	  ]
    .filter(Boolean)
    .join(' ');

  return redactFulfillmentIdentity(summary, provider);
}

export function formatProviderPolicyBrief(provider: ProviderPolicyLike) {
  const claimWindow = `${provider.damaged_claim_window_days} days`;
  const lostWindow = `${provider.lost_package_claim_window_days} days`;

  const shippingText =
    getStatus(provider.shipping_time_status) === 'published'
      ? `Shipping estimate: ${provider.shipping_time_description}.`
      : 'Transit estimate is not published; tracking is sent when the order ships.';

  const brief = provider.accepts_size_color_remorse_returns
    ? `Made to order. Size/color returns follow this item’s policy; damage or wrong-item claims must be reported within ${claimWindow}, and lost-package claims within ${lostWindow}.`
    : `Made to order. Size/color changes are final sale when the item arrives correct; damage or wrong-item claims must be reported within ${claimWindow}, and lost-package claims within ${lostWindow}. ${shippingText}`;

  return redactFulfillmentIdentity(brief, provider);
}

export function isProviderPolicyStale(
  provider: Pick<EcommerceProvider, 'policy_verified_at'> | null | undefined,
  months = 6
) {
  if (!provider?.policy_verified_at) return false;

  const verifiedAt = new Date(`${provider.policy_verified_at}T00:00:00Z`);
  if (Number.isNaN(verifiedAt.getTime())) return false;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  return verifiedAt < cutoff;
}
