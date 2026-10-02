import type { Metadata } from 'next';
import { AdminLinkAudit } from '@/components/admin/AdminLinkAudit';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';

export const metadata: Metadata = {
  title: 'Admin Link Audit',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLinkAuditPage() {
  return (
    <ProtectedAdminRoute>
      <AdminLinkAudit />
    </ProtectedAdminRoute>
  );
}
