'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import { aboutPageImages } from '@/data/aboutPageImages';
import { uploadMediaFile } from '@/lib/adminMedia';
import {
  defaultSiteSettings,
  fetchSiteSettings,
  updateSiteSettings,
  type SiteSettings,
} from '@/lib/siteSettings';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';

type UploadField =
  | 'logoLight'
  | 'logoDark'
  | 'logoFooter'
  | 'homeHeroFallbackImage'
  | 'homeAboutImage'
  | 'homeNextImage'
  | 'aboutHeroImage'
  | 'blogHeroImage'
  | 'destinationsHeroImage'
  | 'galleryHeroImage'
  | 'gearHeroImage';

const uploadFieldLabels: Record<UploadField, string> = {
  logoLight: 'Light logo',
  logoDark: 'Dark logo',
  logoFooter: 'Footer logo',
  homeHeroFallbackImage: 'Home fallback image',
  homeAboutImage: 'Home about image',
  homeNextImage: 'Up Next image',
  aboutHeroImage: 'About hero image',
  blogHeroImage: 'Blog banner image',
  destinationsHeroImage: 'Destinations banner image',
  galleryHeroImage: 'Gallery banner image',
  gearHeroImage: 'My Gear banner image',
};

const imageUploadGuidance: Record<
  UploadField,
  { recommendation: string; previewAspectClass: string }
> = {
  logoLight: {
    recommendation: 'Recommended: at least 600 × 700 px, transparent PNG or WebP.',
    previewAspectClass: 'aspect-[4/3]',
  },
  logoDark: {
    recommendation: 'Recommended: at least 600 × 700 px, transparent PNG or WebP.',
    previewAspectClass: 'aspect-[4/3]',
  },
  logoFooter: {
    recommendation: 'Recommended: at least 1200 × 600 px, transparent PNG or WebP.',
    previewAspectClass: 'aspect-[4/3]',
  },
  homeHeroFallbackImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo).',
    previewAspectClass: 'aspect-[16/9]',
  },
  homeAboutImage: {
    recommendation: 'Recommended: 1536 × 2048 px (vertical photo).',
    previewAspectClass: 'aspect-[3/4]',
  },
  homeNextImage: {
    recommendation: 'Recommended: 2048 × 1536 px (horizontal photo).',
    previewAspectClass: 'aspect-[4/3]',
  },
  aboutHeroImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo). Keep Katie near the center.',
    previewAspectClass: 'aspect-[16/9]',
  },
  blogHeroImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo).',
    previewAspectClass: 'aspect-[16/9]',
  },
  destinationsHeroImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo).',
    previewAspectClass: 'aspect-[16/9]',
  },
  galleryHeroImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo).',
    previewAspectClass: 'aspect-[16/9]',
  },
  gearHeroImage: {
    recommendation: 'Recommended: 1600 × 900 px (banner photo).',
    previewAspectClass: 'aspect-[16/9]',
  },
};

const imageUploadFields: UploadField[] = [
  'homeHeroFallbackImage',
  'homeAboutImage',
  'homeNextImage',
  'aboutHeroImage',
  'blogHeroImage',
  'destinationsHeroImage',
  'galleryHeroImage',
  'gearHeroImage',
];

const socialSettingFields = [
  { label: 'Instagram', urlField: 'instagram', visibleField: 'showInstagram' },
  { label: 'YouTube', urlField: 'youtube', visibleField: 'showYoutube' },
  { label: 'Pinterest', urlField: 'pinterest', visibleField: 'showPinterest' },
  { label: 'Facebook', urlField: 'facebook', visibleField: 'showFacebook' },
  { label: 'TikTok', urlField: 'tiktok', visibleField: 'showTiktok' },
] as const;

// Every scalar field this form can actually change, used to compute which
// ones differ from the last loaded/saved snapshot so the revalidation
// endpoint can invalidate only the pages that depend on them. `countries` is
// intentionally excluded — this form never edits it (AdminCountries owns it).
const editableFieldKeys = [
  'name',
  'tagline',
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
  'contactLocation',
  'contactPartners',
  'homeHeroVideoDesktop',
  'homeHeroVideoMobile',
  'homeHeroFallbackImage',
  'homeAboutTitle',
  'homeAboutGreeting',
  'homeAboutParagraph1',
  'homeAboutParagraph2',
  'homeAboutParagraph3',
  'homeAboutImage',
  'homeNextEyebrow',
  'homeNextTitle',
  'homeNextSubtitle',
  'homeNextImage',
  'homeNextStops',
  'aboutHeroImage',
  'aboutHeroTitle',
  'aboutImageCopy',
  'aboutDiveSitesCount',
  'aboutCountriesCount',
  'aboutDivesLoggedCount',
  'blogHeroImage',
  'destinationsHeroImage',
  'galleryHeroImage',
  'gearHeroImage',
  'gearDisclosureText',
  'imageWatermarkText',
] as const satisfies readonly (keyof SiteSettings)[];

export function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const lastSavedSettingsRef = useRef<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<UploadField | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextSettings = await fetchSiteSettings();
        if (isMounted) {
          setSettings(nextSettings);
          lastSavedSettingsRef.current = nextSettings;
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load settings. Make sure docs/supabase-site-settings.sql has been run.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof SiteSettings, value: string) => {
    setSuccessMessage('');
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const updateBooleanField = (field: keyof SiteSettings, value: boolean) => {
    setSuccessMessage('');
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const updateAboutImageCopy = (
    imageId: string,
    field: 'alt' | 'caption',
    value: string
  ) => {
    setSuccessMessage('');
    setSettings((current) => ({
      ...current,
      aboutImageCopy: current.aboutImageCopy.map((copy) =>
        copy.id === imageId ? { ...copy, [field]: value } : copy
      ),
    }));
  };

  const handleLogoUpload = async (field: UploadField, file: File | undefined) => {
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');
    setUploadingField(field);

    try {
      const publicUrl = await uploadMediaFile(file, 'site', {
        maxWidth: field.startsWith('logo') ? 1000 : 1600,
        quality: field.startsWith('logo') ? 0.84 : 0.74,
        targetSize: field.startsWith('logo') ? 300 * 1024 : 500 * 1024,
        minWidth: field.startsWith('logo') ? 600 : 1100,
        minQuality: field.startsWith('logo') ? 0.68 : 0.54,
        watermark: !field.startsWith('logo'),
        watermarkText: settings.imageWatermarkText.trim(),
      });
      updateField(field, publicUrl);
      setSuccessMessage('Logo uploaded. Save settings to publish it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload logo.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const payload = {
        ...settings,
        name: settings.name.trim(),
        tagline: settings.tagline.trim(),
        description: settings.description.trim(),
        email: settings.email.trim(),
        logoLight: settings.logoLight.trim(),
        logoDark: settings.logoDark.trim(),
        logoFooter: settings.logoFooter.trim(),
        instagram: settings.instagram.trim(),
        youtube: settings.youtube.trim(),
        pinterest: settings.pinterest.trim(),
        facebook: settings.facebook.trim(),
        tiktok: settings.tiktok.trim(),
        showInstagram: settings.showInstagram,
        showYoutube: settings.showYoutube,
        showPinterest: settings.showPinterest,
        showFacebook: settings.showFacebook,
        showTiktok: settings.showTiktok,
        contactLocation: settings.contactLocation.trim(),
        contactPartners: settings.contactPartners.trim(),
        homeHeroVideoDesktop: settings.homeHeroVideoDesktop.trim(),
        homeHeroVideoMobile: settings.homeHeroVideoMobile.trim(),
        homeHeroFallbackImage: settings.homeHeroFallbackImage.trim(),
        homeAboutTitle: settings.homeAboutTitle.trim(),
        homeAboutGreeting: settings.homeAboutGreeting.trim(),
        homeAboutParagraph1: settings.homeAboutParagraph1.trim(),
        homeAboutParagraph2: settings.homeAboutParagraph2.trim(),
        homeAboutParagraph3: settings.homeAboutParagraph3.trim(),
        homeAboutImage: settings.homeAboutImage.trim(),
        homeNextEyebrow: settings.homeNextEyebrow.trim(),
        homeNextTitle: settings.homeNextTitle.trim(),
        homeNextSubtitle: settings.homeNextSubtitle.trim(),
        homeNextImage: settings.homeNextImage.trim(),
        homeNextStops: settings.homeNextStops.trim(),
        aboutHeroImage: settings.aboutHeroImage.trim(),
        aboutHeroTitle: settings.aboutHeroTitle.trim(),
        aboutImageCopy: settings.aboutImageCopy.map((copy) => ({
          ...copy,
          alt: copy.alt.trim(),
          caption: copy.caption.trim(),
        })),
        aboutDiveSitesCount: settings.aboutDiveSitesCount.trim(),
        aboutCountriesCount: settings.aboutCountriesCount.trim(),
        aboutDivesLoggedCount: settings.aboutDivesLoggedCount.trim(),
        blogHeroImage: settings.blogHeroImage.trim(),
        destinationsHeroImage: settings.destinationsHeroImage.trim(),
        galleryHeroImage: settings.galleryHeroImage.trim(),
        gearHeroImage: settings.gearHeroImage.trim(),
        gearDisclosureText: settings.gearDisclosureText.trim(),
        imageWatermarkText: settings.imageWatermarkText.trim(),
      };

      if (
        !payload.aboutDiveSitesCount ||
        !payload.aboutCountriesCount ||
        !payload.aboutDivesLoggedCount
      ) {
        throw new Error('Complete all three About page experience numbers.');
      }

      if (payload.aboutImageCopy.some((copy) => !copy.alt)) {
        throw new Error('Add descriptive alt text to every About page image.');
      }

      // Compare against the last loaded/saved snapshot to find exactly which
      // fields changed, so the endpoint can invalidate only the pages that
      // depend on them instead of the whole layout. Missing a baseline (e.g.
      // the initial load failed silently) means we can't prove anything —
      // omit `changedKeys` entirely so the endpoint falls back to the broad,
      // safe invalidation.
      const baseline = lastSavedSettingsRef.current;
      const changedKeys = baseline
        ? editableFieldKeys.filter(
            (key) => JSON.stringify(payload[key]) !== JSON.stringify(baseline[key])
          )
        : undefined;

      const nextSettings = await updateSiteSettings(payload);
      setSettings(nextSettings);
      lastSavedSettingsRef.current = nextSettings;
      await requestAdminRevalidation({ scope: 'settings', changedKeys });
      setSuccessMessage('Site settings saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Admin
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">
            Site Settings
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading settings...
          </p>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Site name</span>
                <input
                  value={settings.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Email</span>
                <input
                  value={settings.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Tagline</span>
              <input
                value={settings.tagline}
                onChange={(event) => updateField('tagline', event.target.value)}
                className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Description</span>
              <textarea
                value={settings.description}
                onChange={(event) => updateField('description', event.target.value)}
                rows={4}
                className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-3">
              {([
                ['logoLight', 'Light logo'],
                ['logoDark', 'Dark logo'],
                ['logoFooter', 'Footer logo'],
              ] as const).map(([field, label]) => (
                <div key={field} className="border border-black/10 bg-gray-50 p-4">
                  <span className="mb-3 block font-body text-sm text-black/60">{label}</span>
                  <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden bg-white">
                    {settings[field] ? (
                      <img
                        src={settings[field]}
                        alt={label}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-black/30" />
                    )}
                  </div>
                  <p className="mb-3 font-body text-xs leading-relaxed text-black/45">
                    {imageUploadGuidance[field].recommendation}
                  </p>
                  <input
                    value={settings[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    className="mb-3 h-10 w-full border border-black/10 bg-white px-3 font-body text-sm outline-none focus:border-ocean"
                  />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => void handleLogoUpload(field, event.target.files?.[0])}
                    className="font-body text-xs text-black/55 file:mr-3 file:border-0 file:bg-ocean file:px-3 file:py-2 file:font-body file:text-xs file:text-white hover:file:bg-ocean-light"
                  />
                  {uploadingField === field && (
                    <p className="mt-2 font-body text-xs text-black/45">Uploading...</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Social links</h2>
              <div className="grid gap-5 md:grid-cols-2">
                {socialSettingFields.map((item) => (
                  <div key={item.urlField} className="border border-black/10 bg-gray-50 p-4">
                    <label className="block">
                      <span className="mb-2 block font-body text-sm text-black/60">
                        {item.label} URL
                      </span>
                      <input
                        value={settings[item.urlField]}
                        onChange={(event) => updateField(item.urlField, event.target.value)}
                        className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                      />
                    </label>
                    <label className="mt-4 flex items-center gap-3 font-body text-sm text-black/70">
                      <input
                        type="checkbox"
                        checked={settings[item.visibleField]}
                        onChange={(event) =>
                          updateBooleanField(item.visibleField, event.target.checked)
                        }
                        className="h-4 w-4 accent-ocean"
                      />
                      Show in footer and public social metadata
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Contact page</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">
                    Current location
                  </span>
                  <input
                    value={settings.contactLocation}
                    onChange={(event) => updateField('contactLocation', event.target.value)}
                    placeholder="Currently on Heron Island, Great Barrier Reef"
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">
                    Partners, one per line
                  </span>
                  <textarea
                    value={settings.contactPartners}
                    onChange={(event) => updateField('contactPartners', event.target.value)}
                    rows={4}
                    placeholder={'PADI\nAnother partner'}
                    className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
                  />
                  <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                    Leave empty to hide the partners list on the contact page.
                  </p>
                </label>
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Home hero</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">
                    Desktop YouTube video ID
                  </span>
                  <input
                    value={settings.homeHeroVideoDesktop}
                    onChange={(event) => updateField('homeHeroVideoDesktop', event.target.value)}
                    placeholder="c9dRw1KIfDk"
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                  <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                    Paste only the YouTube video ID, not the full link.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">
                    Mobile YouTube video ID
                  </span>
                  <input
                    value={settings.homeHeroVideoMobile}
                    onChange={(event) => updateField('homeHeroVideoMobile', event.target.value)}
                    placeholder="y-B9ReggOfM"
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Home about me</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">Title</span>
                  <input
                    value={settings.homeAboutTitle}
                    onChange={(event) => updateField('homeAboutTitle', event.target.value)}
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">Greeting</span>
                  <input
                    value={settings.homeAboutGreeting}
                    onChange={(event) => updateField('homeAboutGreeting', event.target.value)}
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-5">
                {([
                  ['homeAboutParagraph1', 'Paragraph 1'],
                  ['homeAboutParagraph2', 'Paragraph 2'],
                  ['homeAboutParagraph3', 'Paragraph 3'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="mb-2 block font-body text-sm text-black/60">{label}</span>
                    <textarea
                      value={settings[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      rows={3}
                      className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Up Next</h2>
              <div className="grid gap-5 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">Left heading</span>
                  <input
                    value={settings.homeNextEyebrow}
                    onChange={(event) => updateField('homeNextEyebrow', event.target.value)}
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">Title</span>
                  <input
                    value={settings.homeNextTitle}
                    onChange={(event) => updateField('homeNextTitle', event.target.value)}
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-black/60">Subtitle</span>
                  <input
                    value={settings.homeNextSubtitle}
                    onChange={(event) => updateField('homeNextSubtitle', event.target.value)}
                    className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                  />
                </label>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block font-body text-sm text-black/60">
                  Destinations, one per line
                </span>
                <textarea
                  value={settings.homeNextStops}
                  onChange={(event) => updateField('homeNextStops', event.target.value)}
                  rows={5}
                  className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
                />
              </label>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">About page</h2>
              <label className="block max-w-xl">
                <span className="mb-2 block font-body text-sm text-black/60">Hero title</span>
                <input
                  value={settings.aboutHeroTitle}
                  onChange={(event) => updateField('aboutHeroTitle', event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <div className="mt-6 border border-black/10 bg-gray-50 p-5">
                <h3 className="font-display text-2xl text-black">Experience numbers</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
                  These numbers appear in the statistics strip near the bottom of the About page.
                  Include the plus sign when the public number should read “100+”.
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  {([
                    ['aboutDiveSitesCount', 'Dive sites'],
                    ['aboutCountriesCount', 'Countries'],
                    ['aboutDivesLoggedCount', 'Dives logged'],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="mb-2 block font-body text-sm text-black/60">{label}</span>
                      <input
                        value={settings[field]}
                        onChange={(event) => updateField(field, event.target.value)}
                        required
                        maxLength={20}
                        className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 border border-black/10 p-5">
                <h3 className="font-display text-2xl text-black">Image text and alt text</h3>
                <p className="mt-2 max-w-3xl font-body text-sm leading-relaxed text-black/55">
                  Alt text describes the image for screen readers and search engines. Captions are
                  the public text shown over story photos. Keep alt text factual and captions
                  personal.
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {aboutPageImages.map((image) => {
                    const copy = settings.aboutImageCopy.find((item) => item.id === image.id) ?? {
                      id: image.id,
                      alt: image.defaultAlt,
                      caption: image.defaultCaption,
                    };
                    const previewUrl = image.id === 'about-hero' ? settings.aboutHeroImage : image.src;

                    return (
                      <div key={image.id} className="border border-black/10 bg-gray-50 p-4">
                        <span className="mb-3 block font-body text-sm font-semibold text-black">
                          {image.label}
                        </span>
                        <div
                          className={`mb-3 overflow-hidden bg-white ${image.previewAspectClass}`}
                        >
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImagePlus className="h-8 w-8 text-black/30" />
                            </div>
                          )}
                        </div>
                        <p className="mb-4 font-body text-xs leading-relaxed text-black/45">
                          {image.recommendedSize}
                        </p>
                        <label className="block">
                          <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                            Alt text
                          </span>
                          <input
                            value={copy.alt}
                            onChange={(event) =>
                              updateAboutImageCopy(image.id, 'alt', event.target.value)
                            }
                            required
                            maxLength={180}
                            className="h-11 w-full border border-black/10 bg-white px-3 font-body text-sm outline-none focus:border-ocean"
                          />
                        </label>
                        {image.supportsCaption && (
                          <label className="mt-4 block">
                            <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                              Public caption
                            </span>
                            <textarea
                              value={copy.caption}
                              onChange={(event) =>
                                updateAboutImageCopy(image.id, 'caption', event.target.value)
                              }
                              rows={3}
                              maxLength={240}
                              className="w-full border border-black/10 bg-white px-3 py-2 font-body text-sm outline-none focus:border-ocean"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <h2 className="mb-5 font-display text-3xl text-black">Editable images</h2>
              <label className="mb-5 block max-w-xl">
                <span className="mb-2 block font-body text-sm text-black/60">
                  Photo watermark text
                </span>
                <input
                  value={settings.imageWatermarkText}
                  onChange={(event) => updateField('imageWatermarkText', event.target.value)}
                  placeholder="whatkatieseas.com"
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
                <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                  This is added to new optimized photo uploads. If left empty, the default
                  whatkatieseas.com watermark is used. Existing images are not changed.
                </p>
              </label>
              <div className="grid gap-5 md:grid-cols-2">
                {imageUploadFields.map((field) => (
                  <div key={field} className="border border-black/10 bg-gray-50 p-4">
                    <span className="mb-3 block font-body text-sm text-black/60">
                      {uploadFieldLabels[field]}
                    </span>
                    <div
                      className={`mb-3 overflow-hidden bg-white ${imageUploadGuidance[field].previewAspectClass}`}
                    >
                      {settings[field] ? (
                        <img
                          src={settings[field]}
                          alt={uploadFieldLabels[field]}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImagePlus className="h-8 w-8 text-black/30" />
                        </div>
                      )}
                    </div>
                    <p className="mb-3 font-body text-xs leading-relaxed text-black/45">
                      {imageUploadGuidance[field].recommendation}
                    </p>
                    <input
                      value={settings[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      className="mb-3 h-10 w-full border border-black/10 bg-white px-3 font-body text-sm outline-none focus:border-ocean"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => void handleLogoUpload(field, event.target.files?.[0])}
                      className="font-body text-xs text-black/55 file:mr-3 file:border-0 file:bg-ocean file:px-3 file:py-2 file:font-body file:text-xs file:text-white hover:file:bg-ocean-light"
                    />
                    {uploadingField === field && (
                      <p className="mt-2 font-body text-xs text-black/45">Uploading...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-black/10 pt-8">
              <button
                type="submit"
                disabled={isSaving || uploadingField !== null}
                className="btn-ocean disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
