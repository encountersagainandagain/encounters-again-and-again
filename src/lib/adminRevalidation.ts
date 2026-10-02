import { supabase } from '@/lib/supabase';

type RevalidationScope =
  | 'posts'
  | 'gallery'
  | 'gear'
  | 'settings'
  | 'products'
  | 'countries'
  | 'campaigns';

type AdminRevalidationInput = {
  scope: RevalidationScope;
  slugs?: Array<string | null | undefined>;
  countrySlugs?: Array<string | null | undefined>;
  // Only meaningful for scope 'settings'. Omit when the caller can't prove
  // exactly which fields changed — the endpoint falls back to the broad
  // invalidation in that case. Pass an empty array when a save happened but
  // nothing actually differs from what was loaded (no-op, saves a write).
  changedKeys?: string[];
};

export async function requestAdminRevalidation({
  scope,
  slugs = [],
  countrySlugs = [],
  changedKeys,
}: AdminRevalidationInput) {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  const response = await fetch('/api/admin/revalidate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scope,
      slugs: [...new Set(slugs.filter(Boolean))],
      countrySlugs: [...new Set(countrySlugs.filter(Boolean))],
      ...(changedKeys !== undefined ? { changedKeys } : {}),
    }),
  });

  if (!response.ok) {
    console.warn('Admin save succeeded, but public cache revalidation failed.', {
      scope,
      status: response.status,
    });
  }
}
