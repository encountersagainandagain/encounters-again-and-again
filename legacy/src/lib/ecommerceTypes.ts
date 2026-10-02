export type EcommerceOrderStatus =
  | 'pending'
  | 'paid'
  | 'awaiting_manual_fulfillment'
  | 'submitting'
  | 'submitted'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'on_hold'
  | 'failed'
  | 'canceled'
  | 'refunded';

export type PodProvider = string;
export type FulfillmentMode = 'api' | 'manual';
export type ProviderPolicyFieldStatus = 'published' | 'not_published' | 'unverified';
export type ShippingPriceMode = 'included' | 'separate';

export type ProcessedWebhookSource = 'stripe' | PodProvider;

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  retail_price_cents: number;
  currency: string;
  provider: PodProvider;
  provider_catalog_product_id: number | null;
  provider_print_provider_id: number | null;
  provider_meta: Record<string, unknown>;
  example_images: string[];
  shipping_price_mode: ShippingPriceMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EcommerceProvider = {
  code: string;
  name: string;
  fulfillment_mode: FulfillmentMode;
  is_active: boolean;
  provider_is_sellable: boolean;
  api_fulfillment_enabled: boolean;
  shipping_countries?: string[] | null;
  shipping_first_item_cents: number;
  shipping_additional_item_cents: number;
  contact_notes: string;
  contact_email: string;
  contact_url: string;
  provider_policy_version: string;
  provider_policy_hash: string;
  shipping_cost_status?: ProviderPolicyFieldStatus | null;
  damaged_claim_window_days: number;
  recommended_issue_report_window_days?: number | null;
  photo_evidence_required: boolean;
  photo_evidence_description: string;
  lost_package_claim_window_days: number;
  lost_package_window_basis: string;
  eligible_return_request_window_days?: number | null;
  delivered_not_received_policy: string;
  address_change_status?: ProviderPolicyFieldStatus | null;
  address_change_cutoff: string;
  wrong_address_reship_status?: ProviderPolicyFieldStatus | null;
  wrong_address_reship_policy: string;
  accepts_size_color_remorse_returns: boolean;
  production_time_description: string;
  shipping_time_status?: ProviderPolicyFieldStatus | null;
  shipping_time_description: string;
  return_shipping_payer?: string | null;
  return_authorization_required?: boolean | null;
  claim_review_time_description?: string | null;
  cancellation_cutoff?: string | null;
  non_returnable_categories?: string | null;
  refund_method_description?: string | null;
  production_delay_compensation?: string | null;
  customs_responsibility?: string | null;
  support_contact: string;
  claim_submission_instructions: string;
  return_address_status?: ProviderPolicyFieldStatus | null;
  return_address: string;
  policy_source_url: string;
  policy_source_urls?: string[] | null;
  policy_source_note: string;
  policy_verified_at: string;
  created_at: string;
  updated_at: string;
};

export type PublicProviderPolicy = Pick<
  EcommerceProvider,
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

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string;
  color_code: string;
  size: string;
  provider_variant_id: number | null;
  provider_base_cost_cents: number;
  available_us: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductFile = {
  id: string;
  product_id: string;
  placement: string;
  file_url: string;
  provider_file_type: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  color: string | null;
  alt_text: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type EcommerceShopCountry = {
  code: string;
  name: string;
  is_enabled: boolean;
  requires_legal_review: boolean;
  legal_review_note: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

export type EcommerceProviderShippingRate = {
  id: string;
  provider: PodProvider;
  country_code: string;
  first_item_cents: number;
  additional_item_cents: number;
  currency: string;
  source_note: string;
  verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductShippingRate = {
  id: string;
  product_id: string;
  country_code: string;
  first_item_cents: number;
  additional_item_cents: number;
  currency: string;
  source_note: string;
  verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductEnabledCountry = {
  product_id: string;
  country_code: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type EcommerceSizeGuide = {
  id: string;
  provider: PodProvider;
  product_id?: string;
  provider_catalog_product_id: number | null;
  base_garment_name?: string | null;
  base_garment_provider_identifier?: string | null;
  version: string;
  unit: string;
  measurement_type: string;
  title: string;
  tolerance: string;
  source_url: string;
  source_checked_at: string;
  guide: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EcommerceOrder = {
  id: string;
  customer_order_number: string;
  status: EcommerceOrderStatus;
  provider: PodProvider;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  provider_order_id: string | null;
  provider_submitted_at: string | null;
  provider_last_attempt_at: string | null;
  provider_last_error: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  provider_cost_cents: number;
  currency: string;
  customer_email: string;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2: string;
  shipping_city: string;
  shipping_state_code: string;
  shipping_zip: string;
  shipping_country_code: string;
  tracking_carrier: string;
  tracking_number: string;
  tracking_url: string;
  return_policy_version: string | null;
  return_policy_url: string | null;
  size_guide_version: string | null;
  size_guide_snapshot: Record<string, unknown>[] | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  customer_purchase_ip: string | null;
  customer_purchase_user_agent: string | null;
  cart_terms_accepted: boolean;
  cart_terms_accepted_at: string | null;
  cart_terms_version: string | null;
  cart_terms_text: string | null;
  provider_policy_snapshot: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
  admin_reviewed_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_cents: number;
  color: string;
  size: string;
  created_at: string;
};

export type ProcessedWebhookEvent = {
  id: string;
  source: ProcessedWebhookSource;
  event_id: string;
  processed_at: string;
};

export type OrderCustomerNotificationType =
  | 'payment_received'
  | 'manual_provider_submitted'
  | 'api_provider_submitted'
  | 'shipped'
  | 'delivered'
  | 'refund';

export type OrderCustomerNotification = {
  id: string;
  order_id: string;
  notification_type: OrderCustomerNotificationType;
  status: 'sent' | 'failed';
  recipient_email: string;
  subject: string;
  resend_email_id: string | null;
  error_message: string;
  created_at: string;
};

export type ProductReviewStatus = 'invited' | 'pending' | 'approved' | 'rejected';

export type ProductReview = {
  id: string;
  order_id: string;
  product_id: string;
  token_hash: string;
  status: ProductReviewStatus;
  author_name: string | null;
  rating: number | null;
  comment_text: string | null;
  requested_at: string;
  expires_at: string;
  submitted_at: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderOperationalIncidentType =
  | 'manual_refund'
  | 'manual_provider_retry'
  | 'manual_status_change'
  | 'manual_provider_order_reference_change'
  | 'manual_fulfillment_reminder'
  | 'missing_terms_consent'
  | 'pending_order_missing_stripe_session'
  | 'paid_webhook_order_update_mismatch';

/**
 * Pasos normales de despachar un pedido con proveedor manual, no señales de que
 * algo anduvo mal. Con fulfillment manual una venta perfecta genera 3 o 4 de
 * estos, así que contarlos como "intervenciones" hace que la métrica suba con
 * las ventas en vez de con los problemas — exactamente al revés de lo que el
 * panel dice que significa.
 *
 * Se listan las rutinarias en vez de listar las problemáticas a propósito: un
 * tipo de incidente nuevo entra contado por defecto. Es preferible mostrar de
 * más y corregir, a que un problema nuevo quede invisible.
 */
export const ROUTINE_ORDER_INCIDENT_TYPES = new Set<OrderOperationalIncidentType>([
  'manual_status_change',
  'manual_provider_order_reference_change',
]);

export type OrderOperationalIncident = {
  id: string;
  order_id: string;
  incident_type: OrderOperationalIncidentType;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type OrderRefund = {
  id: string;
  order_id: string;
  order_item_id: string | null;
  amount_cents: number;
  currency: string;
  quantity: number | null;
  cause: 'process_failure' | 'customer_request';
  reason: string;
  stripe_refund_id: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
};
