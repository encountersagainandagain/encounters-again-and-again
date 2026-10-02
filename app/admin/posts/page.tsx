import type { Metadata } from 'next';
import { AdminPosts } from '@/components/admin/AdminPosts';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Posts',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPostsPage() {
  return (
    <ProtectedAdminRoute>
      <AdminPosts />
    </ProtectedAdminRoute>
  );
}
