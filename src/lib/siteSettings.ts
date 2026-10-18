import { cache } from 'react';
import { siteConfig } from '@/data';
import { modules } from '@/config/modules';
import { supabase } from '@/lib/supabase';

export type CountryPage = {
  slug: string;
  name: string;
  bannerImage: string;
  intro: string;
  body: string;
};

export type ShopLifestylePhoto = {
  url: string;
  alt: string;
};

export type ShopCollectionDisplayMode = 'carousel' | 'grid';
export type ShopCollectionItemsPerRow = 2 | 3 | 4 | 5 | 6;

export type AboutImageCopy = {
  id: string;
  alt: string;
  caption: string;
};

export type ShopCollection = {
  id: string;
  name: string;
  productIds: string[];
  displayMode: ShopCollectionDisplayMode;
  itemsPerRow: ShopCollectionItemsPerRow;
};

export type SiteSettings = {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  logoLight: string;
  logoDark: string;
  logoFooter: string;
  instagram: string;
  youtube: string;
  pinterest: string;
  facebook: string;
  tiktok: string;
  showInstagram: boolean;
  showYoutube: boolean;
  showPinterest: boolean;
  showFacebook: boolean;
  showTiktok: boolean;
  contactLocation: string;
  contactPartners: string;
  homeHeroVideoDesktop: string;
  homeHeroVideoMobile: string;
  homeHeroFallbackImage: string;
  homeAboutTitle: string;
  homeAboutGreeting: string;
  homeAboutParagraph1: string;
  homeAboutParagraph2: string;
  homeAboutParagraph3: string;
  homeAboutImage: string;
  homeNextEyebrow: string;
  homeNextTitle: string;
  homeNextSubtitle: string;
  homeNextImage: string;
  homeNextStops: string;
  aboutHeroImage: string;
  aboutHeroTitle: string;
  aboutImageCopy: AboutImageCopy[];
  aboutDiveSitesCount: string;
  aboutCountriesCount: string;
  aboutDivesLoggedCount: string;
  blogHeroImage: string;
  destinationsHeroImage: string;
  galleryHeroImage: string;
  gearHeroImage: string;
  gearDisclosureText: string;
  imageWatermarkText: string;
  countries: CountryPage[];
  shopEnabled: boolean;
  shopHeroImage: string;
  shopHeroTitle: string;
  shopHeroSubtitle: string;
  shopIntroEyebrow: string;
  shopIntroText: string;
  shopCollectionEyebrow: string;
  shopCollectionDisplayMode: ShopCollectionDisplayMode;
  shopCollectionItemsPerRow: ShopCollectionItemsPerRow;
  shopCollections: ShopCollection[];
  shopLifestyleEyebrow: string;
  shopLifestylePhotos: ShopLifestylePhoto[];
};

export const defaultSiteSettings: SiteSettings = {
  name: siteConfig.name,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  email: '',
  phone: '',
  logoLight: '/images/brand/encounters-logo.png',
  logoDark: '/images/brand/encounters-logo.png',
  logoFooter: '/images/brand/encounters-logo.png',
  instagram: '',
  youtube: '',
  pinterest: '',
  facebook: '',
  tiktok: '',
  showInstagram: false,
  showYoutube: false,
  showPinterest: false,
  showFacebook: false,
  showTiktok: false,
  contactLocation: '',
  contactPartners: '',
  homeHeroVideoDesktop: '',
  homeHeroVideoMobile: '',
  homeHeroFallbackImage: '/images/brand/encounters-logo.png',
  homeAboutTitle: 'About us',
  homeAboutGreeting: '',
  homeAboutParagraph1: '',
  homeAboutParagraph2: '',
  homeAboutParagraph3: '',
  homeAboutImage: '',
  homeNextEyebrow: '',
  homeNextTitle: '',
  homeNextSubtitle: '',
  homeNextImage: '',
  homeNextStops: '',
  aboutHeroImage: '',
  aboutHeroTitle: 'About us',
  aboutImageCopy: [],
  aboutDiveSitesCount: '',
  aboutCountriesCount: '',
  aboutDivesLoggedCount: '',
  blogHeroImage: '',
  destinationsHeroImage: '',
  galleryHeroImage: '',
  gearHeroImage: '',
  gearDisclosureText: '',
  imageWatermarkText: '',
  countries: [],
  shopEnabled: false,
  shopHeroImage: '',
  shopHeroTitle: '',
  shopHeroSubtitle: '',
  shopIntroEyebrow: '',
  shopIntroText: '',
  shopCollectionEyebrow: '',
  shopCollectionDisplayMode: 'carousel',
  shopCollectionItemsPerRow: 4,
  shopCollections: [],
  shopLifestyleEyebrow: '',
  shopLifestylePhotos: [],
};

function normalizeCountryPages(value: unknown): CountryPage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const country = entry as Partial<CountryPage>;
      const name = typeof country.name === 'string' ? country.name.trim() : '';
      const slug = typeof country.slug === 'string' ? country.slug.trim() : '';
      if (!name || !slug) return null;

      return {
        slug,
        name,
        bannerImage: typeof country.bannerImage === 'string' ? country.bannerImage : '',
        intro: typeof country.intro === 'string' ? country.intro : '',
        body: typeof country.body === 'string' ? country.body : '',
      } satisfies CountryPage;
    })
    .filter((country): country is CountryPage => Boolean(country));
}

function normalizeShopLifestylePhotos(value: unknown): ShopLifestylePhoto[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const photo = entry as Partial<ShopLifestylePhoto>;
      const url = typeof photo.url === 'string' ? photo.url.trim() : '';
      if (!url) return null;

      return {
        url,
        alt: typeof photo.alt === 'string' ? photo.alt.trim() : '',
      } satisfies ShopLifestylePhoto;
    })
    .filter((photo): photo is ShopLifestylePhoto => Boolean(photo));
}

function normalizeShopCollections(value: unknown): ShopCollection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const collection = entry as Partial<ShopCollection>;
      const id = typeof collection.id === 'string' ? collection.id.trim() : '';
      const name = typeof collection.name === 'string' ? collection.name.trim() : '';
      if (!id || !name) return null;
      const productIds = Array.isArray(collection.productIds)
        ? collection.productIds.filter((productId): productId is string => typeof productId === 'string')
        : [];
      return {
        id,
        name,
        productIds,
        displayMode: collection.displayMode === 'grid' ? 'grid' : 'carousel',
        itemsPerRow: normalizeItemsPerRow(
          collection.itemsPerRow,
          collection.displayMode === 'grid' ? 3 : 4
        ),
      } satisfies ShopCollection;
    })
    .filter((collection): collection is ShopCollection => Boolean(collection));
}

function normalizeItemsPerRow(
  value: unknown,
  fallback: ShopCollectionItemsPerRow
): ShopCollectionItemsPerRow {
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 6
    ? value
    : fallback;
}

function normalizeAboutImageCopy(value: unknown): AboutImageCopy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string') return [];
    return [{id:entry.id,alt:typeof entry.alt === 'string' ? entry.alt : '',caption:typeof entry.caption === 'string' ? entry.caption : ''}];
  });
}

function normalizeSiteSettings(value: Partial<SiteSettings> | null | undefined): SiteSettings {
  return {
    ...defaultSiteSettings,
    ...(value ?? {}),
    shopEnabled: modules.commerce && value?.shopEnabled === true,
    shopCollectionDisplayMode:
      value?.shopCollectionDisplayMode === 'grid' ? 'grid' : 'carousel',
    shopCollectionItemsPerRow: normalizeItemsPerRow(
      value?.shopCollectionItemsPerRow,
      value?.shopCollectionDisplayMode === 'grid' ? 3 : 4
    ),
    shopCollections: normalizeShopCollections(value?.shopCollections),
    aboutImageCopy: normalizeAboutImageCopy(value?.aboutImageCopy),
    countries: normalizeCountryPages(value?.countries),
    shopLifestylePhotos: normalizeShopLifestylePhotos(value?.shopLifestylePhotos),
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export const fetchSiteSettings = cache(async function fetchSiteSettings() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site')
    .maybeSingle();

  if (error) throw error;
  return normalizeSiteSettings(data?.value as Partial<SiteSettings> | null | undefined);
});

function withoutPages(settings: SiteSettings) {
  const own = { ...settings } as Record<string, unknown>;
  delete own.pages; delete own.home;
  return own;
}

export async function updateSiteSettings(settings: SiteSettings) {
  if (!modules.commerce && settings.shopEnabled) throw new Error('Commerce is disabled.');
  const client = requireSupabase();
  const existing=await client.from('site_settings').select('value').eq('key','site').maybeSingle();
  if(existing.error)throw existing.error;
  const { data, error } = await client
    .from('site_settings')
    // Page presentation (pages, home) is saved by its own editor; a stale copy here must not overwrite it.
    .upsert({ key: 'site', value: {...existing.data?.value,...withoutPages(settings)} }, { onConflict: 'key' })
    .select('value')
    .single();

  if (error) throw error;
  return normalizeSiteSettings(data.value as Partial<SiteSettings>);
}
