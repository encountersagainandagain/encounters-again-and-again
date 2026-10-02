import {
  redactFulfillmentIdentity,
  type ProviderPolicySnapshot,
} from '@/lib/ecommerceProviderPolicy';

export const CUSTOMER_ORDER_NUMBER_PREFIX = 'WKS';

type OrderNumberLike = {
  id: string;
  customer_order_number?: string | null;
};

export function getCustomerOrderNumber(order: OrderNumberLike) {
  if (order.customer_order_number) return order.customer_order_number;
  return `${CUSTOMER_ORDER_NUMBER_PREFIX}-${order.id.slice(0, 8).toUpperCase()}`;
}

export function getCustomerOrderNumbers(orders: OrderNumberLike[]) {
  return [...new Set(orders.map(getCustomerOrderNumber))];
}

export function formatCustomerOrderNumbers(orders: OrderNumberLike[]) {
  return getCustomerOrderNumbers(orders).join(', ');
}

export function getProviderClaimHelpLines(
  providerPolicySnapshots: ProviderPolicySnapshot[]
) {
  if (providerPolicySnapshots.length === 0) {
    return [
      'Claim deadline: reply as soon as possible so Katie can check the applicable window.',
      'If something arrived damaged, defective, or wrong, send clear photos of the item, the issue, the size tag, and the packing slip if you still have it.',
      'Not covered: size, color, or buyer’s remorse when the item arrived correct.',
    ];
  }

  return providerPolicySnapshots.map((snapshot) => {
    const customerText = (value: string) =>
      redactFulfillmentIdentity(value, {
        name: snapshot.provider_name,
        code: snapshot.provider_code,
      });
    const parts = [
      `Damaged, defective, or wrong item claims must be sent within ${snapshot.damaged_claim_window_days} days`,
      `lost-package claims within ${snapshot.lost_package_claim_window_days} days from ${customerText(snapshot.lost_package_window_basis)}`,
    ];

    if (snapshot.recommended_issue_report_window_days) {
      parts.push(
        `please report misprints, damage, or defects within ${snapshot.recommended_issue_report_window_days} days when possible`
      );
    }

    if (snapshot.eligible_return_request_window_days) {
      parts.push(
        `${snapshot.eligible_return_request_window_days} days is only the maximum to request an already eligible return, not a general return window`
      );
    }

    parts.push(
      snapshot.photo_evidence_required
        ? `send photos if something arrived wrong or damaged: ${customerText(snapshot.photo_evidence_description)}`
        : 'photos may not be required, but clear photos still help if something arrived wrong or damaged'
    );

    parts.push(
      snapshot.accepts_size_color_remorse_returns
        ? 'size/color returns follow the saved item terms'
        : 'size, color, and buyer’s remorse are final sale when the item arrives correct'
    );

    if (snapshot.shipping_time_status === 'not_published') {
      parts.push('transit estimate is not published; tracking will be shared when the order ships');
    }

    return `${parts.join('; ')}.`;
  });
}

export function buildCustomerHelpText({
  orderNumber,
  supportEmail,
  providerPolicySnapshots,
}: {
  orderNumber: string;
  supportEmail: string;
  providerPolicySnapshots: ProviderPolicySnapshot[];
}) {
  return [
    'Need help with this order?',
    `Order number: ${orderNumber}`,
    `Write to: ${supportEmail}`,
    `Please include your order number and write from the same email address you used at checkout.`,
    ...getProviderClaimHelpLines(providerPolicySnapshots),
  ].join('\n');
}
