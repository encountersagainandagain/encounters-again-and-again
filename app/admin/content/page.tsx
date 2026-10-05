import {ProtectedAdminRoute} from '@/components/admin/ProtectedAdminRoute';
import {EncountersCms} from '@/components/admin/EncountersCms';
export default function Page(){return <ProtectedAdminRoute><EncountersCms/></ProtectedAdminRoute>;}
