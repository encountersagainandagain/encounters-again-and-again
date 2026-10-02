'use client';

import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { trackPostShareClick } from '@/lib/analytics';

type PostShareButtonProps = {
  title?: string;
  text?: string;
  slug?: string;
  url?: string;
};

export function PostShareButton({ title, text, slug, url }: PostShareButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 420);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    const shareUrl = url || (slug ? `${window.location.origin}/blog/${slug}` : window.location.href);
    const shareTitle = title || document.title || 'What Katie Seas';
    const shareSlug = slug || window.location.pathname;
    const shareData = {
      title: shareTitle,
      text: text || shareTitle,
      url: shareUrl,
    };

    if (navigator.share) {
      await navigator
        .share(shareData)
        .then(() => {
          trackPostShareClick({
            href: shareUrl,
            title: shareTitle,
            slug: shareSlug,
            method: 'native_share',
          });
        })
        .catch(() => undefined);
      return;
    }

    await navigator.clipboard?.writeText(shareUrl).then(
      () => {
        trackPostShareClick({
          href: shareUrl,
          title: shareTitle,
          slug: shareSlug,
          method: 'copy_link',
        });
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      },
      () => undefined
    );
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      aria-label={copied ? 'Page link copied' : 'Share this page'}
      className={`fixed bottom-6 right-[4.75rem] z-40 flex h-11 w-11 items-center justify-center bg-ocean text-white shadow-lg shadow-black/20 transition-all duration-300 hover:bg-ocean-dark focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 md:bottom-8 md:right-[5.25rem] ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      <span className="sr-only">{copied ? 'Page link copied' : 'Share this page'}</span>
      {copied && (
        <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-ocean-dark px-3 py-1.5 font-body text-xs text-white shadow-lg">
          Link copied
        </span>
      )}
    </button>
  );
}
