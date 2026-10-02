'use client';

import { resetCookieConsentForBrowser } from '@/components/CookieConsentBanner';

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={resetCookieConsentForBrowser}
      className="font-body text-xs text-white/85 transition-colors hover:text-white"
    >
      Cookie Settings
    </button>
  );
}
