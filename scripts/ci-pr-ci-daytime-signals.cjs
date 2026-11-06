'use strict';
const SCHEMA='HH_CI_DAYTIME_SIGNALS_V1', OBS_SCHEMA='HH_CI_WATCHDOG_RUN_COUNTS_V1';
const OWNER='andylitvinov-design', ZONE='America/Toronto';
const count=x=>Number.isSafeInteger(x)&&x>=0;
const stamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
function daytime(iso){
 const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'2-digit',hourCycle:'h23',hour12:false}).format(new Date(iso)));
 return h>=8&&h<23;
}
function withoutCurrentWatchdog(total,rows,runId){
 if(!count(total))return {running:null,excluded:false};
 const self=Array.isArray(rows)&&Number.isSafeInteger(runId)&&rows.some(r=>r?.id===runId&&
  r?.status==='in_progress'&&r?.name==='HH PR 10-minute watchdog'&&
  r?.head_branch==='codex/bootstrap-books');
 return {running:self?Math.max(0,total-1):total,excluded:Boolean(self)};
}
function validPrevious(p){
 return !p||(p.schema===SCHEMA&&typeof p.armed==='boolean'&&count(p.highest_level)&&
 p.highest_level<=3&&count(p.last_running)&&count(p.last_queued)&&stamp(p.last_seen_at)&&
 (p.cycle_id===null||stamp(p.cycle_id))&&(!p.armed||p.cycle_id!==null));
}
function validObservation(o,now){
 if(!o||o.schema!==OBS_SCHEMA||!count(o.running)||!count(o.queued)||
 !stamp(o.observed_at)||!(o.other_pending==null||count(o.other_pending))||
 !Number.isFinite(now))return false;
 const age=now-Date.parse(o.observed_at);
 return age>=-120000&&age<=900000;
}
function levelOf(o){
 if(o.running>10)return 0;
 if(o.running>=5)return 1;
 if(o.running===0&&o.queued===0&&o.other_pending===0)return 3;
 return 2;
}
function needsZeroProof(prev,o,now){
 return validPrevious(prev)&&validObservation(o,now)&&prev?.armed===true&&
  prev.highest_level<3&&o.running===0&&o.queued===0&&
  daytime(o.observed_at)&&daytime(new Date(now).toISOString());
}
function evaluate(prev,o,now=Date.now()){
 if(!validPrevious(prev))return {status:'INVALID_PREVIOUS',state:null,alert:null};
 if(!validObservation(o,now))return {status:'UNKNOWN_OR_STALE',state:prev||null,alert:null};
 if(prev&&Date.parse(o.observed_at)<=Date.parse(prev.last_seen_at))
 return {status:'OLDER_OR_DUPLICATE',state:prev,alert:null};
 const newCycle=o.running>10&&(!prev||!prev.armed||prev.last_running<=10);
 const armed=newCycle?true:Boolean(prev?.armed);
 const cycle_id=newCycle?o.observed_at:(prev?.cycle_id||null);
 const oldLevel=newCycle?0:(prev?.highest_level||0);
 const level=levelOf(o),eligible=armed&&level>oldLevel;
 const quiet=!daytime(o.observed_at)||!daytime(new Date(now).toISOString());
 const next={schema:SCHEMA,armed,cycle_id,highest_level:eligible&&quiet?level:oldLevel,
  last_running:o.running,last_queued:o.queued,last_seen_at:o.observed_at};
 if(eligible&&!quiet){
  next.highest_level=level;
  return {status:'ALERT_CANDIDATE',state:next,
   alert:{level,running:o.running,queued:o.queued,other_pending:o.other_pending??null,
    observed_at:o.observed_at,cycle_id}};
 }
 return {status:eligible&&quiet?'QUIET_SUPPRESSED':!armed?'NOT_ARMED':'NO_NEW_LEVEL',
  state:next,alert:null};
}
function marker(a){
 if(!a||!stamp(a.cycle_id)||![1,2,3].includes(a.level))throw Error('INVALID_MARKER');
 return '<!-- HH_CI_DAYTIME_SIGNAL_V1 cycle='+a.cycle_id+' level='+a.level+' -->';
}
function renderAlert(a){
 if(!a||![1,2,3].includes(a.level)||!count(a.running)||!count(a.queued)||!stamp(a.observed_at))
  throw Error('INVALID_ALERT');
 const local=new Intl.DateTimeFormat('ru-RU',{timeZone:ZONE,year:'numeric',month:'2-digit',
  day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(a.observed_at));
 const title=a.level===3?'Все CI и очереди завершились':
  a.level===2?'Осталось меньше пяти CI':'Осталось не больше десяти CI';
 return marker(a)+'\n@'+OWNER+' '+('🔔'.repeat(a.level))+' **'+title+'**\n\n'+
 'Работают: **'+a.running+'** workflow; ожидают: **'+a.queued+'** workflow. '+
 (a.level===3?'Pending/waiting/requested = 0.':'Ожидающая очередь не означает завершение.')+
 '\n\nВремя: '+local+' (Торонто). [GitHub Actions](https://github.com/andylitvinov-design/books/actions) · '+
 '[PR Monitor](https://holistic-house-pr-monitor.vercel.app).\n\n'+
 '_Текущий достоверно опознанный Watchdog исключён из порогового счётчика; iOS выбирает реальный звук уведомления._';
}
async function verifyExtraPending(github){
 try{
  const totals=await Promise.all(['pending','waiting','requested'].map(async status=>
   (await github.rest.actions.listWorkflowRunsForRepo({
     owner:OWNER,repo:'books',status,per_page:1
   }))?.data?.total_count));
  return totals.every(count)?totals.reduce((a,b)=>a+b,0):null;
 }catch{return null;}
}
async function deliver({github,issue,prior,observation,nowMs=Date.now()}){
 const current=prior||null;
 if(!observation)return {status:'NO_OBSERVATION',state:current,alert:null};
 if(!validPrevious(current))return {status:'INVALID_PREVIOUS',state:current,alert:null};
 const obs={...observation};
 if(needsZeroProof(current,obs,nowMs))obs.other_pending=await verifyExtraPending(github);
 const result=evaluate(current,obs,nowMs);
 if(!result.alert)return result;
 if(!issue||!Number.isSafeInteger(issue.comments)||issue.comments<0)
  return {status:'UNVERIFIED_ISSUE_COMMENTS',state:current,alert:null};
 try{
  const page=Math.max(1,Math.ceil(issue.comments/100));
  const comments=(await github.rest.issues.listComments({
   owner:OWNER,repo:'books',issue_number:3128,per_page:100,page
  }))?.data;
  if(!Array.isArray(comments))throw Error('COMMENTS_UNVERIFIED');
  const key=marker(result.alert);
  const posted=comments.some(c=>c?.user?.login==='github-actions[bot]'&&
   typeof c.body==='string'&&c.body.includes(key));
  if(!posted)await github.rest.issues.createComment({
   owner:OWNER,repo:'books',issue_number:3128,body:renderAlert(result.alert)
  });
  return {...result,status:posted?'ALREADY_POSTED':'POSTED'};
 }catch{
  return {status:'DELIVERY_UNVERIFIED_RETRYABLE',state:current,alert:null};
 }
}
module.exports={SCHEMA,OBS_SCHEMA,daytime,withoutCurrentWatchdog,validObservation,
 validPrevious,needsZeroProof,evaluate,marker,renderAlert,verifyExtraPending,deliver};
