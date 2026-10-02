import type { Metadata } from 'next';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

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
      <AdminSettings />
    </ProtectedAdminRoute>
  );
}
