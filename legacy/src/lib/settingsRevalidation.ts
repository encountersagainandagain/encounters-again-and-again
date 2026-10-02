// Site Settings fields rendered in the root layout (Header, Footer,
// Organization/WebSite JSON-LD) — every page depends on these, so a change
// here still needs the broad `revalidatePath('/', 'layout')`. Derived from
// actual consumers: src/components/Header.tsx, Footer.tsx,
// src/lib/structuredData.ts (buildOrganizationJsonLd/buildWebsiteJsonLd).
export const globalSettingsFields = new Set([
  'name',
  'description',
  'email',
  'logoLight',
  'logoDark',
  'logoFooter',
  'instagram',
  'youtube',
  'pinterest',
  'facebook',
  'tiktok',
  'showInstagram',
  'showYoutube',
  'showPinterest',
  'showFacebook',
  'showTiktok',
  // Both also feed the global Organization JSON-LD image/founder image.
  'aboutHeroImage',
  'homeAboutImage',
  // Controls Header/Footer shop links and cart affordances globally.
  'shopEnabled',
]);

// Remaining Site Settings fields, mapped to the exact public paths that read
// them (derived from each field's actual consumer, not guessed). A field not
// listed here and not in `globalSettingsFields` is treated as unknown.
export const settingsFieldPaths: Record<string, string[]> = {
  tagline: ['/', '/blog'],
  homeHeroVideoDesktop: ['/'],
  homeHeroVideoMobile: ['/'],
  homeHeroFallbackImage: ['/', '/about', '/blog', '/contact', '/destinations', '/gallery'],
  homeAboutTitle: ['/'],
  homeAboutGreeting: ['/'],
  homeAboutParagraph1: ['/'],
  homeAboutParagraph2: ['/'],
  homeAboutParagraph3: ['/'],
  homeNextEyebrow: ['/'],
  homeNextTitle: ['/'],
  homeNextSubtitle: ['/'],
  homeNextImage: ['/'],
  homeNextStops: ['/'],
  aboutHeroTitle: ['/about'],
  aboutImageCopy: ['/about'],
  aboutDiveSitesCount: ['/about'],
  aboutCountriesCount: ['/about'],
  aboutDivesLoggedCount: ['/about'],
  blogHeroImage: ['/blog'],
  destinationsHeroImage: ['/destinations'],
  galleryHeroImage: ['/gallery'],
  gearHeroImage: ['/gear'],
  gearDisclosureText: ['/gear'],
  contactLocation: ['/contact'],
  contactPartners: ['/contact'],
  imageWatermarkText: [],
  shopHeroImage: ['/shop'],
  shopHeroTitle: ['/shop'],
  shopHeroSubtitle: ['/shop'],
  shopIntroEyebrow: ['/shop'],
  shopIntroText: ['/shop'],
  shopCollectionEyebrow: ['/shop'],
  shopCollectionDisplayMode: ['/shop'],
  shopCollectionItemsPerRow: ['/shop'],
  shopCollections: ['/shop'],
  shopLifestyleEyebrow: ['/shop'],
  shopLifestylePhotos: ['/shop'],
};

export type SettingsRevalidationPlan = {
  fullLayout: boolean;
  paths: string[];
};

// Pure mapping: given the set of Site Settings field names that changed
// (or undefined when the caller can't prove what changed), decide whether a
// full-layout invalidation is needed or which specific paths suffice.
// No I/O, no Next.js APIs — safe to unit test in isolation.
export function planSettingsRevalidation(
  changedKeys: string[] | undefined,
  settingsPaths: string[]
): SettingsRevalidationPlan {
  if (changedKeys === undefined) {
    return { fullLayout: true, paths: [...new Set(settingsPaths)] };
  }

  const allRecognized = changedKeys.every(
    (key) => globalSettingsFields.has(key) || key in settingsFieldPaths
  );

  if (!allRecognized) {
    return { fullLayout: true, paths: [...new Set(settingsPaths)] };
  }

  if (changedKeys.some((key) => globalSettingsFields.has(key))) {
    return { fullLayout: true, paths: [...new Set(settingsPaths)] };
  }

  const paths = new Set<string>();
  changedKeys.forEach((key) => {
    (settingsFieldPaths[key] ?? []).forEach((path) => paths.add(path));
  });

  return { fullLayout: false, paths: [...paths] };
}
