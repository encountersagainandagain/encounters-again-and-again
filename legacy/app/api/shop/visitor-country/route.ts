import { NextResponse } from 'next/server';
import { fetchEnabledShopCountries, getCountryName } from '@/lib/shopShipping';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const countryCode = request.headers.get('x-vercel-ip-country')?.trim().toUpperCase() ?? '';
  const enabledCountries = await fetchEnabledShopCountries().catch(() => [
    { code: 'US', name: 'United States' },
  ]);
  const enabledCodes = new Set(enabledCountries.map((country) => country.code));
  const enabledCountryNames = enabledCountries.map((country) => country.name);

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return NextResponse.json(
      {
        countryCode: null,
        countryName: null,
        isSupported: null,
        enabledCountryNames,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  }

  return NextResponse.json(
    {
      countryCode,
      countryName: getCountryName(countryCode),
      isSupported: enabledCodes.has(countryCode),
      enabledCountryNames,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
