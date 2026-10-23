import type { Metadata } from 'next';

// The admin is never cached: its pages answer per request (the public pages are cached, app/layout.tsx).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
