import type { Metadata } from 'next';
import { AdminNewsletter } from '@/components/admin/AdminNewsletter';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Newsletter',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminNewsletterPage() {
  return (
    <ProtectedAdminRoute>
      <AdminNewsletter />
    </ProtectedAdminRoute>
  );
}
