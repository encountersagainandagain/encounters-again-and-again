import type { Metadata } from 'next';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'New Product',
  robots: {
    index: false,
    follow: false,
  },
};

type NewAdminProductPageProps = {
  searchParams: Promise<{
    copyFrom?: string;
  }>;
};

export default async function NewAdminProductPage({ searchParams }: NewAdminProductPageProps) {
  const { copyFrom } = await searchParams;

  return (
    <ProtectedAdminRoute>
      <AdminProductForm copyFromId={copyFrom} />
    </ProtectedAdminRoute>
  );
}
