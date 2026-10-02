export type AccountingOrderItem = {
  id: string;
  quantity: number;
  unit_price_cents: number;
};

export type AccountingOrderRefund = {
  order_item_id: string | null;
  amount_cents: number;
  quantity: number | null;
};

export type EffectiveOrderItem<TItem extends AccountingOrderItem = AccountingOrderItem> =
  TItem & {
    purchasedQuantity: number;
    refundedQuantity: number;
    effectiveQuantity: number;
    grossAmountCents: number;
    refundedAmountCents: number;
    effectiveAmountCents: number;
    isFullyRefunded: boolean;
  };

export type EffectiveOrderState<TItem extends AccountingOrderItem = AccountingOrderItem> = {
  items: EffectiveOrderItem<TItem>[];
  purchasedItemCount: number;
  refundedItemCount: number;
  effectiveItemCount: number;
  grossItemsCents: number;
  itemRefundedCents: number;
  orderLevelRefundedCents: number;
  totalRefundedCents: number;
  effectiveItemsCents: number;
  effectiveOrderCents: number;
  hasRefunds: boolean;
  isFullyRefunded: boolean;
};

export function willItemRefundLeaveNoEffectiveItems<TItem extends AccountingOrderItem>({
  items,
  refunds,
  orderItemId,
  quantity,
}: {
  items: TItem[];
  refunds: AccountingOrderRefund[];
  orderItemId: string;
  quantity: number;
}) {
  return items.every((item) => {
    const alreadyRefundedQuantity = refunds
      .filter((refund) => refund.order_item_id === item.id)
      .reduce((total, refund) => total + (refund.quantity ?? 0), 0);
    const pendingRefundQuantity = item.id === orderItemId ? quantity : 0;

    return item.quantity - alreadyRefundedQuantity - pendingRefundQuantity <= 0;
  });
}

export function getEffectiveOrderState<TItem extends AccountingOrderItem>({
  items,
  refunds,
  orderTotalCents,
}: {
  items: TItem[];
  refunds: AccountingOrderRefund[];
  orderTotalCents: number;
}): EffectiveOrderState<TItem> {
  const itemRefundsByItemId = new Map<string, AccountingOrderRefund[]>();
  let orderLevelRefundedCents = 0;

  refunds.forEach((refund) => {
    if (refund.order_item_id) {
      itemRefundsByItemId.set(refund.order_item_id, [
        ...(itemRefundsByItemId.get(refund.order_item_id) ?? []),
        refund,
      ]);
      return;
    }

    orderLevelRefundedCents += refund.amount_cents;
  });

  const grossItemsCents = items.reduce(
    (total, item) => total + item.quantity * item.unit_price_cents,
    0
  );
  const totalRefundedCents = refunds.reduce((total, refund) => total + refund.amount_cents, 0);
  const cappedTotalRefundedCents = Math.min(totalRefundedCents, orderTotalCents);
  const isOrderFullyRefundedByAmount =
    orderTotalCents > 0 && cappedTotalRefundedCents >= orderTotalCents;

  let purchasedItemCount = 0;
  let refundedItemCount = 0;
  let effectiveItemCount = 0;
  let itemRefundedCents = 0;
  let effectiveItemsCents = 0;

  const effectiveItems = items.map((item) => {
    const itemRefunds = itemRefundsByItemId.get(item.id) ?? [];
    const refundedQuantity = Math.min(
      item.quantity,
      itemRefunds.reduce((total, refund) => total + (refund.quantity ?? 0), 0)
    );
    const rawEffectiveQuantity = Math.max(item.quantity - refundedQuantity, 0);
    const effectiveQuantity = isOrderFullyRefundedByAmount ? 0 : rawEffectiveQuantity;
    const grossAmountCents = item.quantity * item.unit_price_cents;
    const rawRefundedAmountCents = itemRefunds.reduce(
      (total, refund) => total + refund.amount_cents,
      0
    );
    const refundedAmountCents = isOrderFullyRefundedByAmount
      ? grossAmountCents
      : Math.min(grossAmountCents, rawRefundedAmountCents);
    const effectiveAmountCents = item.unit_price_cents * effectiveQuantity;

    purchasedItemCount += item.quantity;
    refundedItemCount += refundedQuantity;
    effectiveItemCount += effectiveQuantity;
    itemRefundedCents += refundedAmountCents;
    effectiveItemsCents += effectiveAmountCents;

    return {
      ...item,
      purchasedQuantity: item.quantity,
      refundedQuantity: isOrderFullyRefundedByAmount ? item.quantity : refundedQuantity,
      effectiveQuantity,
      grossAmountCents,
      refundedAmountCents,
      effectiveAmountCents,
      isFullyRefunded: effectiveQuantity <= 0,
    };
  });

  const isFullyRefunded =
    isOrderFullyRefundedByAmount || (items.length > 0 && effectiveItemCount === 0);

  return {
    items: effectiveItems,
    purchasedItemCount,
    refundedItemCount: isFullyRefunded ? purchasedItemCount : refundedItemCount,
    effectiveItemCount: isFullyRefunded ? 0 : effectiveItemCount,
    grossItemsCents,
    itemRefundedCents,
    orderLevelRefundedCents,
    totalRefundedCents: cappedTotalRefundedCents,
    effectiveItemsCents: isFullyRefunded ? 0 : effectiveItemsCents,
    effectiveOrderCents: Math.max(orderTotalCents - cappedTotalRefundedCents, 0),
    hasRefunds: totalRefundedCents > 0,
    isFullyRefunded,
  };
}
