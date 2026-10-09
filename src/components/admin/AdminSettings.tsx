'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { defaultSiteSettings, fetchSiteSettings, updateSiteSettings } from '@/lib/siteSettings';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import {HomeSettings} from './HomeSettings';
import {EditorialSettings} from './EditorialSettings';
const fields = [
  ['name', 'Site name'], ['tagline', 'Tagline'], ['description', 'Description'],
  ['email', 'Public contact email'], ['instagram', 'Instagram'], ['youtube', 'YouTube'],
  ['homeAboutTitle', 'About title'], ['homeAboutParagraph1', 'About introduction'],
] as const;
export function AdminSettings() {
  const [settings, setSettings] = useState(defaultSiteSettings);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Loading settings…');
  useEffect(() => { let live = true; fetchSiteSettings().then(data => {
    if (live) { setSettings(data); setReady(true); setMessage(''); }
  }).catch(() => { if (live) setMessage('Settings could not be loaded. Check the project configuration.'); });
    return () => { live = false; };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!ready) return;
    try { await updateSiteSettings(settings); await requestAdminRevalidation({ scope: 'settings' }); setMessage('Settings saved.'); }
    catch { setMessage('Settings could not be saved.'); }
  }
  return <section className="section-padding py-12"><Link href="/admin">Administration</Link><h1 className="font-display text-4xl">Site settings</h1>
    <form onSubmit={save} className="mt-8 grid max-w-2xl gap-5">{fields.map(([key,label]) => <label key={key}>{label}
      <input type={key === 'email' ? 'email' : 'text'} value={settings[key]} onChange={event => setSettings({...settings, [key]:event.target.value})} className="block w-full border p-3 text-black" />
    </label>)}<button disabled={!ready} className="btn-ocean" type="submit">Save settings</button><p role="status">{message}</p></form><EditorialSettings/><HomeSettings/>
  </section>;
}
