'use client';

import { useEffect, useState } from 'react';
import { defaultSiteSettings, fetchSiteSettings, type SiteSettings } from '@/lib/siteSettings';

type SiteSettingsContextValue = {
  settings: SiteSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useSiteSettings() {
  return useSiteSettingsState().settings;
}

export function useSiteSettingsState() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshStandalone(isMounted: () => boolean) {
    setIsLoading(true);

    try {
      const nextSettings = await fetchSiteSettings();
      if (isMounted()) setSettings(nextSettings);
    } catch (error) {
      console.error('Unable to load site settings', error);
    } finally {
      if (isMounted()) setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    void refreshStandalone(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    settings,
    isLoading,
    refresh: () => refreshStandalone(() => true),
  } satisfies SiteSettingsContextValue;
}
