'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  centsFromDollars,
  createManualProvider,
  dollarsFromCents,
  fetchAdminProviderShippingRates,
  fetchAdminProviders,
  normalizeProviderCode,
  updateManualProvider,
  updateProviderPolicy,
  type AdminProviderShippingRate,
  type ProviderShippingRateInput,
} from '@/lib/ecommerceProviders';
import { fetchAllShopCountries, getCountryName, type ShopCountry } from '@/lib/shopShipping';
import {
  formatProviderPolicySummary,
  getProviderPolicyFieldLimit,
  getProviderPolicyLengthErrors,
  getProviderPolicyMissingFields,
  getPolicyStatusLabel,
  isProviderSellable,
  isProviderPolicyStale,
  PROVIDER_POLICY_FIELD_STATUSES,
} from '@/lib/ecommerceProviderPolicy';
import type { EcommerceProvider, ProviderPolicyFieldStatus } from '@/lib/ecommerceTypes';

type ProviderFormState = {
  code: string;
  name: string;
  isActive: boolean;
  shippingCostStatus: ProviderPolicyFieldStatus;
  shippingCountries: string[];
  enabledShippingCountries: string[];
  shippingRatesByCountry: Record<string, { firstShipping: string; additionalShipping: string }>;
  contactEmail: string;
  contactUrl: string;
  contactNotes: string;
  damagedClaimWindowDays: string;
  recommendedIssueReportWindowDays: string;
  photoEvidenceRequired: boolean;
  photoEvidenceDescription: string;
  lostPackageClaimWindowDays: string;
  lostPackageWindowBasis: string;
  eligibleReturnRequestWindowDays: string;
  deliveredNotReceivedPolicy: string;
  addressChangeStatus: ProviderPolicyFieldStatus;
  addressChangeCutoff: string;
  wrongAddressReshipStatus: ProviderPolicyFieldStatus;
  wrongAddressReshipPolicy: string;
  acceptsSizeColorRemorseReturns: boolean;
  productionTimeDescription: string;
  shippingTimeStatus: ProviderPolicyFieldStatus;
  shippingTimeDescription: string;
  returnShippingPayer: string;
  returnAuthorizationRequired: boolean;
  claimReviewTimeDescription: string;
  cancellationCutoff: string;
  nonReturnableCategories: string;
  refundMethodDescription: string;
  productionDelayCompensation: string;
  customsResponsibility: string;
  supportContact: string;
  claimSubmissionInstructions: string;
  returnAddressStatus: ProviderPolicyFieldStatus;
  returnAddress: string;
  policySourceUrl: string;
  policySourceUrls: string;
  policySourceNote: string;
  policyVerifiedAt: string;
};

const emptyForm: ProviderFormState = {
  code: '',
  name: '',
  isActive: true,
  shippingCostStatus: 'unverified',
  shippingCountries: [],
  enabledShippingCountries: [],
  shippingRatesByCountry: {},
  contactEmail: '',
  contactUrl: '',
  contactNotes: '',
  damagedClaimWindowDays: '',
  recommendedIssueReportWindowDays: '',
  photoEvidenceRequired: true,
  photoEvidenceDescription: '',
  lostPackageClaimWindowDays: '',
  lostPackageWindowBasis: '',
  eligibleReturnRequestWindowDays: '',
  deliveredNotReceivedPolicy: '',
  addressChangeStatus: 'unverified',
  addressChangeCutoff: '',
  wrongAddressReshipStatus: 'unverified',
  wrongAddressReshipPolicy: '',
  acceptsSizeColorRemorseReturns: false,
  productionTimeDescription: '',
  shippingTimeStatus: 'unverified',
  shippingTimeDescription: '',
  returnShippingPayer: '',
  returnAuthorizationRequired: true,
  claimReviewTimeDescription: '',
  cancellationCutoff: '',
  nonReturnableCategories: '',
  refundMethodDescription: '',
  productionDelayCompensation: '',
  customsResponsibility: '',
  supportContact: '',
  claimSubmissionInstructions: '',
  returnAddressStatus: 'unverified',
  returnAddress: '',
  policySourceUrl: '',
  policySourceUrls: '',
  policySourceNote: '',
  policyVerifiedAt: '',
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formFromProvider(
  provider: EcommerceProvider,
  providerRates: AdminProviderShippingRate[] = []
): ProviderFormState {
  const ratesByCountry = Object.fromEntries(
    providerRates.map((rate) => [
      rate.country_code,
      {
        firstShipping: dollarsFromCents(rate.first_item_cents),
        additionalShipping: dollarsFromCents(rate.additional_item_cents),
      },
    ])
  );
  const legacyRateCountries = provider.shipping_countries ?? [];

  legacyRateCountries.forEach((countryCode) => {
    if (!ratesByCountry[countryCode]) {
      ratesByCountry[countryCode] = {
        firstShipping: dollarsFromCents(provider.shipping_first_item_cents),
        additionalShipping: dollarsFromCents(provider.shipping_additional_item_cents),
      };
    }
  });

  return {
    code: provider.code,
    name: provider.name,
    isActive: provider.is_active,
    shippingCostStatus: provider.shipping_cost_status ?? 'published',
    shippingCountries: provider.shipping_countries ?? [],
    enabledShippingCountries: providerRates
      .filter((rate) => rate.is_active)
      .map((rate) => rate.country_code),
    shippingRatesByCountry: ratesByCountry,
    contactEmail: provider.contact_email,
    contactUrl: provider.contact_url,
    contactNotes: provider.contact_notes,
    damagedClaimWindowDays: String(provider.damaged_claim_window_days || ''),
    recommendedIssueReportWindowDays: String(provider.recommended_issue_report_window_days || ''),
    photoEvidenceRequired: provider.photo_evidence_required ?? true,
    photoEvidenceDescription: provider.photo_evidence_description ?? '',
    lostPackageClaimWindowDays: String(provider.lost_package_claim_window_days || ''),
    lostPackageWindowBasis: provider.lost_package_window_basis ?? '',
    eligibleReturnRequestWindowDays: String(provider.eligible_return_request_window_days || ''),
    deliveredNotReceivedPolicy: provider.delivered_not_received_policy ?? '',
    addressChangeStatus: provider.address_change_status ?? 'published',
    addressChangeCutoff: provider.address_change_cutoff ?? '',
    wrongAddressReshipStatus: provider.wrong_address_reship_status ?? 'published',
    wrongAddressReshipPolicy: provider.wrong_address_reship_policy ?? '',
    acceptsSizeColorRemorseReturns: provider.accepts_size_color_remorse_returns ?? false,
    productionTimeDescription: provider.production_time_description ?? '',
    shippingTimeStatus: provider.shipping_time_status ?? 'published',
    shippingTimeDescription: provider.shipping_time_description ?? '',
    returnShippingPayer: provider.return_shipping_payer ?? '',
    returnAuthorizationRequired: provider.return_authorization_required ?? true,
    claimReviewTimeDescription: provider.claim_review_time_description ?? '',
    cancellationCutoff: provider.cancellation_cutoff ?? '',
    nonReturnableCategories: provider.non_returnable_categories ?? '',
    refundMethodDescription: provider.refund_method_description ?? '',
    productionDelayCompensation: provider.production_delay_compensation ?? '',
    customsResponsibility: provider.customs_responsibility ?? '',
    supportContact: provider.support_contact ?? '',
    claimSubmissionInstructions: provider.claim_submission_instructions ?? '',
    returnAddressStatus: provider.return_address_status ?? 'published',
    returnAddress: provider.return_address ?? '',
    policySourceUrl: provider.policy_source_url ?? '',
    policySourceUrls: (provider.policy_source_urls ?? []).join('\n'),
    policySourceNote: provider.policy_source_note ?? '',
    policyVerifiedAt: provider.policy_verified_at
      ? provider.policy_verified_at.slice(0, 10)
      : '',
  };
}

function FieldHelp({ children }: { children: ReactNode }) {
  return <p className="mt-2 font-body text-xs leading-relaxed text-black/50">{children}</p>;
}

function StatusSelect({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: ProviderPolicyFieldStatus;
  onChange: (value: ProviderPolicyFieldStatus) => void;
  help: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-body text-sm font-semibold text-black">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ProviderPolicyFieldStatus)}
        className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
      >
        {PROVIDER_POLICY_FIELD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {getPolicyStatusLabel(status)}
          </option>
        ))}
      </select>
      <FieldHelp>{help}</FieldHelp>
    </label>
  );
}

function parseOptionalDays(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseSourceUrls(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortCountryCodes(countryCodes: string[]) {
  return [...new Set(countryCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))].sort();
}

function getRateForCountry(form: ProviderFormState, countryCode: string) {
  return (
    form.shippingRatesByCountry[countryCode] ?? {
      firstShipping: '0.00',
      additionalShipping: '0.00',
    }
  );
}

function buildProviderShippingRates(form: ProviderFormState): ProviderShippingRateInput[] {
  return form.shippingCountries.map((countryCode) => {
    const rate = getRateForCountry(form, countryCode);

    return {
      country_code: countryCode,
      first_item_cents: centsFromDollars(rate.firstShipping),
      additional_item_cents: centsFromDollars(rate.additionalShipping),
      is_active: form.enabledShippingCountries.includes(countryCode),
    };
  });
}

function getLegacyShippingRate(form: ProviderFormState) {
  const defaultCountry =
    form.enabledShippingCountries.find((countryCode) => countryCode === 'US') ??
    form.enabledShippingCountries[0] ??
    form.shippingCountries[0];
  const rate = defaultCountry ? getRateForCountry(form, defaultCountry) : null;

  return {
    first: rate ? centsFromDollars(rate.firstShipping) : 0,
    additional: rate ? centsFromDollars(rate.additionalShipping) : 0,
  };
}

export function AdminProviders() {
  const [providers, setProviders] = useState<EcommerceProvider[]>([]);
  const [editingCode, setEditingCode] = useState('');
  const [form, setForm] = useState<ProviderFormState>(emptyForm);
  const [shopCountries, setShopCountries] = useState<ShopCountry[]>([]);
  const [providerShippingRates, setProviderShippingRates] = useState<
    AdminProviderShippingRate[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const editingProvider = useMemo(
    () => providers.find((provider) => provider.code === editingCode),
    [editingCode, providers]
  );
  const apiProviders = providers.filter((provider) => provider.fulfillment_mode === 'api');
  const manualProviders = providers.filter((provider) => provider.fulfillment_mode === 'manual');
  const isEditingApiProvider = editingProvider?.fulfillment_mode === 'api';
  const editingApiFulfillmentLocked =
    editingProvider?.fulfillment_mode === 'api' && !editingProvider.api_fulfillment_enabled;
  const formPolicyIsStale = isProviderPolicyStale(
    form.policyVerifiedAt
      ? ({ policy_verified_at: form.policyVerifiedAt } as Pick<EcommerceProvider, 'policy_verified_at'>)
      : null
  );
	  const policyFormForValidation: Partial<EcommerceProvider> = {
    shipping_cost_status: form.shippingCostStatus,
	    damaged_claim_window_days: Number(form.damagedClaimWindowDays),
    recommended_issue_report_window_days: parseOptionalDays(form.recommendedIssueReportWindowDays),
	    photo_evidence_description: form.photoEvidenceDescription.trim(),
	    lost_package_claim_window_days: Number(form.lostPackageClaimWindowDays),
	    lost_package_window_basis: form.lostPackageWindowBasis.trim(),
    eligible_return_request_window_days: parseOptionalDays(form.eligibleReturnRequestWindowDays),
	    delivered_not_received_policy: form.deliveredNotReceivedPolicy.trim(),
    address_change_status: form.addressChangeStatus,
	    address_change_cutoff: form.addressChangeCutoff.trim(),
    wrong_address_reship_status: form.wrongAddressReshipStatus,
	    wrong_address_reship_policy: form.wrongAddressReshipPolicy.trim(),
	    production_time_description: form.productionTimeDescription.trim(),
    shipping_time_status: form.shippingTimeStatus,
	    shipping_time_description: form.shippingTimeDescription.trim(),
    return_shipping_payer: form.returnShippingPayer.trim(),
    claim_review_time_description: form.claimReviewTimeDescription.trim(),
    cancellation_cutoff: form.cancellationCutoff.trim(),
    non_returnable_categories: form.nonReturnableCategories.trim(),
    refund_method_description: form.refundMethodDescription.trim(),
    production_delay_compensation: form.productionDelayCompensation.trim(),
    customs_responsibility: form.customsResponsibility.trim(),
	    support_contact: form.supportContact.trim(),
	    claim_submission_instructions: form.claimSubmissionInstructions.trim(),
    return_address_status: form.returnAddressStatus,
	    return_address: form.returnAddress.trim(),
	    policy_source_note: form.policySourceNote.trim(),
    policy_verified_at: form.policyVerifiedAt,
    contact_email: form.contactEmail.trim(),
    contact_url: form.contactUrl.trim(),
    contact_notes: form.contactNotes.trim(),
  };
  const enabledCountryRateErrors = form.enabledShippingCountries
    .map((countryCode) => {
      const rate = getRateForCountry(form, countryCode);
      const first = Number(rate.firstShipping);
      const additional = Number(rate.additionalShipping);
      if (!Number.isFinite(first) || first <= 0) {
        return `${getCountryName(countryCode)} first-item shipping rate`;
      }
      if (!Number.isFinite(additional) || additional < 0) {
        return `${getCountryName(countryCode)} additional-item shipping rate`;
      }
      return '';
    })
    .filter(Boolean);

	  const formMissingPolicyFields = [
    form.shippingCostStatus !== 'published' && 'Shipping cost published by provider',
    form.shippingCountries.length === 0 && 'Provider shipping countries',
    form.enabledShippingCountries.length === 0 && 'Enabled selling country',
    ...enabledCountryRateErrors,
	    !Number(form.damagedClaimWindowDays) && 'Damaged/wrong item claim window',
	    !form.photoEvidenceDescription.trim() && 'Photo evidence details',
	    !Number(form.lostPackageClaimWindowDays) && 'Lost package claim window',
	    !form.lostPackageWindowBasis.trim() && 'Lost package window starts from',
	    !form.deliveredNotReceivedPolicy.trim() && 'Delivered but not received',
    form.addressChangeStatus === 'unverified' && 'Address change publication status',
    form.addressChangeStatus === 'published' &&
      !form.addressChangeCutoff.trim() &&
      'Address change cutoff',
    form.wrongAddressReshipStatus === 'unverified' && 'Wrong address reship publication status',
    form.wrongAddressReshipStatus === 'published' &&
      !form.wrongAddressReshipPolicy.trim() &&
      'Wrong address reship policy',
	    !form.productionTimeDescription.trim() && 'Production time',
    form.shippingTimeStatus === 'unverified' && 'Shipping time publication status',
    form.shippingTimeStatus === 'published' &&
      !form.shippingTimeDescription.trim() &&
      'Shipping time',
	    !form.supportContact.trim() && 'Provider support contact',
	    !form.claimSubmissionInstructions.trim() && 'Claim instructions',
    form.returnAddressStatus === 'unverified' && 'Return address publication status',
    form.returnAddressStatus === 'published' &&
      !form.returnAddress.trim() &&
      'Return address / not applicable note',
	    !form.policySourceNote.trim() && 'Source note',
	    !form.policyVerifiedAt && 'Verification date',
	  ].filter(Boolean) as string[];
  const formLengthErrors = getProviderPolicyLengthErrors(policyFormForValidation);
	  const customerPolicyPreview =
    form.name.trim() &&
    Number(form.damagedClaimWindowDays) > 0 &&
    Number(form.lostPackageClaimWindowDays) > 0
      ? formatProviderPolicySummary({
          code: normalizeProviderCode(form.code),
          name: form.name.trim(),
          is_active: form.isActive,
          provider_is_sellable: formMissingPolicyFields.length === 0 && formLengthErrors.length === 0,
	          provider_policy_version: editingProvider?.provider_policy_version || 'generated-on-save',
	          provider_policy_hash: editingProvider?.provider_policy_hash || 'generated-on-save',
          shipping_cost_status: form.shippingCostStatus,
	          damaged_claim_window_days: Number(form.damagedClaimWindowDays),
          recommended_issue_report_window_days: parseOptionalDays(form.recommendedIssueReportWindowDays),
	          photo_evidence_required: form.photoEvidenceRequired,
	          photo_evidence_description:
	            form.photoEvidenceDescription.trim() || '[photo evidence details]',
	          lost_package_claim_window_days: Number(form.lostPackageClaimWindowDays),
	          lost_package_window_basis:
	            form.lostPackageWindowBasis.trim() || '[lost package window basis]',
          eligible_return_request_window_days: parseOptionalDays(
            form.eligibleReturnRequestWindowDays
          ),
	          delivered_not_received_policy:
	            form.deliveredNotReceivedPolicy.trim() || '[delivered/not received policy]',
          address_change_status: form.addressChangeStatus,
	          address_change_cutoff: form.addressChangeCutoff.trim() || '[address change cutoff]',
          wrong_address_reship_status: form.wrongAddressReshipStatus,
	          wrong_address_reship_policy:
	            form.wrongAddressReshipPolicy.trim() || '[wrong-address reship policy]',
	          accepts_size_color_remorse_returns: form.acceptsSizeColorRemorseReturns,
	          production_time_description:
	            form.productionTimeDescription.trim() || '[production time]',
          shipping_time_status: form.shippingTimeStatus,
	          shipping_time_description: form.shippingTimeDescription.trim() || '[shipping time]',
          return_shipping_payer: form.returnShippingPayer.trim(),
          return_authorization_required: form.returnAuthorizationRequired,
          claim_review_time_description: form.claimReviewTimeDescription.trim(),
          cancellation_cutoff: form.cancellationCutoff.trim(),
          non_returnable_categories: form.nonReturnableCategories.trim(),
          refund_method_description: form.refundMethodDescription.trim(),
          production_delay_compensation: form.productionDelayCompensation.trim(),
          customs_responsibility: form.customsResponsibility.trim(),
	          policy_verified_at: form.policyVerifiedAt || '[verification date]',
	        })
	      : '';
  const openProviderQuestions = [
    form.shippingCostStatus !== 'published' &&
      'BLOCKS SALES: What do you charge to ship the first shirt and each additional shirt in the same US order?',
    form.shippingCountries.length === 0 &&
      'BLOCKS SALES: Which countries does this provider ship to?',
    form.enabledShippingCountries.length === 0 &&
      'BLOCKS SALES: Which provider shipping countries should What Katie Seas sell to now?',
    ...enabledCountryRateErrors.map(
      (field) => `BLOCKS SALES: Confirm ${field.toLowerCase()}.`
    ),
    form.shippingTimeStatus !== 'published' &&
      'What estimated transit time can customers expect after production, if you publish or can confirm one?',
    form.addressChangeStatus !== 'published' &&
      'Until what point can Katie change a customer shipping address after checkout?',
    form.wrongAddressReshipStatus !== 'published' &&
      'If a package is returned or lost because the customer entered the wrong address, who pays to reship?',
    !form.returnShippingPayer.trim() &&
      'For an eligible approved return, who pays return shipping?',
    !form.claimReviewTimeDescription.trim() &&
      'How long does the provider take to review a claim or return request?',
    !form.cancellationCutoff.trim() && 'Until when can an order be canceled before production?',
  ].filter(Boolean) as string[];

  async function loadProviders() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextProviders, nextShopCountries, nextProviderShippingRates] = await Promise.all([
        fetchAdminProviders(),
        fetchAllShopCountries(),
        fetchAdminProviderShippingRates(),
      ]);
      setProviders(nextProviders);
      setShopCountries(nextShopCountries);
      setProviderShippingRates(nextProviderShippingRates);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load providers.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProviders();
  }, []);

  const startEditing = (provider: EcommerceProvider) => {
    setEditingCode(provider.code);
    setForm(
      formFromProvider(
        provider,
        providerShippingRates.filter((rate) => rate.provider === provider.code)
      )
    );
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetForm = () => {
    setEditingCode('');
    setForm(emptyForm);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const code = normalizeProviderCode(form.code);
    if (!code) {
      setErrorMessage('Provider code is required.');
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage('Provider name is required.');
      return;
    }

    if (form.isActive && formMissingPolicyFields.length > 0) {
      setErrorMessage(`Complete provider policy requirements: ${formMissingPolicyFields.join(', ')}.`);
      return;
    }

    if (formLengthErrors.length > 0) {
      setErrorMessage(`Shorten these provider fields: ${formLengthErrors.join(' ')}`);
      return;
    }

    setIsSaving(true);

    try {
      const legacyShippingRate = getLegacyShippingRate(form);
      const input = {
        code,
        name: form.name.trim(),
	        is_active: form.isActive,
        shipping_countries: sortCountryCodes(form.shippingCountries),
        shipping_first_item_cents: legacyShippingRate.first,
        shipping_additional_item_cents: legacyShippingRate.additional,
        provider_shipping_rates: buildProviderShippingRates(form),
        shipping_cost_status: form.shippingCostStatus,
	        contact_email: form.contactEmail.trim(),
	        contact_url: form.contactUrl.trim(),
	        contact_notes: form.contactNotes.trim(),
	        damaged_claim_window_days: Number(form.damagedClaimWindowDays),
        recommended_issue_report_window_days: parseOptionalDays(
          form.recommendedIssueReportWindowDays
        ),
	        photo_evidence_required: form.photoEvidenceRequired,
	        photo_evidence_description: form.photoEvidenceDescription.trim(),
	        lost_package_claim_window_days: Number(form.lostPackageClaimWindowDays),
	        lost_package_window_basis: form.lostPackageWindowBasis.trim(),
        eligible_return_request_window_days: parseOptionalDays(
          form.eligibleReturnRequestWindowDays
        ),
	        delivered_not_received_policy: form.deliveredNotReceivedPolicy.trim(),
        address_change_status: form.addressChangeStatus,
	        address_change_cutoff: form.addressChangeCutoff.trim(),
        wrong_address_reship_status: form.wrongAddressReshipStatus,
	        wrong_address_reship_policy: form.wrongAddressReshipPolicy.trim(),
	        accepts_size_color_remorse_returns: form.acceptsSizeColorRemorseReturns,
	        production_time_description: form.productionTimeDescription.trim(),
        shipping_time_status: form.shippingTimeStatus,
	        shipping_time_description: form.shippingTimeDescription.trim(),
        return_shipping_payer: form.returnShippingPayer.trim(),
        return_authorization_required: form.returnAuthorizationRequired,
        claim_review_time_description: form.claimReviewTimeDescription.trim(),
        cancellation_cutoff: form.cancellationCutoff.trim(),
        non_returnable_categories: form.nonReturnableCategories.trim(),
        refund_method_description: form.refundMethodDescription.trim(),
        production_delay_compensation: form.productionDelayCompensation.trim(),
        customs_responsibility: form.customsResponsibility.trim(),
	        support_contact: form.supportContact.trim(),
	        claim_submission_instructions: form.claimSubmissionInstructions.trim(),
        return_address_status: form.returnAddressStatus,
	        return_address: form.returnAddress.trim(),
	        policy_source_url: form.policySourceUrl.trim(),
        policy_source_urls: parseSourceUrls(form.policySourceUrls),
	        policy_source_note: form.policySourceNote.trim(),
        policy_verified_at: form.policyVerifiedAt,
      };

      if (editingProvider) {
        const policyInput = {
          name: input.name,
          is_active: input.is_active,
          shipping_countries: input.shipping_countries,
		          shipping_first_item_cents: input.shipping_first_item_cents,
	          shipping_additional_item_cents: input.shipping_additional_item_cents,
          provider_shipping_rates: input.provider_shipping_rates,
          shipping_cost_status: input.shipping_cost_status,
	          contact_email: input.contact_email,
	          contact_url: input.contact_url,
	          contact_notes: input.contact_notes,
	          damaged_claim_window_days: input.damaged_claim_window_days,
          recommended_issue_report_window_days: input.recommended_issue_report_window_days,
	          photo_evidence_required: input.photo_evidence_required,
	          photo_evidence_description: input.photo_evidence_description,
	          lost_package_claim_window_days: input.lost_package_claim_window_days,
	          lost_package_window_basis: input.lost_package_window_basis,
          eligible_return_request_window_days: input.eligible_return_request_window_days,
	          delivered_not_received_policy: input.delivered_not_received_policy,
          address_change_status: input.address_change_status,
	          address_change_cutoff: input.address_change_cutoff,
          wrong_address_reship_status: input.wrong_address_reship_status,
	          wrong_address_reship_policy: input.wrong_address_reship_policy,
	          accepts_size_color_remorse_returns: input.accepts_size_color_remorse_returns,
	          production_time_description: input.production_time_description,
          shipping_time_status: input.shipping_time_status,
	          shipping_time_description: input.shipping_time_description,
          return_shipping_payer: input.return_shipping_payer,
          return_authorization_required: input.return_authorization_required,
          claim_review_time_description: input.claim_review_time_description,
          cancellation_cutoff: input.cancellation_cutoff,
          non_returnable_categories: input.non_returnable_categories,
          refund_method_description: input.refund_method_description,
          production_delay_compensation: input.production_delay_compensation,
          customs_responsibility: input.customs_responsibility,
	          support_contact: input.support_contact,
	          claim_submission_instructions: input.claim_submission_instructions,
          return_address_status: input.return_address_status,
	          return_address: input.return_address,
	          policy_source_url: input.policy_source_url,
          policy_source_urls: input.policy_source_urls,
	          policy_source_note: input.policy_source_note,
          policy_verified_at: input.policy_verified_at,
        };

        if (editingProvider.fulfillment_mode === 'api') {
          await updateProviderPolicy(editingProvider.code, {
            ...policyInput,
            name: editingProvider.name,
		            is_active: editingProvider.is_active,
            shipping_countries: input.shipping_countries,
            shipping_first_item_cents: input.shipping_first_item_cents,
            shipping_additional_item_cents: input.shipping_additional_item_cents,
            provider_shipping_rates: input.provider_shipping_rates,
            shipping_cost_status: input.shipping_cost_status,
	          });
          setSuccessMessage('API provider policy updated.');
        } else {
          await updateManualProvider(editingProvider.code, policyInput);
          setSuccessMessage('Manual provider updated.');
        }
      } else {
        await createManualProvider(input);
        setSuccessMessage('Manual provider created.');
      }

      setForm(emptyForm);
      setEditingCode('');
      await loadProviders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save provider.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin"
            className="mb-4 inline-block font-body text-sm uppercase tracking-[0.18em] text-ocean transition-colors hover:text-ocean/70"
          >
            ← Dashboard
          </Link>
          <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Ecommerce
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">Providers</h1>
          <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-black/60">
            API providers are integrated by the technical team, but Katie can update their
            verified customer policy when the provider changes its Help Center rules. Manual
            providers can be created and edited here.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4">
            <p className="font-body text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 border border-green-200 bg-green-50 p-4">
            <p className="font-body text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-8">
            <section className="border border-black/10 bg-gray-50 p-6">
              <h2 className="font-display text-3xl text-black">API providers</h2>
              <p className="mt-2 font-body text-sm text-black/55">
                Integration details are locked because code is required, but the customer policy
                can be updated when Katie re-checks the provider rules.
              </p>
              <div className="mt-4 divide-y divide-black/10 border border-black/10 bg-white">
                {isLoading ? (
                  <p className="p-4 font-body text-sm text-black/45">Loading providers...</p>
                ) : apiProviders.length === 0 ? (
                  <p className="p-4 font-body text-sm text-black/45">No API providers yet.</p>
                ) : (
                  apiProviders.map((provider) => (
                    <ProviderRow
                      key={provider.code}
                      provider={provider}
                      shippingRates={providerShippingRates.filter(
                        (rate) => rate.provider === provider.code
                      )}
                      onEdit={() => startEditing(provider)}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="border border-black/10 bg-gray-50 p-6">
              <h2 className="font-display text-3xl text-black">Manual providers</h2>
              <div className="mt-4 divide-y divide-black/10 border border-black/10 bg-white">
                {isLoading ? (
                  <p className="p-4 font-body text-sm text-black/45">Loading providers...</p>
                ) : manualProviders.length === 0 ? (
                  <p className="p-4 font-body text-sm text-black/45">
                    No manual providers yet.
                  </p>
                ) : (
                  manualProviders.map((provider) => (
                    <ProviderRow
                      key={provider.code}
                      provider={provider}
                      shippingRates={providerShippingRates.filter(
                        (rate) => rate.provider === provider.code
                      )}
                      onEdit={() => startEditing(provider)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="border border-ocean/20 bg-sky-50 p-6"
          >
            <h2 className="font-display text-3xl text-black">
              {editingProvider
                ? editingProvider.fulfillment_mode === 'api'
                  ? 'Edit API provider policy'
                  : 'Edit manual provider'
                : 'New manual provider'}
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-black/60">
              Use this screen for the companies that make and ship Katie&apos;s merch. API
              providers are connected by the technical team; their catalog, variants, and size
              guides come from the provider API. The policy fields below are Katie&apos;s dated
              verification from provider Help Center pages, because claim windows and photo
              requirements are not exposed by the Printful catalog API. Manual providers are the
              ones that email Katie the order details so she can place the order herself.
            </p>
            {isEditingApiProvider && (
              <div className="mt-4 border border-ocean/20 bg-white p-4">
                <p className="font-body text-sm font-semibold text-black">
                  Synced vs. verified data
                </p>
                <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
                  Do not edit the API integration details here. Product catalog data and size
                  measurements are synced from Printful. Claim windows, photo requirements, and
                  lost-package rules are transcribed from the provider Help Center with a source
                  URL and verification date, then snapshotted onto each order.
                </p>
              </div>
            )}
            {editingApiFulfillmentLocked && (
              <div className="mt-4 border border-amber-300 bg-amber-50 p-4">
                <p className="font-body text-sm font-semibold text-amber-950">
                  API fulfillment is locked for production.
                </p>
                <p className="mt-2 font-body text-sm leading-relaxed text-amber-900">
                  This provider can keep its verified policy data, but it cannot sell or accept
                  product activation until the technical team deliberately enables API fulfillment.
                  Production launches with manual providers only.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-6">
              <section className="border border-black/10 bg-white/70 p-4">
                <h3 className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
                  Provider details
                </h3>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Name
                    </span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => {
                          const nextName = event.target.value;
                          const currentNameCode = normalizeProviderCode(current.name);
                          const shouldAutoUpdateCode =
                            !editingProvider &&
                            (!current.code || current.code === currentNameCode);

                          return {
                            ...current,
                            name: nextName,
                            code: shouldAutoUpdateCode
                              ? normalizeProviderCode(nextName)
                              : current.code,
                          };
                        })
                      }
                      disabled={isEditingApiProvider}
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean disabled:bg-black/[0.04] disabled:text-black/45"
                    />
                    <FieldHelp>
                      The name Katie will see when choosing a provider while creating a product.
                      API provider names are integration data and stay locked here.
                    </FieldHelp>
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Code
                    </span>
                    <input
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: normalizeProviderCode(event.target.value),
                        }))
                      }
                      disabled={Boolean(editingProvider)}
                      placeholder="tapstitch"
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean disabled:bg-black/[0.04] disabled:text-black/45"
                    />
                    <FieldHelp>
                      Internal identifier: lowercase, no spaces. It can stay auto-generated from
                      the name. Once products use this provider, avoid changing it.
                    </FieldHelp>
                  </label>

                  <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                      disabled={isEditingApiProvider}
                      className="mt-1 h-4 w-4 accent-ocean disabled:opacity-50"
                    />
                    <span>
                      <span className="block font-body text-sm font-semibold text-black">
                        Provider active
                      </span>
                      <FieldHelp>
                        Controls whether this provider appears as an option when Katie creates
                        products. API provider activation is locked here because it depends on the
                        integration.
                      </FieldHelp>
                    </span>
                  </label>
                </div>
              </section>

              <section className="border border-black/10 bg-white/70 p-4">
                <h3 className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
                  Shipping destinations and rates
                </h3>
                <p className="mt-2 font-body text-xs leading-relaxed text-black/50">
                  Order matters: first record where the provider says it can ship, then choose
                  where What Katie Seas is allowed to sell, then enter the exact default shipping
                  rate for each enabled destination. Do not use $0 as a placeholder.
                </p>

                <div className="mt-4">
                  <StatusSelect
                    label="Shipping cost status"
                    value={form.shippingCostStatus}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, shippingCostStatus: value }))
                    }
                    help="Published or directly confirmed shipping cost is required before a provider can sell. If the provider does not publish it, keep the provider inactive until Katie confirms the cost directly."
                  />
                </div>

                <div className="mt-5 border border-black/10 bg-white p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    1. Countries this provider ships to
                  </p>
                  <FieldHelp>
                    Informational provider coverage. This does not turn on shop sales by itself.
                  </FieldHelp>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {shopCountries.map((country) => {
                      const checked = form.shippingCountries.includes(country.code);

                      return (
                        <label
                          key={country.code}
                          className="flex items-start gap-2 border border-black/10 bg-gray-50 p-3 font-body text-sm text-black"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setForm((current) => {
                                const nextShippingCountries = event.target.checked
                                  ? sortCountryCodes([...current.shippingCountries, country.code])
                                  : current.shippingCountries.filter(
                                      (countryCode) => countryCode !== country.code
                                    );

                                return {
                                  ...current,
                                  shippingCountries: nextShippingCountries,
                                  enabledShippingCountries:
                                    nextShippingCountries.includes(country.code)
                                      ? current.enabledShippingCountries
                                      : current.enabledShippingCountries.filter(
                                          (countryCode) => countryCode !== country.code
                                        ),
                                };
                              })
                            }
                            className="mt-1 h-4 w-4 accent-ocean"
                          />
                          <span>
                            <span className="block font-semibold">{country.name}</span>
                            <span className="block text-xs text-black/45">{country.code}</span>
                          </span>
                        </label>
                      );
                    })}
                    {shopCountries.length === 0 && (
                      <p className="font-body text-sm text-amber-800">
                        No shop countries are loaded yet. Apply the shipping-country SQL before
                        configuring provider destinations.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 border border-black/10 bg-white p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    2. Countries enabled for selling
                  </p>
                  <FieldHelp>
                    A country can be enabled only if the provider ships there and the shop country
                    itself is enabled. Countries requiring legal review stay visible but should not
                    be enabled yet.
                  </FieldHelp>
                  <div className="mt-3 grid gap-2">
                    {shopCountries.map((country) => {
                      const providerShipsThere = form.shippingCountries.includes(country.code);
                      const enabled = form.enabledShippingCountries.includes(country.code);
                      const canEnable = providerShipsThere && country.is_enabled && !country.requires_legal_review;

                      return (
                        <label
                          key={country.code}
                          className={
                            canEnable
                              ? 'flex items-start gap-2 border border-black/10 bg-gray-50 p-3 font-body text-sm text-black'
                              : 'flex items-start gap-2 border border-amber-100 bg-amber-50 p-3 font-body text-sm text-amber-950'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={!canEnable}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                enabledShippingCountries: event.target.checked
                                  ? sortCountryCodes([
                                      ...current.enabledShippingCountries,
                                      country.code,
                                    ])
                                  : current.enabledShippingCountries.filter(
                                      (countryCode) => countryCode !== country.code
                                    ),
                              }))
                            }
                            className="mt-1 h-4 w-4 accent-ocean disabled:opacity-40"
                          />
                          <span>
                            <span className="block font-semibold">{country.name}</span>
                            <span className="block text-xs text-black/50">
                              {!providerShipsThere
                                ? 'Provider coverage not selected yet.'
                                : !country.is_enabled
                                  ? 'Shop country is not enabled.'
                                  : country.requires_legal_review
                                    ? country.legal_review_note || 'Legal review required before selling here.'
                                    : 'Ready for a default provider shipping rate.'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 border border-black/10 bg-white p-4">
                  <p className="font-body text-sm font-semibold text-black">
                    3. Default shipping rates by enabled country
                  </p>
                  <FieldHelp>
                    These are Katie&apos;s default shipping costs from this provider for each
                    destination, only when that same rate applies across products. If a specific
                    garment, SKU, hat, hoodie, or jacket ships differently, set that on the product
                    instead.
                  </FieldHelp>
                  <div className="mt-3 grid gap-4">
                    {form.enabledShippingCountries.map((countryCode) => {
                      const rate = getRateForCountry(form, countryCode);

                      return (
                        <div key={countryCode} className="border border-black/10 bg-gray-50 p-4">
                          <p className="font-body text-sm font-semibold text-black">
                            {getCountryName(countryCode)} ({countryCode})
                          </p>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block font-body text-sm font-semibold text-black">
                                First item shipping / USD
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rate.firstShipping}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    shippingRatesByCountry: {
                                      ...current.shippingRatesByCountry,
                                      [countryCode]: {
                                        ...getRateForCountry(current, countryCode),
                                        firstShipping: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block font-body text-sm font-semibold text-black">
                                Additional item shipping / USD
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={rate.additionalShipping}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    shippingRatesByCountry: {
                                      ...current.shippingRatesByCountry,
                                      [countryCode]: {
                                        ...getRateForCountry(current, countryCode),
                                        additionalShipping: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    {form.enabledShippingCountries.length === 0 && (
                      <p className="font-body text-sm text-amber-800">
                        Enable at least one country above, then enter its first-item and
                        additional-item shipping rates.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {!isEditingApiProvider && (
              <section className="border border-black/10 bg-white/70 p-4">
                <h3 className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
                  Manual ordering info
                </h3>
                <p className="mt-2 font-body text-xs leading-relaxed text-black/50">
                  For manual providers, this is where Katie keeps the information she will need
                  when a customer buys something and she has to place the order by hand.
                </p>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Contact email
                    </span>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, contactEmail: event.target.value }))
                      }
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                    />
                    <FieldHelp>
                      Email to contact this manual provider when Katie needs to place an order.
                    </FieldHelp>
                  </label>
                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Contact URL
                    </span>
                    <input
                      type="url"
                      value={form.contactUrl}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, contactUrl: event.target.value }))
                      }
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                    />
                    <FieldHelp>
                      Website, dashboard, order form, or login page Katie should open to order
                      from this provider.
                    </FieldHelp>
                  </label>
                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Notes / ordering contact
                    </span>
                    <textarea
                      rows={5}
                      value={form.contactNotes}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, contactNotes: event.target.value }))
                      }
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                    />
                    <FieldHelp>
                      Put provider-wide ordering notes future Katie needs: account notes, contact
                      person, minimums, general special instructions, or reminders. Do not put a
                      product&apos;s blank garment, SKU, size chart, or product-specific shipping rate
                      here; those belong on the product.
                    </FieldHelp>
                  </label>
                </div>
              </section>
              )}

              <section className="border border-black/10 bg-white/70 p-4">
                <h3 className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
                  Customer policy requirements
                </h3>
                <p className="mt-2 font-body text-xs leading-relaxed text-black/50">
                  These fields are used on product pages, cart disclosure, order evidence, and
                  customer support replies. A provider cannot be used for selling until this is
                  complete.
                </p>
	                <div className="mt-4 border border-black/10 bg-white p-3">
	                  <p className="font-body text-sm font-semibold text-black">Provider checklist</p>
                  {formMissingPolicyFields.length === 0 && formLengthErrors.length === 0 ? (
                    <p className="mt-2 font-body text-sm text-green-800">
                      Complete. This provider can be made sellable after saving.
                    </p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-amber-900">
                      {formMissingPolicyFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                      {formLengthErrors.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
	                  )}
	                </div>
                {openProviderQuestions.length > 0 && (
                  <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
                    <p className="font-body text-sm font-semibold text-amber-950">
                      Questions to send this provider
                    </p>
                    <p className="mt-2 font-body text-xs leading-relaxed text-amber-900/80">
                      These are the missing answers Katie should confirm in one email. Items marked
                      “BLOCKS SALES” must be solved before products from this provider can sell.
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-amber-950">
                      {openProviderQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
	                <div className="mt-4 border border-ocean/15 bg-sky-50 p-3">
                  <p className="font-body text-sm font-semibold text-black">
                    Customer-facing preview
                  </p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
                    {customerPolicyPreview ||
                      'Complete the required provider policy fields to preview exactly what customers will see on product pages, in the cart, and in order emails.'}
                  </p>
                  <p className="mt-3 font-body text-xs leading-relaxed text-black/45">
                    Policy version is generated automatically from the verified policy content when
                    saved. Changing a deadline or customer-facing rule creates a different
                    identifier.
                  </p>
                  {editingProvider?.provider_policy_version && (
                    <p className="mt-2 font-body text-xs text-black/45">
                      Current version: {editingProvider.provider_policy_version}
                    </p>
                  )}
                </div>
                {formPolicyIsStale && (
                  <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
                    <p className="font-body text-sm font-semibold text-amber-900">
                      Policy verification is older than 6 months.
                    </p>
                    <p className="mt-2 font-body text-xs leading-relaxed text-amber-900/80">
                      Re-open the provider&apos;s Help Center or policy source, confirm the claim
                      windows and evidence rules, update the source note if needed, and set today as
                      the verification date. This is an operational reminder, not a sales blocker.
                    </p>
                  </div>
                )}
                <div className="mt-4 grid gap-4">
	                  <div className="grid gap-4 sm:grid-cols-2">
	                    <label className="block">
	                      <span className="mb-2 block font-body text-sm font-semibold text-black">
	                        Damaged/wrong item claim window · days
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.damagedClaimWindowDays}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            damagedClaimWindowDays: event.target.value,
                          }))
                        }
                        className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                      />
                      <FieldHelp>How long Katie has to open a claim for a bad item.</FieldHelp>
                    </label>
                    <label className="block">
                      <span className="mb-2 block font-body text-sm font-semibold text-black">
                        Lost package claim window · days
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.lostPackageClaimWindowDays}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            lostPackageClaimWindowDays: event.target.value,
                          }))
                        }
                        className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                      />
	                      <FieldHelp>How long Katie has to report a lost shipment.</FieldHelp>
	                    </label>
	                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block font-body text-sm font-semibold text-black">
                        Recommended issue report target · days
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.recommendedIssueReportWindowDays}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            recommendedIssueReportWindowDays: event.target.value,
                          }))
                        }
                        className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                      />
                      <FieldHelp>
                        Optional. Example: TapStitch says misprint/damage/defect should ideally be
                        reported within 7 days. This is a recommendation, not the hard maximum.
                      </FieldHelp>
                    </label>
                    <label className="block">
                      <span className="mb-2 block font-body text-sm font-semibold text-black">
                        Eligible return request maximum · days
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.eligibleReturnRequestWindowDays}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            eligibleReturnRequestWindowDays: event.target.value,
                          }))
                        }
                        className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                      />
                      <FieldHelp>
                        Optional. This is only for returns that are already eligible/approved; it is
                        not a general return window for correctly made unwanted items.
                      </FieldHelp>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatusSelect
                      label="Address change cutoff status"
                      value={form.addressChangeStatus}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, addressChangeStatus: value }))
                      }
                      help="If not published, customers are told Katie cannot promise address changes after checkout."
                    />
                    <StatusSelect
                      label="Wrong-address reship status"
                      value={form.wrongAddressReshipStatus}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, wrongAddressReshipStatus: value }))
                      }
                      help="If not published, customers are told Katie cannot promise free reshipping for incorrect addresses."
                    />
                    <StatusSelect
                      label="Shipping time status"
                      value={form.shippingTimeStatus}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, shippingTimeStatus: value }))
                      }
                      help="If not published, customers are told tracking will be sent when the order ships."
                    />
                    <StatusSelect
                      label="Return address status"
                      value={form.returnAddressStatus}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, returnAddressStatus: value }))
                      }
                      help="If not published, do not invent a return address. For TapStitch, returns go only where they say after approval."
                    />
                  </div>

	                  {[
	                    ['photoEvidenceDescription', 'Photo evidence details', 'What customers must send Katie when something arrives damaged, wrong, or defective.', 'photo_evidence_description'],
	                    ['lostPackageWindowBasis', 'Lost package window starts from', 'Example: estimated delivery date, ship date, or delivery scan.', 'lost_package_window_basis'],
	                    ['deliveredNotReceivedPolicy', 'Delivered but not received', 'What customers are told when tracking says delivered but they cannot find it.', 'delivered_not_received_policy'],
	                    ['addressChangeCutoff', 'Address change cutoff', 'When customers can still ask Katie to fix an address before the provider ships.', 'address_change_cutoff'],
		                    ['wrongAddressReshipPolicy', 'Wrong-address reship policy', 'Who pays if the package comes back because the customer entered the wrong address.', 'wrong_address_reship_policy'],
		                    ['productionTimeDescription', 'Estimated production time', 'Estimated time production may take before shipment. Do not write a guaranteed delivery date.', 'production_time_description'],
		                    ['shippingTimeDescription', 'Estimated shipping/transit time', 'Estimated transit after production. Do not write a guaranteed delivery date.', 'shipping_time_description'],
                      ['returnShippingPayer', 'Return shipping payer', 'Who pays return shipping when a return is eligible/approved.', 'return_shipping_payer'],
                      ['claimReviewTimeDescription', 'Claim review time', 'How long the provider says it may take to review a claim or return request.', 'claim_review_time_description'],
                      ['cancellationCutoff', 'Cancellation cutoff', 'When an order can still be canceled before production/fulfillment.', 'cancellation_cutoff'],
                      ['nonReturnableCategories', 'Non-returnable categories', 'Products/categories the provider says cannot be returned. Do not use this as a general return window.', 'non_returnable_categories'],
                      ['refundMethodDescription', 'Refund method', 'How eligible refunds are returned, for example original payment method or store credit.', 'refund_method_description'],
                      ['productionDelayCompensation', 'Production delay compensation', 'What the provider offers if production is delayed, if anything.', 'production_delay_compensation'],
                      ['customsResponsibility', 'Customs / international responsibility', 'Who pays customs duties/taxes if international shipping is added later.', 'customs_responsibility'],
		                    ['supportContact', 'Provider support contact', 'Internal: where Katie contacts the provider for claims. This is not shown publicly.', 'support_contact'],
		                    ['claimSubmissionInstructions', 'Claim instructions', 'Internal: steps Katie follows to open a provider claim. This is not shown publicly.', 'claim_submission_instructions'],
		                    ['returnAddress', 'Return address', 'Internal: where returns go, if applicable. Write “not applicable” if none. This is not shown publicly.', 'return_address'],
		                    ['policySourceUrl', 'Policy source URL', 'Internal: provider policy URL, if one exists. This is not shown publicly.', 'policy_source_url'],
                      ['policySourceUrls', 'Additional policy source URLs', 'Optional: one URL per line. Use this when a provider has more than one relevant official document.', 'policy_source_url'],
		                    ['policySourceNote', 'Source note', 'Internal: where Katie verified this information if there is no public URL. This is not shown publicly.', 'policy_source_note'],
		                  ].map(([field, label, help, limitKey]) => {
                      const maxLength = getProviderPolicyFieldLimit(
                        limitKey as Parameters<typeof getProviderPolicyFieldLimit>[0]
                      );
                      const value = String(form[field as keyof ProviderFormState]);
                      const isOverLimit = value.length > maxLength;

                      return (
	                    <label key={field} className="block">
	                      <span className="mb-2 block font-body text-sm font-semibold text-black">
	                        {label}
	                      </span>
	                      <textarea
	                        rows={field === 'policySourceUrl' ? 1 : 3}
	                        value={String(form[field as keyof ProviderFormState])}
                          maxLength={maxLength + 100}
	                        onChange={(event) =>
	                          setForm((current) => ({
	                            ...current,
	                            [field]: event.target.value,
	                          }))
	                        }
	                        className={
                            isOverLimit
                              ? 'w-full border border-red-300 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-red-400'
                              : 'w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean'
                          }
	                      />
	                      <FieldHelp>
                          {help} {value.length}/{maxLength} characters.
                        </FieldHelp>
	                    </label>
                      );
                    })}

                  <label className="block">
                    <span className="mb-2 block font-body text-sm font-semibold text-black">
                      Policy verified date
                    </span>
                    <input
                      type="date"
                      value={form.policyVerifiedAt}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, policyVerifiedAt: event.target.value }))
                      }
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none focus:border-ocean"
                    />
                    <FieldHelp>Date Katie last checked these provider rules.</FieldHelp>
                  </label>

                  <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={form.photoEvidenceRequired}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          photoEvidenceRequired: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-ocean"
                    />
                    <span className="font-body text-sm text-black/65">
                      This provider requires photos/evidence for claims.
                    </span>
                  </label>

	                  <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
	                    <input
	                      type="checkbox"
	                      checked={form.acceptsSizeColorRemorseReturns}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          acceptsSizeColorRemorseReturns: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-ocean"
                    />
                    <span className="font-body text-sm text-black/65">
                      This provider accepts size/color/buyer’s remorse returns. Leave unchecked
                      for final-sale made-to-order products.
	                    </span>
	                  </label>

                  <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={form.returnAuthorizationRequired}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          returnAuthorizationRequired: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-ocean"
                    />
                    <span className="font-body text-sm text-black/65">
                      Eligible returns require provider authorization before anything is mailed back.
                    </span>
                  </label>
	                </div>
	              </section>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={isSaving} className="btn-ocean justify-center">
                {isSaving ? 'Saving...' : editingProvider ? 'Update provider' : 'Create provider'}
              </button>
              {editingProvider && (
                <button type="button" onClick={resetForm} className="btn-secondary justify-center">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function ProviderRow({
  provider,
  shippingRates,
  readOnly = false,
  onEdit,
}: {
  provider: EcommerceProvider;
  shippingRates: AdminProviderShippingRate[];
  readOnly?: boolean;
  onEdit?: () => void;
}) {
  const missingPolicyFields = getProviderPolicyMissingFields(provider);
  const apiFulfillmentLocked =
    provider.fulfillment_mode === 'api' && !provider.api_fulfillment_enabled;
  const isSellable = isProviderSellable(provider) && missingPolicyFields.length === 0;
  const isPolicyStale = isProviderPolicyStale(provider);

  return (
    <article className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-2xl text-black">{provider.name}</h3>
          <span className="border border-black/10 bg-gray-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-black/50">
            {provider.code}
          </span>
          <span className="border border-ocean/20 bg-sky-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-ocean">
            {provider.fulfillment_mode}
          </span>
          <span
            className={
              provider.is_active && isSellable
                ? 'border border-green-200 bg-green-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-green-800'
                : 'border border-amber-200 bg-amber-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-amber-900'
            }
          >
            {provider.is_active && isSellable ? 'Sellable' : 'Not sellable'}
          </span>
          {apiFulfillmentLocked && (
            <span className="border border-amber-300 bg-amber-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-amber-900">
              API locked
            </span>
          )}
        </div>
        <div className="mt-2 font-body text-sm text-black/55">
          <p>Default shipping rates:</p>
          {shippingRates.filter((rate) => rate.is_active).length > 0 ? (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {shippingRates
                .filter((rate) => rate.is_active)
                .map((rate) => (
                  <li key={rate.country_code}>
                    {getCountryName(rate.country_code)}: {formatUsd(rate.first_item_cents)} first
                    item / {formatUsd(rate.additional_item_cents)} additional item
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-1 text-amber-800">No enabled country rate recorded yet.</p>
          )}
        </div>
        <p className="mt-1 font-body text-xs text-black/45">
          Provider ships to:{' '}
          {(provider.shipping_countries ?? []).length > 0
            ? (provider.shipping_countries ?? []).join(', ')
            : 'not recorded yet'}
        </p>
        {(provider.contact_email || provider.contact_url || provider.contact_notes) && (
          <p className="mt-2 line-clamp-2 font-body text-xs text-black/45">
            {[provider.contact_email, provider.contact_url, provider.contact_notes]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {missingPolicyFields.length > 0 && (
          <p className="mt-2 font-body text-xs text-amber-800">
            Missing policy info: {missingPolicyFields.join(', ')}
          </p>
        )}
        {apiFulfillmentLocked && (
          <p className="mt-2 font-body text-xs leading-relaxed text-amber-800">
            This API provider is deliberately blocked for the manual-provider production launch.
            Its policy data stays saved, but products cannot use it until API fulfillment is
            enabled by a deliberate database switch.
          </p>
        )}
        {isPolicyStale && (
          <p className="mt-2 font-body text-xs text-amber-800">
            Policy verification is older than 6 months. Re-check the provider rules and update the
            verification date.
          </p>
        )}
        {provider.fulfillment_mode === 'api' && (
          <p className="mt-2 font-body text-xs text-black/45">
            API catalog and size data are synced by code; policy rules are manually verified from
            provider documentation.
          </p>
        )}
      </div>
      {readOnly ? (
        <p className="font-body text-xs uppercase tracking-[0.14em] text-black/35">Read-only</p>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="font-body text-sm font-semibold text-ocean underline"
        >
          Edit
        </button>
      )}
    </article>
  );
}
