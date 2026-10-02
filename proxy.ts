import { NextResponse, type NextRequest } from 'next/server';
import { isRouteEnabled } from '@/config/module-policy';
export function proxy(request: NextRequest) {
  if (!isRouteEnabled(request.nextUrl.pathname)) {
    return new NextResponse('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|icon.png).*)'] };
