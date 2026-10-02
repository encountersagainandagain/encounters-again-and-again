import { cache } from 'react';
import { siteConfig } from '@/data';
import { aboutPageImages } from '@/data/aboutPageImages';
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
  email: 'whatkatieseas@gmail.com',
  logoLight: '/images/brand/Up3logowhite.png',
  logoDark: '/images/brand/Updblacklogo.png',
  logoFooter: '/images/brand/logo_con_nombre.png',
  instagram: siteConfig.social.instagram,
  youtube: siteConfig.social.youtube,
  pinterest: siteConfig.social.pinterest ?? '',
  facebook: siteConfig.social.facebook ?? '',
  tiktok: siteConfig.social.tiktok ?? '',
  showInstagram: true,
  showYoutube: true,
  showPinterest: true,
  showFacebook: false,
  showTiktok: false,
  contactLocation: 'Currently on Heron Island, Great Barrier Reef',
  contactPartners: 'PADI',
  homeHeroVideoDesktop: 'c9dRw1KIfDk',
  homeHeroVideoMobile: 'y-B9ReggOfM',
  homeHeroFallbackImage: '/images/home/hero-bg.jpg',
  homeAboutTitle: 'About Me',
  homeAboutGreeting: 'Hello There!',
  homeAboutParagraph1:
    "I'm Katie - a dive instructor and skipper currently living on Heron Island on the Great Barrier Reef.",
  homeAboutParagraph2:
    "For the past few years, I've been traveling the world, working in the ocean, and building a life centered around saltwater, adventure, and exploration. From remote islands to unforgettable underwater encounters, this blog is where I share the moments that have shaped me - the beauty, the chaos, and everything in between.",
  homeAboutParagraph3:
    'The ocean has always felt like home, and this space is a reflection of that - a collection of stories, experiences, and lessons from a life lived beneath the surface.',
  homeAboutImage: '/images/about/about-katie.jpg',
  homeNextEyebrow: 'Up Next',
  homeNextTitle: 'Places on the horizon',
  homeNextSubtitle: "New oceans, new cultures, and places we're excited to explore soon.",
  homeNextImage: '/images/home/next_destinations.jpg',
  homeNextStops: 'Ecuador\nArgentina\nCosta Rica',
  aboutHeroImage: '/images/about/about-hero.jpg',
  aboutHeroTitle: 'My Story',
  aboutImageCopy: aboutPageImages.map((image) => ({
    id: image.id,
    alt: image.defaultAlt,
    caption: image.defaultCaption,
  })),
  aboutDiveSitesCount: '100+',
  aboutCountriesCount: '18',
  aboutDivesLoggedCount: '2000+',
  blogHeroImage: '/images/about/about-hero.jpg',
  destinationsHeroImage: '/images/destinations/maldives.jpg',
  galleryHeroImage: '/images/about/about-hero.jpg',
  gearHeroImage: '/images/about/about-hero.jpg',
  gearDisclosureText:
    'Every piece of gear I recommend is based on my own experience from more than 2,000 dives. Some links on this site are affiliate links, meaning I may earn a small commission if you make a purchase through partners like Amazon, Booking.com, Hotels.com, or others. It never costs you anything extra, and it helps support What Katie Seas so I can keep creating free dive and travel content.',
  imageWatermarkText: 'whatkatieseas.com',
  countries: [],
  shopEnabled: false,
  shopHeroImage: '',
  shopHeroTitle: 'Wear a piece of the ocean.',
  shopHeroSubtitle: 'Designs inspired by the places, animals, and dives that shape my world.',
  shopIntroEyebrow: 'Made for ocean people',
  shopIntroText:
    'I design each piece after the dives, coastlines, and creatures that shaped how I see the water. Every print starts as something I wanted to wear myself.',
  shopCollectionEyebrow: 'The collection',
  shopCollectionDisplayMode: 'carousel',
  shopCollectionItemsPerRow: 4,
  shopCollections: [],
  shopLifestyleEyebrow: 'From the ocean to you',
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
  const entries = Array.isArray(value) ? value : [];
  const byId = new Map(
    entries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const copy = entry as Partial<AboutImageCopy>;
      return typeof copy.id === 'string' ? [[copy.id, copy] as const] : [];
    })
  );

  return aboutPageImages.map((image) => {
    const saved = byId.get(image.id);
    return {
      id: image.id,
      alt: typeof saved?.alt === 'string' ? saved.alt : image.defaultAlt,
      caption: typeof saved?.caption === 'string' ? saved.caption : image.defaultCaption,
    };
  });
}

function normalizeSiteSettings(value: Partial<SiteSettings> | null | undefined): SiteSettings {
  return {
    ...defaultSiteSettings,
    ...(value ?? {}),
    shopEnabled: value?.shopEnabled === true,
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
  if (!supabase) return defaultSiteSettings;

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'site')
    .maybeSingle();

  if (error) throw error;
  return normalizeSiteSettings(data?.value as Partial<SiteSettings> | null | undefined);
});

export async function updateSiteSettings(settings: SiteSettings) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('site_settings')
    .upsert({ key: 'site', value: settings }, { onConflict: 'key' })
    .select('value')
    .single();

  if (error) throw error;
  return normalizeSiteSettings(data.value as Partial<SiteSettings>);
}
