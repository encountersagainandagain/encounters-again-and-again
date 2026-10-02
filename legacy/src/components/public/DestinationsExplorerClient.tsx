'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { BlogPost, Continent } from '@/types';
import type { CountryPage } from '@/lib/siteSettings';
import type { ExtendedFeature, GeoPermissibleObjects } from 'd3-geo';
import type { GeometryCollection, Topology } from 'topojson-specification';

type ContinentOption = {
  slug: Continent;
  name: string;
  shortName: string;
};

const CONTINENTS: ContinentOption[] = [
  {
    slug: 'asia',
    name: 'Asia',
    shortName: 'Asia',
  },
  {
    slug: 'europe',
    name: 'Europe',
    shortName: 'Europe',
  },
  {
    slug: 'oceania',
    name: 'Oceania',
    shortName: 'Oceania',
  },
  {
    slug: 'north-america',
    name: 'North America',
    shortName: 'North America',
  },
  {
    slug: 'central-america',
    name: 'Central America',
    shortName: 'Central America',
  },
  {
    slug: 'south-america',
    name: 'South America',
    shortName: 'South America',
  },
  {
    slug: 'africa',
    name: 'Africa',
    shortName: 'Africa',
  },
];

const MAP_WIDTH = 840;
const MAP_HEIGHT = 430;
const WORLD_GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  '004': 'asia',
  '008': 'europe',
  '012': 'africa',
  '016': 'oceania',
  '020': 'europe',
  '024': 'africa',
  '028': 'central-america',
  '031': 'asia',
  '032': 'south-america',
  '036': 'oceania',
  '040': 'europe',
  '044': 'central-america',
  '048': 'asia',
  '050': 'asia',
  '051': 'asia',
  '052': 'central-america',
  '056': 'europe',
  '060': 'north-america',
  '064': 'asia',
  '068': 'south-america',
  '070': 'europe',
  '072': 'africa',
  '076': 'south-america',
  '084': 'central-america',
  '090': 'oceania',
  '096': 'asia',
  '100': 'europe',
  '104': 'asia',
  '108': 'africa',
  '112': 'europe',
  '116': 'asia',
  '120': 'africa',
  '124': 'north-america',
  '132': 'africa',
  '136': 'central-america',
  '140': 'africa',
  '144': 'asia',
  '148': 'africa',
  '152': 'south-america',
  '156': 'asia',
  '158': 'asia',
  '170': 'south-america',
  '174': 'africa',
  '178': 'africa',
  '180': 'africa',
  '188': 'central-america',
  '191': 'europe',
  '192': 'central-america',
  '196': 'asia',
  '203': 'europe',
  '204': 'africa',
  '208': 'europe',
  '212': 'central-america',
  '214': 'central-america',
  '218': 'south-america',
  '222': 'central-america',
  '226': 'africa',
  '231': 'africa',
  '232': 'africa',
  '233': 'europe',
  '238': 'south-america',
  '242': 'oceania',
  '246': 'europe',
  '250': 'europe',
  '254': 'south-america',
  '258': 'oceania',
  '262': 'africa',
  '266': 'africa',
  '268': 'asia',
  '270': 'africa',
  '275': 'asia',
  '276': 'europe',
  '288': 'africa',
  '300': 'europe',
  '304': 'north-america',
  '308': 'central-america',
  '320': 'central-america',
  '324': 'africa',
  '328': 'south-america',
  '332': 'central-america',
  '340': 'central-america',
  '344': 'asia',
  '348': 'europe',
  '352': 'europe',
  '356': 'asia',
  '360': 'asia',
  '364': 'asia',
  '368': 'asia',
  '372': 'europe',
  '376': 'asia',
  '380': 'europe',
  '384': 'africa',
  '388': 'central-america',
  '392': 'asia',
  '398': 'asia',
  '400': 'asia',
  '404': 'africa',
  '408': 'asia',
  '410': 'asia',
  '414': 'asia',
  '417': 'asia',
  '418': 'asia',
  '422': 'asia',
  '426': 'africa',
  '428': 'europe',
  '430': 'africa',
  '434': 'africa',
  '438': 'europe',
  '440': 'europe',
  '442': 'europe',
  '450': 'africa',
  '454': 'africa',
  '458': 'asia',
  '462': 'asia',
  '466': 'africa',
  '470': 'europe',
  '478': 'africa',
  '480': 'africa',
  '484': 'central-america',
  '496': 'asia',
  '498': 'europe',
  '499': 'europe',
  '504': 'africa',
  '508': 'africa',
  '512': 'asia',
  '516': 'africa',
  '524': 'asia',
  '528': 'europe',
  '531': 'central-america',
  '533': 'central-america',
  '540': 'oceania',
  '548': 'oceania',
  '554': 'oceania',
  '558': 'central-america',
  '562': 'africa',
  '566': 'africa',
  '578': 'europe',
  '586': 'asia',
  '591': 'central-america',
  '598': 'oceania',
  '600': 'south-america',
  '604': 'south-america',
  '608': 'asia',
  '616': 'europe',
  '620': 'europe',
  '624': 'africa',
  '626': 'asia',
  '630': 'central-america',
  '634': 'asia',
  '642': 'europe',
  '643': 'asia',
  '646': 'africa',
  '682': 'asia',
  '686': 'africa',
  '688': 'europe',
  '690': 'africa',
  '694': 'africa',
  '702': 'asia',
  '703': 'europe',
  '704': 'asia',
  '705': 'europe',
  '706': 'africa',
  '710': 'africa',
  '724': 'europe',
  '728': 'africa',
  '729': 'africa',
  '740': 'south-america',
  '748': 'africa',
  '752': 'europe',
  '756': 'europe',
  '760': 'asia',
  '762': 'asia',
  '764': 'asia',
  '768': 'africa',
  '780': 'central-america',
  '784': 'asia',
  '788': 'africa',
  '792': 'asia',
  '795': 'asia',
  '798': 'oceania',
  '800': 'africa',
  '804': 'europe',
  '807': 'europe',
  '818': 'africa',
  '826': 'europe',
  '834': 'africa',
  '840': 'north-america',
  '854': 'africa',
  '858': 'south-america',
  '860': 'asia',
  '862': 'south-america',
  '882': 'oceania',
  '887': 'asia',
  '894': 'africa',
};

type WorldTopology = Topology<{
  countries: GeometryCollection<{ name?: string }>;
}>;

type MapGeography = ExtendedFeature;

const CONTINENT_PAGE_SIZE = 6;
const CONTINENT_INCREMENT = 3;
const SEARCH_PAGE_SIZE = 6;

function formatPostDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizeCountryName(country: string) {
  return country
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function DestinationPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 mb-4">
        <Image
          src={post.coverImage}
          alt={post.coverAlt || post.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-body text-[11px] uppercase tracking-[0.16em] text-ocean">
          {post.destination && <span>{post.destination}</span>}
          {post.country && <span>{post.country}</span>}
        </div>
        <p className="font-body text-sm text-black/55 shrink-0">
          {formatPostDate(post.publishedAt)}
        </p>
      </div>

      <h3 className="font-display text-xl text-black leading-snug group-hover:text-ocean transition-colors duration-200">
        {post.title}
      </h3>
    </Link>
  );
}

type DestinationsExplorerClientProps = {
  posts: BlogPost[];
  countries: CountryPage[];
};

export function DestinationsExplorerClient({ posts, countries }: DestinationsExplorerClientProps) {
  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [continentVisibleCount, setContinentVisibleCount] = useState(CONTINENT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchContinent, setSearchContinent] = useState<'all' | Continent>('all');
  const [searchCountry, setSearchCountry] = useState<'all' | string>('all');
  const [searchVisibleCount, setSearchVisibleCount] = useState(SEARCH_PAGE_SIZE);
  const [mapGeographies, setMapGeographies] = useState<MapGeography[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [pressedCountry, setPressedCountry] = useState<string | null>(null);
  const continentResultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorldMap() {
      const response = await fetch(WORLD_GEO_URL, { signal: controller.signal });
      const topology = (await response.json()) as WorldTopology;
      const countryFeatures = feature(topology, topology.objects.countries);

      if (countryFeatures.type === 'FeatureCollection') {
        setMapGeographies(countryFeatures.features as MapGeography[]);
      }
    }

    loadWorldMap().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Unable to load world map', error);
    });

    return () => controller.abort();
  }, []);

  const mapPath = useMemo(() => {
    const projection = geoMercator()
      .scale(130)
      .center([10, 20])
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

    return geoPath(projection);
  }, []);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ),
    [posts]
  );

  const postsByContinent = useMemo(
    () =>
      activeContinent
        ? sortedPosts.filter((post) => post.continent === activeContinent)
        : sortedPosts,
    [activeContinent, sortedPosts]
  );

  const availableCountriesByContinent = useMemo(() => {
    const map = new Map<Continent, string[]>();

    CONTINENTS.forEach((continent) => {
      const countriesByKey = new Map<string, string>();

      sortedPosts
        .filter((post) => post.continent === continent.slug && post.country)
        .forEach((post) => {
          const country = (post.country as string).trim().replace(/\s+/g, ' ');
          const key = normalizeCountryName(country);

          if (country && !countriesByKey.has(key)) {
            countriesByKey.set(key, country);
          }
        });

      map.set(continent.slug, [...countriesByKey.values()].sort());
    });

    return map;
  }, [sortedPosts]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    return sortedPosts.filter((post) => {
      const matchesContinent =
        searchContinent === 'all' ? true : post.continent === searchContinent;
      const matchesCountry =
        searchCountry === 'all'
          ? true
          : Boolean(post.country && normalizeCountryName(post.country) === searchCountry);
      const haystack = [
        post.title,
        post.subtitle,
        post.excerpt,
        post.destination,
        post.country,
        post.continent,
        ...post.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = normalizedSearch ? haystack.includes(normalizedSearch) : true;
      return matchesContinent && matchesCountry && matchesQuery;
    });
  }, [normalizedSearch, searchContinent, searchCountry, sortedPosts]);

  const currentContinent = activeContinent
    ? CONTINENTS.find((continent) => continent.slug === activeContinent)
    : null;
  const visibleContinentPosts = postsByContinent.slice(0, continentVisibleCount);
  const visibleSearchResults = searchResults.slice(0, searchVisibleCount);
  const availableCountries =
    searchContinent === 'all' ? [] : availableCountriesByContinent.get(searchContinent) ?? [];
  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  );

  const handleContinentSelect = (continent: Continent) => {
    setActiveContinent(continent);
    setContinentVisibleCount(CONTINENT_PAGE_SIZE);
    requestAnimationFrame(() => {
      continentResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleAllDestinationsSelect = () => {
    setActiveContinent(null);
    setContinentVisibleCount(CONTINENT_PAGE_SIZE);
    requestAnimationFrame(() => {
      continentResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <>
      <section className="py-16 md:py-20 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="mb-10">
            <h2 className="font-display text-4xl md:text-5xl text-black mb-4">
              Explore by Continent
            </h2>
            <p className="font-body text-base md:text-lg text-black/62 max-w-3xl leading-relaxed">
              Tap a continent to jump into the stories from that part of the world.
            </p>
          </div>

          <div className="bg-ocean-dark rounded-sm overflow-hidden p-6 md:p-10">
            <div className="relative mx-auto max-w-5xl">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="w-full h-auto"
                role="img"
                aria-label="Interactive world map by continent"
              >
                <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="transparent" />
                {mapGeographies.map((geo, index) => {
                  const countryId = String(geo.id ?? '').padStart(3, '0');
                  const continent = COUNTRY_TO_CONTINENT[countryId];
                  const countryKey = countryId || geo.properties?.name || `country-${index}`;
                  const pathKey = `${countryKey}-${index}`;
                  const isActive = continent === activeContinent;
                  const isHovered = hoveredCountry === countryKey;
                  const isPressed = pressedCountry === countryKey;
                  const pathData = mapPath(geo as GeoPermissibleObjects);

                  if (!pathData) return null;

                  const fill = continent
                    ? isActive || isHovered || isPressed
                      ? '#7dd3fc'
                      : 'rgba(255,255,255,0.24)'
                    : 'rgba(255,255,255,0.08)';

                  return (
                    <path
                      key={pathKey}
                      d={pathData}
                      fill={fill}
                      stroke={isActive || isHovered ? '#ffffff' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={0.6}
                      onClick={() => {
                        if (continent) handleContinentSelect(continent);
                      }}
                      onMouseEnter={() => {
                        if (continent) setHoveredCountry(countryKey);
                      }}
                      onMouseLeave={() => {
                        setHoveredCountry(null);
                        setPressedCountry(null);
                      }}
                      onMouseDown={() => {
                        if (continent) setPressedCountry(countryKey);
                      }}
                      onMouseUp={() => setPressedCountry(null)}
                      style={{
                        cursor: continent ? 'pointer' : 'default',
                        outline: 'none',
                        pointerEvents: continent ? 'auto' : 'none',
                        transition: 'fill 300ms ease, stroke 300ms ease',
                      }}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={handleAllDestinationsSelect}
                aria-pressed={!activeContinent}
                className={`border px-3 py-1.5 font-body text-[11px] uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ocean-dark ${
                  !activeContinent
                    ? 'border-sky-200/90 bg-sky-200/90 text-ocean-dark'
                    : 'border-white/15 text-white/75 hover:border-white/55 hover:text-white'
                }`}
              >
                All
              </button>
              {CONTINENTS.map((continent) => (
                <button
                  key={continent.slug}
                  type="button"
                  onClick={() => handleContinentSelect(continent.slug)}
                  aria-pressed={activeContinent === continent.slug}
                  className={`border px-3 py-1.5 font-body text-[11px] uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ocean-dark ${
                    activeContinent === continent.slug
                      ? 'border-sky-200/90 bg-sky-200/90 text-ocean-dark'
                      : 'border-white/15 text-white/75 hover:border-white/55 hover:text-white'
                  }`}
                >
                  {continent.shortName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        ref={continentResultsRef}
        className="py-16 md:py-20 bg-white border-b border-black/5 scroll-mt-28"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <span className="font-body text-sm uppercase tracking-[0.18em] text-black/70 block mb-3">
                {currentContinent ? 'Selected continent' : 'All destinations'}
              </span>
              <h2 className="font-display text-4xl md:text-5xl text-black">
                {currentContinent?.name ?? 'Explore every place'}
              </h2>
            </div>

            {postsByContinent.length > continentVisibleCount && (
              <button
                onClick={() => setContinentVisibleCount(postsByContinent.length)}
                className="font-body text-sm uppercase tracking-[0.16em] text-black/55 hover:text-ocean transition-colors"
              >
                View all -&gt;
              </button>
            )}
          </div>

          {postsByContinent.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleContinentPosts.map((post) => (
                  <DestinationPostCard key={`${post.slug}-continent`} post={post} />
                ))}
              </div>

              {continentVisibleCount < postsByContinent.length && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() =>
                      setContinentVisibleCount((current) => current + CONTINENT_INCREMENT)
                    }
                    className="btn-ocean"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="font-body text-base text-black/60">
              There are no published posts in this continent yet.
            </p>
          )}
        </div>
      </section>

      {sortedCountries.length > 0 && (
        <section className="py-16 md:py-20 bg-white border-b border-black/5">
          <div className="max-w-6xl mx-auto px-6 md:px-8">
            <h2 className="mb-10 font-display text-3xl text-black md:text-4xl">
              Browse by Country
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCountries.map((country) => (
                <Link
                  key={country.slug}
                  href={`/destinations/${country.slug}`}
                  className="group relative block aspect-[3/2] overflow-hidden bg-gray-100"
                >
                  {country.bannerImage && (
                    <Image
                      src={country.bannerImage}
                      alt={country.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30 transition-colors duration-300 group-hover:bg-black/40" />
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <h3 className="text-center font-display text-3xl uppercase tracking-[0.04em] text-white drop-shadow-sm md:text-4xl">
                      {country.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="mb-10">
            <h2 className="font-display text-4xl md:text-5xl text-black mb-4">
              Search Destinations
            </h2>
            <p className="font-body text-base md:text-lg text-black/62 max-w-3xl leading-relaxed">
              Search by destination, country, animal, or travel keyword. You can also narrow the results by continent and then by country.
            </p>
          </div>

          <div className="max-w-2xl relative mb-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-black/35" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchVisibleCount(SEARCH_PAGE_SIZE);
              }}
              placeholder="Try Galapagos, sharks, Tenerife, Egypt..."
              className="w-full h-14 pl-14 pr-5 bg-gray-50 border border-black/10 font-body text-base text-black placeholder:text-black/35 focus:outline-none focus:border-ocean transition-colors"
            />
          </div>

          <div className="mb-8">
            <p className="font-body text-sm uppercase tracking-[0.18em] text-black/70 mb-4">
              Filter by continent
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSearchContinent('all');
                  setSearchCountry('all');
                  setSearchVisibleCount(SEARCH_PAGE_SIZE);
                }}
                className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                  searchContinent === 'all'
                    ? 'bg-ocean text-white border-ocean'
                    : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                }`}
              >
                All
              </button>
              {CONTINENTS.map((continent) => (
                <button
                  key={continent.slug}
                  onClick={() => {
                    setSearchContinent(continent.slug);
                    setSearchCountry('all');
                    setSearchVisibleCount(SEARCH_PAGE_SIZE);
                  }}
                  className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                    searchContinent === continent.slug
                      ? 'bg-ocean text-white border-ocean'
                      : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                  }`}
                >
                  {continent.shortName}
                </button>
              ))}
            </div>
          </div>

          {availableCountries.length > 0 && (
            <div className="mb-10">
              <p className="font-body text-sm uppercase tracking-[0.18em] text-black/70 mb-4">
                Countries with blog posts
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSearchCountry('all');
                    setSearchVisibleCount(SEARCH_PAGE_SIZE);
                  }}
                  className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                    searchCountry === 'all'
                      ? 'bg-ocean text-white border-ocean'
                      : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                  }`}
                >
                  All countries
                </button>
                {availableCountries.map((country) => (
                  <button
                    key={country}
                  onClick={() => {
                      setSearchCountry(normalizeCountryName(country));
                      setSearchVisibleCount(SEARCH_PAGE_SIZE);
                    }}
                    className={`px-4 py-2 border text-sm font-body uppercase tracking-[0.14em] transition-colors ${
                      searchCountry === normalizeCountryName(country)
                        ? 'bg-ocean text-white border-ocean'
                        : 'border-black/10 text-black/65 hover:border-ocean hover:text-ocean'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <p className="font-body text-sm uppercase tracking-[0.16em] text-black/70">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </p>
          </div>

          {searchResults.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleSearchResults.map((post) => (
                  <DestinationPostCard key={`${post.slug}-search`} post={post} />
                ))}
              </div>

              {searchVisibleCount < searchResults.length && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() => setSearchVisibleCount((current) => current + CONTINENT_INCREMENT)}
                    className="btn-ocean"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="font-body text-base text-black/60">
              No destination posts matched that search yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
