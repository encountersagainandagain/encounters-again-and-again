'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { SiteSettings } from '@/lib/siteSettings';

const VIDEO_DESKTOP = 'c9dRw1KIfDk';
const VIDEO_MOBILE = 'y-B9ReggOfM';
const LEGACY_PLACEHOLDER_IMAGE = '/images/home/hero-bg.jpg';

type HeroProps = {
  settings: SiteSettings;
};

export function Hero({ settings }: HeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [useMobileVideo, setUseMobileVideo] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    const checkVideoLayout = () => {
      setUseMobileVideo(window.innerWidth < 768 && window.innerHeight >= window.innerWidth);
    };

    const handleScroll = () => {
      if (!heroRef.current || !contentRef.current) return;

      const scrollY = window.scrollY;
      const heroHeight = heroRef.current.offsetHeight;
      const progress = Math.min(scrollY / (heroHeight * 0.5), 1);

      contentRef.current.style.opacity = `${1 - progress}`;
      contentRef.current.style.transform = `translateY(${-scrollY * 0.2}px)`;
    };

    checkVideoLayout();
    window.addEventListener('resize', checkVideoLayout);
    window.addEventListener('orientationchange', checkVideoLayout);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', checkVideoLayout);
      window.removeEventListener('orientationchange', checkVideoLayout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const loadVideo = () => {
      timeoutId = window.setTimeout(() => setIsVideoLoaded(true), 800);
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(loadVideo, { timeout: 1600 });
    } else {
      loadVideo();
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (idleId && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
    };
  }, []);

  const videoId = useMobileVideo ? VIDEO_MOBILE : VIDEO_DESKTOP;
  const posterImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackImage =
    settings.homeHeroFallbackImage !== LEGACY_PLACEHOLDER_IMAGE
      ? settings.homeHeroFallbackImage
      : '';
  const heroImage = fallbackImage || posterImage;

  return (
    <section
      ref={heroRef}
      className="relative h-[100svh] min-h-[600px] overflow-hidden md:h-screen"
    >
      {/* 🎥 VIDEO BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        <Image
          src={heroImage}
          alt="Ocean surface and clear blue water"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {isVideoLoaded && (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1&origin=https://www.whatkatieseas.com`}
            className="absolute top-1/2 left-1/2 pointer-events-none border-0"
            style={{
              width: '100vw',
              height: '100vh',
              transform: 'translate(-50%, -50%) scale(1.3)',
            }}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Hero video"
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      {/* CONTENT */}
      <div
        ref={contentRef}
        className="relative z-10 h-full flex items-center section-padding"
      >
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight mb-6 opacity-0 animate-fade-in-up">
            {settings.tagline}
          </h1>

          <p className="font-body text-lg md:text-xl text-white/80 max-w-lg opacity-0 animate-fade-in-up animation-delay-200">
            {settings.description}
          </p>
        </div>
      </div>
    </section>
  );
}
