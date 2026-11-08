/** Owner-authored Cron Jobs: content, schedule and agent-skill bindings.
 * Instructions are DATA, never shell commands or new execution permissions.
 */
import {randomUUID} from 'node:crypto';
import {CRON_SKILLS,getCronSkill,SKILL_SCHEDULES,nextCronSkillDue} from './cron-skills.mjs';
const JOBS='app_private.cc_skill_jobs';
const EVENTS='app_private.cc_skill_events';
const ROLES=Object.freeze(['commander','analyst','engineering','marketing','education']);
const BRAINS=Object.freeze(['none','ai-projects-brain','agent-council']);
/** Role profiles are context settings, not connected execution adapters. */
export const CRON_AGENT_PROFILES=Object.freeze([
 {id:'commander',name:'Commander',description:'Координация и приоритеты',aiRunnerConnected:false},
 {id:'analyst',name:'Аналитик',description:'Анализ PR и метрик',aiRunnerConnected:false},
 {id:'engineering',name:'Инженер',description:'Код и проверки CI',aiRunnerConnected:false},
 {id:'marketing',name:'Маркетолог',description:'Маркетинговый анализ',aiRunnerConnected:false},
 {id:'education',name:'Образование',description:'Курсы и обучение',aiRunnerConnected:false}
]);
const SAFE_KINDS=Object.freeze(['builtin','blocked_no_runner']);
export const CRON_SYSTEM_JOBS=Object.freeze([
 {id:'vercel:direct-message-push',title:'Direct message push + Command Center tick',schedule:'*/5 * * * *',source:'Vercel',editable:false,description:'Системное восстановление сообщений и общий тик Commander'},
 {id:'vercel:housekeeping',title:'Housekeeping',schedule:'0 5 * * *',source:'Vercel',editable:false,description:'Существующая системная уборка'},
 {id:'vercel:video-scout-hourly',title:'Video Scout',schedule:'17 * * * *',source:'Vercel',editable:false,description:'Существующий сбор видео'},
 {id:'vercel:practice-telegram-digest',title:'Practice Telegram digest',schedule:'0 13,14,19,20 * * *',source:'Vercel',editable:false,description:'Существующий дайджест практики'},
 {id:'vercel:council-archive-telegram',title:'Council archive',schedule:'0 16,17 * * *',source:'Vercel',editable:false,description:'Существующее архивирование Совета'},
 {id:'vercel:market-intel-telegram',title:'Market Intel',schedule:'0 18,19 * * *',source:'Vercel',editable:false,description:'Существующие рыночные обзоры'},
 {id:'vercel:revenue-ideas-telegram',title:'Revenue ideas',schedule:'0 13,14 * * *',source:'Vercel',editable:false,description:'Существующие рекомендации выручки'}
]);
export const CRON_BRAIN_SOURCES=Object.freeze([
 {id:'none',name:'Без памяти',available:true},
 {id:'ai-projects-brain',name:'AI Projects Brain · проектная память',available:true,
  url:'https://github.com/andylitvinov-design/ai-projects-brain'},
 {id:'agent-council',name:'AI Council · обсуждение задачи',available:false}
]);
const uid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const trim=(v,max)=>typeof v==='string'?v.trim().slice(0,max+1):'';
export function sanitizeAutomation(input,{mode='create'}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const title=trim(input.title,120),instruction=trim(input.instruction,6000);
 if(title.length<6||title.length>120||instruction.length<20||instruction.length>6000)return null;
 const schedule=input.schedule;
 if(!SKILL_SCHEDULES.includes(schedule))return null;
 if(!BRAINS.includes(input.brainScope)||!ROLES.includes(input.agentRole))return null;
 if(!Array.isArray(input.skillIds)||input.skillIds.length>8)return null;
 if(input.skillIds.some(x=>typeof x!=='string'||!getCronSkill(x)))return null;
 const skillIds=[...new Set(input.skillIds)];
 if(skillIds.length>8)return null;
 if(mode==='edit'&&(!uid(input.jobId)||!Number.isInteger(input.expectedRevision)||
   input.expectedRevision<0||input.expectedRevision>1000000))return null;
 if(mode==='create'&&input.enabled===true)return null;
 if(mode==='edit'&&typeof input.enabled!=='boolean')return null;
 return {title,instruction,schedule,brainScope:input.brainScope,agentRole:input.agentRole,
  skillIds,enabled:mode==='edit'?input.enabled:false,
  ...(mode==='edit'?{jobId:input.jobId,expectedRevision:input.expectedRevision}:{})};
}
export function automationRuntime(job){
 if(job?.execution_mode==='builtin'&&getCronSkill(job.skill_id)?.runnable)return 'builtin_readonly';
 return 'blocked_no_runner';
}
/** Owner-only CAS role update; cannot change instructions, schedule or execution. */
export async function assignAutomationAgent(db,input,requestId){
 if(!input||!uid(input.jobId)||!uid(requestId)||!ROLES.includes(input.agentRole)||
  !Number.isInteger(input.expectedRevision)||input.expectedRevision<0||
  input.expectedRevision>1000000)return {status:'invalid'};
 const selected=await db.query(`SELECT id,skill_id,agent_role,execution_mode,revision,lease_until
  FROM ${JOBS} WHERE id=$1 FOR UPDATE`,[input.jobId]);
 const job=selected.rows[0];
 if(!job)return {status:'not_found'};
 if(job.revision!==input.expectedRevision)return {status:'revision_conflict',currentRevision:job.revision};
 if(job.lease_until&&new Date(job.lease_until).getTime()>Date.now())return {status:'running'};
 const runtime=automationRuntime(job);
 if(job.agent_role===input.agentRole)return {status:'unchanged',job,runtime};
 if(!await record(db,requestId,job.skill_id))return {status:'already_recorded'};
 const changed=await db.query(`UPDATE ${JOBS} SET agent_role=$2,revision=revision+1,updated_at=now()
  WHERE id=$1 AND revision=$3 AND (lease_until IS NULL OR lease_until<=now())
  RETURNING id,skill_id,agent_role,execution_mode,revision`,
  [input.jobId,input.agentRole,input.expectedRevision]);
 return changed.rows.length?{status:'agent_assigned',job:changed.rows[0],runtime}:{status:'revision_conflict'};
}
export function detectScheduleFromText(value){
 const text=typeof value==='string'?value.toLowerCase():'';
 if(/кажд(?:ые|ые\s+)\s*10\s*мин|every\s*10\s*min/.test(text))return '10m';
 if(/кажд(?:ые|ые\s+)\s*30\s*мин|every\s*30\s*min/.test(text))return '30m';
 if(/кажд(?:ый|ую)\s*час|hourly|every hour/.test(text))return 'hourly';
 if(/понедельник|по понедельник|monday|weekly/.test(text))return 'weekly_mon_9';
 if(/кажд(?:ый|ое|ое)\s*(?:утр|день)|ежеднев|daily|every day/.test(text))return 'daily_9';
 return null;
}
export function suggestSkillIdsFromText(value){
 const text=typeof value==='string'?value.toLowerCase():'';
 const matches=[
 [/pr|пиар|pull request|мерж|github/,['pr.queue-reconcile','task.stall-watchdog']],
 [/ci|тест|pipeline|ошибк|сбой/,['ci.exact-head-diagnose','agents.health-lease']],
 [/бюджет|расход|счёт|лимит|cost|budget/,['cost.budget-guard']],
 [/отчёт|сводк|бриф|summary|report/,['report.morning-brief']],
 [/маркетинг|клиент|продаж|seo|marketing/,['marketing.advisor','seo.opportunities']]
 ];
 return [...new Set(matches.flatMap(([pattern,ids])=>pattern.test(text)?ids:[]))].slice(0,8);
}
async function record(db,requestId,skillId){
 if(!uid(requestId))return false;
 const r=await db.query(`INSERT INTO ${EVENTS}(request_id,skill_id,action)
  VALUES($1,$2,'configure') ON CONFLICT DO NOTHING RETURNING request_id`,[requestId,skillId]);
 return r.rows.length===1;
}
export async function createAutomation(db,input,requestId){
 const data=sanitizeAutomation(input);
 if(!data||!uid(requestId))return {status:'invalid'};
 const count=await db.query(`SELECT count(*)::int AS total FROM ${JOBS}`);
 if(Number(count.rows[0]?.total||0)>=40)return {status:'limit'};
 const skillId='custom.'+randomUUID().replace(/-/g,'').slice(0,20);
 if(!await record(db,requestId,skillId))return {status:'already_recorded'};
 const next=nextCronSkillDue(data.schedule);
 const out=await db.query(`INSERT INTO ${JOBS}
 (skill_id,project_key,schedule,enabled,next_due_at,title,instruction,skill_ids,brain_scope,agent_role,execution_mode)
 VALUES($1,'holistichouse',$2,false,$3,$4,$5,$6::jsonb,$7,$8,'blocked_no_runner')
 RETURNING id,skill_id,title,instruction,schedule,enabled,skill_ids,brain_scope,
 agent_role,execution_mode,revision,next_due_at`,
 [skillId,data.schedule,next,data.title,data.instruction,JSON.stringify(data.skillIds),data.brainScope,data.agentRole]);
 return {status:'created_draft',job:out.rows[0],runtime:'blocked_no_runner'};
}
export async function updateAutomation(db,input,requestId){
 const data=sanitizeAutomation(input,{mode:'edit'});
 if(!data||!uid(requestId))return {status:'invalid'};
 const selected=await db.query(`SELECT id,skill_id,execution_mode,revision,lease_until,enabled FROM ${JOBS}
 WHERE id=$1 FOR UPDATE`,[data.jobId]);
 const prev=selected.rows[0];
 if(!prev)return {status:'not_found'};
 if(prev.revision!==data.expectedRevision)return {status:'revision_conflict',currentRevision:prev.revision};
 if(prev.lease_until&&new Date(prev.lease_until).getTime()>Date.now())return {status:'running'};
 const runtime=automationRuntime(prev);
 if(data.enabled&&runtime!=='builtin_readonly')return {status:'blocked_no_runner'};
 if(!await record(db,requestId,prev.skill_id))return {status:'already_recorded'};
 const next=nextCronSkillDue(data.schedule);
 const out=await db.query(`UPDATE ${JOBS} SET title=$2,instruction=$3,
 schedule=$4,enabled=$5,next_due_at=$6,skill_ids=$7::jsonb,brain_scope=$8,
 agent_role=$9,revision=revision+1,updated_at=now()
 WHERE id=$1 AND revision=$10 AND lease_until IS NULL
 RETURNING id,skill_id,title,instruction,schedule,enabled,skill_ids,
 brain_scope,agent_role,execution_mode,revision,next_due_at`,
 [data.jobId,data.title,data.instruction,data.schedule,data.enabled,next,
 JSON.stringify(data.skillIds),data.brainScope,data.agentRole,data.expectedRevision]);
 if(!out.rows.length)return {status:'revision_conflict'};
 return {status:'updated',job:out.rows[0],runtime};
}
