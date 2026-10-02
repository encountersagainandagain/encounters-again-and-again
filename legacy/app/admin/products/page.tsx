import type { Metadata } from 'next';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Products',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminProductsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminProducts />
    </ProtectedAdminRoute>
  );
}
