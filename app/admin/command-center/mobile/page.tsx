import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig} from '@/lib/app/config';
import {transaction,closeDatabase} from '@/lib/app/database';
import {readCommandSnapshot} from '@/lib/command-center/store.mjs';
import {CC_AGENT_REGISTRY} from '@/lib/command-center/contracts.mjs';
import {uiLocaleCookie} from '@/lib/ui-locale';
import AgentStudio from './agent-studio';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Agent Studio · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'};
type Lang='en'|'ru'|'es';
type Snapshot={
 observedAt:string;settings:{enabled:boolean;max_runs_per_day:number}|null;
 projects:Array<{id:string;title:string;state:string}>;
 tasks:Array<{id:string;title:string;description:string;kind:string;state:string;priority:number;source_ref:string|null;auto_allowed:boolean;attempt_count:number}>;
 runs:Array<{id:string;worker_id:string;state:string;error_code:string|null;started_at:string}>;
 evidence:Array<{run_id:string;evidence_kind:string;source_url:string;created_at:string}>;
 slots:Array<{slot_utc:string;state:string;last_error:string|null}>;
 brief:{total:number;active:number;verified:number;blocked:number};
 dailyReport:{date_utc:string}|null;partial:boolean;
};
export default async function AgentStudioMobile(){
 if(!await requireAdminRequest())redirect('/admin/login');
 const locale=(await cookies()).get(uiLocaleCookie)?.value;
 const lang:Lang=locale==='es'?'es':locale==='en'?'en':'ru';
 let snapshot:Snapshot|null=null;
 try{snapshot=await transaction(getAppConfig(),null,(db:unknown)=>readCommandSnapshot(db),{server:true}) as Snapshot;}
 catch{snapshot=null;}finally{await closeDatabase();}
 const agents=CC_AGENT_REGISTRY.map(a=>({id:a.id,role:a.role,status:a.status,runtime:a.runtime,capabilities:[...a.capabilities],maxConcurrency:a.maxConcurrency}));
 const payload=snapshot?{
   observedAt:snapshot.observedAt,
   settings:snapshot.settings?{enabled:snapshot.settings.enabled,maxRuns:snapshot.settings.max_runs_per_day}:null,
   projects:snapshot.projects.map(p=>({id:p.id,title:p.title,state:p.state})),
   tasks:snapshot.tasks.map(t=>({id:t.id,title:t.title,description:t.description,kind:t.kind,state:t.state,priority:t.priority,sourceRef:t.source_ref,autoAllowed:t.auto_allowed,attemptCount:t.attempt_count})),
   runs:snapshot.runs.map(r=>({id:r.id,worker:r.worker_id,state:r.state,errorCode:r.error_code,startedAt:r.started_at})),
   evidence:snapshot.evidence.map(e=>({id:e.run_id,kind:e.evidence_kind,source:e.source_url,createdAt:e.created_at})),
   slots:snapshot.slots.map(s=>({time:s.slot_utc,state:s.state,error:s.last_error})),
   brief:snapshot.brief,reportDate:snapshot.dailyReport?.date_utc||null,partial:snapshot.partial
 }:null;
 const runtimeReady=process.env.VERCEL_ENV==='production'&&process.env.HH_CC_TICK_ENABLED==='true';
 return <AgentStudio lang={lang} snapshot={payload} agents={agents} runtimeReady={runtimeReady}/>;
}
