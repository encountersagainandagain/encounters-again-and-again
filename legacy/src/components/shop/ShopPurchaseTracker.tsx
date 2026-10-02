'use client';

import { useEffect } from 'react';
import { trackShopPurchase, type ShopPurchaseAnalytics } from '@/lib/analytics';

const trackedPurchaseIds = new Set<string>();
const PURCHASE_STORAGE_PREFIX = 'what-katie-seas-ga4-purchase-v1:';
const MAX_TRACKING_ATTEMPTS = 40;

function wasPurchaseTracked(transactionId: string) {
  if (trackedPurchaseIds.has(transactionId)) return true;

  try {
    return window.localStorage.getItem(`${PURCHASE_STORAGE_PREFIX}${transactionId}`) === '1';
  } catch {
    return false;
  }
}

function markPurchaseTracked(transactionId: string) {
  trackedPurchaseIds.add(transactionId);

  try {
    window.localStorage.setItem(`${PURCHASE_STORAGE_PREFIX}${transactionId}`, '1');
  } catch {
    // The in-memory guard still prevents duplicates during this page lifecycle.
  }
}

export function ShopPurchaseTracker({ purchase }: { purchase: ShopPurchaseAnalytics }) {
  useEffect(() => {
    if (wasPurchaseTracked(purchase.transaction_id)) return;

    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const sendPurchase = () => {
      if (cancelled || wasPurchaseTracked(purchase.transaction_id)) return;

      if (trackShopPurchase(purchase)) {
        markPurchaseTracked(purchase.transaction_id);
        return;
      }

      attempts += 1;
      if (attempts < MAX_TRACKING_ATTEMPTS) {
        retryTimer = setTimeout(sendPurchase, 250);
      }
    };

    sendPurchase();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [purchase]);

  return null;
}
