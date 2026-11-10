'use strict';
/* HH PM Agent Chat: owner-only, no paid fallback, no source-writing capability.
 * Read-only trusted GitHub reports plus bounded OpenRouter :free conversation.
 * No new cron, secret exposure or anonymous POST. The client persists chat events separately
 * through the owner-verified Supabase private-store API; this endpoint has no transcript store.
 */
const crypto=require('node:crypto');
const REPO='andylitvinov-design/books', GH='https://api.github.com/repos/'+REPO;
const OWNER_COOKIE='hh_seo_owner';
const REPORT_ISSUES=[1419,3128,3890];
const MAX_REPORTS=40, MAX_INPUT=1200, FREE_MAX=18;
let cachedReports=null, reportsUntil=0, cachedModels=null, modelsUntil=0;
const clamp=(text,n)=>String(text||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').trim().slice(0,n);
const json=(res,code,data)=>{
  res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
};
function same(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
}
async function isOwner(req){
 try{
  const store=require('../lib/commander-private-store');
  if(store.tokenFromRequest(req)){
   const status=await store.callStore(req,'status',{}, {method:'GET'});
   if(status.status===200&&status.data?.owner===true&&status.data?.privateStoreConfigured===true)return true;
  }
 }catch{}

 const secret=process.env.SEO_SESSION_SECRET||'';
 const cookie=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(OWNER_COOKIE+'='));
 if(!secret||!cookie)return false;
 const parts=cookie.slice(OWNER_COOKIE.length+1).split('.');
 if(parts.length!==3||parts[0]!=='v1'||!/^\d{10}$/.test(parts[1])||!/^[0-9a-f]{64}$/.test(parts[2]))return false;
 const expires=Number(parts[1]);
 if(!Number.isSafeInteger(expires)||expires<=Date.now()/1000)return false;
 return same(crypto.createHmac('sha256',secret).update('v1.'+parts[1]).digest('hex'),parts[2]);
}
function correctOrigin(req){
 const origin=req.headers?.origin;
 if(typeof origin!=='string'||!origin.startsWith('https://'))return false;
 try{
  const o=new URL(origin);
  return o.protocol==='https:'&&o.host===req.headers.host&&o.pathname==='/'&&o.search===''&&o.hash==='';
 }catch{return false}
}
function freePrice(model){
 if(!model||typeof model.id!=='string'||!model.id.endsWith(':free'))return false;
 const p=model.pricing;
 if(!p||p.prompt===undefined||p.completion===undefined)return false;
 return Object.values(p).every(x=>x===null||x===undefined||(typeof x!=='object'&&String(x).trim()!==''&&Number(x)===0));
}
function freeCatalog(data){
 if(!Array.isArray(data?.data))return [];
 const seen=new Set();
 return data.data.filter(freePrice).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true})
  .slice(0,FREE_MAX).map(x=>({id:x.id,name:clamp(x.name||x.id,90),pricing:'$0 verified by current catalog'}));
}
const apiKey=()=>process.env.HH_PM_OPENROUTER_API_KEY||'';
async function getModels(){
 if(!apiKey())return {error:'OPENROUTER_KEY_NOT_CONFIGURED'};
 if(cachedModels&&Date.now()<modelsUntil)return {models:cachedModels};
 let r;
 try{r=await fetch('https://openrouter.ai/api/v1/models',{headers:{
  Accept:'application/json',Authorization:'Bearer '+apiKey()},
  redirect:'error',signal:AbortSignal.timeout(7000),cache:'no-store'});}
 catch{return {error:'FREE_MODEL_CATALOG_UNAVAILABLE'};}
 if(!r.ok)return {error:'FREE_MODEL_CATALOG_HTTP_'+r.status};
 let body;try{body=await r.json()}catch{return {error:'FREE_MODEL_CATALOG_INVALID'}}
 if(!body||!Array.isArray(body.data)||body.data.length>3000)return {error:'FREE_MODEL_CATALOG_INVALID'};
 const models=freeCatalog(body);
 if(!models.length)return {error:'NO_VERIFIED_FREE_MODELS'};
 cachedModels=models;modelsUntil=Date.now()+300000;
 return {models};
}
async function getGithub(url){
 const res=await fetch(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'HH-Owner-Agent-Report-Viewer'},
  redirect:'error',signal:AbortSignal.timeout(6000),cache:'no-store'});
 if(!res.ok)throw Error('GITHUB_HTTP_'+res.status);
 const text=await res.text();
 if(text.length>480000)throw Error('GITHUB_LIMIT');
 return JSON.parse(text);
}
const reporter=(c)=>{
 const actor=c.user?.login,app=c.performed_via_github_app;
 if(actor==='github-actions[bot]'&&c.user?.type==='Bot'&&app?.slug==='github-actions'&&app.id===15368)return 'GitHub Actions';
 if(actor==='andylitvinov-design'&&app?.slug==='chatgpt-codex-connector')return 'ChatGPT Triage';
 return null;
};
function reportEntries(comments,issue){
 if(!Array.isArray(comments))return [];
 const out=[];
 for(const c of comments){
  let agent=reporter(c);
  if(!agent||typeof c.body!=='string'||!Number.isSafeInteger(c.id)||c.id<1)continue;
  if(issue===3890){
    const matched=/^<!-- HH_PM_INBOX_STATE_V1 comment=([1-9]\d*) status=([A-Z_]+) -->/.exec(c.body);
    if(agent!=='GitHub Actions'||!matched||!['CLAIMED','REPLIED','BLOCKED','DISPATCH_ACCEPTED_UNCORRELATED'].includes(matched[2]))continue;
    agent=matched[2]==='REPLIED'?'OpenRouter Free · GitHub Worker':'GitHub Repair Gateway';
  }
  const url='https://github.com/'+REPO+'/issues/'+issue+'#issuecomment-'+c.id;
  const body=clamp(c.body.replace(/<!--[\s\S]*?-->/g,'').replace(/(?:ghp_|gho_|sk-)[A-Za-z0-9_-]{16,}/g,'[REDACTED]'),1600);
  if(!body||!/^\d{4}-\d{2}-\d{2}T/.test(c.created_at||''))continue;
  out.push({id:issue+':'+c.id,agent,origin:'GitHub issue #'+issue,body,
   createdAt:c.created_at,url,sourceVerified:true,
   status:'REPORT_ONLY_NOT_PROOF_OF_SOURCE_COMMIT'});
 }
 return out;
}
async function reports(){
 if(cachedReports&&Date.now()<reportsUntil)return {reports:cachedReports,source:'github',observedAt:new Date().toISOString(),cached:true};
 const answers=await Promise.all(REPORT_ISSUES.map(async id=>{
  const issue=await getGithub(GH+'/issues/'+id);
  if(!Number.isSafeInteger(issue.comments)||issue.comments<0||issue.comments>20000)throw Error('ISSUE_COUNT_UNVERIFIED');
  const page=Math.max(1,Math.ceil(issue.comments/100));
  const comments=await getGithub(GH+'/issues/'+id+'/comments?per_page=100&page='+page);
  return reportEntries(comments,id);
 }));
 const rows=answers.flat().sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,MAX_REPORTS);
 cachedReports=rows;reportsUntil=Date.now()+120000;
 return {reports:rows,observedAt:new Date().toISOString(),source:'github_actions_chatgpt_connector_and_pm_free_inbox',cached:false};
}
function offline(message,tasks){
 const q=message.toLowerCase(),scope=tasks.length?'Выбрано '+tasks.length+' задач: '+tasks.join(', ')+'. ':'Задачи не выбраны. ';
 if(/запуст|выполн|измени код|исправ|коммит|деплой/.test(q))
  return scope+'Локальный советник не редактирует репозиторий. Для реального исправления назначьте исполнителя, проверьте PR и lease, после чего используйте защищённый GitHub Worker или передайте задание в ChatGPT Work. Отчёт о запуске без commit SHA нельзя считать выполнением.';
 if(/статус|готов|отчет|отчёт|что сделан|результат/.test(q))
  return scope+'Для статуса откройте «Отчёты агентов» и проверьте GitHub на текущем HEAD. Метка «проверено» в снимке задач не заменяет merge SHA и функциональный LIVE.';
 if(/блок|почему|ошиб|ci|конфликт/.test(q))
  return scope+'Проверьте первый причинный failed job на актуальном HEAD, owner lease, BASE_ADVANCED или true DIRTY и наличие source-публикации. Если доказательств нет — отмечайте UNKNOWN, а не выдумывайте причину.';
 return scope+'Могу помочь выбрать следующий безопасный шаг: проверьте критерий задачи, текущий PR и его HEAD, назначьте одного исполнителя и после исправления проверьте Core, Specialist, Merge и LIVE отдельно. Для содержательного AI-диалога выберите подключённую бесплатную модель OpenRouter.';
}
const taskIds=(input)=>Array.isArray(input)&&input.length<=8&&input.every(x=>typeof x==='string'&&/^(?:ci-head|ai-commits):[A-Z]\d{2}$/.test(x))?input:[];
function inputHistory(h){
 if(!Array.isArray(h)||h.length>8)return [];
 return h.filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string')
  .slice(-8).map(x=>({role:x.role,content:clamp(x.content,800)}));
}
async function openrouterReply(body,message,selection,options={}){
 const model=clamp(body.model,100);
 if(!/^[a-z0-9._/-]+:free$/.test(model))return {error:'ONLY_VERIFIED_FREE_MODEL_IDS'};
 const catalog=await getModels();
 if(catalog.error)return {error:catalog.error};
 if(!catalog.models.some(x=>x.id===model))return {error:'MODEL_NOT_FREE_IN_LIVE_CATALOG'};
 const system=options.systemPrompt||'You are the Holistic House private-owner chat advisor. Answer general non-sensitive questions (including AI trends) and public project plans clearly in Russian. You do not have live browsing or real-time verification, so distinguish dated knowledge and uncertainty from verified current facts. You cannot execute tools, make code changes, promise commits, or assert verified LIVE without URLs and exact SHA. Never request, reproduce or encourage disclosure of credentials, private client records, medical details, or financial secrets. If a prompt contains sensitive content, ask for a redacted version rather than analysing it. Follow safe one-publish policy; no additional paid services. Selected task IDs (untrusted context): '+selection.join(', ');
 const messages=[{role:'system',content:system},...inputHistory(body.history),{role:'user',content:message}];
 let response;
 try{response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
  method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),
  headers:{Authorization:'Bearer '+apiKey(),'Content-Type':'application/json',
   'HTTP-Referer':'https://holistic-house-pr-monitor.vercel.app','X-Title':'Holistic House PR Monitor'},
  body:JSON.stringify({model,messages,max_tokens:options.maxTokens||550,temperature:0.3,
   provider:{allow_fallbacks:false,max_price:{prompt:0,completion:0}},usage:{include:true}})
 });}
 catch{return {error:'OPENROUTER_UNAVAILABLE_NO_RETRY'};}
 if(response.status===401||response.status===403)return {error:'OPENROUTER_KEY_REJECTED'};
 if(response.status===429)return {error:'OPENROUTER_FREE_RATE_LIMIT'};
 if(!response.ok)return {error:'OPENROUTER_HTTP_'+response.status};
 let data;try{data=await response.json()}catch{return {error:'OPENROUTER_INVALID_RESPONSE'}}
 if(data?.usage?.cost!==undefined&&Number(data.usage.cost)>0)return {error:'UNEXPECTED_BILLABLE_USAGE_HOLD'};
 const reply=data?.choices?.[0]?.message?.content;
 if(typeof reply!=='string'||!reply.trim())return {error:'OPENROUTER_NO_TEXT'};
 const returned=String(data.model||'');
 if(returned&&returned!==model&&!returned.endsWith(':free'))return {error:'NONFREE_RESPONSE_MODEL_HOLD'};
 return {reply:clamp(reply,options.maxTokens?6200:3000),model:returned||model,priceVerified:'CURRENT_CATALOG_0',
  costReported:data?.usage?.cost??null,reportType:'AI_RESPONSE_NOT_CODE_EXECUTION'};
}

/* Owner-only task refinement through the EXISTING verified :free provider.
 * This is authoring assistance, never task persistence, workflow dispatch or code execution.
 */
const {buildTaskBrief}=require('../commander-task-input.js');
const DECOMPOSE_SYSTEM=[
 'You refine an EXISTING complete executor prompt for the Holistic House Agent Commander.',
 'It already has four mandatory blocks: WHAT TO DO, GOOD RESULT, QUALITY BENCHMARKS, BUSINESS CONTEXT with public URLs.',
 'Return only up to five concrete NEW improvements to implementation steps, measurable acceptance or relevant unresolved dependencies.',
 'Never invent web addresses, physical business locations, competitors, product features, test results, or project status.',
 'Do not copy benchmark code, design or copywriting. Do not change the original owner requirements.',
 'No private client information, new paid providers, unapproved PR writing, bypasses or autonomous launches.',
 'Unverified assertions must be marked НЕ ПРОВЕРЕНО. Reply in Russian, concise and actionable.'
].join(' ');
async function decomposeTask(text){
 const base=buildTaskBrief(text);
 if(!base)return {error:'INVALID_TASK_DESCRIPTION'};
 const catalog=await getModels();
 if(catalog.error)return {error:catalog.error};
 const model=catalog.models?.[0]?.id;
 if(!model||!model.endsWith(':free'))return {error:'NO_VERIFIED_FREE_MODELS'};
 const answer=await openrouterReply({model,history:[]},
  'Предложи новые, специфичные для задачи уточнения к уже составленному промпту; НЕ повторяй его разделы.\n\n'+base,[],
  {systemPrompt:DECOMPOSE_SYSTEM,maxTokens:700});
 if(answer.error)return answer;
 if(!answer.reply||answer.reply.length<55)return {error:'TASK_BREAKDOWN_TOO_SHORT'};
 const marker='\n\n8. ДОПОЛНЕНИЯ ИИ — ПРОВЕРИТЬ ПЕРЕД ПЕРЕДАЧЕЙ\n';
 const free=Math.max(0,8500-base.length-marker.length);
 const reply=base+marker+answer.reply.trim().slice(0,free);
 return {...answer,reply,reportType:'AI_TASK_PLAN_NOT_EXECUTION',taskSaved:false,agentStarted:false};
}


/* Three advisory viewpoints from ONE verified zero-price model, not Telegram Council. */
const COUNCIL_SYSTEM=[
 'You are the Holistic House Agent Commander AI Council advisory view.',
 'You are ONE free AI model, not three independent agents. Give three labeled perspectives:',
 '1) Продукт и польза, 2) Архитектура и практичная реализация, 3) QA, безопасность и риски.',
 'Then one concrete next action and 2-3 measurable acceptance criteria.',
 'Use Russian throughout. Ask no unnecessary clarifications when reasonable assumptions suffice.',
 'Never assert you checked GitHub, a PR, CI, existing software or LIVE unless explicit verified evidence is provided.',
 'Do not provide paid services, secret handling, personal client data, automatic commits or fake expert consensus.',
 'If information is missing, label it НЕ ПРОВЕРЕНО. Be concise and specific.'
].join(' ');
async function councilTask(text){
 const catalog=await getModels();
 if(catalog.error)return {error:catalog.error};
 const model=catalog.models?.[0]?.id;
 if(!model||!model.endsWith(':free'))return {error:'NO_VERIFIED_FREE_MODELS'};
 const out=await openrouterReply({model,history:[]},'Задача владельца:\n'+text,[],
  {systemPrompt:COUNCIL_SYSTEM,maxTokens:700});
 if(out.error)return out;
 if(!out.reply||out.reply.trim().length<55)return {error:'COUNCIL_ADVICE_TOO_SHORT'};
 return {...out,reportType:'AI_COUNCIL_SINGLE_FREE_MODEL_NOT_EXECUTION',
  councilType:'ONE_VERIFIED_FREE_MODEL_THREE_PERSPECTIVES',taskSaved:false,agentStarted:false};
}

module.exports=async function(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Cookie');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'METHOD_NOT_ALLOWED'});
 if(!await isOwner(req))return json(res,401,{error:'OWNER_SESSION_REQUIRED',loginEndpoint:'/commander-auth.html'});
 const action=new URL(req.url,'https://holistic-house-pr-monitor.vercel.app').searchParams.get('action')||'status';
 if(req.method==='GET'){
  if(action==='status')return json(res,200,{schema:'HH_PM_AGENT_CHAT_V1',authenticated:true,
   modes:{local:true,openrouter:!!apiKey(),githubReports:true,githubFreeRelay:true},
   githubInboxUrl:'https://github.com/andylitvinov-design/books/issues/3890',
   storage:'CURRENT_BROWSER_SESSION_ONLY',githubCodeExecution:false,
   provider:'OPENROUTER_FREE_ONLY',observedAt:new Date().toISOString()});
  if(action==='models'){const value=await getModels();return json(res,value.error?503:200,value)}
  if(action==='reports'){
   try{return json(res,200,await reports())}
   catch(e){return json(res,503,{error:'GITHUB_REPORTS_UNAVAILABLE',reason:clamp(e.message,80)})}
  }
  return json(res,400,{error:'UNKNOWN_ACTION'});
 }
 if(!correctOrigin(req))return json(res,403,{error:'CROSS_ORIGIN_DENIED'});
 if(action!=='chat'&&action!=='decompose'&&action!=='council')return json(res,400,{error:'UNKNOWN_ACTION'});
 if(Number(req.headers['content-length']||0)>5000)return json(res,413,{error:'PAYLOAD_TOO_LARGE'});
 let body=req.body;
 if(typeof body==='string')try{body=JSON.parse(body)}catch{return json(res,400,{error:'INVALID_JSON'})}
 if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'INVALID_JSON'});
 if(action==='decompose'){
  if(typeof body.message!=='string'||body.message.trim().length<8||body.message.length>2500)
   return json(res,400,{error:'INVALID_TASK_DESCRIPTION'});
  if(!apiKey())return json(res,503,{error:'OPENROUTER_NOT_CONNECTED'});
  const out=await decomposeTask(clamp(body.message,2500));
  return json(res,out.error?503:200,{...out,observedAt:new Date().toISOString()});
 }
 if(action==='council'){
  if(typeof body.message!=='string'||body.message.trim().length<8||body.message.length>2500)
   return json(res,400,{error:'INVALID_TASK_DESCRIPTION'});
  if(!apiKey())return json(res,503,{error:'OPENROUTER_NOT_CONNECTED'});
  const answer=await councilTask(clamp(body.message,2500));
  return json(res,answer.error?503:200,{...answer,observedAt:new Date().toISOString()});
 }
 const message=clamp(body.message,MAX_INPUT),tasks=taskIds(body.tasks);
 if(message.length<2||message.length>MAX_INPUT||!Array.isArray(body.tasks)||body.tasks.length>8||tasks.length!==body.tasks.length)
  return json(res,400,{error:'INVALID_CHAT_INPUT'});
 if(body.mode==='local')return json(res,200,{reply:offline(message,tasks),model:'Local PM Advisor',priceVerified:'NO_EXTERNAL_PROVIDER',
  observedAt:new Date().toISOString(),reportType:'DETERMINISTIC_ADVICE_NO_CODE_EXECUTION'});
 if(body.mode!=='openrouter')return json(res,400,{error:'MODE_NOT_SUPPORTED'});
 if(!apiKey())return json(res,503,{error:'OPENROUTER_NOT_CONNECTED'});
 const result=await openrouterReply(body,message,tasks);
 return json(res,result.error?503:200,{...result,observedAt:new Date().toISOString()});
};
module.exports.__test={isOwner,correctOrigin,freePrice,freeCatalog,reporter,reportEntries,taskIds,offline,DECOMPOSE_SYSTEM,COUNCIL_SYSTEM};
