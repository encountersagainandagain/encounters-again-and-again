import type { Metadata } from 'next';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShopDisputePlaybook } from '@/components/admin/shop-disputes/AdminShopDisputePlaybook';

export const metadata: Metadata = {
  title: 'Shop Dispute Playbook',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminShopDisputesPage() {
  return (
    <ProtectedAdminRoute>
      <AdminShopDisputePlaybook />
    </ProtectedAdminRoute>
  );
}
