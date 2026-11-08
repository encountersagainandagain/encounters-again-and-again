import { NextResponse, type NextRequest } from 'next/server';
import { isRouteEnabled } from '@/config/module-policy';
import { legacyWordPress } from '@/config/legacy-wordpress';
export function proxy(request: NextRequest) {
  // Addresses of the former WordPress site: moved pages go to their new page, WordPress' own ones are gone.
  const legacy = legacyWordPress(request.nextUrl.pathname);
  if (legacy?.status === 308) return NextResponse.redirect(new URL(legacy.location, request.url), 308);
  if (legacy?.status === 410) return new NextResponse('Gone', { status: 410, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  // The local visual review (/review, fixtures and handoff assets) never runs on a Vercel deployment.
  const localReview = process.env.VERCEL && /^\/review(\/|$)/.test(request.nextUrl.pathname);
  if (localReview || !isRouteEnabled(request.nextUrl.pathname)) {
    return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|icon.png).*)'] };
