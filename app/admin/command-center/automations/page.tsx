import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {cookies} from 'next/headers';
import {uiLocaleCookie} from '@/lib/ui-locale';
import AutomationManager from './automation-manager';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Автоматизации · Agent Commander',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function AutomationsPage(){
 if(!await requireAdminRequest())redirect('/admin/login');
 const lang=(await cookies()).get(uiLocaleCookie)?.value;
 return <AutomationManager lang={lang==='en'?'en':lang==='es'?'es':'ru'}/>;
}
