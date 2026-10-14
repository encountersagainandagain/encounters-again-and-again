import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <ProtectedAdminRoute>
      <AdminShell><AdminDashboard /></AdminShell>
    </ProtectedAdminRoute>
  );
}
