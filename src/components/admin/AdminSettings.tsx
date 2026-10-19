'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { defaultSiteSettings, fetchSiteSettings, updateSiteSettings } from '@/lib/siteSettings';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import {EditorialSettings} from './EditorialSettings';
import {AdminHeader} from './AdminShell';
const notes: Record<string,string> = { name:'Shown in the browser tab and when pages are shared.', tagline:'Short phrase that accompanies the name.', description:'One or two sentences used when the site is shared or found in search.', email:'Address shown to visitors who want to write to you, and where the contact form opens an email. Leave empty to hide it.', phone:'Shown on About as written, e.g. +61 451 544 843. Leave empty to hide it.', whatsapp:'Number in international format, e.g. +61 451 544 843. Shown on Contact and About as “Message us”, which opens WhatsApp. Leave empty to hide it.', donationUrl:'Full https:// address of the page where people can donate (for example a fundraiser). Shown on Contact and About. Leave empty to hide it.', donationLabel:'Text of the donation link. Empty: “Support the project”.', instagram:'Full address of the profile, starting with https://.', youtube:'Full address of the channel, starting with https://.', homeAboutTitle:'Title of the About section on Home.', homeAboutParagraph1:'Short introduction for the About section on Home.' };
const fields = [
  ['name', 'Site name'], ['tagline', 'Tagline'], ['description', 'Description'],
  ['email', 'Public contact email'], ['phone', 'Public phone'], ['whatsapp', 'WhatsApp number'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['donationUrl', 'Donation page'], ['donationLabel', 'Donation link text'],
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
  return <div className="adm-stack"><AdminHeader kicker="Site" title="Site settings" lead="General information, contact details and how some pages are presented."/>
    <form onSubmit={save} className="adm-card"><div className="adm-card-head"><div><h2 className="adm-card-title">General and contact</h2><p>Used across the whole site.</p></div></div>
      <div className="adm-fields">{fields.map(([key,label]) => <label key={key} className={`adm-field${key==='description'?' adm-field--wide':''}`}>{label}
      <input type={key === 'email' ? 'email' : 'text'} value={settings[key]} onChange={event => setSettings({...settings, [key]:event.target.value})} aria-describedby={`setting-${key}`} />
      <small id={`setting-${key}`}>{notes[key]}</small></label>)}</div>
      <div className="adm-actions" style={{marginTop:18}}><button disabled={!ready} className="adm-btn" type="submit">Save settings</button><p role="status" className="adm-help">{message}</p></div></form><EditorialSettings/><p className="adm-help">Home, About, Contact and the program pages are presented from <a href="/admin/page-settings?page=home">Page presentation</a>.</p>
  </div>;
}
