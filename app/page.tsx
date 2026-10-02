import type { Metadata } from 'next';
import { PreparationPage } from '@/components/public/PreparationPage';
import { NewsletterSignup } from '@/components/public/NewsletterSignup';
import { modules } from '@/config/modules';
export const metadata: Metadata = { alternates: { canonical: '/' } };
export default function HomePage() {
  return <><PreparationPage title="Art, ocean, education and conservation" />{modules.newsletter && <NewsletterSignup />}</>;
}
