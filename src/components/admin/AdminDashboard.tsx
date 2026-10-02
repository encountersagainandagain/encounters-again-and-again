'use client';
import Link from 'next/link';
import { modules } from '@/config/modules';
export function AdminDashboard() {
  const items = [
    { enabled: modules.cms, href: '/admin/posts', label: 'Content and media' },
    { enabled: modules.cms, href: '/admin/settings', label: 'Site settings' },
    { enabled: modules.newsletter, href: '/admin/newsletter', label: 'Newsletter' },
  ];
  return <section className="section-padding py-12"><h1 className="font-display text-4xl">Encounters administration</h1>
    <nav aria-label="Administration" className="mt-8 flex flex-wrap gap-6">{items.filter(i => i.enabled).map(i => <Link key={i.href} href={i.href}>{i.label}</Link>)}</nav>
  </section>;
}
