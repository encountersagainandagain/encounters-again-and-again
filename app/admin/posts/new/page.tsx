import type { Metadata } from 'next';
import { AdminPostForm } from '@/components/admin/AdminPostForm';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'New Post',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewAdminPostPage() {
  return (
    <ProtectedAdminRoute>
      <AdminShell><AdminPostForm /></AdminShell>
    </ProtectedAdminRoute>
  );
}
