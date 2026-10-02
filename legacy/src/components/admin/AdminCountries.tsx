'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { uploadMediaFile } from '@/lib/adminMedia';
import {
  defaultSiteSettings,
  fetchSiteSettings,
  updateSiteSettings,
  type CountryPage,
  type SiteSettings,
} from '@/lib/siteSettings';
import { slugifyCountry } from '@/lib/countries';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';

function emptyCountry(): CountryPage {
  return { slug: '', name: '', bannerImage: '', intro: '', body: '' };
}

function CountryActions({
  isSaving,
  isUploading,
  onAdd,
  onSave,
}: {
  isSaving: boolean;
  isUploading: boolean;
  onAdd: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 border border-black/15 px-5 py-3 font-body text-sm uppercase tracking-[0.14em] text-black/70 transition-colors hover:border-ocean hover:text-ocean"
      >
        <Plus className="h-4 w-4" />
        Add country
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || isUploading}
        className="inline-flex items-center gap-2 bg-ocean px-6 py-3 font-body text-sm uppercase tracking-[0.14em] text-white transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Save country pages'}
      </button>
    </div>
  );
}

export function AdminCountries() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [countries, setCountries] = useState<CountryPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const next = await fetchSiteSettings();
        if (isMounted) {
          setSettings(next);
          setCountries(next.countries);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load country pages.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateCountry = (index: number, patch: Partial<CountryPage>) => {
    setSuccessMessage('');
    setCountries((current) =>
      current.map((country, i) => (i === index ? { ...country, ...patch } : country))
    );
  };

  const handleNameChange = (index: number, name: string) => {
    setCountries((current) =>
      current.map((country, i) => {
        if (i !== index) return country;
        // Auto-fill the slug while it still matches the previous auto value, so a
        // manually edited slug is never overwritten.
        const autoSlugMatches = country.slug === slugifyCountry(country.name);
        return {
          ...country,
          name,
          slug: autoSlugMatches ? slugifyCountry(name) : country.slug,
        };
      })
    );
    setSuccessMessage('');
  };

  const addCountry = () => {
    setSuccessMessage('');
    setCountries((current) => [...current, emptyCountry()]);
  };

  const removeCountry = (index: number) => {
    setSuccessMessage('');
    setCountries((current) => current.filter((_, i) => i !== index));
  };

  const handleBannerUpload = async (index: number, file: File | undefined) => {
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');
    setUploadingIndex(index);

    try {
      const publicUrl = await uploadMediaFile(file, 'countries', {
        maxWidth: 1600,
        quality: 0.74,
        targetSize: 500 * 1024,
        minWidth: 1100,
        minQuality: 0.54,
        watermark: true,
        watermarkText: settings.imageWatermarkText.trim(),
      });
      updateCountry(index, { bannerImage: publicUrl });
      setSuccessMessage('Banner uploaded. Save to publish it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload banner.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const cleaned = countries.map((country) => ({
      name: country.name.trim(),
      slug: (country.slug.trim() ? slugifyCountry(country.slug) : slugifyCountry(country.name)),
      bannerImage: country.bannerImage.trim(),
      intro: country.intro.trim(),
      body: country.body.trim(),
    }));

    const invalid = cleaned.find((country) => !country.name || !country.slug);
    if (invalid) {
      setErrorMessage('Every country needs a name (used to match posts and build its URL).');
      return;
    }

    const slugs = cleaned.map((country) => country.slug);
    if (new Set(slugs).size !== slugs.length) {
      setErrorMessage('Two countries resolve to the same URL. Give them distinct names or slugs.');
      return;
    }

    setIsSaving(true);

    try {
      // Slugs from before AND after the save — covers additions, removals,
      // and renames without having to diff each country individually.
      const affectedSlugs = [
        ...settings.countries.map((country) => country.slug),
        ...cleaned.map((country) => country.slug),
      ];

      const nextSettings = await updateSiteSettings({ ...settings, countries: cleaned });
      setSettings(nextSettings);
      setCountries(nextSettings.countries);
      await requestAdminRevalidation({ scope: 'countries', slugs: affectedSlugs });
      setSuccessMessage('Country pages saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save country pages.');
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
          <h1 className="font-display text-5xl text-black md:text-6xl">Country pages</h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
            Each country gets a full-screen banner page at{' '}
            <span className="text-black/80">/destinations/[slug]</span>. Posts appear automatically
            when their <span className="text-black/80">Country</span> field matches the country name.
            If a country has posts in more than one place, readers get a quick filter by destination.
          </p>
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
            Loading country pages...
          </p>
        ) : (
          <div className="grid gap-8">
            <CountryActions
              isSaving={isSaving}
              isUploading={uploadingIndex !== null}
              onAdd={addCountry}
              onSave={() => void handleSave()}
            />

            {countries.length === 0 && (
              <p className="font-body text-base text-black/55">
                No country pages yet. Add your first one above.
              </p>
            )}

            {countries.map((country, index) => (
              <div key={index} className="border border-black/10 bg-gray-50 p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl text-black">
                    {country.name.trim() || 'New country'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => removeCountry(index)}
                    className="inline-flex items-center gap-2 border border-black/15 px-3 py-2 font-body text-sm text-black/60 transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55">
                      Country name
                    </span>
                    <input
                      type="text"
                      value={country.name}
                      onChange={(event) => handleNameChange(index, event.target.value)}
                      placeholder="Indonesia"
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black focus:border-ocean focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55">
                      URL slug
                    </span>
                    <input
                      type="text"
                      value={country.slug}
                      onChange={(event) => updateCountry(index, { slug: event.target.value })}
                      placeholder="indonesia"
                      className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black focus:border-ocean focus:outline-none"
                    />
                    <span className="mt-1 block font-body text-xs text-black/45">
                      /destinations/{country.slug.trim() || slugifyCountry(country.name) || 'slug'}
                    </span>
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55">
                    Intro (optional)
                  </span>
                  <textarea
                    value={country.intro}
                    onChange={(event) => updateCountry(index, { intro: event.target.value })}
                    placeholder="A short line shown under the country title."
                    rows={2}
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black focus:border-ocean focus:outline-none"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55">
                    Page text (optional)
                  </span>
                  <textarea
                    value={country.body}
                    onChange={(event) => updateCountry(index, { body: event.target.value })}
                    placeholder="Longer country copy shown between the banner and posts. Use blank lines for separate paragraphs."
                    rows={7}
                    className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base leading-relaxed text-black focus:border-ocean focus:outline-none"
                  />
                </label>

                <div className="mt-5">
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55">
                    Banner image
                  </span>
                  <p className="mb-3 font-body text-xs leading-relaxed text-black/45">
                    Recommended: 2048 × 1536 px (country banner photo).
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative h-24 w-40 shrink-0 overflow-hidden border border-black/10 bg-white">
                      {country.bannerImage ? (
                        <Image
                          src={country.bannerImage}
                          alt={`${country.name || 'Country'} banner`}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-body text-xs text-black/35">
                          No image
                        </div>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 border border-black/15 bg-white px-4 py-3 font-body text-sm text-black/70 transition-colors hover:border-ocean hover:text-ocean">
                      <ImagePlus className="h-4 w-4" />
                      {uploadingIndex === index ? 'Uploading...' : 'Upload banner'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploadingIndex !== null}
                        onChange={(event) => {
                          void handleBannerUpload(index, event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <CountryActions
              isSaving={isSaving}
              isUploading={uploadingIndex !== null}
              onAdd={addCountry}
              onSave={() => void handleSave()}
            />
          </div>
        )}
      </section>
    </div>
  );
}
