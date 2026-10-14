import type { Metadata } from 'next';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin Settings',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSettingsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminShell><AdminSettings /></AdminShell>
    </ProtectedAdminRoute>
  );
}
