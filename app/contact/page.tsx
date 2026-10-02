import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { isSupabaseConfigured } from '@/lib/supabase';
export const metadata = { title: 'Contact', alternates: { canonical: '/contact' } };
export default async function ContactPage() {
  const settings = isSupabaseConfigured ? await fetchSiteSettings() : defaultSiteSettings;
  return <section className="enc-preparation"><h1>Contact</h1>{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : <p>Contact details will be available soon.</p>}</section>;
}
