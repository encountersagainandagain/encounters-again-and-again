import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedAdminEmail } from '@/lib/adminAccess';
import { planSettingsRevalidation } from '@/lib/settingsRevalidation';

type RevalidationScope =
  | 'posts'
  | 'gallery'
  | 'gear'
  | 'settings'
  | 'products'
  | 'countries'
  | 'campaigns';

type RevalidationRequest = {
  scope?: RevalidationScope;
  slugs?: string[];
  countrySlugs?: string[];
  changedKeys?: string[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const basePublicPaths = ['/', '/blog', '/destinations'];
const settingsPaths = [
  '/',
  '/about',
  '/blog',
  '/contact',
  '/destinations',
  '/gallery',
  '/gear',
  '/shop',
  '/sitemap.xml',
  '/privacy-policy',
  '/support-us',
  '/terms-of-use',
  '/affiliate-disclosure',
];

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '').trim();

  if (!supabaseUrl || !supabaseAnonKey || !token) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;

  return isAllowedAdminEmail(data.user.email);
}

export async function POST(request: Request) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RevalidationRequest;
  const scope = body.scope ?? 'posts';
  const paths = new Set<string>();
  let invalidateFullLayout = false;

  if (scope === 'posts') {
    basePublicPaths.forEach((path) => paths.add(path));
    uniqueValues(body.slugs ?? []).forEach((slug) => paths.add(`/blog/${slug}`));
    uniqueValues(body.countrySlugs ?? []).forEach((slug) =>
      paths.add(`/destinations/${slug}`)
    );
    paths.add('/sitemap.xml');
  }

  if (scope === 'gallery') {
    paths.add('/gallery');
  }

  if (scope === 'gear') {
    paths.add('/gear');
  }

  if (scope === 'products') {
    paths.add('/shop');
    uniqueValues(body.slugs ?? []).forEach((slug) => paths.add(`/shop/${slug}`));
    paths.add('/sitemap.xml');
  }

  if (scope === 'campaigns') {
    invalidateFullLayout = true;
    paths.add('/shop');
    paths.add('/cart');
  }

  if (scope === 'countries') {
    // Countries only ever change via a full-array save (add/remove/rename),
    // so the caller sends every slug that was present before or after the
    // save — covers additions, removals, and renames without guessing.
    paths.add('/destinations');
    paths.add('/sitemap.xml');
    uniqueValues(body.slugs ?? []).forEach((slug) => paths.add(`/destinations/${slug}`));
  }

  if (scope === 'settings') {
    const plan = planSettingsRevalidation(body.changedKeys, settingsPaths);
    invalidateFullLayout = plan.fullLayout;
    plan.paths.forEach((path) => paths.add(path));
  }

  if (invalidateFullLayout) {
    revalidatePath('/', 'layout');
  }

  paths.forEach((path) => revalidatePath(path));

  return NextResponse.json({
    revalidated: true,
    fullLayout: invalidateFullLayout,
    paths: [...paths],
  });
}
