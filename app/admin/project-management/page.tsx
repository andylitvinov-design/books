import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {uiLocaleCookie} from '@/lib/ui-locale';
import {transaction,closeDatabase} from '@/lib/app/database';
import {getAppConfig} from '@/lib/app/config';
import {readProjectManagement} from '@/lib/project-management/store.mjs';
import ProjectManagementClient from './project-management-client';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Project Management · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ProjectManagementPage(){
 if(!await requireAdminRequest())redirect('/admin/login');
 const selected=(await cookies()).get(uiLocaleCookie)?.value;
 const lang=selected==='en'?'en':selected==='es'?'es':'ru';
 let snapshot=null;
 try{snapshot=await transaction(getAppConfig(),null,(db: unknown)=>readProjectManagement(db),{server:true});}
 catch{snapshot=null;} // Migration/backend unavailable => unknown, not fabricated empty.
 finally{await closeDatabase();}
 return <ProjectManagementClient lang={lang} initialSnapshot={snapshot}/>;
}