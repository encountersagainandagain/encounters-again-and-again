'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminProductCostReference } from '@/components/admin/AdminProductCostReference';
import { AdminShopPageContent } from '@/components/admin/AdminShopPageContent';
import { fetchAdminProducts, type AdminProductListItem } from '@/lib/ecommerceProducts';

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function CreateProductDialog({
  isOpen,
  products,
  copySourceProductId,
  onClose,
  onCopySourceProductChange,
}: {
  isOpen: boolean;
  products: AdminProductListItem[];
  copySourceProductId: string;
  onClose: () => void;
  onCopySourceProductChange: (productId: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-product-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-black/10 bg-white p-6 shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
              New product
            </span>
            <h2 id="create-product-title" className="font-display text-4xl text-black">
              How do you want to start?
            </h2>
            <p className="mt-3 font-body text-sm leading-relaxed text-black/60">
              Start from scratch, or copy reusable setup from an existing product. Copying does not
              save anything until Katie reviews the form and clicks Save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-body text-3xl leading-none text-black/45 transition-colors hover:text-black"
            aria-label="Close create product dialog"
          >
            ×
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="border border-black/10 bg-gray-50 p-5">
            <h3 className="font-display text-2xl text-black">Blank product</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
              Use this when the product uses a different garment, provider setup, or size guide.
            </p>
            <Link href="/admin/products/new" className="btn-ocean mt-5 justify-center">
              Start blank
            </Link>
          </div>

          <div className="border-2 border-ocean bg-sky-50 p-5">
            <h3 className="font-display text-2xl text-black">Copy existing setup</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
              Reuses provider, price, shipping, countries, colors, sizes, variant costs, and size
              guide. Name, slug, product photos, print-ready design files, and story text stay
              empty.
            </p>
            {products.length > 0 ? (
              <>
                <label className="mt-4 block">
                  <span className="mb-2 block font-body text-sm font-semibold text-black">
                    Product to copy from
                  </span>
                  <select
                    value={copySourceProductId}
                    onChange={(event) => onCopySourceProductChange(event.target.value)}
                    className="h-12 w-full border border-black/15 bg-white px-4 font-body text-sm text-black outline-none focus:border-ocean"
                  >
                    <option value="">Choose a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} · {product.providerRecord?.name ?? product.provider}
                      </option>
                    ))}
                  </select>
                </label>

                <Link
                  href={
                    copySourceProductId
                      ? `/admin/products/new?copyFrom=${encodeURIComponent(copySourceProductId)}`
                      : '/admin/products/new'
                  }
                  aria-disabled={!copySourceProductId}
                  className={
                    copySourceProductId
                      ? 'btn-ocean mt-5 justify-center'
                      : 'pointer-events-none mt-5 block border border-black/10 bg-white px-6 py-3 text-center font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/35'
                  }
                >
                  Copy this setup
                </Link>
              </>
            ) : (
              <p className="mt-4 border border-amber-200 bg-white p-3 font-body text-sm text-amber-900">
                There are no existing products to copy yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 border border-black/10 bg-white p-4">
          <p className="font-body text-sm font-semibold text-black">What still needs to be new?</p>
          <p className="mt-1 font-body text-sm leading-relaxed text-black/60">
            Katie must still add the new product name, slug, photos, print-ready design files, and
            product story before activating it.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminProducts() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [copySourceProductId, setCopySourceProductId] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchAdminProducts()
      .then((nextProducts) => {
        if (!isMounted) return;
        setProducts(nextProducts);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load products.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-4 inline-block font-body text-sm uppercase tracking-[0.18em] text-ocean transition-colors hover:text-ocean/70"
            >
              ← Dashboard
            </Link>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Ecommerce
            </span>
            <h1 className="font-display text-5xl text-black md:text-6xl">My Products</h1>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
              Review each product&apos;s primary image, retail price, publication status, and
              creation date. Open Edit to inspect its saved variants, availability, base costs,
              example photos, and print-ready designs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            className="btn-ocean justify-center"
          >
            New product
          </button>
        </div>

        <CreateProductDialog
          isOpen={isCreateDialogOpen}
          products={products}
          copySourceProductId={copySourceProductId}
          onClose={() => setIsCreateDialogOpen(false)}
          onCopySourceProductChange={setCopySourceProductId}
        />

        <AdminShopPageContent productSlugs={products.map((product) => product.slug)} />

        {isLoading && (
          <div className="border border-black/10 bg-gray-50 p-8 text-center">
            <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
              Loading products...
            </p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="border border-red-200 bg-red-50 p-5">
            <p className="font-body text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && products.length === 0 && (
          <div className="border border-dashed border-black/15 bg-gray-50 p-8 text-center">
            <h2 className="font-display text-3xl text-black">No products yet</h2>
            <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-relaxed text-black/60">
              Create the first merch product to verify product basics and upload flows.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && products.length > 0 && (
          <div className="overflow-hidden border border-black/10">
            <div className="hidden bg-gray-50 px-5 py-3 font-body text-xs font-semibold uppercase tracking-[0.16em] text-black/45 md:grid md:grid-cols-[96px_1.2fr_0.9fr_0.8fr_0.6fr_0.7fr_0.7fr_80px] md:items-center md:gap-4">
              <span>Image</span>
              <span>Product</span>
              <span>Slug</span>
              <span>Provider</span>
              <span>Price</span>
              <span>Status</span>
              <span>Created</span>
              <span>Edit</span>
            </div>

            <div className="divide-y divide-black/10">
              {products.map((product) => {
                const firstImage = product.images[0];
                const firstImageUrl = firstImage?.image_url || product.example_images[0];

                return (
                  <article
                    key={product.id}
                    className="grid gap-4 bg-white p-5 md:grid-cols-[96px_1.2fr_0.9fr_0.8fr_0.6fr_0.7fr_0.7fr_80px] md:items-center"
                  >
                    <div className="h-24 w-24 overflow-hidden bg-gray-100">
                      {firstImageUrl ? (
                        <img
                          src={firstImageUrl}
                          alt={firstImage?.alt_text || ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-3 text-center font-body text-xs text-black/35">
                          No image
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="font-display text-2xl text-black">{product.name}</h2>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 font-body text-sm leading-relaxed text-black/55">
                          {product.description}
                        </p>
                      )}
                      {product.missingSizeGuideSizes.length > 0 && (
                        <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 font-body text-xs leading-relaxed text-amber-900">
                          Size guide missing active size
                          {product.missingSizeGuideSizes.length === 1 ? '' : 's'}:{' '}
                          {product.missingSizeGuideSizes.join(', ')}. This product should stay
                          inactive until the guide covers every sellable size.
                        </p>
                      )}
                    </div>

                    <p className="break-words font-body text-sm text-black/55">
                      /shop/{product.slug}
                    </p>

                    <p className="font-body text-sm text-black/55">
                      {product.providerRecord?.name ?? product.provider}
                    </p>

                    <p className="font-body text-sm font-semibold text-black">
                      {formatPrice(product.retail_price_cents, product.currency)}
                    </p>

                    <p>
                      <span
                        className={
                          product.is_active
                            ? 'inline-flex border border-green-200 bg-green-50 px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.14em] text-green-800'
                            : 'inline-flex border border-black/10 bg-gray-50 px-3 py-1 font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/55'
                        }
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>

                    <p className="font-body text-sm text-black/55">
                      {formatDate(product.created_at)}
                    </p>

                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="font-body text-sm font-semibold text-ocean underline"
                    >
                      Edit
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <AdminProductCostReference />
      </section>
    </div>
  );
}
