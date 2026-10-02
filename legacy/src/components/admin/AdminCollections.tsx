'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  defaultSiteSettings,
  fetchSiteSettings,
  updateSiteSettings,
  type ShopCollection,
  type SiteSettings,
} from '@/lib/siteSettings';
import { fetchAdminProducts, type AdminProductListItem } from '@/lib/ecommerceProducts';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';

const itemCountOptions = [2, 3, 4, 5, 6] as const;

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `collection-${Date.now()}`;
}

export function AdminCollections() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchSiteSettings(), fetchAdminProducts()])
      .then(([nextSettings, nextProducts]) => {
        setSettings(nextSettings);
        setCollections(nextSettings.shopCollections);
        setProducts(nextProducts);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load collections.'))
      .finally(() => setIsLoading(false));
  }, []);

  const updateCollection = (id: string, patch: Partial<ShopCollection>) => {
    setCollections((current) => current.map((collection) => (collection.id === id ? { ...collection, ...patch } : collection)));
  };

  const save = async () => {
    setError('');
    setMessage('');
    const validCollections = collections
      .map((collection) => ({ ...collection, name: collection.name.trim() }))
      .filter((collection) => collection.name);
    if (validCollections.length !== collections.length) {
      setError('Every collection needs a name before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const nextSettings = await updateSiteSettings({
        ...settings,
        shopCollections: validCollections,
      });
      setSettings(nextSettings);
      setCollections(nextSettings.shopCollections);
      await requestAdminRevalidation({
        scope: 'settings',
        changedKeys: [
          'shopCollections',
          'shopCollectionDisplayMode',
          'shopCollectionItemsPerRow',
        ],
      });
      setMessage('Collections saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save collections.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-white px-6 pt-32 font-body text-sm text-black/55">Loading collections...</div>;

  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <Link href="/admin" className="mb-4 inline-block font-body text-sm uppercase tracking-[0.18em] text-ocean">← Dashboard</Link>
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">Ecommerce</span>
            <h1 className="font-display text-5xl text-black md:text-6xl">Collections</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">Group products into collections such as T-shirts or Hats, then choose how those collections appear on /shop.</p>
          </div>
          <button type="button" onClick={() => setCollections((current) => [...current, { id: makeId(), name: '', productIds: [], displayMode: 'carousel', itemsPerRow: 4 }])} className="btn-ocean justify-center">New collection</button>
        </div>

        {error && <p className="mb-5 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">{error}</p>}
        {message && <p className="mb-5 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">{message}</p>}

        <section className="mb-8 border border-ocean/20 bg-sky-50 p-5 md:p-7">
          <h2 className="font-display text-3xl text-black">All products filter</h2>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-black/55">
            This controls the layout shown when a shopper selects “All”. Each individual
            collection keeps its own layout below.
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-6">
            <div>
              <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                Layout
              </span>
              <div className="flex items-center gap-2">
                {(['grid', 'carousel'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        shopCollectionDisplayMode: mode,
                      }))
                    }
                    className={settings.shopCollectionDisplayMode === mode ? 'border border-ocean bg-white px-3 py-2 font-body text-xs font-semibold text-ocean' : 'border border-black/15 bg-white px-3 py-2 font-body text-xs text-black/60'}
                  >
                    {mode === 'grid' ? 'Grid' : 'Carousel'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                {settings.shopCollectionDisplayMode === 'grid'
                  ? 'Desktop columns'
                  : 'Products visible on desktop'}
              </span>
              <div className="flex items-center gap-2">
                {itemCountOptions.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        shopCollectionItemsPerRow: count,
                      }))
                    }
                    className={settings.shopCollectionItemsPerRow === count ? 'h-9 w-9 border border-ocean bg-white font-body text-xs font-semibold text-ocean' : 'h-9 w-9 border border-black/15 bg-white font-body text-xs text-black/60'}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {collections.map((collection) => (
            <section key={collection.id} className="border border-black/10 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <label className="block flex-1"><span className="mb-2 block font-body text-sm font-semibold text-black">Collection name</span><input value={collection.name} onChange={(event) => updateCollection(collection.id, { name: event.target.value })} placeholder="T-shirts" className="h-12 w-full border border-black/15 bg-white px-4 font-body text-sm text-black outline-none focus:border-ocean" /></label>
                <button type="button" onClick={() => setCollections((current) => current.filter((entry) => entry.id !== collection.id))} className="mt-7 font-body text-sm text-black/45 underline hover:text-red-700">Remove</button>
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <p className="font-body text-sm font-semibold text-black">Products in this collection</p>
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Layout</span>
                    <div className="flex items-center gap-2 font-body text-xs text-black/60">
                      {(['grid', 'carousel'] as const).map((mode) => (
                        <button key={mode} type="button" onClick={() => updateCollection(collection.id, { displayMode: mode })} className={collection.displayMode === mode ? 'border border-ocean bg-sky-50 px-3 py-2 font-semibold text-ocean' : 'border border-black/15 bg-white px-3 py-2 text-black/60'}>
                          {mode === 'grid' ? 'Grid' : 'Carousel'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                      {collection.displayMode === 'grid'
                        ? 'Desktop columns'
                        : 'Products visible on desktop'}
                    </span>
                    <div className="flex items-center gap-2">
                      {itemCountOptions.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => updateCollection(collection.id, { itemsPerRow: count })}
                          className={collection.itemsPerRow === count ? 'h-9 w-9 border border-ocean bg-sky-50 font-body text-xs font-semibold text-ocean' : 'h-9 w-9 border border-black/15 bg-white font-body text-xs text-black/60'}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {products.map((product) => {
                  const checked = collection.productIds.includes(product.id);
                  const imageUrl = product.images[0]?.image_url || product.example_images[0];
                  return <label key={product.id} className={checked ? 'flex cursor-pointer items-center gap-3 border-2 border-ocean bg-sky-50 p-3' : 'flex cursor-pointer items-center gap-3 border border-black/10 bg-white p-3'}><input type="checkbox" checked={checked} onChange={() => updateCollection(collection.id, { productIds: checked ? collection.productIds.filter((id) => id !== product.id) : [...collection.productIds, product.id] })} className="h-4 w-4 accent-[var(--ocean)]" />{imageUrl ? <Image src={imageUrl} alt="" width={48} height={60} className="h-14 w-12 object-contain" /> : <span className="h-14 w-12 bg-gray-100" />}<span className="font-body text-sm text-black">{product.name}</span></label>;
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex justify-end"><button type="button" onClick={() => void save()} disabled={isSaving} className="btn-ocean disabled:opacity-50">{isSaving ? 'Saving...' : 'Save collections'}</button></div>
      </section>
    </main>
  );
}
