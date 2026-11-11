import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import CronSkillsPanel from './cron-skills-panel';
import {cookies} from 'next/headers';
import {uiLocaleCookie} from '@/lib/ui-locale';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Cron Skills · Agent Commander',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function CronSkillsPage(){
 if(!await requireAdminRequest())redirect('/admin/login');
 const value=(await cookies()).get(uiLocaleCookie)?.value;
 const lang=value==='en'?'en':value==='es'?'es':'ru';
 return <CronSkillsPanel lang={lang}/>;
}
