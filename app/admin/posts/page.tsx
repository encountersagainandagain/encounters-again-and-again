import type { Metadata } from 'next';
import { AdminPosts } from '@/components/admin/AdminPosts';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

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
      <AdminShell><AdminPosts /></AdminShell>
    </ProtectedAdminRoute>
  );
}
