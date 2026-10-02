import type { Metadata } from 'next';
import { AdminGallery } from '@/components/admin/AdminGallery';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Gallery',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminGalleryPage() {
  return (
    <ProtectedAdminRoute>
      <AdminGallery />
    </ProtectedAdminRoute>
  );
}
