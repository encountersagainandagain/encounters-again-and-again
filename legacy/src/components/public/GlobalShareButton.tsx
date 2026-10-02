'use client';

import { usePathname } from 'next/navigation';
import { PostShareButton } from '@/components/public/PostShareButton';

export function GlobalShareButton() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return <PostShareButton />;
}
