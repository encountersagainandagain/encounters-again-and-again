'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  getSizeGuideTable,
  SHOP_RETURN_POLICY_PATH,
  type CustomerSizeGuide,
} from '@/lib/ecommercePolicy';
import { ShopShippingScopeNotice } from '@/components/shop/ShopShippingScopeNotice';
import { addCartItem, openCartDrawer } from '@/lib/cartStorage';
import { formatShippingMode } from '@/lib/shopShipping';
import type { PublicProductImage, PublicRelatedProduct } from '@/lib/publicProducts';
import type { ProductShippingRate, ShippingPriceMode } from '@/lib/shopShipping';

type ShopProductOptionsProps = {
  productName: string;
  productSlug: string;
  description: string;
  priceLabel: string;
  retailPriceCents: number;
  currency: string;
  images: PublicProductImage[];
  variants: CustomerProductVariant[];
  shippingPriceMode: ShippingPriceMode;
  shippingRates: ProductShippingRate[];
  sizeGuide: CustomerSizeGuide | null;
  policyBrief: string;
  policySummary: string;
  shippingEstimate: string;
  shippingPackageKey?: string;
  contactEmail: string;
  storyShortText?: string;
  storyLongText?: string;
  storyImageUrl?: string | null;
  relatedProducts?: PublicRelatedProduct[];
};

type CustomerProductVariant = {
  id: string;
  color: string;
  color_code: string;
  size: string;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="font-body text-[10.5px] font-bold uppercase tracking-[0.2em] text-ocean">
        {children}
      </p>
      <span className="mt-2 block h-[2px] w-[34px] bg-ocean" aria-hidden="true" />
    </div>
  );
}

function sortSizes(sizes: string[]) {
  const order = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

  return [...sizes].sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function fallbackImage(productName: string): PublicProductImage {
  return {
    id: 'fallback',
    product_id: 'fallback',
    image_url: '/images/about/about-katie.jpg',
    color: null,
    alt_text: productName,
    position: 0,
  };
}

function sortProductImages(images: PublicProductImage[]) {
  return [...images].sort((a, b) => a.position - b.position);
}

function getColorImages(images: PublicProductImage[], color: string) {
  return sortProductImages(images.filter((image) => image.color === color));
}

function getGenericImages(images: PublicProductImage[]) {
  return sortProductImages(images.filter((image) => !image.color));
}

export function ShopProductOptions({
  productName,
  productSlug,
  description,
  priceLabel,
  retailPriceCents,
  currency,
  images,
  variants,
  shippingPriceMode,
  shippingRates,
  sizeGuide,
  policyBrief,
  policySummary,
  shippingEstimate,
  shippingPackageKey,
  contactEmail,
  storyShortText,
  storyLongText,
  storyImageUrl,
  relatedProducts = [],
}: ShopProductOptionsProps) {
  const productShippingMode = shippingPriceMode;
  const shippingCountriesForCart = shippingRates.map((rate) => ({
    code: rate.country_code,
    name: rate.country_name,
    firstItemCents: rate.first_item_cents,
    additionalItemCents: rate.additional_item_cents,
    currency: rate.currency,
    rateSource: rate.rate_source,
  }));
  const colors = useMemo(
    () =>
      [
        ...new Map(
          variants.map((variant) => [
            variant.color,
            {
              name: variant.color,
              code: variant.color_code,
            },
          ])
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [variants]
  );
  const sizes = useMemo(() => sortSizes([...new Set(variants.map((variant) => variant.size))]), [
    variants,
  ]);
  const displayImages = useMemo(
    () => (images.length > 0 ? sortProductImages(images) : [fallbackImage(productName)]),
    [images, productName]
  );
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name ?? '');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const availableSizesForColor = useMemo(
    () =>
      new Set(
        variants
          .filter((variant) => variant.color === selectedColor)
          .map((variant) => variant.size)
      ),
    [selectedColor, variants]
  );
  const firstSizeForColor = sizes.find((size) => availableSizesForColor.has(size)) ?? '';
  const [selectedSize, setSelectedSize] = useState(firstSizeForColor);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState('');
  const selectedVariant = variants.find(
    (variant) => variant.color === selectedColor && variant.size === selectedSize
  );
  const colorImages = useMemo(
    () => getColorImages(displayImages, selectedColor),
    [displayImages, selectedColor]
  );
  const genericImages = useMemo(() => getGenericImages(displayImages), [displayImages]);
  const galleryImages = useMemo(() => {
    const scopedImages =
      colorImages.length > 0 ? [...colorImages, ...genericImages] : displayImages;

    const seen = new Set<string>();
    return scopedImages.filter((image) => {
      if (seen.has(image.image_url)) return false;
      seen.add(image.image_url);
      return true;
    });
  }, [colorImages, displayImages, genericImages]);
  const primaryColorImage = colorImages[0] ?? genericImages[0] ?? displayImages[0];
  const hoverColorImage = colorImages[1] ?? null;
  const selectedImage =
    galleryImages.find((image) => image.image_url === manualImageUrl) ??
    primaryColorImage ??
    displayImages[0];
  const selectedHoverImage =
    selectedImage?.image_url === primaryColorImage?.image_url ? hoverColorImage : null;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setManualImageUrl('');
    setAddedMessage('');
    const nextSize =
      sizes.find((size) =>
        variants.some((variant) => variant.color === color && variant.size === size)
      ) ?? '';
    setSelectedSize(nextSize);
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addCartItem({
      productVariantId: selectedVariant.id,
      quantity,
      productName,
      productSlug,
      color: selectedVariant.color,
      size: selectedVariant.size,
      retailPriceCents,
      currency,
      imageUrl: selectedImage.image_url,
      imageAlt: selectedImage.alt_text || productName,
      shippingPackageKey,
      policyBrief: policyBrief || undefined,
      policySummary: policySummary || undefined,
      shippingPriceMode: productShippingMode,
      sellableCountries: shippingCountriesForCart,
    });
    setAddedMessage(`${productName} was added to your cart.`);
    openCartDrawer();
  };

  if (variants.length === 0) {
    return (
      <>
        <div className="grid min-w-0 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <ProductGallery
            images={galleryImages}
            selectedImage={selectedImage}
            hoverImage={selectedHoverImage}
            productName={productName}
            onSelectImage={setManualImageUrl}
            veiled
          />
          <aside className="min-w-0 lg:sticky lg:top-28">
            <ProductHeading
              productName={productName}
              description={description}
              priceLabel={priceLabel}
              unavailable
            />
            <div className="mt-8 border border-ocean/15 bg-sky-50 p-5">
              <p className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/70">
                Currently unavailable
              </p>
              <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
                This design is currently unavailable in any size or color. Check back later, or{' '}
                <Link href="/shop" className="font-semibold text-ocean underline">
                  browse the rest of the shop
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
        <ProductStory
          storyShortText={storyShortText}
          storyLongText={storyLongText}
          storyImageUrl={storyImageUrl}
          productName={productName}
        />
        <RelatedProducts products={relatedProducts} />
      </>
    );
  }

  return (
    <>
      <div className="grid min-w-0 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <ProductGallery
          images={galleryImages}
          selectedImage={selectedImage}
          hoverImage={selectedHoverImage}
          productName={productName}
          onSelectImage={setManualImageUrl}
        />

        <aside className="min-w-0 lg:sticky lg:top-28">
          <ProductHeading productName={productName} description={description} priceLabel={priceLabel} />

          <div className="mt-8 space-y-7">
            <div>
              <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
                Color <span className="text-black/40">· {selectedColor || '—'}</span>
              </p>
              <div className="flex flex-wrap gap-4">
                {colors.map((color) => {
                  const isSelected = color.name === selectedColor;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorChange(color.name)}
                      aria-pressed={isSelected}
                      aria-label={color.name}
                      title={color.name}
                      className="group flex w-16 shrink-0 flex-col items-center gap-2 rounded-[5px] text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
                    >
                      <span
                        aria-hidden="true"
                        className="h-8 w-8 shrink-0 rounded-full border border-black/15 transition-shadow"
                        style={{
                          backgroundColor: color.code || '#ffffff',
                          boxShadow: isSelected
                            ? '0 0 0 2px #ffffff, 0 0 0 4px #006994'
                            : undefined,
                        }}
                      />
                      <span
                        className={`font-body text-[11px] leading-tight ${
                          isSelected ? 'font-semibold text-ocean' : 'text-black/55'
                        }`}
                      >
                        {color.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
                  Size
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {sizes.map((size) => {
                  const isAvailable = availableSizesForColor.has(size);
                  const isSelected = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(size)}
                      aria-pressed={isSelected}
                      className={
                        isSelected
                          ? 'flex w-14 shrink-0 items-center justify-center rounded-[5px] border border-ocean bg-ocean py-3 font-body text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
                          : 'flex w-14 shrink-0 items-center justify-center rounded-[5px] border border-black/15 bg-white py-3 font-body text-sm text-black transition-colors hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <ProductSizeGuide sizeGuide={sizeGuide} />

            <label className="block">
              <span className="mb-3 block font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
                Quantity
              </span>
              <select
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-32 rounded-[5px] border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition-colors focus:border-ocean focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="border border-black/10 bg-gray-50 p-5">
              <p className="font-body text-sm text-black/60">
                Selected: {selectedColor || 'Color'} / {selectedSize || 'Size'} · Quantity {quantity}
              </p>
              <button
                type="button"
                disabled={!selectedVariant}
                onClick={handleAddToCart}
                className="mt-4 w-full rounded-[5px] border border-ocean bg-ocean px-5 py-4 font-body text-[12.5px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:border-black/15 disabled:bg-black/5 disabled:text-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
              >
                Add to cart
              </button>
              {addedMessage && (
                <p className="mt-3 font-body text-xs font-semibold text-ocean">{addedMessage}</p>
              )}
              {!selectedVariant && (
                <p className="mt-3 font-body text-xs text-amber-800">
                  Pick an available color and size combination.
                </p>
              )}
            </div>

            <ProductConditions
              shippingEstimate={shippingEstimate}
              shippingMode={productShippingMode}
              countries={shippingCountriesForCart}
              contactEmail={contactEmail}
            />

            {(policyBrief || policySummary) && (
              <OrderPolicyNotice brief={policyBrief} summary={policySummary} />
            )}

            <ShopShippingScopeNotice productName={productName} productSlug={productSlug} compact />
          </div>
        </aside>
      </div>

      <ProductStory
        storyShortText={storyShortText}
        storyLongText={storyLongText}
        storyImageUrl={storyImageUrl}
        productName={productName}
      />
      <RelatedProducts products={relatedProducts} />
    </>
  );
}

function ProductConditions({
  shippingEstimate,
  shippingMode,
  countries,
  contactEmail,
}: {
  shippingEstimate: string;
  shippingMode: 'included' | 'separate';
  countries: Array<{ code: string; name: string }>;
  contactEmail: string;
}) {
  const countryList = countries.length > 0 ? countries.map((country) => country.name).join(', ') : null;

  return (
    <div className="space-y-2 border-t border-black/10 pt-6 font-body text-[12.5px] leading-[1.9] text-black/70">
      <p className="font-semibold text-ocean-dark">
        If your order arrives damaged, defective, or wrong, I&rsquo;ll make it right.
      </p>
      <p>
        Made to order — ships in {shippingEstimate} (estimated, not guaranteed).{' '}
        {formatShippingMode(shippingMode)}.
      </p>
      <p>
        {countryList ? `Ships within ${countryList} only.` : 'Shipping destinations are not ready yet.'}{' '}
        Outside that? Email{' '}
        <a href={`mailto:${contactEmail}`} className="font-semibold text-ocean underline">
          {contactEmail}
        </a>
        .
      </p>
      <p>Sizes and colors can&rsquo;t be exchanged once an order ships correctly.</p>
      <Link
        href={SHOP_RETURN_POLICY_PATH}
        className="inline-flex font-semibold text-ocean underline underline-offset-2"
      >
        Return &amp; Exchange Policy →
      </Link>
    </div>
  );
}

function ProductSizeGuide({ sizeGuide }: { sizeGuide: CustomerSizeGuide | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const table = getSizeGuideTable(sizeGuide);

  if (!sizeGuide || !table) {
    return (
      <div id="size-guide" className="border border-amber-200 bg-amber-50 p-5">
        <p className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-amber-900">
          Size guide
        </p>
        <p className="mt-2 font-body text-sm leading-relaxed text-amber-900/80">
          The live size guide is not available right now. Please contact Katie before ordering if
          you are unsure about fit.
        </p>
      </div>
    );
  }

  const sizes = table.measurements[0]?.values.map((value) => value.size) ?? [];
  const baseGarment = sizeGuide.base_garment_name?.trim() ?? '';

  return (
    <div id="size-guide" className="border border-ocean/15 bg-sky-50 rounded-[8px]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
      >
        <span className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-ocean">
          Size guide
        </span>
        <span className="font-body text-xs font-semibold uppercase tracking-[0.1em] text-ocean">
          {isOpen ? 'Hide' : 'Show'}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-ocean/15 px-5 pb-5 pt-4">
          <p className="font-body text-sm leading-relaxed text-black/60">
            Measurements are for the garment, shown in {table.unit}. {sizeGuide.tolerance}
          </p>
          {baseGarment && (
            <p className="mt-1 font-body text-xs leading-relaxed text-black/50">
              Garment: {baseGarment}.
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-ocean/15 text-left text-black/50">
                  <th className="py-2 pr-4 font-semibold">Size</th>
                  {table.measurements.map((measurement) => (
                    <th key={measurement.type_label} className="px-4 py-2 font-semibold">
                      {measurement.type_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size} className="border-b border-ocean/10 last:border-0">
                    <td className="py-2 pr-4 font-semibold text-black">{size}</td>
                    {table.measurements.map((measurement) => {
                      const value = measurement.values.find((candidate) => candidate.size === size);
                      const displayValue =
                        value?.value ??
                        (value?.min_value && value?.max_value
                          ? `${value.min_value}–${value.max_value}`
                          : '—');

                      return (
                        <td key={measurement.type_label} className="px-4 py-2 text-black/65">
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 font-body text-xs leading-relaxed text-black/50">
            Because each item is printed on demand, size exchanges are not covered when the item was
            made correctly. If the garment you receive differs from the published garment
            measurements beyond the stated tolerance, that is treated as a defect and is covered by
            the returns policy. Please compare these garment measurements with a shirt you already
            like.
          </p>
        </div>
      )}
    </div>
  );
}

function OrderPolicyNotice({ brief, summary }: { brief: string; summary: string }) {
  return (
    <details className="border-t border-black/10 pt-4 font-body text-xs leading-relaxed text-black/60">
      <summary className="cursor-pointer font-semibold text-ocean">
        View order issue and claim details
      </summary>
      {brief && <p className="mt-2">{brief}</p>}
      {summary && <p className="mt-2">{summary}</p>}
    </details>
  );
}

function ProductHeading({
  productName,
  description,
  priceLabel,
  unavailable = false,
}: {
  productName: string;
  description: string;
  priceLabel: string;
  unavailable?: boolean;
}) {
  return (
    <>
      <p className="mb-3 font-body text-[10.5px] font-bold uppercase tracking-[0.2em] text-ocean">
        Print-on-demand designs
      </p>
      <h1 className="font-display text-3xl leading-none text-black md:text-5xl">{productName}</h1>
      <p
        className={
          unavailable
            ? 'mt-5 font-body text-2xl font-semibold text-black/40 line-through'
            : 'mt-5 font-body text-2xl font-semibold text-black'
        }
      >
        {priceLabel}
      </p>
      {description && (
        <p className="mt-5 whitespace-pre-line font-body text-base leading-relaxed text-black/65">
          {description}
        </p>
      )}
    </>
  );
}

function ProductGallery({
  images,
  selectedImage,
  hoverImage,
  productName,
  onSelectImage,
  veiled = false,
}: {
  images: PublicProductImage[];
  selectedImage: PublicProductImage;
  hoverImage: PublicProductImage | null;
  productName: string;
  onSelectImage: (url: string) => void;
  veiled?: boolean;
}) {
  const [isHoveringMainImage, setIsHoveringMainImage] = useState(false);
  const mainImage = isHoveringMainImage && hoverImage ? hoverImage : selectedImage;
  const colorThumbCount = images.filter((image) => image.color).length;

  return (
    <div className="min-w-0">
      <div
        className="relative aspect-square overflow-hidden rounded-[8px] bg-gray-100"
        onMouseEnter={() => setIsHoveringMainImage(true)}
        onMouseLeave={() => setIsHoveringMainImage(false)}
        onFocus={() => setIsHoveringMainImage(true)}
        onBlur={() => setIsHoveringMainImage(false)}
      >
        <Image
          src={mainImage.image_url}
          alt={mainImage.alt_text || productName}
          fill
          priority
          sizes="(min-width: 1024px) 56vw, 100vw"
          className="object-cover transition-opacity duration-200"
        />
        {veiled && <div className="absolute inset-0 bg-white/55" aria-hidden="true" />}
        {hoverImage && !veiled && (
          <span className="absolute bottom-3 left-3 hidden bg-white/90 px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-black/60 md:block">
            Hover for second photo
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex min-w-0 max-w-full gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const isSelected = image.image_url === selectedImage.image_url;
            const isDividerBefore = colorThumbCount > 0 && index === colorThumbCount;

            return (
              <div key={`${image.image_url}-${index}`} className="flex shrink-0 items-center gap-3">
                {isDividerBefore && (
                  <span aria-hidden="true" className="h-12 w-px shrink-0 bg-black/10 md:h-16" />
                )}
                <button
                  type="button"
                  onMouseEnter={() => image.color && onSelectImage(image.image_url)}
                  onClick={() => onSelectImage(image.image_url)}
                  aria-label={`View ${image.alt_text || `${productName} photo ${index + 1}`}`}
                  className={
                    isSelected
                      ? 'relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[6px] border-2 border-ocean bg-gray-100 md:h-[76px] md:w-[76px]'
                      : 'relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[6px] border border-black/15 bg-gray-100 transition-colors hover:border-ocean/50 md:h-[76px] md:w-[76px]'
                  }
                >
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || `${productName} detail ${index + 1}`}
                    fill
                    sizes="76px"
                    className="object-cover"
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 font-body text-[10.5px] leading-relaxed text-black/45">
        Hover a color thumbnail to preview its second photo · last three are lifestyle shots.
      </p>
    </div>
  );
}

function ProductStory({
  storyShortText,
  storyLongText,
  storyImageUrl,
  productName,
}: {
  storyShortText?: string;
  storyLongText?: string;
  storyImageUrl?: string | null;
  productName: string;
}) {
  if (!storyLongText) return null;

  return (
    <section className="mt-16 bg-sky-50 px-6 py-12 md:px-8 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_420px] md:items-center">
        <div className="max-w-[480px]">
          <Eyebrow>The story behind this design</Eyebrow>
          <p className="whitespace-pre-line font-body text-base leading-relaxed text-black/70">
            {storyLongText}
          </p>
        </div>
        {storyImageUrl && (
          <div className="relative aspect-[16/10] overflow-hidden rounded-[8px] bg-gray-100">
            <Image
              src={storyImageUrl}
              alt={storyShortText || `${productName} story photo`}
              fill
              sizes="(min-width: 768px) 420px, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function RelatedProducts({ products }: { products: PublicRelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto mt-16 max-w-6xl px-6 md:px-8">
      <Eyebrow>You might also like</Eyebrow>
      <div className="mx-auto grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-5">
        {products.map((product) => (
          <Link key={product.id} href={`/shop/${product.slug}`} className="group flex flex-col">
            <div className="relative mb-2 aspect-[4/5] overflow-hidden bg-white">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-4 text-center font-body text-xs text-black/35">
                  Image coming soon
                </div>
              )}
            </div>
            <p className="font-display text-lg leading-snug text-black">{product.name}</p>
            <p className="mt-1 font-body text-sm font-semibold text-black/70">
              {formatPrice(product.retail_price_cents, product.currency)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
