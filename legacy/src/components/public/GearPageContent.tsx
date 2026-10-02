'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Info } from 'lucide-react';
import type { GearItem } from '@/lib/gearItems';

type GearPageContentProps = {
  items: GearItem[];
  disclosureText: string;
};

export function GearPageContent({ items, disclosureText }: GearPageContentProps) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      const category = item.tag.trim();
      const categoryKey = category.toLowerCase();
      if (category && !seen.has(categoryKey)) {
        seen.add(categoryKey);
        result.push(category);
      }
    }
    return result;
  }, [items]);

  const [activeCategory, setActiveCategory] = useState<string>('all');

  const visibleItems = useMemo(
    () =>
      activeCategory === 'all'
        ? items
        : items.filter((item) => item.tag.trim().toLowerCase() === activeCategory),
    [activeCategory, items]
  );

  return (
    <div className="bg-white min-h-screen">
      {disclosureText.trim() && (
        <section className="border-b border-black/10 bg-gray-50">
          <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">
            <div className="grid gap-5 border border-ocean/20 bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,0.06)] md:grid-cols-[auto_1fr] md:p-6">
              <div className="flex h-11 w-11 items-center justify-center bg-ocean text-white">
                <Info className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-2 font-body text-xs uppercase tracking-[0.18em] text-ocean">
                  Gear disclosure
                </p>
                <p className="whitespace-pre-line font-body text-base leading-relaxed text-black/72">
                  {disclosureText}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="border-b border-black/10 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-8 md:px-8">
            <p className="font-body text-sm uppercase tracking-[0.18em] text-black/70 mb-4">
              Filter by category
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveCategory('all')}
                aria-pressed={activeCategory === 'all'}
                className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-ocean text-white border-ocean'
                    : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                }`}
              >
                All
              </button>
              {categories.map((category) => {
                const categoryKey = category.toLowerCase();

                return (
                  <button
                    key={categoryKey}
                    onClick={() => setActiveCategory(categoryKey)}
                    aria-pressed={activeCategory === categoryKey}
                    className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                      activeCategory === categoryKey
                        ? 'bg-ocean text-white border-ocean'
                        : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          {visibleItems.length === 0 ? (
            <p className="font-body text-base text-black/55">No gear items yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleItems.map((item) => (
                <div key={item.id} className="group flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-gray-100 mb-4">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-col flex-1">
                    {item.tag && (
                      <span className="font-body text-[11px] uppercase tracking-[0.15em] text-ocean mb-2">
                        {item.tag}
                      </span>
                    )}

                    <h2 className="font-display text-xl text-black leading-snug mb-3">
                      {item.name}
                    </h2>

                    {item.description && (
                      <p className="font-body text-sm text-black/65 leading-relaxed mb-4 flex-1">
                        {item.description}
                      </p>
                    )}

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-2 self-start font-body text-sm uppercase tracking-[0.14em] text-ocean border border-ocean px-4 py-2 transition-colors hover:bg-ocean hover:text-white mt-auto"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Shop
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
