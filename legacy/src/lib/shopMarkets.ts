export type ShopCountryCode = 'US';

export const SHOP_SELLING_COUNTRIES: Array<{
  code: ShopCountryCode;
  name: string;
}> = [
  {
    code: 'US',
    name: 'United States',
  },
];

export const SHOP_SELLING_COUNTRY_CODES = SHOP_SELLING_COUNTRIES.map(
  (country) => country.code
);

export const SHOP_SELLING_COUNTRY_NAMES = SHOP_SELLING_COUNTRIES.map(
  (country) => country.name
);

export const SHOP_SHIPPING_SCOPE_NOTICE =
  'Ships to the United States only for this first shop launch.';

export const SHOP_INTERNATIONAL_EXPANSION_NOTE =
  'Adding a country here is not enough to sell there. Before enabling a new destination, verify provider shipping cost, the pricing model for that destination, local tax/VAT/GST obligations, and a return-policy text that is valid for that jurisdiction.';

export function isShopSellingCountry(countryCode: string | null | undefined) {
  if (!countryCode) return false;
  return SHOP_SELLING_COUNTRY_CODES.includes(countryCode.toUpperCase() as ShopCountryCode);
}

export function formatShopSellingCountries() {
  return SHOP_SELLING_COUNTRY_NAMES.join(', ');
}

export function getCountryName(countryCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}
