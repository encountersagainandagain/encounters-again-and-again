'use client';

import { useEffect } from 'react';
import { saveCartItems } from '@/lib/cartStorage';
import { storeShopPromotion } from '@/lib/shopCampaigns';

export function ClearCartOnSuccess() {
  useEffect(() => {
    saveCartItems([]);
    storeShopPromotion(null);
  }, []);

  return null;
}
