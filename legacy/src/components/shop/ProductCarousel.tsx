'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import type {
  ShopCollectionDisplayMode,
  ShopCollectionItemsPerRow,
} from '@/lib/siteSettings';

export type ProductCarouselItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  storyShortText: string;
};

const gridColumnClasses: Record<ShopCollectionItemsPerRow, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const carouselWidthClasses: Record<ShopCollectionItemsPerRow, string> = {
  2: 'md:w-[calc(50%_-_0.625rem)]',
  3: 'md:w-[calc(33.333%_-_0.833rem)]',
  4: 'md:w-[calc(25%_-_0.938rem)]',
  5: 'md:w-[calc(20%_-_1rem)]',
  6: 'md:w-[calc(16.667%_-_1.042rem)]',
};

export function ProductCarousel({
  products,
  displayMode = 'carousel',
  itemsPerRow = 4,
}: {
  products: Array<{
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    imageAlt: string;
    storyShortText: string;
  }>;
  displayMode?: ShopCollectionDisplayMode;
  itemsPerRow?: ShopCollectionItemsPerRow;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className={
          displayMode === 'grid'
            ? `grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10 ${gridColumnClasses[itemsPerRow]}`
            : 'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-5'
        }
        style={{ scrollbarWidth: 'thin' }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/shop/${product.slug}`}
            className={
              displayMode === 'grid'
                ? 'group flex min-w-0 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
                : `group flex w-[178px] shrink-0 snap-start flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean ${carouselWidthClasses[itemsPerRow]}`
            }
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-white">
              <div className="relative h-full w-full overflow-hidden bg-white">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    sizes={`(min-width: 768px) ${Math.ceil(100 / itemsPerRow)}vw, 178px`}
                    className="object-contain transition-transform duration-300 group-hover:scale-[1.015]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-3 text-center font-body text-xs text-black/35">
                    Image coming soon
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col pt-2 md:pt-3">
              <p className="font-display text-[15px] leading-snug text-black md:text-[19px]">
                {product.name}
              </p>
              <p className="mt-1 font-body text-[10.5px] leading-snug text-black/60 md:text-xs">
                {product.storyShortText}
              </p>
              <span className="mt-1 font-body text-[10px] font-semibold uppercase tracking-[0.12em] text-ocean md:text-[11px]">
                Shop →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {displayMode === 'carousel' && products.length > itemsPerRow && (
        <div className="mt-4 hidden justify-end gap-3 md:flex">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Previous products"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-black/15 bg-white font-body text-lg text-black/60 transition-colors hover:border-ocean hover:text-ocean focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Next products"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-black/15 bg-white font-body text-lg text-black/60 transition-colors hover:border-ocean hover:text-ocean focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
