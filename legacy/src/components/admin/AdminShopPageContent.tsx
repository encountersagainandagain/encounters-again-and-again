'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { uploadMediaFile } from '@/lib/adminMedia';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import {
  defaultSiteSettings,
  fetchSiteSettings,
  updateSiteSettings,
  type ShopLifestylePhoto,
  type SiteSettings,
} from '@/lib/siteSettings';

const SHOP_CONTENT_KEYS = [
  'shopEnabled',
  'shopHeroImage',
  'shopHeroTitle',
  'shopHeroSubtitle',
  'shopIntroEyebrow',
  'shopIntroText',
  'shopCollectionEyebrow',
  'shopLifestyleEyebrow',
  'shopLifestylePhotos',
] as const;

type ShopContentForm = Pick<SiteSettings, (typeof SHOP_CONTENT_KEYS)[number]>;

function pickShopContent(settings: SiteSettings): ShopContentForm {
  return {
    shopEnabled: settings.shopEnabled,
    shopHeroImage: settings.shopHeroImage,
    shopHeroTitle: settings.shopHeroTitle,
    shopHeroSubtitle: settings.shopHeroSubtitle,
    shopIntroEyebrow: settings.shopIntroEyebrow,
    shopIntroText: settings.shopIntroText,
    shopCollectionEyebrow: settings.shopCollectionEyebrow,
    shopLifestyleEyebrow: settings.shopLifestyleEyebrow,
    shopLifestylePhotos: settings.shopLifestylePhotos,
  };
}

export function AdminShopPageContent({ productSlugs = [] }: { productSlugs?: string[] }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [form, setForm] = useState<ShopContentForm>(pickShopContent(defaultSiteSettings));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingLifestyle, setIsUploadingLifestyle] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const hasShopAvailabilityChange = form.shopEnabled !== siteSettings.shopEnabled;

  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => {
        setSiteSettings(settings);
        setForm(pickShopContent(settings));
      })
      .catch(() => {
        setSiteSettings(defaultSiteSettings);
        setForm(pickShopContent(defaultSiteSettings));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const lifestyleAltError = form.shopLifestylePhotos.some((photo) => !photo.alt.trim())
    ? 'Add alt text for every lifestyle photo before saving.'
    : '';

  const handleHeroImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage('');
    setIsUploadingHero(true);
    try {
      const publicUrl = await uploadMediaFile(file, 'shop', {
        maxWidth: 1800,
        quality: 0.76,
        targetSize: 500 * 1024,
        minWidth: 1200,
        minQuality: 0.55,
        watermarkText: siteSettings.imageWatermarkText.trim(),
      });
      setForm((current) => ({ ...current, shopHeroImage: publicUrl }));
      setSuccessMessage('Hero photo uploaded. Save to publish it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload hero photo.');
    } finally {
      setIsUploadingHero(false);
    }
  };

  const handleLifestyleUpload = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage('');
    setIsUploadingLifestyle(true);
    try {
      const publicUrl = await uploadMediaFile(file, 'shop', {
        maxWidth: 1400,
        quality: 0.74,
        targetSize: 400 * 1024,
        minWidth: 900,
        minQuality: 0.54,
        watermarkText: siteSettings.imageWatermarkText.trim(),
      });
      setForm((current) => ({
        ...current,
        shopLifestylePhotos: [...current.shopLifestylePhotos, { url: publicUrl, alt: '' }],
      }));
      setSuccessMessage('Photo uploaded. Add alt text, then save to publish it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload photo.');
    } finally {
      setIsUploadingLifestyle(false);
    }
  };

  const updateLifestylePhoto = (index: number, alt: string) => {
    setForm((current) => ({
      ...current,
      shopLifestylePhotos: current.shopLifestylePhotos.map((photo, photoIndex) =>
        photoIndex === index ? { ...photo, alt } : photo
      ),
    }));
  };

  const moveLifestylePhoto = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.shopLifestylePhotos.length) return current;

      const nextPhotos = [...current.shopLifestylePhotos];
      const [moved] = nextPhotos.splice(index, 1);
      nextPhotos.splice(targetIndex, 0, moved);
      return { ...current, shopLifestylePhotos: nextPhotos };
    });
  };

  const removeLifestylePhoto = (index: number) => {
    setForm((current) => ({
      ...current,
      shopLifestylePhotos: current.shopLifestylePhotos.filter(
        (_photo, photoIndex) => photoIndex !== index
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lifestyleAltError) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const trimmedForm: ShopContentForm = {
        shopEnabled: form.shopEnabled,
        shopHeroImage: form.shopHeroImage.trim(),
        shopHeroTitle: form.shopHeroTitle.trim(),
        shopHeroSubtitle: form.shopHeroSubtitle.trim(),
        shopIntroEyebrow: form.shopIntroEyebrow.trim(),
        shopIntroText: form.shopIntroText.trim(),
        shopCollectionEyebrow: form.shopCollectionEyebrow.trim(),
        shopLifestyleEyebrow: form.shopLifestyleEyebrow.trim(),
        shopLifestylePhotos: form.shopLifestylePhotos.map(
          (photo): ShopLifestylePhoto => ({
            url: photo.url,
            alt: photo.alt.trim(),
          })
        ),
      };

      const shopEnabledChanged = trimmedForm.shopEnabled !== siteSettings.shopEnabled;
      const nextSettings = await updateSiteSettings({ ...siteSettings, ...trimmedForm });
      setSiteSettings(nextSettings);
      setForm(pickShopContent(nextSettings));
      await requestAdminRevalidation({ scope: 'settings', changedKeys: [...SHOP_CONTENT_KEYS] });
      if (shopEnabledChanged) {
        await requestAdminRevalidation({ scope: 'products', slugs: productSlugs });
      }
      setSuccessMessage('Shop page content saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save shop page content.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-12 border border-black/10 bg-gray-50 p-5 md:p-7">
        <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
          Loading shop page content...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mb-12 border border-black/10 bg-gray-50 p-5 md:p-7"
    >
      <h2 className="mb-2 font-display text-3xl text-black">Shop page content</h2>
      <p className="mb-5 font-body text-sm leading-relaxed text-black/55">
        Controls whether the public shop is open, plus the hero, brand intro, and lifestyle strip
        on /shop. Delivery estimates, shipping destinations, and the return policy link are not
        editable here — they come from the provider and country records so they stay part of the
        order evidence chain.
      </p>

      {errorMessage && (
        <div className="mb-4 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
          {successMessage}
        </div>
      )}

      <div className="space-y-8">
        <div className="border border-ocean/20 bg-white p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-ocean">
                Shop availability
              </h3>
              <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-black/60">
                Keep this off while Katie is configuring products, provider policy, shipping,
                emails, and checkout. When off, the Shop link and cart are hidden, product pages are
                not public, the sitemap omits shop URLs, and checkout is blocked even if a product
                is active.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                  Current saved status
                </span>
                <span
                  className={`border px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.14em] ${
                    siteSettings.shopEnabled
                      ? 'border-ocean/30 bg-sky-50 text-ocean'
                      : 'border-black/10 bg-gray-50 text-black/55'
                  }`}
                >
                  {siteSettings.shopEnabled ? 'Open to customers' : 'Closed to customers'}
                </span>
              </div>
              {hasShopAvailabilityChange && (
                <p className="mt-3 border border-amber-200 bg-amber-50 p-3 font-body text-sm leading-relaxed text-amber-900">
                  Pending change: after you click “Save shop page content,” the shop will be{' '}
                  {form.shopEnabled ? 'opened to customers' : 'closed to customers'}.
                </p>
              )}
            </div>

            <fieldset className="shrink-0 border border-black/10 bg-gray-50 p-3">
              <legend className="mb-2 font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                After saving
              </legend>
              <div className="grid gap-2">
                {[
                  {
                    value: false,
                    label: 'Keep shop closed',
                    description: 'Hide Shop/cart and block checkout.',
                  },
                  {
                    value: true,
                    label: 'Open shop',
                    description: 'Show Shop/cart and allow checkout.',
                  },
                ].map((option) => (
                  <label
                    key={option.label}
                    className={`block cursor-pointer border px-4 py-3 transition-colors ${
                      form.shopEnabled === option.value
                        ? 'border-ocean bg-white text-ocean'
                        : 'border-black/10 bg-white text-black/70 hover:border-ocean/40'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="shopEnabled"
                        checked={form.shopEnabled === option.value}
                        onChange={() =>
                          setForm((current) => ({ ...current, shopEnabled: option.value }))
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-body text-sm font-semibold">
                          {option.label}
                        </span>
                        <span className="mt-1 block font-body text-xs leading-relaxed text-black/50">
                          {option.description}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
            Hero
          </h3>
          <div className="grid gap-5 md:grid-cols-[1fr_220px] md:items-start">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Title</span>
                <input
                  value={form.shopHeroTitle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shopHeroTitle: event.target.value }))
                  }
                  placeholder={defaultSiteSettings.shopHeroTitle}
                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">
                  Subtitle (optional)
                </span>
                <input
                  value={form.shopHeroSubtitle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shopHeroSubtitle: event.target.value }))
                  }
                  placeholder={defaultSiteSettings.shopHeroSubtitle}
                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>
              <div>
                <span className="mb-2 block font-body text-sm text-black/60">Hero photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={isUploadingHero}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    void handleHeroImageUpload(file);
                  }}
                  className="block w-full font-body text-sm text-black file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:font-semibold file:text-white"
                />
                {isUploadingHero && (
                  <p className="mt-2 font-body text-sm text-black/45">Uploading...</p>
                )}
                <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                  Recommended: 1600 × 900 px (banner photo). If no photo is set, the hero shows the
                  title on a plain ocean-color background instead of falling back to another
                  page&rsquo;s photo.
                </p>
                {form.shopHeroImage && (
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, shopHeroImage: '' }))}
                    className="mt-2 font-body text-xs font-semibold text-red-700 hover:text-red-900"
                  >
                    Remove hero photo
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden bg-ocean-dark">
              {form.shopHeroImage ? (
                <Image
                  src={form.shopHeroImage}
                  alt=""
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-4 text-center font-body text-xs text-white/60">
                  No hero photo set
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 pt-6">
          <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
            Brand intro
          </h3>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">
                Eyebrow (optional)
              </span>
              <input
                value={form.shopIntroEyebrow}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shopIntroEyebrow: event.target.value }))
                }
                placeholder={defaultSiteSettings.shopIntroEyebrow}
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Paragraph</span>
              <textarea
                value={form.shopIntroText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shopIntroText: event.target.value }))
                }
                rows={3}
                placeholder={defaultSiteSettings.shopIntroText}
                className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
              />
              <span className="mt-1 block font-body text-[11px] leading-relaxed text-black/45">
                Leave empty to remove the intro section from the page entirely.
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-black/10 pt-6">
          <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
            Section titles
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">
                Collection section
              </span>
              <input
                value={form.shopCollectionEyebrow}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shopCollectionEyebrow: event.target.value }))
                }
                placeholder={defaultSiteSettings.shopCollectionEyebrow}
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">
                Lifestyle strip section
              </span>
              <input
                value={form.shopLifestyleEyebrow}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shopLifestyleEyebrow: event.target.value }))
                }
                placeholder={defaultSiteSettings.shopLifestyleEyebrow}
                className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-black/10 pt-6">
          <h3 className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
            Lifestyle strip photos
          </h3>
          <p className="mb-4 font-body text-sm leading-relaxed text-black/60">
            &ldquo;From the ocean to you&rdquo; photos, in order. Any number works — the strip
            scrolls instead of using a fixed grid. Recommended: 1300 × 800 px (carousel photo).
            Leave this list empty to remove the section from the page entirely.
          </p>

          {lifestyleAltError && (
            <p className="mb-4 border border-amber-200 bg-amber-50 p-3 font-body text-sm text-amber-900">
              {lifestyleAltError}
            </p>
          )}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isUploadingLifestyle}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              void handleLifestyleUpload(file);
            }}
            className="block w-full font-body text-sm text-black file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:font-semibold file:text-white"
          />
          {isUploadingLifestyle && (
            <p className="mt-2 font-body text-sm text-black/45">Uploading...</p>
          )}

          {form.shopLifestylePhotos.length > 0 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {form.shopLifestylePhotos.map((photo, index) => (
                <div key={photo.url} className="border border-black/10 bg-white p-3">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                    <Image
                      src={photo.url}
                      alt={photo.alt || `Lifestyle photo ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 40vw, 90vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-body text-xs text-black/55">Photo {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLifestylePhoto(index)}
                      className="font-body text-xs font-semibold text-red-700 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1 block font-body text-xs text-black/45">
                      Alt text · required
                    </span>
                    <input
                      type="text"
                      value={photo.alt}
                      onChange={(event) => updateLifestylePhoto(index, event.target.value)}
                      className="w-full border border-black/10 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean"
                    />
                    {!photo.alt.trim() && (
                      <span className="mt-1 block font-body text-[11px] text-amber-800">
                        Describe the photo for SEO and screen readers before saving.
                      </span>
                    )}
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => moveLifestylePhoto(index, -1)}
                      disabled={index === 0}
                      className="border border-black/10 px-2 py-2 font-body text-xs text-black/65 transition-colors hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Move photo ${index + 1} earlier`}
                    >
                      ← Earlier
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLifestylePhoto(index, 1)}
                      disabled={index === form.shopLifestylePhotos.length - 1}
                      className="border border-black/10 px-2 py-2 font-body text-xs text-black/65 transition-colors hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Move photo ${index + 1} later`}
                    >
                      Later →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-7">
        <button
          type="submit"
          disabled={isSaving || isUploadingHero || isUploadingLifestyle || Boolean(lifestyleAltError)}
          className="btn-ocean"
        >
          {isSaving ? 'Saving...' : 'Save shop page content'}
        </button>
      </div>
    </form>
  );
}
