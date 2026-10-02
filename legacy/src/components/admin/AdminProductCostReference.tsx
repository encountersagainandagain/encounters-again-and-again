import {
  PRINTFUL_BASE_COST_BY_SIZE_CENTS,
  PRINTFUL_COST_REFERENCE_SOURCE,
  PRINTFUL_COST_REFERENCE_VERIFIED_AT,
  PRINTFUL_PLACEMENT_ADDITIONAL_COST_CENTS,
  PRINTFUL_UNLIMITED_COLOR_EMBROIDERY_ADDITIONAL_CENTS,
  PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS,
  PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS,
  STRIPE_FIXED_FEE_CENTS,
  STRIPE_PERCENT_FEE_BPS,
  formatUsd,
  getPlacementLabel,
} from '@/lib/ecommerceCostReference';

const PLACEMENT_REFERENCE_ROWS = [
  'back',
  'label_inside',
  'label_outside',
  'sleeve_left',
  'sleeve_right',
  'embroidery_chest_left',
  'embroidery_chest_center',
];

export function AdminProductCostReference() {
  return (
    <section className="mt-10 border border-ocean/20 bg-sky-50 p-6">
      <div className="mb-6 border-b border-ocean/15 pb-5">
        <span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
          Cost reference
        </span>
        <h2 className="mt-2 font-display text-3xl text-black">Printful reference costs</h2>
        <p className="mt-2 max-w-3xl font-body text-sm leading-relaxed text-black/60">
          Values verified {PRINTFUL_COST_REFERENCE_VERIFIED_AT}. This is a convenient admin
          reference; the authoritative number is Katie&apos;s Printful account. Margins also need
          Stripe&apos;s estimated {STRIPE_PERCENT_FEE_BPS / 100}% +{' '}
          {formatUsd(STRIPE_FIXED_FEE_CENTS)} fee.
        </p>
        <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
          Source: {PRINTFUL_COST_REFERENCE_SOURCE}.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="border border-black/10 bg-white p-4">
          <h3 className="font-display text-2xl text-black">Base shirt cost</h3>
          <div className="mt-3 divide-y divide-black/10">
            {Object.entries(PRINTFUL_BASE_COST_BY_SIZE_CENTS).map(([size, cost]) => (
              <div key={size} className="flex items-center justify-between py-2">
                <span className="font-body text-sm text-black">{size}</span>
                <span className="font-body text-sm font-semibold text-black">
                  {formatUsd(cost)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-black/10 bg-white p-4">
          <h3 className="font-display text-2xl text-black">Placement add-ons</h3>
          <div className="mt-3 divide-y divide-black/10">
            {PLACEMENT_REFERENCE_ROWS.map((placement) => (
              <div key={placement} className="flex items-center justify-between gap-4 py-2">
                <span className="font-body text-sm capitalize text-black">
                  {getPlacementLabel(placement)}
                </span>
                <span className="font-body text-sm font-semibold text-black">
                  {formatUsd(PRINTFUL_PLACEMENT_ADDITIONAL_COST_CENTS[placement] ?? 0)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="font-body text-sm text-black">
                Unlimited color embroidery
              </span>
              <span className="font-body text-sm font-semibold text-black">
                {formatUsd(PRINTFUL_UNLIMITED_COLOR_EMBROIDERY_ADDITIONAL_CENTS)}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-black/10 bg-white p-4">
          <h3 className="font-display text-2xl text-black">US shipping</h3>
          <div className="mt-3 divide-y divide-black/10">
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="font-body text-sm text-black">First shirt</span>
              <span className="font-body text-sm font-semibold text-black">
                {formatUsd(PRINTFUL_US_FIRST_SHIRT_SHIPPING_CENTS)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="font-body text-sm text-black">Additional shirt</span>
              <span className="font-body text-sm font-semibold text-black">
                {formatUsd(PRINTFUL_US_ADDITIONAL_SHIRT_SHIPPING_CENTS)}
              </span>
            </div>
          </div>
          <p className="mt-4 font-body text-xs leading-relaxed text-black/50">
            Common setup: large artwork on the back plus a small logo on the chest uses two
            placements, so it adds the back placement cost to the base shirt cost.
          </p>
        </div>
      </div>
    </section>
  );
}
