import type {Metadata} from 'next';
import {AdminShell} from '@/components/admin/AdminShell';
import {PageSettings} from '@/components/admin/PageSettings';
import {ProtectedAdminRoute} from '@/components/admin/ProtectedAdminRoute';
export const metadata:Metadata={title:'Page presentation',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const {page='home'}=await searchParams;return <ProtectedAdminRoute><AdminShell><PageSettings key={page} pageKey={page}/></AdminShell></ProtectedAdminRoute>;}
