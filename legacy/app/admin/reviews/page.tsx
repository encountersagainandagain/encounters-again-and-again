import type { Metadata } from 'next';
import { AdminProductReviews } from '@/components/admin/AdminProductReviews';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Reviews',
  robots: { index: false, follow: false },
};

export default function AdminReviewsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminProductReviews />
    </ProtectedAdminRoute>
  );
}
