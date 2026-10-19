import type { Metadata } from 'next';
import { AdminNewsletter } from '@/components/admin/AdminNewsletter';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin Newsletter',
  robots: {
    index: false,
    follow: false,
  },
};

// Delivery stays off until the sending domain is verified and an authorized test is done (same flag the
// send route checks). The page says so instead of letting the button fail.
export default function AdminNewsletterPage() {
  return (
    <ProtectedAdminRoute>
      <AdminShell><AdminNewsletter sendingEnabled={process.env.ENCOUNTERS_EMAIL_ENABLED === 'true'} /></AdminShell>
    </ProtectedAdminRoute>
  );
}
