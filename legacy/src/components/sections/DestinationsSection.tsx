import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { DestinationsSectionClient } from '@/components/sections/DestinationsSectionClient';
import type { BlogPost } from '@/types';

type DestinationsSectionProps = {
  initialPosts?: BlogPost[];
};

export function DestinationsSection({ initialPosts }: DestinationsSectionProps) {
  const destinationPosts = (initialPosts ?? []).filter((post) => post.destination || post.country);

  return (
    <section className="py-24 lg:py-10 bg-white">
      <div className="section-padding">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-light">
            Destinations
          </h2>
          
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 font-body text-sm text-black/70 hover:text-terracotta transition-all duration-300 mt-4 md:mt-0 group"
          >
            <span>view all</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
          </Link>
        </div>

        <DestinationsSectionClient posts={destinationPosts} />
      </div>
    </section>
  );
}
