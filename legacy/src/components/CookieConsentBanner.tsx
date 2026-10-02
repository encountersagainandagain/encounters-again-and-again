'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

const CONSENT_STORAGE_KEY = 'what-katie-seas-cookie-consent-v1';
const CONSENT_EVENT_NAME = 'what-katie-seas-cookie-consent';

type CookieConsentValue = 'accepted' | 'rejected';
type CookieConsentSnapshot = CookieConsentValue | null | 'loading';

function readConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === 'accepted' || value === 'rejected' ? value : null;
}

function saveConsent(value: CookieConsentValue) {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: value }));
}

export function getCookieConsentForBrowser() {
  return readConsent();
}

export function subscribeCookieConsent(listener: () => void) {
  window.addEventListener(CONSENT_EVENT_NAME, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(CONSENT_EVENT_NAME, listener);
    window.removeEventListener('storage', listener);
  };
}

export function resetCookieConsentForBrowser() {
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME));
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const consent = useSyncExternalStore<CookieConsentSnapshot>(
    subscribeCookieConsent,
    getCookieConsentForBrowser,
    () => 'loading'
  );

  if (consent === 'loading' || consent || pathname.startsWith('/admin')) return null;

  const chooseConsent = (value: CookieConsentValue) => {
    saveConsent(value);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-4xl border border-black/10 bg-white p-5 shadow-2xl md:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="font-display text-2xl text-black">Cookies & analytics</p>
          <p className="mt-2 font-body text-sm leading-relaxed text-black/65">
            We use optional analytics and marketing cookies to understand visits and improve the
            site. You can accept them or continue without them.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => chooseConsent('rejected')}
            className="border border-black/15 px-5 py-3 font-body text-sm uppercase tracking-[0.14em] text-black/70 transition-colors hover:border-black hover:text-black"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => chooseConsent('accepted')}
            className="bg-ocean px-5 py-3 font-body text-sm uppercase tracking-[0.14em] text-white transition-colors hover:bg-ocean-dark"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
