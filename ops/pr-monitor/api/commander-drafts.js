'use strict';
/* Owner-only same-origin task drafts. Durable persistence ONLY in a verified private
 * GitHub repository with an explicit server-side write token. Never public GitHub.
 * Queuing an issue is NOT workflow_dispatch or proof that an executor started.
 */
const crypto=require('node:crypto');
const COOKIE='hh_seo_owner',MARK='HH_COMMANDER_TASK_V1', MAX_PAYLOAD=26000;
const token=()=>process.env.HH_PM_GITHUB_WRITE_TOKEN||'';
const repository=()=>process.env.HH_PM_TASKS_PRIVATE_REPO||'';
const compact=(v,n)=>String(v||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim().slice(0,n);
const respond=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body))};
function owner(req){
 const secret=process.env.SEO_SESSION_SECRET||'';
 const cookie=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!secret||!cookie)return false;
 const p=cookie.slice(COOKIE.length+1).split('.');
 if(p.length!==3||p[0]!=='v1'||!/^\d{10}$/.test(p[1])||!/^[\da-f]{64}$/.test(p[2])||Number(p[1])<=Date.now()/1000)return false;
 const actual=crypto.createHmac('sha256',secret).update('v1.'+p[1]).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(p[2]));
}
function originOK(req){
 try{const u=new URL(req.headers?.origin||'');return u.protocol==='https:'&&u.host===req.headers?.host&&u.pathname==='/'&&u.search===''&&u.hash==='';}
 catch{return false}
}
function ready(){return !!token()&&/^andylitvinov-design\/[a-zA-Z0-9_.-]{1,100}$/.test(repository());}
async function github(method,path,data){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
 try{
  const r=await fetch('https://api.github.com/repos/'+repository()+path,{
   method,signal:controller.signal,redirect:'error',cache:'no-store',
   headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'HH-Commander-Owner-Editor',
    Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json'}:{})},
   ...(data?{body:JSON.stringify(data)}:{})
  });
  if(!r.ok)throw Error(r.status===401||r.status===403?'PRIVATE_REPOSITORY_ACCESS_DENIED':'GITHUB_HTTP_'+r.status);
  const body=await r.text();if(body.length>350000)throw Error('GITHUB_RESPONSE_TOO_LARGE');
  return JSON.parse(body);
 }finally{clearTimeout(timeout)}
}
async function assertPrivate(){
 if(!ready())throw Error('PRIVATE_STORE_NOT_CONFIGURED');
 const repo=await github('GET','');
 if(repo?.private!==true||repo?.owner?.login!=='andylitvinov-design'||repo?.permissions?.push!==true)
  throw Error('PRIVATE_REPOSITORY_WRITE_REQUIRED');
}
const VALID_PROJECTS=new Set(['commander','holistic','video','other']),VALID_PRIORITY=new Set(['normal','high','urgent']);
const VALID_MODES=new Set(['analysis','repair','full']),VALID_AGENTS=new Set(['agent-commander','repair-worker','review']);
function clean(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('INVALID_DRAFT');
 const title=compact(raw.title,140),source=compact(raw.source,2500),prompt=compact(raw.prompt,15000);
 if(title.length<5||source.length<8||prompt.length<40||raw.source?.length>2500||raw.prompt?.length>15000)throw Error('INCOMPLETE_DRAFT');
 if(!VALID_PROJECTS.has(raw.project)||!VALID_PRIORITY.has(raw.priority)||!VALID_MODES.has(raw.mode)||!VALID_AGENTS.has(raw.executor))throw Error('INVALID_OPTIONS');
 if(typeof raw.taskId!=='string'||!/^[0-9a-f-]{36}$/i.test(raw.taskId))throw Error('INVALID_DRAFT_ID');
 if(!Array.isArray(raw.relatedPr)||raw.relatedPr.length>15||!raw.relatedPr.every(n=>Number.isSafeInteger(n)&&n>0&&n<100000))throw Error('INVALID_PR_LIST');
 return {schema:MARK,taskId:raw.taskId,title,source,prompt,
  project:raw.project,priority:raw.priority,mode:raw.mode,executor:raw.executor,
  area:compact(raw.area,100),summary:compact(raw.summary,1400),plan:compact(raw.plan,4500),
  relatedPr:[...new Set(raw.relatedPr)],restrictions:{
   noCost:raw.restrictions?.noCost!==false,
   noDuplicate:raw.restrictions?.noDuplicate!==false,
   verifyLive:raw.restrictions?.verifyLive!==false
  },updatedAt:new Date().toISOString()};
}
function makeBody(record,state){
 const item={...record,state};
 return '<!-- '+MARK+':'+record.taskId+' -->\nPrivate Agent Commander task. GitHub issue is a storage/queue record, not proof of AI execution.\n'+
  'DATA_BASE64:\n'+Buffer.from(JSON.stringify(item),'utf8').toString('base64')+'\n';
}
function unpack(issue){
 const body=String(issue?.body||''),m=body.match(/<!-- HH_COMMANDER_TASK_V1:([0-9a-f-]{36}) -->\n[\s\S]*?\nDATA_BASE64:\n([A-Za-z0-9+/=]+)\n/i);
 if(!m||m[2].length>60000)return null;
 try{
  const item=JSON.parse(Buffer.from(m[2],'base64').toString('utf8'));
  return item?.schema===MARK&&item.taskId===m[1]?item:null;
 }catch{return null}
}
async function issue(id){
 const data=await github('GET','/issues/'+id);
 if(data.pull_request||!unpack(data))throw Error('UNKNOWN_EDITOR_TASK');
 return data;
}
async function findExisting(taskId){
 for(let page=1;page<=5;page++){
  const pageData=await github('GET','/issues?state=all&per_page=100&page='+page+'&sort=updated');
  if(!Array.isArray(pageData))throw Error('INVALID_TASK_LIST');
  const found=pageData.find(x=>!x.pull_request&&String(x.body||'').includes(MARK+':'+taskId));
  if(found)return found;
  if(pageData.length<100)break;
 }
 return null;
}
async function list(){
 const out=[];
 for(let page=1;page<=4;page++){
  const items=await github('GET','/issues?state=all&per_page=100&page='+page+'&sort=updated');
  if(!Array.isArray(items))throw Error('INVALID_TASK_LIST');
  for(const issue of items){const draft=unpack(issue);if(!draft)continue;
   out.push({issueNumber:issue.number,title:draft.title,taskId:draft.taskId,
    state:draft.state||'DRAFT',updatedAt:issue.updated_at,relatedPr:draft.relatedPr})}
  if(items.length<100||out.length>=40)break;
 }
 return out.slice(0,40);
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Frame-Options','DENY');
 if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(!owner(req))return respond(res,401,{error:'OWNER_SESSION_REQUIRED'});
 const u=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app');
 const action=u.searchParams.get('action')||'status';
 if(req.method==='GET'&&action==='status')return respond(res,200,{
  authenticated:true,privateStoreConfigured:ready(),queueMeans:'GITHUB_PRIVATE_ISSUE_ONLY_NO_AGENT_EXECUTION',
  observedAt:new Date().toISOString()});
 if(!ready())return respond(res,503,{error:'PRIVATE_STORE_NOT_CONFIGURED',
  message:'Для серверного хранения нужен приватный репозиторий и защищённый GitHub write token. Локальная зашифрованная копия доступна.'});
 if(req.method==='POST'&&!originOK(req))return respond(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(req.method==='POST'&&Number(req.headers['content-length']||0)>MAX_PAYLOAD)return respond(res,413,{error:'PAYLOAD_TOO_LARGE'});
 try{
  await assertPrivate();
  if(req.method==='GET'&&action==='list')return respond(res,200,{tasks:await list()});
  if(req.method==='GET'&&action==='read'){
   const id=Number(u.searchParams.get('id'));
   if(!Number.isSafeInteger(id)||id<1)return respond(res,400,{error:'INVALID_ID'});
   const saved=await issue(id);return respond(res,200,{issueNumber:id,record:unpack(saved)});
  }
  if(req.method==='POST'&&action==='save'){
   let body=req.body;if(typeof body==='string')body=JSON.parse(body);
   if(JSON.stringify(body||{}).length>MAX_PAYLOAD)return respond(res,413,{error:'PAYLOAD_TOO_LARGE'});
   const record=clean(body?.record);let existing=null;
   if(body.issueNumber!==undefined&&body.issueNumber!==null){
    const id=Number(body.issueNumber);if(!Number.isSafeInteger(id)||id<1)throw Error('INVALID_ISSUE_ID');
    existing=await issue(id);
    if(unpack(existing).taskId!==record.taskId)throw Error('ISSUE_TASK_MISMATCH');
   }else existing=await findExisting(record.taskId);
   const state=unpack(existing)?.state==='QUEUED_FOR_REVIEW'?'QUEUED_FOR_REVIEW':'DRAFT';
   const title='[AC] '+record.title;
   const data=existing?
    await github('PATCH','/issues/'+existing.number,{title,body:makeBody(record,state)}) :
    await github('POST','/issues',{title,body:makeBody(record,state)});
   return respond(res,200,{saved:true,issueNumber:data.number,state,agentStarted:false,
    storage:'PRIVATE_GITHUB_ISSUE',observedAt:new Date().toISOString()});
  }
  if(req.method==='POST'&&action==='queue'){
   const id=Number(req.body?.issueNumber);
   if(!Number.isSafeInteger(id)||id<1)throw Error('INVALID_ISSUE_ID');
   const existing=await issue(id),record=unpack(existing);
   const updated=await github('PATCH','/issues/'+id,{title:'[AC · READY] '+record.title,
    body:makeBody(record,'QUEUED_FOR_REVIEW')});
   return respond(res,200,{queuedForReview:true,issueNumber:updated.number,agentStarted:false,
    executionState:'NOT_STARTED_NO_EXECUTION_GATEWAY',observedAt:new Date().toISOString()});
  }
  return respond(res,400,{error:'UNKNOWN_ACTION'});
 }catch(e){return respond(res,503,{error:compact(e.message||'SERVER_ERROR',120)})}
};
module.exports.__test={owner,originOK,ready,clean,makeBody,unpack};
