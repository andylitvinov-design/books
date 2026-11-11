import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import AutomationsBridge from './automations-bridge';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Agent Commander · защищённое соединение',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function BridgePage(){
 if(!await requireAdminRequest())redirect('/admin/login');
 return <AutomationsBridge/>;
}
