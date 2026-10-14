import {ProtectedAdminRoute} from '@/components/admin/ProtectedAdminRoute';
import {AdminShell} from '@/components/admin/AdminShell';
import {EncountersCms} from '@/components/admin/EncountersCms';
export default function Page(){return <ProtectedAdminRoute><AdminShell><EncountersCms/></AdminShell></ProtectedAdminRoute>;}
