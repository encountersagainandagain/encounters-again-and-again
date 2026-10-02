import Image from 'next/image';
import type { AdminEcommerceProductDetail } from '@/lib/ecommerceProducts';
import {
  PRODUCT_MARGIN_WARNING_THRESHOLD_CENTS,
  PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS,
  PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS,
  PRINTFUL_COST_REFERENCE_VERIFIED_AT,
  calculateEstimatedMargin,
  formatUsd,
  getUniquePlacementAdditionalCostCents,
} from '@/lib/ecommerceCostReference';

function getSizeSortValue(size: string) {
  const order = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const index = order.indexOf(size);

  return index === -1 ? order.length : index;
}

export function AdminProductSavedSummary({
  detail,
}: {
  detail: AdminEcommerceProductDetail;
}) {
  const { product, variants, files } = detail;
  const provider = detail.provider;
  const shippingFirstItemCents =
    provider?.shipping_first_item_cents ?? PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS;
  const shippingAdditionalItemCents =
    provider?.shipping_additional_item_cents ?? PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS;
  const images =
    detail.images.length > 0
      ? detail.images
      : product.example_images.map((url, index) => ({
          id: url,
          product_id: product.id,
          image_url: url,
          color: null,
          alt_text: product.name,
          position: index,
          created_at: product.created_at,
          updated_at: product.updated_at,
        }));
  const activeVariants = variants.filter((variant) => variant.is_active);
  const usAvailableVariants = variants.filter((variant) => variant.available_us);
  const uniquePlacements = [...new Set(files.map((file) => file.placement))];
  const placementAdditionalCostCents = getUniquePlacementAdditionalCostCents(uniquePlacements);
  const marginRows = [...new Set(variants.map((variant) => variant.size))]
    .sort((a, b) => getSizeSortValue(a) - getSizeSortValue(b) || a.localeCompare(b))
    .map((size) => {
      const variantsForSize = variants.filter((variant) => variant.size === size);
      const baseCostCents = Math.max(
        ...variantsForSize.map((variant) => variant.provider_base_cost_cents)
      );
      const printfulCostCents = baseCostCents + placementAdditionalCostCents;
      const singleUnit = calculateEstimatedMargin({
        retailPriceCents: product.retail_price_cents,
        printfulProductCostCents: printfulCostCents,
        quantity: 1,
        shippingFirstItemCents,
        shippingAdditionalItemCents,
      });
      const twoUnits = calculateEstimatedMargin({
        retailPriceCents: product.retail_price_cents,
        printfulProductCostCents: printfulCostCents,
        quantity: 2,
        shippingFirstItemCents,
        shippingAdditionalItemCents,
      });

      return {
        size,
        baseCostCents,
        printfulCostCents,
        singleUnit,
        twoUnits,
      };
    });

  return (
    <section className="mb-10 border border-ocean/20 bg-sky-50 p-6">
      <div className="mb-6 border-b border-ocean/15 pb-5">
        <span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
          Read-only
        </span>
        <h2 className="mt-2 font-display text-4xl text-black">Last saved product</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-black/60">
          This summary reflects the version currently stored in Supabase. Changes in the form
          below appear here after a successful update.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          {
            label: 'Retail price',
            value: formatUsd(product.retail_price_cents, product.currency),
          },
          {
            label: 'Shop URL',
            value: `/shop/${product.slug}`,
          },
          {
            label: 'Stored variants',
            value: String(variants.length),
          },
          {
            label: 'Active variants',
            value: String(activeVariants.length),
          },
          {
            label: 'Available US',
            value: String(usAvailableVariants.length),
          },
          {
            label: 'Design files',
            value: String(files.length),
          },
        ].map((item) => (
          <div key={item.label} className="border border-black/10 bg-white p-4">
            <p className="font-body text-xs uppercase tracking-[0.12em] text-black/45">
              {item.label}
            </p>
            <p className="mt-1 font-display text-2xl text-black">{item.value}</p>
          </div>
        ))}
      </div>

      {marginRows.length > 0 && (
        <div className="mt-7">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-2xl text-black">Estimated margin by size</h3>
              <p className="mt-1 font-body text-xs leading-relaxed text-black/50">
                Based on this product&apos;s saved placements ({uniquePlacements.length || 0})
                , {provider?.name ?? product.provider} shipping, and Stripe&apos;s estimated 2.9% +
                $0.30 fee. The 2-unit column shows margin per unit when same-provider shipping and
                Stripe&apos;s fixed fee are spread across two shirts.
                Printful reference costs verified {PRINTFUL_COST_REFERENCE_VERIFIED_AT}.
              </p>
            </div>
            <p className="font-body text-xs text-black/45">
              Low margin threshold: {formatUsd(PRODUCT_MARGIN_WARNING_THRESHOLD_CENTS)}
            </p>
          </div>

          <div className="mt-3 overflow-auto border border-black/10 bg-white">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="bg-gray-50">
                <tr className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3 text-right">Printful</th>
                  <th className="px-4 py-3 text-right">Shipping</th>
                  <th className="px-4 py-3 text-right">Tax est.</th>
                  <th className="px-4 py-3 text-right">Stripe est.</th>
                  <th className="px-4 py-3 text-right">Total cost</th>
                  <th className="px-4 py-3 text-right">Margin · 1 unit</th>
                  <th className="px-4 py-3 text-right">Margin/unit · 2 units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {marginRows.map((row) => {
                  const isLowMargin =
                    row.singleUnit.marginCents < PRODUCT_MARGIN_WARNING_THRESHOLD_CENTS;

                  return (
                    <tr
                      key={row.size}
                      className={isLowMargin ? 'bg-amber-50 text-amber-950' : 'text-black'}
                    >
                      <td className="px-4 py-3 font-body text-sm font-semibold">{row.size}</td>
                      <td className="px-4 py-3 text-right font-body text-sm">
                        {formatUsd(row.printfulCostCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm">
                        {formatUsd(row.singleUnit.shippingCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm">
                        {formatUsd(row.singleUnit.taxCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm">
                        {formatUsd(row.singleUnit.stripeFeeCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm font-semibold">
                        {formatUsd(row.singleUnit.totalCostCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm font-semibold">
                        {formatUsd(row.singleUnit.marginCents, product.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm font-semibold">
                        {formatUsd(row.twoUnits.marginPerUnitCents, product.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-7">
        <h3 className="font-display text-2xl text-black">Example photos</h3>
        {images.length === 0 ? (
          <p className="mt-2 font-body text-sm text-black/50">No example photos saved.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((image, index) => (
              <a
                key={image.id}
                href={image.image_url}
                target="_blank"
                rel="noreferrer"
                className="relative aspect-square overflow-hidden border border-black/10 bg-white"
              >
                <Image
                  src={image.image_url}
                  alt={image.alt_text || `Saved example photo ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 140px, (min-width: 640px) 28vw, 90vw"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 bg-ocean px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                    Primary
                  </span>
                )}
                <span className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                  {image.color || 'Generic'}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-7">
        <h3 className="font-display text-2xl text-black">Print-ready designs</h3>
        {files.length === 0 ? (
          <p className="mt-2 font-body text-sm text-black/50">No print files saved.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {files.map((file) => (
              <article key={file.id} className="border border-black/10 bg-white p-3">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-square overflow-hidden bg-gray-100"
                >
                  <Image
                    src={file.file_url}
                    alt={`Saved ${file.placement} print design`}
                    fill
                    sizes="(min-width: 1024px) 170px, (min-width: 640px) 42vw, 90vw"
                    className="object-contain p-3"
                  />
                </a>
                <p className="mt-3 font-body text-sm font-semibold capitalize text-black">
                  {file.placement.replaceAll('_', ' ')}
                </p>
                <p className="font-body text-xs text-black/45">
                  Position {file.position + 1} · {file.provider_file_type}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-7">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-display text-2xl text-black">Stored variants</h3>
          <p className="font-body text-xs text-black/45">
            Includes disabled rows preserved for order history and reactivation.
          </p>
        </div>

        {variants.length === 0 ? (
          <p className="mt-2 font-body text-sm text-black/50">No variants saved.</p>
        ) : (
          <div className="mt-3 max-h-[34rem] overflow-auto border border-black/10 bg-white">
            <table className="w-full min-w-[650px] border-collapse text-left">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Available US</th>
                  <th className="px-4 py-3">Stored status</th>
                  <th className="px-4 py-3 text-right">Base cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {variants.map((variant) => (
                  <tr
                    key={variant.id}
                    className={variant.is_active ? 'text-black' : 'bg-gray-50 text-black/50'}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-body text-sm">
                        <span
                          aria-hidden="true"
                          className="h-5 w-5 rounded-full border border-black/20"
                          style={{ backgroundColor: variant.color_code || '#ffffff' }}
                        />
                        {variant.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-sm">{variant.size}</td>
                    <td className="px-4 py-3 font-body text-sm">
                      {variant.available_us ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 font-body text-sm">
                      {variant.is_active ? 'Active' : 'Disabled'}
                    </td>
                    <td className="px-4 py-3 text-right font-body text-sm font-semibold">
                      {formatUsd(variant.provider_base_cost_cents, product.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
