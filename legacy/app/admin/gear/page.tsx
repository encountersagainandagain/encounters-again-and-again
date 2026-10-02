import type { Metadata } from 'next';
import { AdminGear } from '@/components/admin/AdminGear';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin My Gear',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminGearPage() {
  return (
    <ProtectedAdminRoute>
      <AdminGear />
    </ProtectedAdminRoute>
  );
}
