import type { Metadata } from 'next';
import { AdminCollections } from '@/components/admin/AdminCollections';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Collections',
  robots: { index: false, follow: false },
};

export default function AdminCollectionsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminCollections />
    </ProtectedAdminRoute>
  );
}
