import type { Metadata } from 'next';
import { ContentCollection } from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
import { NewsletterSignup } from '@/components/public/NewsletterSignup';
import { modules } from '@/config/modules';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default function HomePage() {
  return <><ContentCollection section="home" title="Encounters Again and Again" />{modules.newsletter && <NewsletterSignup />}</>;
}
