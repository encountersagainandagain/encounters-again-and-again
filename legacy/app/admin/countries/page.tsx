import type { Metadata } from 'next';
import { AdminCountries } from '@/components/admin/AdminCountries';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Country Pages',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminCountriesPage() {
  return (
    <ProtectedAdminRoute>
      <AdminCountries />
    </ProtectedAdminRoute>
  );
}
