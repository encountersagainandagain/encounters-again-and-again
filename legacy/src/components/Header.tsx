'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { CartButton, CartDrawer } from '@/components/cart/CartDrawer';
import { ShopCampaignBanner } from '@/components/shop/ShopCampaignBanner';
import { navigation } from '@/data';
import type { SiteSettings } from '@/lib/siteSettings';
import type { NavItem } from '@/types';
import type { PublicShopCampaign } from '@/lib/shopCampaigns';

function getHeaderNavigation(showShop: boolean): NavItem[] {
  return showShop ? [...navigation, { label: 'My Designs', href: '/shop' }] : navigation;
}

export function Header({
  settings,
  showShop = true,
  shopCampaign = null,
}: {
  settings: SiteSettings;
  showShop?: boolean;
  shopCampaign?: PublicShopCampaign | null;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const transparentHeaderPaths = ['/', '/about', '/blog', '/destinations', '/gallery', '/gear', '/shop'];
  const usesTransparentHeader =
    transparentHeaderPaths.includes(pathname) || pathname.startsWith('/destinations/');
  const forceLightHeader = !usesTransparentHeader;
  const headerNavigation = getHeaderNavigation(showShop);
  const mobileNavigation = headerNavigation.flatMap((item) => item.children ?? [item]);

  // Detect scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // 🔥 SCROLL LOCK REAL (mobile safe)
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      {/* HEADER */}
      <header
        className="site-header fixed top-0 left-0 right-0 z-50"
        data-scrolled={isScrolled ? 'true' : 'false'}
        data-mobile-menu-open={isMobileMenuOpen ? 'true' : 'false'}
      >
        {shopCampaign?.bannerEnabled && <ShopCampaignBanner campaign={shopCampaign} />}
        
        {/* Background */}
        <div
          className={`site-header-bg absolute inset-x-0 bottom-0 ${shopCampaign?.bannerEnabled ? 'top-9' : 'top-0'} transition-colors duration-300 ${
            isMobileMenuOpen
              ? 'bg-black'
              : forceLightHeader || isScrolled
                ? 'bg-white/95 backdrop-blur-md shadow-sm'
                : 'bg-transparent'
          }`}
        />

        {/* CONTENT */}
        <div className="relative section-padding">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 transition-transform duration-300"
            >
              <span className="relative block h-12 w-16 shrink-0">
                <Image
                  src={settings.logoLight}
                  alt={settings.name}
                  fill
                  priority
                  sizes="64px"
                  className={`site-logo-image site-logo-image-light object-contain object-left transition-opacity duration-300 ${
                    isMobileMenuOpen || (!forceLightHeader && !isScrolled)
                      ? 'opacity-100'
                      : 'opacity-0'
                  }`}
                />
                <Image
                  src={settings.logoDark}
                  alt=""
                  fill
                  priority
                  sizes="64px"
                  className={`site-logo-image site-logo-image-dark object-contain object-left transition-opacity duration-300 ${
                    !isMobileMenuOpen && (forceLightHeader || isScrolled)
                      ? 'opacity-100'
                      : 'opacity-0'
                  }`}
                />
              </span>

              <span
                className={`site-logo-text font-logo text-3xl font-medium transition-colors duration-300 ${
                  isMobileMenuOpen
                    ? 'text-white'
                    : forceLightHeader || isScrolled
                    ? 'text-black'
                    : 'text-white'
                }`}
              >
                {settings.name}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {headerNavigation.map((item: NavItem) =>
                item.children ? (
                  <div key={item.href} className="group/nav relative">
                    <Link
                      href={item.href}
                      data-active={item.children.some((child) => isActive(child.href)) ? 'true' : 'false'}
                      className={`site-nav-link relative font-body text-base tracking-wide transition-colors duration-300 pb-1 ${
                        item.children.some((child) => isActive(child.href))
                          ? forceLightHeader || isScrolled
                            ? 'text-ocean'
                            : 'text-white'
                          : forceLightHeader || isScrolled
                            ? 'text-black hover:text-ocean'
                            : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {item.label}
                      <span
                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-ocean transition-all duration-200 ${
                          item.children.some((child) => isActive(child.href))
                            ? 'w-full'
                            : 'w-0 group-hover/nav:w-full'
                        }`}
                      />
                    </Link>

                    <div className="invisible absolute left-1/2 top-full -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-150 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100">
                      <div className="min-w-[160px] border border-black/10 bg-white py-2 shadow-lg">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            data-active={isActive(child.href) ? 'true' : 'false'}
                            className={`block px-4 py-2 font-body text-sm tracking-wide transition-colors ${
                              isActive(child.href)
                                ? 'text-ocean'
                                : 'text-black/75 hover:bg-ocean/5 hover:text-ocean'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={isActive(item.href) ? 'true' : 'false'}
                    className={`site-nav-link relative font-body text-base tracking-wide transition-colors duration-300 pb-1 ${
                      isActive(item.href)
                        ? forceLightHeader || isScrolled
                          ? 'text-ocean'
                          : 'text-white'
                        : forceLightHeader || isScrolled
                          ? 'text-black hover:text-ocean'
                          : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-ocean transition-all duration-200 ${
                        isActive(item.href)
                          ? 'w-full'
                          : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </Link>
                )
              )}
              {showShop && (
                <CartButton
                  className={`site-cart-button transition-colors duration-300 ${
                    forceLightHeader || isScrolled
                      ? 'text-black hover:text-ocean'
                      : 'text-white/85 hover:text-white'
                  }`}
                />
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* 🔥 Cart + menu toggle, laid out together so they can never overlap */}
      <div className={`lg:hidden fixed right-4 z-[60] flex items-center gap-2 ${shopCampaign?.bannerEnabled ? 'top-[52px]' : 'top-4'}`}>
        {showShop && (
          <CartButton
            className={`site-mobile-cart-button p-2 transition-colors duration-300 ${
              isMobileMenuOpen
                ? 'text-white'
                : forceLightHeader || isScrolled
                  ? 'text-black hover:text-ocean'
                  : 'text-white hover:text-white/80'
            }`}
          />
        )}

        <button
          className={`p-2 transition-colors duration-300 ${
            isMobileMenuOpen
              ? 'text-white'
              : forceLightHeader || isScrolled
                ? 'text-black hover:text-ocean'
                : 'text-white hover:text-white/80'
          }`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <Menu className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* 🔥 Mobile Menu FULLSCREEN */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${shopCampaign?.bannerEnabled ? 'top-[116px]' : 'top-20'} ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        } ${isMobileMenuOpen ? 'bg-black/95' : forceLightHeader || isScrolled ? 'bg-white/98' : 'bg-black/95'}`}
      >
        <nav className="flex flex-col items-center justify-center h-full gap-8">
          {mobileNavigation.map((item: NavItem) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`font-display text-3xl font-light transition-colors duration-300 ${
                isMobileMenuOpen
                  ? isActive(item.href)
                    ? 'text-sky-200'
                    : 'text-white hover:text-sky-200'
                  : isActive(item.href)
                    ? 'text-ocean'
                    : forceLightHeader || isScrolled
                      ? 'text-black hover:text-ocean'
                      : 'text-white hover:text-white/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {showShop && <CartDrawer />}
    </>
  );
}
