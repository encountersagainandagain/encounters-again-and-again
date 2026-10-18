import type {Metadata} from 'next';
import {PagePreviewFrame} from '@/components/admin/PagePreviewFrame';
import {ProtectedAdminRoute} from '@/components/admin/ProtectedAdminRoute';
export const metadata:Metadata={title:'Page preview',robots:{index:false,follow:false}};
// Opened only inside the page presentation editor: the public template with the unsaved draft.
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const {page='home'}=await searchParams;return <ProtectedAdminRoute><PagePreviewFrame pageKey={page}/></ProtectedAdminRoute>;}
