import Image from 'next/image';
import Link from 'next/link';
import { navigation } from '@/data';
import type { SiteSettings } from '@/lib/siteSettings';
import { CookieSettingsButton } from '@/components/CookieSettingsButton';
import { NewsletterSignupForm } from '@/components/public/NewsletterSignupForm';
import type { NavItem } from '@/types';

const socialIconPaths = {
  Instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  YouTube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  Pinterest:
    'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.071 3.151 9.405 7.601 11.151-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.669.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.03-.655 2.569-.994 3.995-.283 1.195.599 2.169 1.777 2.169 2.132 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.739.098.119.112.223.083.344-.091.379-.293 1.195-.334 1.363-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.966 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.747 2.848c-.271 1.043-1.002 2.35-1.492 3.146A12.016 12.016 0 0 0 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z',
  Facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.063 24 12.073z',
  TikTok:
    'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.5a6.34 6.34 0 0 0 10.86-4.43V9.11a8.16 8.16 0 0 0 4.77 1.52V7.18a4.79 4.79 0 0 1-1.04-.49z',
} as const;

function getFooterNavigation(showShop: boolean): NavItem[] {
  return showShop ? [...navigation, { label: 'My Designs', href: '/shop' }] : navigation;
}

export function Footer({ settings, showShop = true }: { settings: SiteSettings; showShop?: boolean }) {
  const currentYear = new Date().getFullYear();
  const footerNavigation = getFooterNavigation(showShop);
  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Use', href: '/terms-of-use' },
    ...(showShop ? [{ label: 'Shop Returns', href: '/shop/returns' }] : []),
    { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
  ];
  const socialLinks = [
    {
      label: 'Instagram',
      href: settings.instagram,
      isVisible: settings.showInstagram,
      iconPath: socialIconPaths.Instagram,
    },
    {
      label: 'YouTube',
      href: settings.youtube,
      isVisible: settings.showYoutube,
      iconPath: socialIconPaths.YouTube,
    },
    {
      label: 'Pinterest',
      href: settings.pinterest,
      isVisible: settings.showPinterest,
      iconPath: socialIconPaths.Pinterest,
    },
    {
      label: 'Facebook',
      href: settings.facebook,
      isVisible: settings.showFacebook,
      iconPath: socialIconPaths.Facebook,
    },
    {
      label: 'TikTok',
      href: settings.tiktok,
      isVisible: settings.showTiktok,
      iconPath: socialIconPaths.TikTok,
    },
  ].filter((item) => item.isVisible && item.href.trim());

  return (
    <footer className="bg-ocean text-white">
      {/* Main Footer */}
      <div className="section-padding py-20">
        <div className="grid md:grid-cols-3 gap-12 items-center justify-items-center">
          
          {/* Contact */}
          <div className="text-center md:text-left space-y-4">
            <h3 className="font-display text-xl md:text-2xl font-light">
              Get in Contact
            </h3>

            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${settings.email}`}
                className="font-body text-white/90 hover:text-white transition-colors"
              >
                {settings.email}
              </a>

              <Link
                href="/contact"
                className="font-body text-sm text-white/85 hover:text-white transition-all duration-300 hover:translate-x-1"
              >
                Send a message →
              </Link>

              <Link
                href="/support-us"
                className="font-body text-sm text-white/85 hover:text-white transition-all duration-300 hover:translate-x-1"
              >
                Support the blog →
              </Link>
            </div>
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="flex flex-col items-center gap-3 group">
              
              <Image
                src={settings.logoFooter}
                alt={settings.name}
                width={180}
                height={120}
                className="h-30 w-auto transition-transform duration-300 group-hover:scale-105"
              />

              {/* <span className="font-display text-2xl md:text-3xl font-light tracking-wide">
                What Katie Seas
              </span> */}
            </Link>
          </div>

          {/* Social */}
          <div className="text-center md:text-right">
            <h3 className="font-display text-2xl md:text-3xl font-light mb-4">
              Follow me
            </h3>
            <div className="flex justify-center md:justify-end gap-6">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white transition-colors"
                  aria-label={item.label}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d={item.iconPath} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

        </div>

        <div className="mx-auto mt-14 max-w-2xl border-t border-white/15 pt-10 text-center">
          <NewsletterSignupForm
            source="footer"
            variant="dark"
            title="Stay in the current"
            description="Occasional updates from Katie: new stories, dive tips, and future trip news."
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="section-padding py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <nav className="flex flex-wrap justify-center gap-6">
              {footerNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-body text-sm text-white/85 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {legalLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-body text-xs text-white/85 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <CookieSettingsButton />
            </nav>

            <p className="font-body text-sm text-white/85 text-center">
              &copy; {currentYear} {settings.name}
            </p>

          </div>
        </div>
      </div>
    </footer>
  );
}
