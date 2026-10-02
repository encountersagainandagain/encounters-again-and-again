import type { Metadata } from 'next';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Orders',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminOrdersPage() {
  return (
    <ProtectedAdminRoute>
      <AdminOrders />
    </ProtectedAdminRoute>
  );
}
