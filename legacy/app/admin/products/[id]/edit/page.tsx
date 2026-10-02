import type { Metadata } from 'next';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

type EditAdminProductRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Edit Product',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EditAdminProductPage({
  params,
}: EditAdminProductRouteProps) {
  const { id } = await params;

  return (
    <ProtectedAdminRoute>
      <AdminProductForm id={id} />
    </ProtectedAdminRoute>
  );
}
