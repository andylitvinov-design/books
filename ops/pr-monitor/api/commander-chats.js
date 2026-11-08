'use strict';
/* HH_COMMANDER_THREADS_V1. Same-origin owner API; private GitHub Issues store.
 * One issue per chat, append-only comment events. No public chat storage,
 * no agent dispatch, no paid provider and no self-certified LIVE state.
 */
const drafts=require('./commander-drafts.js');
const core=drafts.__private;
const unpackTask=drafts.__test.unpack;
const {reporter}=require('./pm-agent-chat.js').__test;
const MARK='HH_COMMANDER_THREAD_V1', EVENT='HH_COMMANDER_EVENT_V1';
const PUBLIC='https://api.github.com/repos/andylitvinov-design/books';
const PROJECTS=new Set(['commander','holistic','video','other']);
const EXECUTORS=new Set(['local','openrouter','codex','chatgpt-work','repair-worker','hermes','manual']);
const STATES=new Set(['planned','assigned','working','review','blocked','archived']);
const clean=(v,n)=>String(v||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const respond=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(value))};
const number=v=>Number.isSafeInteger(Number(v))&&Number(v)>0&&Number(v)<100000?Number(v):null;
function normalize(value,previous){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_CHAT_RECORD');
 const id=previous?.id||value.id;
 if(!uuid(id)||(previous&&value.id!==id))throw Error('INVALID_CHAT_ID');
 const title=clean(value.title,110);
 if(title.length<4||String(value.title||'').length>110)throw Error('INVALID_CHAT_TITLE');
 if(!PROJECTS.has(value.project))throw Error('INVALID_PROJECT');
 if(!STATES.has(value.status))throw Error('INVALID_CHAT_STATUS');
 if(!Array.isArray(value.tasks)||value.tasks.length>8||!value.tasks.every(v=>typeof v==='string'&&/^(ci-head|ai-commits):[A-Z]\d{2}$/.test(v)))throw Error('INVALID_TASK_IDS');
 if(!Array.isArray(value.executors)||value.executors.length<1||value.executors.length>6||!value.executors.every(v=>EXECUTORS.has(v)))throw Error('INVALID_EXECUTORS');
 if(!Array.isArray(value.prs)||value.prs.length>15||!value.prs.every(v=>Number.isSafeInteger(v)&&v>0&&v<100000))throw Error('INVALID_PR_NUMBERS');
 const description=clean(value.description,1000);
 if(String(value.description||'').length>1000)throw Error('DESCRIPTION_TOO_LONG');
 return {schema:MARK,id,title,project:value.project,description,
  taskId:previous?.taskId||null,taskIssueNumber:previous?.taskIssueNumber||null,
  tasks:[...new Set(value.tasks)],executors:[...new Set(value.executors)],prs:[...new Set(value.prs)],
  status:value.status,revision:(previous?.revision||0)+1,
  createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
  executionState:'UNVERIFIED_ASSIGNMENT_ONLY',liveVerified:false};
}
function pack(item){
 return '<!-- '+MARK+':'+item.id+' -->\nDATA_BASE64:\n'+Buffer.from(JSON.stringify(item),'utf8').toString('base64')+'\n';
}
function unpack(issue){
 const m=String(issue?.body||'').match(/<!-- HH_COMMANDER_THREAD_V1:([0-9a-f-]{36}) -->\nDATA_BASE64:\n([A-Za-z0-9+/=]+)\n/i);
 if(!m||m[2].length>16000)return null;
 try{const o=JSON.parse(Buffer.from(m[2],'base64').toString('utf8'));
  return o.schema===MARK&&o.id===m[1]&&uuid(o.id)&&Number.isSafeInteger(o.revision)?o:null;
 }catch{return null}
}
function packEvent(value){
 return '<!-- '+EVENT+' -->\nDATA_BASE64:\n'+Buffer.from(JSON.stringify(value),'utf8').toString('base64')+'\n';
}
function unpackEvent(comment){
 const m=String(comment?.body||'').match(/<!-- HH_COMMANDER_EVENT_V1 -->\nDATA_BASE64:\n([A-Za-z0-9+/=]+)\n/);
 if(!m||m[1].length>7000)return null;
 try{const v=JSON.parse(Buffer.from(m[1],'base64').toString('utf8'));
  return v.schema===EVENT&&uuid(v.id)&&['owner','assistant_unverified','note','github_report'].includes(v.kind)?v:null;
 }catch{return null}
}
async function verifiedIssue(id){
 const item=await core.github('GET','/issues/'+id);
 if(item.pull_request||!unpack(item))throw Error('CHAT_NOT_FOUND');
 return item;
}
async function list(){
 const chats=[];let more=false;
 for(let page=1;page<=4;page++){
  const items=await core.github('GET','/issues?state=all&per_page=100&page='+page+'&sort=updated');
  if(!Array.isArray(items))throw Error('INVALID_CHAT_INDEX');
  for(const item of items){if(item.pull_request)continue;const c=unpack(item);if(c)chats.push({...c,issueNumber:item.number,githubUpdatedAt:item.updated_at,updatedAt:item.updated_at||c.updatedAt})}
  if(items.length<100)break;
  if(page===4)more=true;
 }
 return {chats:chats.slice(0,100),incomplete:more||chats.length>100,storage:'PRIVATE_GITHUB_ISSUES'};
}
async function existing(id){
 const results=await list();
 const found=results.chats.find(v=>v.id===id);
 if(found)return found.issueNumber;
 if(results.incomplete)throw Error('CHAT_INDEX_INCOMPLETE_HOLD');
 return null;
}
async function savedPrivateTask(taskId){
 const marker='HH_COMMANDER_TASK_V1:'+taskId;
 for(let page=1;page<=5;page++){
  const found=await core.github('GET','/issues?state=all&per_page=100&page='+page+'&sort=updated');
  if(!Array.isArray(found))throw Error('TASK_INDEX_UNAVAILABLE');
  const matches=found.filter(x=>!x.pull_request&&String(x.body||'').includes(marker));
  if(matches.length>1)throw Error('DUPLICATE_TASK_ID_HOLD');
  if(matches.length===1){
   const issue=await core.github('GET','/issues/'+matches[0].number);
   if(issue.pull_request)throw Error('TASK_SOURCE_INVALID');
   const record=unpackTask(issue);
   if(!record||record.taskId!==taskId)throw Error('TASK_SOURCE_MISMATCH');
   return {record,issueNumber:issue.number};
  }
  if(found.length<100)throw Error('TASK_NOT_SAVED');
 }
 throw Error('TASK_INDEX_INCOMPLETE_HOLD');
}
async function events(issueNumber){
 const rows=[];let truncated=false;
 for(let page=1;page<=5;page++){
  const list=await core.github('GET','/issues/'+issueNumber+'/comments?per_page=100&page='+page);
  if(!Array.isArray(list))throw Error('INVALID_CHAT_EVENTS');
  for(const item of list){const v=unpackEvent(item);if(v)rows.push({...v,sourceCommentId:item.id})}
  if(list.length<100)break;
  if(page===5)truncated=true;
 }
 return {messages:rows,truncated};
}
async function publicGithub(path){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(PUBLIC+path,{cache:'no-store',redirect:'error',signal:controller.signal,
   headers:{Accept:'application/vnd.github+json','User-Agent':'HH-Commander-Thread-Proof'}});
  if(!r.ok)throw Error('GITHUB_PROOF_HTTP_'+r.status);
  const data=await r.text();if(data.length>90000)throw Error('PROOF_RESPONSE_TOO_LARGE');
  return JSON.parse(data);
 }finally{clearTimeout(timeout)}
}
async function attachGithubReport(url){
 const m=String(url||'').match(/^https:\/\/github\.com\/andylitvinov-design\/books\/issues\/(1419|3128)#issuecomment-(\d{1,14})$/);
 if(!m)throw Error('REPORT_URL_NOT_ALLOWED');
 const c=await publicGithub('/issues/comments/'+m[2]);
 const actor=reporter(c);
 if(!actor||!Number.isSafeInteger(c.id)||String(c.id)!==m[2]||!c.body||!c.created_at||
  c.issue_url!==PUBLIC+'/issues/'+m[1])throw Error('REPORT_PROVENANCE_UNVERIFIED');
 return {kind:'github_report',author:actor,text:clean(c.body.replace(/<!--[\s\S]*?-->/g,'').replace(/(?:ghp_|gho_|sk-)[A-Za-z0-9_-]{16,}/g,'[REDACTED]'),1600),
  url:'https://github.com/andylitvinov-design/books/issues/'+m[1]+'#issuecomment-'+m[2],
  sourceVerified:true,proofLevel:'REPORT_ONLY_NOT_COMMIT'};
}
async function prProof(pr){
 const d=await publicGithub('/pulls/'+pr);
 if(d.number!==pr)throw Error('PR_NUMBER_MISMATCH');
 return {pr,open:d.state==='open',draft:!!d.draft,headSha:clean(d.head?.sha,40),base:d.base?.ref||'UNKNOWN',
  merged:!!d.merged_at,mergedAt:d.merged_at||null,mergeSha:d.merge_commit_sha||null,
  ciVerified:false,liveVerified:false,meaning:'PR metadata only; exact-HEAD checks and LIVE require independent receipts'};
}
function cleanEvent(body){
 if(!uuid(body.eventId))throw Error('INVALID_EVENT_ID');
 const kind=body.kind;
 if(!['owner','ai','note'].includes(kind))throw Error('INVALID_EVENT_KIND');
 const text=clean(body.text,1800);
 if(text.length<1||String(body.text||'').length>1800)throw Error('INVALID_EVENT_TEXT');
 return {schema:EVENT,id:body.eventId,kind:kind==='ai'?'assistant_unverified':kind,
  author:kind==='owner'?'Владелец':kind==='ai'?'AI-ответ · не доказательство исполнения':'Заметка владельца',
  text,model:kind==='ai'?clean(body.model,100):'',sourceVerified:false,
  proofLevel:'NOT_CODE_OR_LIVE_PROOF',createdAt:new Date().toISOString()};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(!core.owner(req))return respond(res,401,{error:'OWNER_SESSION_REQUIRED'});
 const u=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app'),action=u.searchParams.get('action')||'status';
 if(req.method==='GET'&&action==='status')return respond(res,200,{
  schema:MARK,authenticated:true,privateStoreConfigured:core.ready(),localEncryptedVaultSupported:true,
  executorDispatch:false,liveVerification:false,observedAt:new Date().toISOString()});
 if(!core.ready())return respond(res,503,{error:'PRIVATE_STORE_NOT_CONFIGURED'});
 if(req.method==='POST'&&!core.originOK(req))return respond(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(req.method==='POST'&&Number(req.headers?.['content-length']||0)>12000)return respond(res,413,{error:'PAYLOAD_TOO_LARGE'});
 let body=req.body;
 if(req.method==='POST'){
  if(typeof body==='string')try{body=JSON.parse(body)}catch{return respond(res,400,{error:'INVALID_JSON'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>12000)
   return respond(res,400,{error:'INVALID_BODY'});
 }
 try{
  await core.assertPrivate();
  if(req.method==='GET'&&action==='list')return respond(res,200,await list());
  if(req.method==='GET'&&action==='proof'){
   const n=number(u.searchParams.get('pr'));if(!n)return respond(res,400,{error:'INVALID_PR'});
   return respond(res,200,await prProof(n));
  }
  if(req.method==='GET'&&action==='read'){
   const n=number(u.searchParams.get('issue'));if(!n)return respond(res,400,{error:'INVALID_ISSUE'});
   const item=await verifiedIssue(n),hist=await events(n);
   return respond(res,200,{chat:{...unpack(item),issueNumber:n,githubUpdatedAt:item.updated_at},...hist});
  }
  if(req.method==='POST'&&action==='from_task'){
   const taskId=String(body.taskId||'');
   if(!uuid(taskId))return respond(res,400,{error:'INVALID_TASK_ID'});
   const task=await savedPrivateTask(taskId);
   const prior=await existing(taskId);
   if(prior){
    const item=await verifiedIssue(prior),chat=unpack(item);
    if(chat.taskId!==taskId||chat.taskIssueNumber!==task.issueNumber)
     throw Error('TASK_CHAT_COLLISION_HOLD');
    return respond(res,200,{issueNumber:prior,created:false,chat,agentStarted:false});
   }
   const record=task.record;
   const chat=normalize({
    id:taskId,title:String(record.title||'').slice(0,110),
    project:PROJECTS.has(record.project)?record.project:'other',
    description:String(record.summary||record.source||'').slice(0,1000),
    tasks:[],prs:(record.relatedPr||[]).filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000).slice(0,15),
    executors:[record.executor==='repair-worker'?'repair-worker':'manual'],status:'assigned'
   });
   chat.taskId=taskId;chat.taskIssueNumber=task.issueNumber;
   chat.executionState='AWAITING_EXECUTOR_NOT_DISPATCHED';
   const saved=await core.github('POST','/issues',{title:'[AC CHAT] '+chat.title,body:pack(chat)});
   return respond(res,201,{issueNumber:saved.number,created:true,chat,agentStarted:false});
  }
  if(req.method==='POST'&&action==='create'){
   const chat=normalize(body.chat);
   const prior=await existing(chat.id);
   if(prior)return respond(res,200,{issueNumber:prior,created:false,alreadyExists:true});
   const d=await core.github('POST','/issues',{title:'[AC CHAT] '+chat.title,body:pack(chat)});
   return respond(res,201,{issueNumber:d.number,created:true,chat,agentStarted:false});
  }
  if(req.method==='POST'&&action==='update'){
   const n=number(body.issueNumber);if(!n)return respond(res,400,{error:'INVALID_ISSUE'});
   const item=await verifiedIssue(n),prior=unpack(item);
   if(body.expectedRevision!==prior.revision)return respond(res,409,{error:'STALE_CHAT_REVISION',revision:prior.revision});
   const updated=normalize(body.chat,prior);
   const d=await core.github('PATCH','/issues/'+n,{title:'[AC CHAT] '+updated.title,body:pack(updated)});
   return respond(res,200,{updated:true,issueNumber:d.number,chat:updated,agentStarted:false});
  }
  if(req.method==='POST'&&(action==='event'||action==='attach')){
   const n=number(body.issueNumber);if(!n)return respond(res,400,{error:'INVALID_ISSUE'});
   await verifiedIssue(n);
   const hist=await events(n);
   if(hist.truncated)return respond(res,409,{error:'CHAT_EVENT_LIMIT_REACHED_EXPORT_REQUIRED'});
   let event;
   if(action==='attach'){
    if(!uuid(body.eventId))return respond(res,400,{error:'INVALID_EVENT_ID'});
    const verified=await attachGithubReport(body.url);
    event={schema:EVENT,id:body.eventId,...verified,createdAt:new Date().toISOString()};
   }else event=cleanEvent(body);
   if(hist.messages.some(x=>x.id===event.id))return respond(res,200,{appended:false,duplicate:true,event});
   const posted=await core.github('POST','/issues/'+n+'/comments',{body:packEvent(event)});
   return respond(res,201,{appended:true,event,commentId:posted.id,agentStarted:false});
  }
  return respond(res,400,{error:'UNKNOWN_ACTION'});
 }catch(e){
  const msg=clean(e.message||'SERVER_UNAVAILABLE',100);
  const validation=/^(INVALID_|CHAT_NOT_FOUND|UNKNOWN_|REPORT_URL|REPORT_PROVENANCE)/.test(msg);
  return respond(res,validation?400:503,{error:msg});
 }
};
module.exports.__test={normalize,pack,unpack,packEvent,unpackEvent,cleanEvent,uuid,STATES,EXECUTORS};