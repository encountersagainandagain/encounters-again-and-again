import type { Metadata } from 'next';
import { AdminProviders } from '@/components/admin/AdminProviders';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Providers',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminProvidersPage() {
  return (
    <ProtectedAdminRoute>
      <AdminProviders />
    </ProtectedAdminRoute>
  );
}

