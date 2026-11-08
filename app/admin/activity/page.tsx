import type { Metadata } from 'next';
import { AdminActivity } from '@/components/admin/AdminActivity';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: 'Admin Activity', robots: { index: false, follow: false } };

export default function AdminActivityPage() {
  return <ProtectedAdminRoute><AdminShell><AdminActivity /></AdminShell></ProtectedAdminRoute>;
}
