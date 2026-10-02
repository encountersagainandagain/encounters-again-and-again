'use client';

import { useState } from 'react';
import { ProductCarousel, type ProductCarouselItem } from '@/components/shop/ProductCarousel';
import type {
  ShopCollectionDisplayMode,
  ShopCollectionItemsPerRow,
} from '@/lib/siteSettings';

export type ShopCollectionGroup = {
  id: string;
  name: string;
  products: ProductCarouselItem[];
  displayMode: ShopCollectionDisplayMode;
  itemsPerRow: ShopCollectionItemsPerRow;
};

const ALL_ID = 'all';

/**
 * Una sola grilla de productos con un filtro por colección encima.
 *
 * El título de la sección se renderiza una vez, fuera de este componente. Antes
 * se repetía por cada colección configurada, así que con dos colecciones la
 * página mostraba "The ocean collection" dos veces.
 *
 * El orden de los filtros es el de `collections`, que a su vez es el orden del
 * array en site_settings: el que Katie define arrastrando en /admin/collections.
 */
export function ShopCollections({
  collections,
  allProducts,
  allDisplayMode = 'carousel',
  allItemsPerRow = 4,
}: {
  collections: ShopCollectionGroup[];
  allProducts: ProductCarouselItem[];
  allDisplayMode?: ShopCollectionDisplayMode;
  allItemsPerRow?: ShopCollectionItemsPerRow;
}) {
  const [selectedId, setSelectedId] = useState(ALL_ID);

  // Con una sola colección el filtro no aporta nada: sería "All" y una única opción.
  const showFilter = collections.length > 1;
  const selected = collections.find((collection) => collection.id === selectedId);
  const options = [{ id: ALL_ID, name: 'All' }, ...collections.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <div>
      {showFilter && (
        <div
          role="tablist"
          aria-label="Filter products by collection"
          className="mb-8 flex flex-wrap items-center gap-x-7 gap-y-3"
        >
          {options.map((option) => {
            const isActive = option.id === selectedId;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedId(option.id)}
                className={`font-body text-sm tracking-wide transition-colors ${
                  isActive
                    ? 'text-black underline decoration-1 underline-offset-[6px]'
                    : 'text-black/45 hover:text-black/70'
                }`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <ProductCarousel
          products={selected.products}
          displayMode={selected.displayMode}
          itemsPerRow={selected.itemsPerRow}
        />
      ) : (
        <ProductCarousel
          products={allProducts}
          displayMode={allDisplayMode}
          itemsPerRow={allItemsPerRow}
        />
      )}
    </div>
  );
}
