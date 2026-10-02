import { SHOP_RETURN_POLICY_PATH } from '@/lib/ecommercePolicy';
import type { ProductShippingRate } from '@/lib/shopShipping';
import type { ApprovedProductReview } from '@/lib/productReviewServer';
import { absoluteUrl, type JsonLdValue } from '@/lib/structuredData';

export const SHOP_BRAND_JSON_LD: JsonLdValue = {
  '@type': 'Brand',
  name: 'What Katie Seas',
};

// Current US fulfillment estimates are represented as ranges, never as a
// guaranteed arrival date. Handling covers made-to-order production; transit
// covers the published US delivery range. Other countries intentionally omit
// deliveryTime until a destination-specific range has been verified.
const US_SHIPPING_DELIVERY_TIME_JSON_LD: JsonLdValue = {
  '@type': 'ShippingDeliveryTime',
  handlingTime: {
    '@type': 'QuantitativeValue',
    minValue: 3,
    maxValue: 7,
    unitCode: 'DAY',
  },
  transitTime: {
    '@type': 'QuantitativeValue',
    minValue: 3,
    maxValue: 7,
    unitCode: 'DAY',
  },
};

export function buildProductReviewsJsonLd(reviews: ApprovedProductReview[]): {
  aggregateRating?: JsonLdValue;
  review?: JsonLdValue;
} {
  if (reviews.length === 0) return {};

  const ratingValue =
    reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;

  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(ratingValue.toFixed(2)),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author_name,
      },
      datePublished: review.submitted_at,
      reviewBody: review.comment_text,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };
}

/**
 * Correctly made, made-to-order products are final sale. Damage, defect, and
 * wrong-item remedies remain available under the linked public policy, but
 * they are not represented as a general return window.
 */
export function buildShopMerchantReturnPolicyJsonLd(): JsonLdValue {
  return {
    '@type': 'MerchantReturnPolicy',
    '@id': `${absoluteUrl(SHOP_RETURN_POLICY_PATH)}#merchant-return-policy`,
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    merchantReturnLink: absoluteUrl(SHOP_RETURN_POLICY_PATH),
  };
}

export function buildOfferShippingDetailsJsonLd(
  shippingRates: ProductShippingRate[]
): JsonLdValue[] {
  return shippingRates.map((rate) => ({
    '@type': 'OfferShippingDetails',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: rate.country_code,
    },
    shippingRate: {
      '@type': 'MonetaryAmount',
      value:
        rate.shipping_price_mode === 'included'
          ? '0.00'
          : (rate.first_item_cents / 100).toFixed(2),
      currency: rate.currency,
    },
    deliveryTime:
      rate.country_code.toUpperCase() === 'US'
        ? US_SHIPPING_DELIVERY_TIME_JSON_LD
        : undefined,
  }));
}

export function buildShopOfferJsonLd({
  path,
  priceCents,
  currency,
  isAvailable,
  shippingRates,
}: {
  path: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  shippingRates: ProductShippingRate[];
}): JsonLdValue {
  return {
    '@type': 'Offer',
    price: (priceCents / 100).toFixed(2),
    priceCurrency: currency,
    availability: isAvailable
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    url: absoluteUrl(path),
    itemCondition: 'https://schema.org/NewCondition',
    seller: {
      '@id': `${absoluteUrl('/')}#organization`,
    },
    shippingDetails: buildOfferShippingDetailsJsonLd(shippingRates),
    hasMerchantReturnPolicy: buildShopMerchantReturnPolicyJsonLd(),
  };
}
