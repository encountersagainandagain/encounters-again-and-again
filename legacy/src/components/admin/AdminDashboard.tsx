'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Network, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchNewAdminCommentCount } from '@/lib/adminComments';
import { fetchNewAdminPaidOrderCount } from '@/lib/ecommerceOrders';
import { fetchPendingProductReviewCount } from '@/lib/adminProductReviews';

export function AdminDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newCommentCount, setNewCommentCount] = useState<number | null>(null);
  const [newPaidOrderCount, setNewPaidOrderCount] = useState<number | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });

    fetchNewAdminCommentCount()
      .then(setNewCommentCount)
      .catch(() => setNewCommentCount(null));
    fetchNewAdminPaidOrderCount()
      .then(setNewPaidOrderCount)
      .catch(() => setNewPaidOrderCount(null));
    fetchPendingProductReviewCount()
      .then(setPendingReviewCount)
      .catch(() => setPendingReviewCount(null));
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Dashboard
            </span>
            <h1 className="font-display text-5xl text-black md:text-6xl">
              Dashboard
            </h1>
            {email && (
              <p className="mt-3 font-body text-base text-black/55">
                Signed in as {email}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="btn-secondary justify-center"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Link
            href="/admin/posts"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              Manage posts
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Create, edit, delete, draft, and publish the first database-backed posts.
            </p>
          </Link>

          <Link
            href="/admin/gallery"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              Manage gallery
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Upload, edit, reorder, hide, and publish gallery photos.
            </p>
          </Link>

          <Link
            href="/admin/gear"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              My Gear
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Add and manage dive and travel gear recommendations with photos, links, and tags.
            </p>
          </Link>

          <Link
            href="/admin/countries"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              Country pages
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Create destination pages by country with a full-screen banner. Posts are grouped
              automatically by their country.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              Site settings
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Edit logo, site copy, email, and social links.
            </p>
          </Link>

          <Link
            href="/admin/newsletter"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
              Newsletter
            </h2>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Write and send email updates to active subscribers.
            </p>
          </Link>

          <Link
            href="/admin/link-audit"
            className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            <div className="mb-3 flex items-center gap-3">
              <Network className="h-5 w-5 text-ocean" aria-hidden="true" />
              <h2 className="font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Link audit
              </h2>
            </div>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Review internal post links, public page links, external URLs, and missing post
              references.
            </p>
          </Link>

          <Link
            href="/admin/comments"
            className="group relative border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
          >
            {newCommentCount !== null && newCommentCount > 0 && (
              <span
                className="absolute right-4 top-4 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-ocean px-2 font-body text-xs font-semibold text-white"
                aria-label={`${newCommentCount} new comments`}
              >
                {newCommentCount > 99 ? '99+' : newCommentCount}
              </span>
            )}
            <div className="mb-3 flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-ocean" aria-hidden="true" />
              <h2 className="font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Comments
              </h2>
            </div>
            <p className="font-body text-sm leading-relaxed text-black/60">
              Review new reader comments and publish replies signed as Katie beneath each one.
            </p>
          </Link>
        </div>

        <div className="mt-14 border-t border-black/10 pt-10">
          <span className="mb-6 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Ecommerce
          </span>

          <div className="grid gap-5 md:grid-cols-3">
            <Link
              href="/admin/products"
              className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Products
              </h2>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Create and manage merch products, example photos, print-ready design files, and
                the /shop page hero, intro, and lifestyle strip.
              </p>
            </Link>

            <Link
              href="/admin/collections"
              className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Collections
              </h2>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Group products into shop collections and choose a carousel or grid layout.
              </p>
            </Link>

            <Link
              href="/admin/providers"
              className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Providers
              </h2>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Review API fulfillment providers and manage manual provider shipping/contact info.
              </p>
            </Link>

            <Link
              href="/admin/orders"
              className="group relative border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              {newPaidOrderCount !== null && newPaidOrderCount > 0 && (
                <span
                  className="absolute right-4 top-4 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-ocean px-2 font-body text-xs font-semibold text-white"
                  aria-label={`${newPaidOrderCount} paid orders to review`}
                >
                  {newPaidOrderCount > 99 ? '99+' : newPaidOrderCount}
                </span>
              )}
              <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Orders
              </h2>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Monitor shop orders, webhook delays, shipping details, and manual fulfillment work.
              </p>
            </Link>

            <Link
              href="/admin/reviews"
              className="group relative border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              {pendingReviewCount !== null && pendingReviewCount > 0 && (
                <span
                  className="absolute right-4 top-4 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-ocean px-2 font-body text-xs font-semibold text-white"
                  aria-label={`${pendingReviewCount} product reviews to moderate`}
                >
                  {pendingReviewCount > 99 ? '99+' : pendingReviewCount}
                </span>
              )}
              <div className="mb-3 flex items-center gap-3">
                <Star className="h-5 w-5 text-ocean" aria-hidden="true" />
                <h2 className="font-display text-2xl text-black transition-colors group-hover:text-ocean">
                  Reviews
                </h2>
              </div>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Approve or reject verified-purchase ratings and comments before they appear in the
                shop.
              </p>
            </Link>

            <Link
              href="/admin/shop-disputes"
              className="group border border-black/10 bg-gray-50 p-6 transition-colors hover:border-ocean/35 hover:bg-sky-50"
            >
              <h2 className="mb-3 font-display text-2xl text-black transition-colors group-hover:text-ocean">
                Shop disputes
              </h2>
              <p className="font-body text-sm leading-relaxed text-black/60">
                Customer issue playbook and Stripe dispute evidence checklist for shop orders.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
