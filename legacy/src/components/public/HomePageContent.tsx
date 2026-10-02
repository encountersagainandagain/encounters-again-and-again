import {
  Hero,
  AboutSection,
  DesignsSection,
  RecentPosts,
  DestinationsSection,
} from '@/components/sections';

import { NextStops } from '@/components/sections/Next';
import type { BlogPost } from '@/types';
import type { SiteSettings } from '@/lib/siteSettings';

type HomeProps = {
  initialPosts?: BlogPost[];
  settings: SiteSettings;
};

export function HomePageContent({ initialPosts, settings }: HomeProps) {
  return (
    <>
      <Hero settings={settings} />
      <AboutSection settings={settings} />
      <DesignsSection />
      <RecentPosts initialPosts={initialPosts} />
      <DestinationsSection initialPosts={initialPosts} />
      <NextStops settings={settings} />
    </>
  );
}
