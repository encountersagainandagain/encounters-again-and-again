import type { Metadata } from 'next';
import { AdminPostForm } from '@/components/admin/AdminPostForm';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

type EditAdminPostRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Post',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditAdminPostPage({ params }: EditAdminPostRouteProps) {
  const { id } = await params;

  return (
    <ProtectedAdminRoute>
      <AdminShell><AdminPostForm id={id} /></AdminShell>
    </ProtectedAdminRoute>
  );
}
