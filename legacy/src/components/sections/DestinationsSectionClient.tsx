'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost, Continent } from '@/types';

const DESTINATION_CARD_LIMIT = 6;

type ContinentFilter = 'all' | Continent;

type ContinentOption = {
  slug: ContinentFilter;
  label: string;
};

const continentOptions: ContinentOption[] = [
  { slug: 'all', label: 'All' },
  { slug: 'asia', label: 'Asia' },
  { slug: 'europe', label: 'Europe' },
  { slug: 'oceania', label: 'Oceania' },
  { slug: 'north-america', label: 'North America' },
  { slug: 'central-america', label: 'Central America' },
  { slug: 'south-america', label: 'South America' },
  { slug: 'africa', label: 'Africa' },
];

type DestinationsSectionClientProps = {
  posts: BlogPost[];
};

export function DestinationsSectionClient({ posts }: DestinationsSectionClientProps) {
  const [activeContinent, setActiveContinent] = useState<ContinentFilter>('all');

  const availableContinents = useMemo(
    () => new Set(posts.map((post) => post.continent).filter(Boolean)),
    [posts]
  );

  const visibleDestinations = useMemo(() => {
    return posts
      .filter((post) => activeContinent === 'all' || post.continent === activeContinent)
      .slice(0, DESTINATION_CARD_LIMIT);
  }, [activeContinent, posts]);

  return (
    <>
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0">
        {continentOptions.map((option) => {
          const isUnavailable =
            option.slug !== 'all' && !availableContinents.has(option.slug);

          return (
            <button
              key={option.slug}
              type="button"
              onClick={() => setActiveContinent(option.slug)}
              disabled={isUnavailable}
              className={`shrink-0 border px-4 py-2 font-body text-sm uppercase tracking-[0.14em] transition-colors ${
                activeContinent === option.slug
                  ? 'border-ocean bg-ocean text-white'
                  : 'border-black/10 text-black/60 hover:border-ocean hover:text-ocean'
              } disabled:cursor-not-allowed disabled:border-black/5 disabled:text-black/25`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visibleDestinations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDestinations.map((destination) => (
            <Link
              key={destination.id}
              href={`/blog/${destination.slug}`}
              className="group relative overflow-hidden bg-gray-100"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={destination.coverImage}
                  alt={destination.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent opacity-85 transition-opacity group-hover:opacity-95" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="mb-2 block font-body text-xs uppercase tracking-wider text-white/90">
                    {[destination.destination, destination.country].filter(Boolean).join(', ')}
                  </span>
                  <h3 className="font-display text-xl font-light leading-tight text-white">
                    {destination.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="font-body text-base text-black/60">
          Destination stories are coming soon.
        </p>
      )}
    </>
  );
}
