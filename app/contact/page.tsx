import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { isSupabaseConfigured } from '@/lib/supabase';
import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata = { title: 'Contact', alternates: { canonical: '/contact' } };
export default async function ContactPage() {
  const settings = isSupabaseConfigured ? await fetchSiteSettings() : defaultSiteSettings;
  return <><ContentCollection section="contact" title="Contact"/><section className="enc-preparation">{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : <p>Contact details will be available soon.</p>}</section></>;
}
