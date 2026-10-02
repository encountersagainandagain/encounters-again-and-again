import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types';

type RecentPostsProps = {
  initialPosts?: BlogPost[];
};

export function RecentPosts({ initialPosts }: RecentPostsProps) {
  const posts = (initialPosts ?? []).slice(0, 3);

  return (
    <section className="py-24 lg:pb-32 lg:pt-10 bg-gray-100">
      <div className="section-padding">
        <div className="mb-12">
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-[#ad6d4d]">
            Recent
            <br />
            Posts
          </h2>
        </div>

        {posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group"
              >
                <div className="relative aspect-[4/3] overflow-hidden mb-4 bg-gray-100">
                  <Image
                    src={post.coverImage}
                    alt={post.coverAlt || post.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <p className="font-body text-sm text-black/55 mb-2">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>

                <h3 className="font-display text-xl text-black leading-snug group-hover:text-ocean transition-colors duration-200">
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        ) : (
          <p className="font-body text-base text-black/60">
            New posts are coming soon.
          </p>
        )}
      </div>
    </section>
  );
}
