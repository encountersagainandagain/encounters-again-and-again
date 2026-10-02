import type { SiteConfig, CurrentLocation, NavItem, NextStop } from '@/types';
import { brand, siteUrl } from '@/config/brand';
import { publicNavigation } from '@/config/routes';
export const siteConfig: SiteConfig = {
  name: brand.name, tagline: 'Art, ocean, education and conservation', description: brand.description,
  url: siteUrl,
  author: { id: 'encounters', name: brand.name, bio: '', avatar: brand.logo },
  social: { instagram: '', youtube: '' },
  seo: { title: brand.name, description: brand.description, ogImage: brand.logo },
};
export const navigation: NavItem[] = [...publicNavigation];
export const currentLocation: CurrentLocation = { city: '', country: '', image: '', nextStops: [] };
export const nextStops: NextStop[] = [];
export const categories = [
  { id: "all", slug: "all", name: "View All" },
  { id: "asia", slug: "asia", name: "Asia" },
  { id: "europe", slug: "europe", name: "Europe" },
  { id: "oceania", slug: "oceania", name: "Oceania" },
  { id: "north-america", slug: "north-america", name: "North America" },
  { id: "central-america", slug: "central-america", name: "Central America" },
  { id: "south-america", slug: "south-america", name: "South America" },
  { id: "africa", slug: "africa", name: "Africa" },
];

export const continents = [
  { id: "asia", name: "Asia", slug: "asia" },
  { id: "europe", name: "Europe", slug: "europe" },
  { id: "oceania", name: "Oceania", slug: "oceania" },
  { id: "north-america", name: "North America", slug: "north-america" },
  { id: "central-america", name: "Central America", slug: "central-america" },
  { id: "south-america", name: "South America", slug: "south-america" },
  { id: "africa", name: "Africa", slug: "africa" },
] as const;
