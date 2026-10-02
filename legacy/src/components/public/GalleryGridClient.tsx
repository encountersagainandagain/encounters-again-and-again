'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryItem } from '@/lib/galleryItems';
import type { Continent } from '@/types';

type GalleryFilter = 'all' | Continent;

const galleryFilters: { slug: GalleryFilter; label: string }[] = [
  { slug: 'all', label: 'All' },
  { slug: 'asia', label: 'Asia' },
  { slug: 'europe', label: 'Europe' },
  { slug: 'oceania', label: 'Oceania' },
  { slug: 'north-america', label: 'North America' },
  { slug: 'central-america', label: 'Central America' },
  { slug: 'south-america', label: 'South America' },
  { slug: 'africa', label: 'Africa' },
];

const imageAspectClass: Record<GalleryItem['orientation'], string> = {
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  square: 'aspect-square',
};

type GalleryGridClientProps = {
  images: GalleryItem[];
};

export function GalleryGridClient({ images }: GalleryGridClientProps) {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('all');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  const visibleImages = useMemo(() => {
    if (activeFilter === 'all') return images;
    return images.filter((image) => image.continent === activeFilter);
  }, [activeFilter, images]);

  const activeImage =
    activeImageIndex === null ? null : visibleImages[activeImageIndex] ?? null;

  const openImage = (index: number) => {
    setActiveImageIndex(index);
  };

  const closeImage = useCallback(() => {
    setActiveImageIndex(null);
  }, []);

  const showPreviousImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null) return current;
      return current === 0 ? visibleImages.length - 1 : current - 1;
    });
  }, [visibleImages.length]);

  const showNextImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null) return current;
      return current === visibleImages.length - 1 ? 0 : current + 1;
    });
  }, [visibleImages.length]);

  useEffect(() => {
    if (!activeImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImage();
      if (event.key === 'ArrowLeft') showPreviousImage();
      if (event.key === 'ArrowRight') showNextImage();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage, closeImage, showNextImage, showPreviousImage]);

  useEffect(() => {
    if (!activeImage) return;

    const checkMobileLandscape = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setIsMobileLandscape(viewportWidth > viewportHeight && viewportWidth <= 950);
    };

    checkMobileLandscape();
    window.addEventListener('resize', checkMobileLandscape);
    window.addEventListener('orientationchange', checkMobileLandscape);
    window.visualViewport?.addEventListener('resize', checkMobileLandscape);

    return () => {
      window.removeEventListener('resize', checkMobileLandscape);
      window.removeEventListener('orientationchange', checkMobileLandscape);
      window.visualViewport?.removeEventListener('resize', checkMobileLandscape);
      setIsMobileLandscape(false);
    };
  }, [activeImage]);

  return (
    <>
      <section className="bg-ocean-dark text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5">
          <div className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-8 md:gap-5 md:overflow-visible">
            {galleryFilters.map((filter) => (
              <button
                key={filter.slug}
                onClick={() => setActiveFilter(filter.slug)}
                className={`shrink-0 border-b pb-3 text-left md:text-center font-body text-sm md:text-base tracking-wide transition-colors ${
                  activeFilter === filter.slug
                    ? 'text-white border-white'
                    : 'text-white/85 border-white/30 hover:text-white hover:border-white/60'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="font-body text-sm uppercase tracking-[0.18em] text-black/70 block mb-3">
                {visibleImages.length} photo{visibleImages.length === 1 ? '' : 's'}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-black">
                {galleryFilters.find((filter) => filter.slug === activeFilter)?.label}
              </h2>
            </div>
          </div>

          {visibleImages.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleImages.map((image, index) => (
                <figure key={image.id} className="group">
                  <button
                    type="button"
                    onClick={() => openImage(index)}
                    className={`${imageAspectClass[image.orientation]} relative isolate block w-full overflow-hidden bg-transparent text-left`}
                    aria-label={`${image.location ? `${image.location} ` : ''}${image.title}`}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.alt_text || `${image.title} in ${image.location}`}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="z-0 object-cover opacity-100 mix-blend-normal transition-none group-hover:opacity-100 group-hover:scale-100"
                    />
                    <div className="absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
                    <div className="absolute inset-x-0 bottom-0 z-10 translate-y-0 p-5 opacity-100 transition-all duration-300 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                      {image.location && (
                        <span className="font-body text-xs uppercase tracking-[0.18em] text-sky-200 block mb-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                          {image.location}
                        </span>
                      )}
                      <h3 className="font-display text-2xl text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                        {image.title}
                      </h3>
                    </div>
                  </button>
                </figure>
              ))}
            </div>
          ) : (
            <p className="font-body text-base text-black/60">
              No gallery photos are published yet.
            </p>
          )}
        </div>
      </section>

      {activeImage && (
        <div
          className={`fixed inset-0 z-[100] ${
            isMobileLandscape ? 'bg-black px-0 py-0' : 'bg-white px-4 py-6 md:px-8 md:py-8'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image viewer"
          onClick={closeImage}
        >
          <button
            type="button"
            onClick={closeImage}
            className={`fixed z-[120] flex items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10 transition-colors hover:bg-black hover:text-white ${
              isMobileLandscape
                ? 'right-3 top-3 h-10 w-10'
                : 'right-4 top-4 h-11 w-11 md:right-8 md:top-8'
            }`}
            aria-label="Close gallery image"
          >
            <X className="w-7 h-7" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPreviousImage();
            }}
            className={`fixed top-1/2 z-[120] flex -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10 transition-colors hover:bg-black hover:text-white ${
              isMobileLandscape ? 'left-3 h-10 w-10' : 'left-3 h-12 w-12 md:left-8 md:h-14 md:w-14'
            }`}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8 md:w-9 md:h-9" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNextImage();
            }}
            className={`fixed top-1/2 z-[120] flex -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10 transition-colors hover:bg-black hover:text-white ${
              isMobileLandscape ? 'right-3 h-10 w-10' : 'right-3 h-12 w-12 md:right-8 md:h-14 md:w-14'
            }`}
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8 md:w-9 md:h-9" />
          </button>

          <div
            className={`h-full mx-auto flex flex-col items-center justify-center ${
              isMobileLandscape ? 'max-w-none gap-0 px-14' : 'max-w-6xl gap-5 px-10 md:px-16'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`relative min-h-0 w-full ${
                isMobileLandscape ? 'h-[100dvh] flex-none' : 'flex-1'
              }`}
            >
              <Image
                src={activeImage.image_url}
                alt={activeImage.alt_text || `${activeImage.title} in ${activeImage.location}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <div className={`text-center text-black ${isMobileLandscape ? 'hidden' : ''}`}>
              <h2 className="font-display text-2xl md:text-3xl">
                {activeImage.title}
              </h2>
              {activeImage.location && (
                <p className="font-body text-sm md:text-base text-black/55 mt-1">
                  {activeImage.location}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
