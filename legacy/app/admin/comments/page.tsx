import type { Metadata } from 'next';
import { AdminComments } from '@/components/admin/AdminComments';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Comments',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminCommentsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminComments />
    </ProtectedAdminRoute>
  );
}
