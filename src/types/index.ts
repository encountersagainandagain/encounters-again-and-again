export type BlogCategorySlug =
  | 'travel'
  | 'diving'
  | 'encounters'
  | 'guides'
  | 'dive-instructor-life';

export interface PostImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface PostQuote {
  text: string;
  attribution?: string;
}

export interface PostSection {
  id: string;
  title?: string;
  paragraphs: string[];
  images?: PostImage[];
  quote?: PostQuote;
}

// Blog Post Type - Escalable para CMS
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverImage: string;
  coverAlt?: string;
  categories: BlogCategorySlug[];
  tags: string[];
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  readTime: number;
  destination?: string;
  country?: string;
  continent?: Continent;
  intro: string[];
  sections: PostSection[];
  relatedPostSlugs?: string[];
  featured?: boolean;
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
}

// Video Type
export interface Video {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  category: Category;
  publishedAt: string;
  views?: number;
  featured?: boolean;
}

// Destination Type
export interface Destination {
  id: string;
  slug: string;
  name: string;
  country: string;
  continent: Continent;
  description: string;
  coverImage: string;
  gallery?: string[];
  highlights?: string[];
  bestTimeToVisit?: string;
  tips?: string[];
  posts?: string[]; // Related post IDs
  featured?: boolean;
}

// Category Type
export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

// Continent Type
export type Continent =
  | 'asia'
  | 'europe'
  | 'oceania'
  | 'north-america'
  | 'central-america'
  | 'south-america'
  | 'africa';

// Author Type
export interface Author {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  social?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    facebook?: string;
    pinterest?: string;
    tiktok?: string;
  };
}

// Navigation Item Type
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

// Instagram Post Type
export interface InstagramPost {
  id: string;
  imageUrl: string;
  link: string;
  caption?: string;
  likes?: number;
}

// Newsletter Subscription Type
export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
  preferences?: {
    travelTips?: boolean;
    newPosts?: boolean;
    destinations?: boolean;
  };
}

// Contact Form Type
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Site Config Type
export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  author: Author;
  social: {
    instagram: string;
    youtube: string;
    twitter?: string;
    facebook?: string;
    pinterest?: string;
    tiktok?: string;
  };
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
}

// Current Location Type
export interface CurrentLocation {
  city: string;
  country: string;
  image: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  nextStops: string[];
}

export interface NextStop {
  country: string;
}

// Partner/As Seen In Type
export interface Partner {
  name: string;
  logo: string;
  url: string;
}
