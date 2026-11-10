import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig} from '@/lib/app/config';
import {transaction,closeDatabase} from '@/lib/app/database';
import {readCommandSnapshot} from '@/lib/command-center/store.mjs';
import {CC_AGENT_REGISTRY} from '@/lib/command-center/contracts.mjs';
import {uiLocaleCookie} from '@/lib/ui-locale';
import CommandCenterMobile from './command-center-mobile';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Command Center · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer',manifest:'/command-center.webmanifest',appleWebApp:{capable:true,title:'HH Command Center',statusBarStyle:'black-translucent'}};

/** Owner-only mobile-first PWA view, scoped dark UI approved for Command Center.
 * Task, runner and LIVE statuses are read from authoritative receipts, never fabricated.
 */
export default async function CommandCenterPage(){
  if(!await requireAdminRequest())redirect('/admin/login');
  const value=(await cookies()).get(uiLocaleCookie)?.value;
  const lang=value==='en'?'en':value==='es'?'es':'ru';
  let snapshot=null;
  try{
    snapshot=await transaction(getAppConfig(),null,(db: unknown)=>readCommandSnapshot(db),{server:true});
  }catch{
    snapshot=null; // Missing migration or backend -> visible UNKNOWN, no fake zeros.
  }finally{
    await closeDatabase();
  }
  return <CommandCenterMobile
    lang={lang}
    initialSnapshot={snapshot}
    registry={[...CC_AGENT_REGISTRY]}
    envReady={process.env.VERCEL_ENV==='production'&&process.env.HH_CC_TICK_ENABLED==='true'}
  />;
}
