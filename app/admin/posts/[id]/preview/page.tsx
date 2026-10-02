import type { Metadata } from 'next';
import { AdminPostPreview } from '@/components/admin/AdminPostPreview';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

type PreviewAdminPostRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Preview Post',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PreviewAdminPostPage({ params }: PreviewAdminPostRouteProps) {
  const { id } = await params;

  return (
    <ProtectedAdminRoute>
      <AdminPostPreview id={id} />
    </ProtectedAdminRoute>
  );
}
