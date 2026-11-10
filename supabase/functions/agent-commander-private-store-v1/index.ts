// Synced from live Supabase Edge Function v10; deployed SHA fc392030bf8dda2a424f3a2934ffdd00376b035a1281fef04ba95fe25f70c935.
// Agent Commander private task/chat store. A valid Supabase user JWT and
// business_brain.owner_access row are required for every request.
import postgres from "npm:postgres@3.4.5";

const ALLOWED_ORIGINS = new Set([
  "https://holistichouse.vercel.app",
  "https://holistic-house-pr-monitor.vercel.app",
]);
const MAX_BODY_BYTES = 32000;
const PROJECTS = new Set(["commander","holistic","video","other"]);
const STATES = new Set(["planned","assigned","working","review","blocked","archived"]);
const EXECUTORS = new Set(["local","openrouter","codex","chatgpt-work","repair-worker","hermes","manual"]);
const uuid = v => typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const clean = (v,n) => typeof v==="string" ? v.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n) : "";
const number = v => Number.isSafeInteger(Number(v)) && Number(v)>0 && Number(v)<100000 ? Number(v) : null;

const HERMES_RUN_SCHEMA="HH_HERMES_COMMANDER_RUN_V1";
const HERMES_STATES=new Set(["STARTING","RUNNING","COMPLETED","FAILED","CANCELLED","WAITING_FOR_APPROVAL","BLOCKED"]);
function hermesConfiguration(){
 const origin=Deno.env.get("HERMES_ORIGIN_URL")||"",secret=Deno.env.get("HERMES_SHARED_SECRET")||"";
 if(secret.length<32)return null;
 try{const url=new URL(origin);
   if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)return null;
   return {origin:url.origin,secret};
 }catch{return null;}
}
async function hermesCall(config,path,method="GET",data){
 if(!config||!/^\/commander\/runs(?:\/[0-9a-f-]{36})?$/.test(path))throw Error("HERMES_INVALID_DESTINATION");
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{
  const response=await fetch(config.origin+path,{method,redirect:"error",cache:"no-store",signal:ctl.signal,
    headers:{"x-hermes-secret":config.secret,"accept":"application/json",
     ...(method==="POST"?{"content-type":"application/json"}:{})},
    ...(method==="POST"?{body:JSON.stringify(data)}:{})});
  if(!response.ok)throw Error(response.status===404?"HERMES_RUN_NOT_FOUND":"HERMES_HTTP_ERROR");
  const raw=await response.text();if(raw.length>12000)throw Error("HERMES_RESPONSE_TOO_LARGE");
  try{return JSON.parse(raw);}catch{throw Error("HERMES_RESPONSE_INVALID");}
 }finally{clearTimeout(timer);}
}
function trustedHermesReceipt(value,runId,jobId,modelId){
 if(!value||value.schema!==HERMES_RUN_SCHEMA||value.runId!==runId||
    typeof value.jobId!=="string"||!/^[A-Za-z0-9_-]{5,120}$/.test(value.jobId)||
    (jobId&&value.jobId!==jobId)||value.model!==modelId||
    !HERMES_STATES.has(value.status)||typeof value.agentStarted!=="boolean"||
    typeof value.executionVerified!=="boolean"||
    (value.status==="RUNNING"&&!value.agentStarted)||
    (value.status==="COMPLETED"&&!value.executionVerified))throw Error("HERMES_RECEIPT_NOT_VERIFIED");
 let write=null;
 if(value.sourceWrite!==null&&value.sourceWrite!==undefined){
  const p=value.sourceWrite;
  if(value.status!=="COMPLETED"||!value.executionVerified||p.verified!==true||
     !/^[a-f0-9]{40}$/.test(p.commitSha||"")||!Number.isSafeInteger(p.prNumber)||p.prNumber<1||
     p.prUrl!=="https://github.com/andylitvinov-design/books/pull/"+p.prNumber)
    throw Error("HERMES_GITHUB_PROOF_INVALID");
  write={verified:true,commitSha:p.commitSha,prNumber:p.prNumber,prUrl:p.prUrl};
 }
 return {jobId:value.jobId,status:value.status,reasonCode:clean(value.reasonCode,110)||null,
   agentStarted:value.agentStarted,executionVerified:value.executionVerified,
   model:value.model,sourceWrite:write,result:value.status==="COMPLETED"?clean(value.result,1500):""};
}
async function saveHermesReceipt(db,ownerId,chatId,runId,report){
 const selected=await q(db,"select status,request_payload,hermes_job_id from business_brain.commander_execution_runs where run_id=$1::uuid and owner_id=$2::uuid and chat_id=$3::uuid limit 1",[runId,ownerId,chatId]);
 if(!selected.length||selected[0].request_payload?.modelId!==report.model||
    (selected[0].hermes_job_id&&selected[0].hermes_job_id!==report.jobId))throw Error("HERMES_RUN_PROVENANCE_MISMATCH");
 const done=["COMPLETED","FAILED","CANCELLED"].includes(report.status);
 const receipt={schema:HERMES_RUN_SCHEMA,dispatchAttempted:true,agentStarted:report.agentStarted,
  executionVerified:report.executionVerified,model:report.model,status:report.status,
  sourceWrite:report.sourceWrite,result:report.result,checkedAt:new Date().toISOString()};
 const rows=await q(db,"update business_brain.commander_execution_runs set status=$1,reason_code=$2,hermes_job_id=$3,executor_session_id=$3,receipt=$4::jsonb,started_at=case when $5::boolean then coalesce(started_at,now()) else started_at end,completed_at=case when $6::boolean then coalesce(completed_at,now()) else completed_at end,updated_at=now() where run_id=$7::uuid and owner_id=$8::uuid and chat_id=$9::uuid and status not in ('COMPLETED','FAILED','CANCELLED') returning run_id",
  [report.status,report.reasonCode||"HERMES_"+report.status,report.jobId,JSON.stringify(receipt),report.agentStarted,done,runId,ownerId,chatId]);
 if(!rows.length)return report;
 if(done){
  const eventId=await stableScopeId(ownerId,"hermes:"+runId+":final");
  const text=report.status==="COMPLETED"?"Ответ исполнителя: "+(report.result||"Нет текстового результата.")+
    (report.sourceWrite?"\nDraft PR: "+report.sourceWrite.prUrl+"\nCommit: "+report.sourceWrite.commitSha:"")+
    "\nЭто НЕ означает CI, merge или LIVE.":"Исполнение остановлено: "+report.status+" · "+(report.reasonCode||"не установлена");
  const event={schema:"HH_COMMANDER_EVENT_V1",id:eventId,
   kind:report.status==="COMPLETED"?"agent_final":"execution_blocked",
   author:"Hermes · OpenRouter Free",text:clean(text,1800),status:report.status,model:report.model,
   hermesJobId:report.jobId,sourceWrite:report.sourceWrite,sourceVerified:report.sourceWrite!==null,
   proofLevel:report.sourceWrite?"DRAFT_PR_COMMIT_VERIFIED_NOT_LIVE":
    (report.status==="COMPLETED"?"EXECUTOR_VERIFIED_NOT_SOURCE_PROOF":"EXECUTION_UNVERIFIED"),
   createdAt:new Date().toISOString()};
  // Database CHECK admits only 'note' for custom event payload kinds.
  await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'note',$4::jsonb,$5::boolean) on conflict(event_id) do nothing",
   [eventId,chatId,ownerId,JSON.stringify(event),report.sourceWrite!==null]);
 }
 await q(db,"update business_brain.commander_chats set execution_state=$1,payload=jsonb_set(payload,'{executionState}',$2::jsonb,true),updated_at=now() where owner_id=$3::uuid and chat_id=$4::uuid",
  [report.status,JSON.stringify(report.status),ownerId,chatId]);
 return report;
}
async function refreshHermesRun(db,ownerId,chatId,runId){
 const rows=await q(db,"select status,hermes_job_id,request_payload,receipt from business_brain.commander_execution_runs where run_id=$1::uuid and owner_id=$2::uuid and chat_id=$3::uuid limit 1",[runId,ownerId,chatId]);
 if(!rows.length||["COMPLETED","FAILED","CANCELLED"].includes(rows[0].status)||
    rows[0].receipt?.dispatchAttempted!==true)return null;
 const config=hermesConfiguration();if(!config)return null;
 const report=trustedHermesReceipt(await hermesCall(config,"/commander/runs/"+runId),runId,rows[0].hermes_job_id,rows[0].request_payload?.modelId);
 return await saveHermesReceipt(db,ownerId,chatId,runId,report);
}

const reply = (status,body,origin) => new Response(JSON.stringify(body),{
  status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":"private, no-store, max-age=0",
    "x-content-type-options":"nosniff",
    "vary":"Origin, Authorization",
    ...(ALLOWED_ORIGINS.has(origin)?{
      "access-control-allow-origin":origin,
      "access-control-allow-methods":"POST, GET, OPTIONS",
      "access-control-allow-headers":"authorization, apikey, content-type",
      "access-control-max-age":"600"
    }:{})
  }
});

async function authenticatedOwner(req){
  const auth=req.headers.get("authorization")||"";
  if(!/^Bearer [A-Za-z0-9._-]{120,8000}$/.test(auth)) return null;
  const apiUrl=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!apiUrl||!anon) throw Error("SERVER_AUTH_NOT_CONFIGURED");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
    const r=await fetch(apiUrl.replace(/\/$/,"")+"/auth/v1/user",{
      method:"GET",redirect:"error",cache:"no-store",signal:controller.signal,
      headers:{apikey:anon,Authorization:auth,Accept:"application/json"}
    });
    if(!r.ok) return null;
    const u=await r.json();
    return u&&uuid(u.id)&&u.email_confirmed_at?u.id:null;
  }finally{clearTimeout(timer)}
}
function taskRecord(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("INVALID_TASK_RECORD");
  if(!uuid(input.taskId))throw Error("INVALID_TASK_ID");
  const title=clean(input.title,180);
  if(title.length<5||String(input.title||"").length>180)throw Error("INVALID_TASK_TITLE");
  const prs=Array.isArray(input.relatedPr)?[...new Set(input.relatedPr.filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000))].slice(0,15):[];
  const r=input.restrictions&&typeof input.restrictions==="object"&&!Array.isArray(input.restrictions)?input.restrictions:{};
  return {schema:"HH_COMMANDER_TASK_V1",taskId:input.taskId,title,project:clean(input.project,50),
    priority:clean(input.priority,20),area:clean(input.area,80),source:clean(input.source,5000),
    summary:clean(input.summary,3000),plan:clean(input.plan,5000),prompt:clean(input.prompt,6000),
    executor:clean(input.executor,50),mode:clean(input.mode,50),relatedPr:prs,
    restrictions:{noCost:r.noCost===true,noDuplicate:r.noDuplicate===true,verifyLive:r.verifyLive===true}};
}
function normalizeChat(input,previous=null){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("INVALID_CHAT_RECORD");
  const id=previous?.id||input.id;
  if(!uuid(id)||(previous&&input.id!==id))throw Error("INVALID_CHAT_ID");
  const title=clean(input.title,110);
  if(title.length<4||String(input.title||"").length>110)throw Error("INVALID_CHAT_TITLE");
  if(!PROJECTS.has(input.project))throw Error("INVALID_PROJECT");
  if(!STATES.has(input.status))throw Error("INVALID_CHAT_STATUS");
  if(!Array.isArray(input.tasks)||input.tasks.length>8||!input.tasks.every(v=>typeof v==="string"&&/^(ci-head|ai-commits):[A-Z]\d{2}$/.test(v)))throw Error("INVALID_TASK_IDS");
  if(!Array.isArray(input.executors)||input.executors.length<1||input.executors.length>6||!input.executors.every(v=>EXECUTORS.has(v)))throw Error("INVALID_EXECUTORS");
  if(!Array.isArray(input.prs)||input.prs.length>15||!input.prs.every(v=>Number.isSafeInteger(v)&&v>0&&v<100000))throw Error("INVALID_PR_NUMBERS");
  const description=clean(input.description,1000);
  if(String(input.description||"").length>1000)throw Error("DESCRIPTION_TOO_LONG");
  const now=new Date().toISOString();
  return {schema:"HH_COMMANDER_THREAD_V1",id,title,project:input.project,description,
    taskId:previous?.taskId||null,taskIssueNumber:previous?.taskIssueNumber||null,
    tasks:[...new Set(input.tasks)],executors:[...new Set(input.executors)],prs:[...new Set(input.prs)],
    status:input.status,revision:(previous?.revision||0)+1,
    createdAt:previous?.createdAt||now,updatedAt:now,
    executionState:previous?.executionState||"UNVERIFIED_ASSIGNMENT_ONLY",liveVerified:false};
}

const TASK_SCOPE = /^(?:(?:ci-head|ai-commits):[A-Z][0-9]{2}|(?:video|messenger|cabinet|academy|services|growth|platform|unassigned)\/[a-z0-9-]+)$/;
const GROUP_TITLES = {
 video:{goal:"Цель, категории, концепция и сценарий",ideas:"Ideas, Voice и монтаж",scenes:"Персонажи, сцены и кинодизайн",render:"Генерация, Safari, MP4 и сохранение",director:"AI Video Director и iHelp",publish:"Публикация, YouTube и MyTube"},
 messenger:{council:"AI Council и ответы",chat:"Диалоги, тесты и голосовые",crm:"CRM, WhatsApp и заявки",voice:"Голосовой Companion"},
 cabinet:{tests:"Тесты и психометрия",profile:"Профиль, отчёты и кабинет",support:"Holistic Support и цели",mind:"Holistic Intelligence",coaching:"Коучинг"},
 academy:{reiki:"Рейки",opora:"ОПОРА",courses:"Курсы и материалы",masters:"Кабинет мастера",business:"Бизнес-программа"},
 services:{offers:"Услуги и оформление заказа",wallet:"Баланс и оплаты",remote:"Дистанционная поддержка",events:"События и билеты"},
 growth:{social:"Instagram и продвижение",home:"Главная и путь клиента"},
 platform:{commander:"Agent Commander и постановка задач",ci:"Watchdog, CI и автоматизация PR",apps:"PWA и Android"},
 unassigned:{triage:"Неразобранные PR · назначить направление"}
};
async function stableScopeId(ownerId,scope){
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("HH_COMMANDER_PUBLIC_SCOPE_V1:"+ownerId+":"+scope)));
 const h=Array.from(digest,v=>v.toString(16).padStart(2,"0")).join("");
 return h.slice(0,8)+"-"+h.slice(8,12)+"-8"+h.slice(13,16)+"-"+((parseInt(h[16],16)&3)|8).toString(16)+h.slice(17,20)+"-"+h.slice(20,32);
}
async function resolveScope(scope,body){
 if(typeof scope!=="string"||scope.length>80||!TASK_SCOPE.test(scope))throw Error("INVALID_TASK_SCOPE");
 if(scope.startsWith("ci-head:")||scope.startsWith("ai-commits:")){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
  try{
   const response=await fetch("https://raw.githubusercontent.com/andylitvinov-design/books/codex/bootstrap-books/ops/pr-monitor/project-management-public.json",{cache:"no-store",redirect:"error",signal:ctl.signal,headers:{Accept:"application/json"}});
   if(!response.ok)throw Error("PUBLIC_TASK_REGISTRY_HTTP_"+response.status);
   const raw=await response.text();if(raw.length>300000)throw Error("PUBLIC_TASK_REGISTRY_TOO_LARGE");
   const registry=JSON.parse(raw);
   if(registry.schema!=="HH_PM_PUBLIC_V1"||!Array.isArray(registry.projects))throw Error("PUBLIC_TASK_REGISTRY_INVALID");
   for(const p of registry.projects||[])for(const stage of p.stages||[])for(const task of stage.tasks||[]){
    if(scope===p.key+":"+task.id)return {title:clean(task.title,180),project:"commander",
     summary:clean("Проект: "+clean(p.title,100)+"; этап: "+clean(stage.title,100)+"; публичный статус: "+clean(task.status,30)+". Статус и связанные PR перепроверить на актуальных источниках.",1000),
     relatedPr:Array.isArray(task.prs)?task.prs.filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000).slice(0,15):[],
     tasks:[scope],scopePrHintsUnverified:false};
   }
   throw Error("PUBLIC_TASK_SCOPE_NOT_FOUND");
  }finally{clearTimeout(timer)}
 }
 const [area,key]=scope.split("/"),title=GROUP_TITLES[area]?.[key];
 if(!title)throw Error("UNKNOWN_TASK_SCOPE");
 const hints=body.prs===undefined?[]:body.prs;
 if(!Array.isArray(hints)||hints.length>15||!hints.every(v=>Number.isSafeInteger(v)&&v>0&&v<100000))throw Error("INVALID_PR_HINTS");
 return {title,project:area==="video"?"video":area==="platform"?"commander":"holistic",
  summary:"Публичная группа Agent Commander: "+title+". scope="+scope+". PR из дерева — ориентиры, а не подтверждение принадлежности или статуса; исполнитель обязан проверить актуальные HEAD/PR/CI.",
  relatedPr:[...new Set(hints)],tasks:[],scopePrHintsUnverified:true};
}

function cleanEvent(body){
  if(!uuid(body.eventId))throw Error("INVALID_EVENT_ID");
  if(!["owner","ai","note"].includes(body.kind))throw Error("INVALID_EVENT_KIND");
  const text=clean(body.text,1800);
  if(!text||String(body.text||"").length>1800)throw Error("INVALID_EVENT_TEXT");
  const ai=body.kind==="ai";
  return {schema:"HH_COMMANDER_EVENT_V1",id:body.eventId,
    kind:ai?"assistant_unverified":body.kind,
    author:body.kind==="owner"?"Владелец":ai?"AI-ответ · не доказательство исполнения":"Заметка владельца",
    text,model:ai?clean(body.model,100):"",sourceVerified:false,
    proofLevel:"NOT_CODE_OR_LIVE_PROOF",createdAt:new Date().toISOString()};
}

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*:free$/;
const PREFERENCE_KEY = /^(?:pr:[1-9][0-9]{0,7}|(?:ci-head|ai-commits):[A-Z][0-9]{2})$/;
function cleanModelName(value: unknown): string {
  return String(value || "").replace(/[\\u0000-\\u001f\\u007f]/g," ").trim().slice(0,120);
}
function preferenceKey(value: unknown): string {
  if(typeof value!=="string"||!PREFERENCE_KEY.test(value))throw Error("INVALID_MODEL_PREFERENCE_KEY");
  return value;
}
async function verifyFreeModel(modelId: unknown): Promise<{id:string,name:string,verifiedAt:string}> {
  if(typeof modelId!=="string"||!MODEL_ID.test(modelId))throw Error("INVALID_FREE_MODEL_ID");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try {
    const endpoint="https://openrouter.ai/api/v1/models?endpoints="+encodeURIComponent("/api/v1/chat/completions");
    const response=await fetch(endpoint,{method:"GET",redirect:"error",cache:"no-store",
      signal:controller.signal,headers:{Accept:"application/json"}});
    if(!response.ok)throw Error("OPENROUTER_CATALOG_HTTP_"+response.status);
    const raw=await response.text();
    if(raw.length>8*1024*1024)throw Error("OPENROUTER_CATALOG_TOO_LARGE");
    let body;try{body=JSON.parse(raw)}catch{throw Error("OPENROUTER_CATALOG_INVALID");}
    if(!Array.isArray(body?.data))throw Error("OPENROUTER_CATALOG_INVALID");
    const matches=body.data.filter((x:any)=>x?.id===modelId);
    if(matches.length!==1)throw Error("OPENROUTER_MODEL_NOT_IN_LIVE_CATALOG");
    const entry=matches[0],pricing=entry.pricing;
    if(!pricing||typeof pricing!=="object"||Array.isArray(pricing)||
       !Object.prototype.hasOwnProperty.call(pricing,"prompt")||
       !Object.prototype.hasOwnProperty.call(pricing,"completion"))
      throw Error("OPENROUTER_MODEL_PRICE_UNKNOWN");
    for(const value of Object.values(pricing)){
      if(!((typeof value==="number"||typeof value==="string")&&
        String(value).trim()!==""&&Number.isFinite(Number(value))))
        throw Error("OPENROUTER_MODEL_PRICE_UNKNOWN");
      if(Number(value)!==0)throw Error("OPENROUTER_MODEL_NOT_FREE");
    }
    if((entry.endpoints!==undefined&&
        (!Array.isArray(entry.endpoints)||!entry.endpoints.includes("/api/v1/chat/completions")))||
       !entry.architecture?.input_modalities?.includes("text")||
       !entry.architecture?.output_modalities?.includes("text"))
      throw Error("OPENROUTER_MODEL_NOT_TEXT_CHAT");
    return {id:modelId,name:cleanModelName(entry.name||modelId),verifiedAt:new Date().toISOString()};
  } finally {clearTimeout(timer);}
}

async function q(db,sql,params=[]){return await db.unsafe(sql,params);}
async function githubPublic(path){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
  try{
    const r=await fetch("https://api.github.com/repos/andylitvinov-design/books"+path,{
      cache:"no-store",redirect:"error",signal:ctl.signal,
      headers:{Accept:"application/vnd.github+json","User-Agent":"HH-Agent-Commander-Private-Store"}
    });
    if(!r.ok)throw Error("GITHUB_PUBLIC_READ_"+r.status);
    const text=await r.text();if(text.length>90000)throw Error("GITHUB_PROOF_TOO_LARGE");
    return JSON.parse(text);
  }finally{clearTimeout(timer)}
}

let githubOidcJwksCache = null;
let githubOidcJwksExpiresAt = 0;

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
function decodeJwtJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}
async function githubOidcJwks() {
  if (githubOidcJwksCache && Date.now() < githubOidcJwksExpiresAt) return githubOidcJwksCache;
  const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks", {
    method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw Error("GITHUB_OIDC_JWKS_UNAVAILABLE");
  const value = await response.json();
  if (!Array.isArray(value?.keys) || value.keys.length < 1 || value.keys.length > 20) throw Error("GITHUB_OIDC_JWKS_INVALID");
  githubOidcJwksCache = value;
  githubOidcJwksExpiresAt = Date.now() + 5 * 60 * 1000;
  return value;
}
async function verifyGitHubActionsOidc(req) {
  const authorization = req.headers.get("authorization") || "";
  const match = /^Bearer ([A-Za-z0-9._-]{100,8000})$/.exec(authorization);
  if (!match) return null;
  const token = match[1], parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = decodeJwtJson(parts[0]);
    const claims = decodeJwtJson(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" ||
        claims.iss !== "https://token.actions.githubusercontent.com" ||
        !(claims.aud === "hh-commander-ci" || (Array.isArray(claims.aud) && claims.aud.includes("hh-commander-ci")))) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat) ||
        claims.exp <= now || claims.exp > now + 15 * 60 ||
        claims.iat > now + 60 || claims.iat < now - 15 * 60 ||
        (Number.isSafeInteger(claims.nbf) && claims.nbf > now + 60)) return null;
    if (claims.repository !== "andylitvinov-design/books" ||
        claims.repository_owner !== "andylitvinov-design" ||
        claims.event_name !== "workflow_run" ||
        claims.ref !== "refs/heads/codex/bootstrap-books" ||
        claims.workflow_ref !== "andylitvinov-design/books/.github/workflows/hh-pr-direct-core-failure.yml@refs/heads/codex/bootstrap-books") return null;

    const jwks = await githubOidcJwks();
    const jwk = jwks.keys.find((item) => item.kid === header.kid && item.kty === "RSA" && (!item.use || item.use === "sig"));
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey("jwk", jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, publicKey,
      decodeBase64Url(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    return valid ? claims : null;
  } catch {
    return null;
  }
}

function normalizeTrustedCoreFailure(body) {
  const run = body?.workflow_run;
  const repo = "andylitvinov-design/books";
  const fail = new Set(["failure", "timed_out", "startup_failure"]);
  if (!run || body.action !== "completed" || run.event !== "pull_request" ||
      run.status !== "completed" || !fail.has(run.conclusion) ||
      run.repository?.full_name !== repo || run.head_repository?.full_name !== repo ||
      run.name !== "HH PR core release gate" ||
      run.path?.split("@")[0] !== ".github/workflows/hh-pr-core-release.yml" ||
      !Number.isSafeInteger(run.id) || run.id < 1 ||
      !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 ||
      !/^[a-f0-9]{40}$/i.test(run.head_sha || "") ||
      typeof run.head_branch !== "string" || run.head_branch.length > 255) return null;
  const links = run.pull_requests;
  if (!Array.isArray(links) || links.length !== 1) return null;
  const pr = links[0];
  if (!Number.isSafeInteger(pr?.number) || pr.number < 1 ||
      pr.base?.repo?.full_name !== repo || pr.base?.ref !== "codex/public-book-library" ||
      pr.head?.repo?.full_name !== repo || pr.head?.ref !== run.head_branch ||
      !/^[a-f0-9]{40}$/i.test(pr.head?.sha || "")) return null;
  const category = String(body.diagnostics?.category || "UNKNOWN");
  if (!new Set(["TYPESCRIPT", "TEST_FAILURE", "SECURITY", "INFRASTRUCTURE", "MERGE_CONFLICT", "BASE_ADVANCED", "UNKNOWN"]).has(category)) return null;
  const safeList = (value) => Array.isArray(value)
    ? value.slice(0, 10).map((x) => clean(String(x || ""), 160)).filter(Boolean) : [];
  return {
    repository: repo,
    workflow_name: run.name,
    workflow_path: ".github/workflows/hh-pr-core-release.yml",
    workflow_run_id: run.id,
    run_attempt: run.run_attempt,
    workflow_run_head_sha: run.head_sha.toLowerCase(),
    head_branch: run.head_branch,
    pr_number: pr.number,
    base_ref: pr.base.ref,
    base_sha: /^[a-f0-9]{40}$/i.test(pr.base.sha || "") ? pr.base.sha.toLowerCase() : null,
    head_ref: pr.head.ref,
    head_sha: pr.head.sha.toLowerCase(),
    conclusion: run.conclusion,
    category,
    failed_jobs: safeList(body.diagnostics?.failedJobs),
    failed_steps: safeList(body.diagnostics?.failedSteps),
    run_url: "https://github.com/" + repo + "/actions/runs/" + run.id,
    source_run_created_at: run.created_at || null
  };
}

async function receiveGitHubWorkflowRun(req, origin) {
  const claims = await verifyGitHubActionsOidc(req);
  if (!claims) return reply(401, { accepted: false, outcome: "GITHUB_OIDC_IDENTITY_REJECTED" }, origin);
  if (Number(req.headers.get("content-length") || "0") > 28000) return reply(413, { accepted: false, outcome: "BODY_TOO_LARGE" }, origin);
  const raw = await req.text();
  if (raw.length > 28000) return reply(413, { accepted: false, outcome: "BODY_TOO_LARGE" }, origin);
  let body;
  try { body = JSON.parse(raw); } catch { return reply(400, { accepted: false, outcome: "INVALID_JSON" }, origin); }
  const event = normalizeTrustedCoreFailure(body);
  if (!event) return reply(202, { accepted: false, outcome: "UNTRUSTED_OR_AMBIGUOUS_CORE_EVENT" }, origin);
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return reply(503, { accepted: false, outcome: "PRIVATE_DATABASE_NOT_CONFIGURED" }, origin);

  const db = postgres(dbUrl, { max: 1, connect_timeout: 6, idle_timeout: 4, ssl: "require", prepare: false });
  try {
    const inserted = await q(db,
      `insert into business_brain.commander_ci_event_inbox(
        repository, workflow_name, workflow_path, workflow_run_id, run_attempt,
        workflow_run_head_sha, head_branch, pr_number, base_ref, base_sha,
        head_ref, head_sha, conclusion, category, failed_jobs, failed_steps,
        run_url, source_run_created_at, oidc_workflow_ref
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18::timestamptz,$19)
      on conflict(repository,workflow_run_id,run_attempt,pr_number,head_sha) do nothing
      returning ci_event_id`,
      [event.repository,event.workflow_name,event.workflow_path,event.workflow_run_id,event.run_attempt,
       event.workflow_run_head_sha,event.head_branch,event.pr_number,event.base_ref,event.base_sha,
       event.head_ref,event.head_sha,event.conclusion,event.category,JSON.stringify(event.failed_jobs),
       JSON.stringify(event.failed_steps),event.run_url,event.source_run_created_at,claims.workflow_ref]);
    if (!inserted.length) {
      const existing = await q(db,
        `select ci_event_id,association_status from business_brain.commander_ci_event_inbox
         where repository=$1 and workflow_run_id=$2 and run_attempt=$3 and pr_number=$4 and head_sha=$5 limit 1`,
        [event.repository,event.workflow_run_id,event.run_attempt,event.pr_number,event.head_sha]);
      return reply(202, { accepted: true, outcome: "ALREADY_RECORDED",
        inbox_id: existing[0]?.ci_event_id || null, association: existing[0]?.association_status || "UNKNOWN",
        pr_number: event.pr_number, head_sha: event.head_sha }, origin);
    }

    const matches = await q(db,
      `select task_id, owner_id from business_brain.commander_tasks
       where project_key='holistic-house' and state not in ('completed','superseded')
         and coalesce(payload->'relatedPr','[]'::jsonb) @> to_jsonb($1::int)
       order by updated_at desc limit 2`, [event.pr_number]);
    let association = "UNMATCHED";
    if (matches.length === 1) {
      const chats = await q(db,
        `select chat_id from business_brain.commander_chats
         where task_id=$1::uuid and owner_id=$2::uuid order by updated_at desc limit 2`,
        [matches[0].task_id,matches[0].owner_id]);
      if (chats.length === 1) {
        const chatEvent = {
          schema: "HH_COMMANDER_EVENT_V1", id: crypto.randomUUID(),
          kind: "github_report", author: "GitHub Actions · verified CI",
          text: "Core CI failed for PR #" + event.pr_number + " at " + event.head_sha.slice(0,12) +
            ". Category: " + event.category + ". Failed jobs: " + event.failed_jobs.join(", ") +
            ". Failed steps: " + event.failed_steps.join(", ") + ". Repair has not been started by this event receiver.",
          source: { repository: event.repository, workflow_run_id: event.workflow_run_id,
            run_attempt: event.run_attempt, head_sha: event.head_sha, run_url: event.run_url },
          sourceVerified: true, proofLevel: "GITHUB_OIDC_AND_EXACT_PR_HEAD",
          createdAt: new Date().toISOString()
        };
        await q(db,
          `insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified)
           values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::jsonb,true)
           on conflict(event_id) do nothing`,
          [chatEvent.id,chats[0].chat_id,matches[0].owner_id,JSON.stringify(chatEvent)]);
        await q(db, `update business_brain.commander_chats set updated_at=now()
          where chat_id=$1::uuid and owner_id=$2::uuid`, [chats[0].chat_id,matches[0].owner_id]);
        association = "MATCHED_CHAT_EVENT_RECORDED";
      } else if (chats.length > 1) association = "AMBIGUOUS_TASK_CHATS";
      else association = "MATCHED_TASK_NO_CHAT";
      await q(db, `update business_brain.commander_ci_event_inbox
        set associated_task_id=$1::uuid,associated_owner_id=$2::uuid,association_status=$3
        where ci_event_id=$4::uuid`,
        [matches[0].task_id,matches[0].owner_id,association,inserted[0].ci_event_id]);
    } else if (matches.length > 1) association = "AMBIGUOUS_TASKS";

    return reply(202, { accepted: true, outcome: "RECORDED", inbox_id: inserted[0].ci_event_id,
      association, pr_number: event.pr_number, head_sha: event.head_sha }, origin);
  } catch (error) {
    console.error("COMMANDER_GITHUB_CI_INBOX_ERROR", error && error.name || "unknown");
    return reply(503, { accepted: false, outcome: "CI_EVENT_STORE_UNAVAILABLE" }, origin);
  } finally {
    await db.end({ timeout: 2 });
  }
}

async function handler(req){
  const origin=req.headers.get("origin")||"";
  const pathname=new URL(req.url).pathname;
  if(req.method==="POST"&&pathname.endsWith("/webhooks/github-workflow-run"))
    return await receiveGitHubWorkflowRun(req,origin);
  if(req.method==="OPTIONS")return ALLOWED_ORIGINS.has(origin)?reply(204,{},origin):reply(403,{error:"ORIGIN_DENIED"},origin);
  if(!["GET","POST"].includes(req.method))return reply(405,{error:"METHOD_NOT_ALLOWED"},origin);
  if(origin&&!ALLOWED_ORIGINS.has(origin))return reply(403,{error:"ORIGIN_DENIED"},origin);
  let body={},action;
  if(req.method==="GET"){
    const params=new URL(req.url).searchParams;
    action=params.get("action")||"status";
    for(const [key,value] of params.entries()){
      if(key==="action")continue;
      if(!["issueNumber","pr","limit"].includes(key))return reply(400,{error:"UNKNOWN_QUERY_PARAMETER"},origin);
      if(Object.prototype.hasOwnProperty.call(body,key))return reply(400,{error:"DUPLICATE_QUERY_PARAMETER"},origin);
      body[key]=value;
    }
  }
  else{
    if(Number(req.headers.get("content-length")||"0")>MAX_BODY_BYTES)return reply(413,{error:"BODY_TOO_LARGE"},origin);
    const raw=await req.text();if(raw.length>MAX_BODY_BYTES)return reply(413,{error:"BODY_TOO_LARGE"},origin);
    try{body=JSON.parse(raw)}catch{return reply(400,{error:"INVALID_JSON"},origin)}
    if(!body||typeof body!=="object"||Array.isArray(body))return reply(400,{error:"INVALID_BODY"},origin);
    action=body.action;
  }
  if(typeof action!=="string"||!/^[a-z_]{1,48}$/.test(action))return reply(400,{error:"UNKNOWN_ACTION"},origin);
  const ownerId=await authenticatedOwner(req);
  if(!ownerId)return reply(401,{error:"OWNER_SUPABASE_LOGIN_REQUIRED"},origin);
  const dbUrl=Deno.env.get("SUPABASE_DB_URL");
  if(!dbUrl)return reply(503,{error:"PRIVATE_DATABASE_NOT_CONFIGURED"},origin);
  const db=postgres(dbUrl,{max:1,connect_timeout:6,idle_timeout:4,ssl:"require",prepare:false});
  try{
    const acl=await q(db,"select can_read,can_write from business_brain.owner_access where user_id=$1::uuid limit 1",[ownerId]);
    if(!acl.length||!acl[0].can_read)return reply(403,{error:"OWNER_ACCESS_DENIED"},origin);
    const writable=acl[0].can_write===true;
    const writeActions=new Set(["commander_set_model_preference","commander_save_task","commander_queue_task","commander_from_task",
      "commander_create_chat","commander_update_chat","commander_append_event","commander_attach_event","commander_start_run"]);
    if(writeActions.has(action)&&!writable)return reply(403,{error:"OWNER_WRITE_DENIED"},origin);


    if(action==="commander_list_execution_runs"){
      const chatNumber=number(body.issueNumber);if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const chats=await q(db,"select chat_id from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!chats.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const runsSql="select run_id,executor,status,reason_code,request_sha256,hermes_job_id,executor_session_id,receipt,started_at,completed_at,created_at,updated_at from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid order by created_at desc limit 30";
      let runs=await q(db,runsSql,[ownerId,chats[0].chat_id]);
      const unfinished=runs.find(x=>!["COMPLETED","FAILED","CANCELLED"].includes(x.status)&&x.receipt?.dispatchAttempted===true);
      if(writable&&unfinished&&hermesConfiguration()){
        try{
          await refreshHermesRun(db,ownerId,chats[0].chat_id,unfinished.run_id);
          runs=await q(db,runsSql,[ownerId,chats[0].chat_id]);
        }catch(error){console.error("COMMANDER_HERMES_RECONCILE_UNCONFIRMED",error&&error.name||"Error");}
      }
      return reply(200,{schema:"HH_COMMANDER_EXECUTION_RUNS_V1",runs,storage:"SUPABASE_PRIVATE",
        dispatchEnabled:Boolean(hermesConfiguration()),observedAt:new Date().toISOString()},origin);
    }
    if(action==="commander_start_run"){
      const chatNumber=number(body.issueNumber);
      if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const runId=body.runId,idempotencyKey=body.idempotencyKey,executor=body.executor;
      const message=clean(body.message,5000);
      if(!uuid(runId)||!uuid(idempotencyKey)||!EXECUTORS.has(executor)||message.length<2||
         String(body.message||"").length>5000)return reply(400,{error:"INVALID_EXECUTION_REQUEST"},origin);
      const chats=await q(db,"select chat_id,task_id,payload,revision from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!chats.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const chat=chats[0],rawChat=chat.payload&&typeof chat.payload==="object"?chat.payload:{};
      // Prior conversation is read from this owner's private ledger, never trusted from the browser.
      const historyRows=await q(db,"select payload from business_brain.commander_chat_events where owner_id=$1::uuid and chat_id=$2::uuid order by created_at desc limit 10",[ownerId,chat.chat_id]);
      const priorHistory=historyRows.map(row=>row.payload&&typeof row.payload==="object"?row.payload:{})
        .reverse()
        .filter(item=>["owner","assistant_unverified"].includes(item.kind))
        .map(item=>({role:item.kind==="owner"?"user":"assistant",content:clean(item.text,240)}))
        .filter(item=>item.content);
      if(priorHistory.length&&priorHistory[priorHistory.length-1].role==="user"&&priorHistory[priorHistory.length-1].content===message)priorHistory.pop();
      const contextCapsule={
        schema:"HH_COMMANDER_TASK_CONTEXT_V1",chatId:chat.chat_id,taskId:chat.task_id||null,
        chatRevision:Number.isSafeInteger(chat.revision)?chat.revision:0,
        title:clean(rawChat.title,140),project:clean(rawChat.project,60),
        description:clean(rawChat.description,500),
        tasks:Array.isArray(rawChat.tasks)?rawChat.tasks.slice(0,6).map(x=>clean(x,90)).filter(Boolean):[],
        history:priorHistory.slice(-4),
        linkedPrHints:Array.isArray(rawChat.prs)?rawChat.prs.filter(x=>Number.isSafeInteger(x)&&x>0&&x<100000).slice(0,8):[],
        linkedPrHintsVerified:false,
        requiredBeforeSourceChange:"Resolve live GitHub PR and exact HEAD before any source change."
      };
      const canUseHermes=executor==="hermes";
      const modelId=typeof body.modelId==="string"?body.modelId:"";
      const validModel=MODEL_ID.test(modelId);
      const writeConfirmed=body.confirmGitHubWrite===true;
      if(writeConfirmed&&!canUseHermes)return reply(403,{error:"GITHUB_WRITE_REQUIRES_HERMES_EXECUTOR"},origin);
      const config=hermesConfiguration();
      const canDispatch=Boolean(canUseHermes&&config&&validModel);
      let reasonCode="EXECUTOR_TRANSPORT_NOT_CONFIGURED";
      if(canUseHermes)reasonCode=!config?"HERMES_RUNTIME_NOT_CONFIGURED":
        !validModel?"HERMES_FREE_MODEL_NOT_SELECTED":"HERMES_DISPATCH_REQUESTED";
      else if(executor==="openrouter")reasonCode="OPENROUTER_IS_ADVISOR_MODE_NOT_EXECUTOR";
      else if(executor==="codex")reasonCode="CODEX_LOCAL_AGENT_OFFLINE_OR_REMOTE_APPROVAL_DISABLED";
      else if(executor==="repair-worker")reasonCode="REPAIR_WORKER_REQUIRES_EXACT_PR_HEAD_AND_ACTIVE_LEASE";
      else if(executor==="chatgpt-work")reasonCode="CHATGPT_WORK_TRANSPORT_NOT_AVAILABLE";
      else if(executor==="local")reasonCode="LOCAL_ADVISOR_IS_NOT_AN_EXECUTOR";
      else if(executor==="manual")reasonCode="MANUAL_EXECUTOR_REQUIRES_OWNER_HANDOFF";
      const firstStatus=canDispatch?"STARTING":"BLOCKED";
      const hashInput=[chat.chat_id,executor,String(contextCapsule.chatRevision),message,modelId,String(writeConfirmed)].join(String.fromCharCode(31));
      const hashed=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(hashInput)));
      const requestSha256=Array.from(hashed,x=>x.toString(16).padStart(2,"0")).join("");
      const initialReceipt={dispatchAttempted:false,agentStarted:false,executionVerified:false,
        status:firstStatus,sourceWrite:null,model:modelId};
      const pendingText=canDispatch?"Задача зарегистрирована; подтверждение запуска Hermes ещё не получено.":
        "Задача сохранена, но запуск не подтверждён. Причина: "+reasonCode+".";
      const result=await db.begin(async tx=>{
        const inserted=await tx.unsafe("insert into business_brain.commander_execution_runs (run_id,owner_id,chat_id,task_id,idempotency_key,request_sha256,executor,status,reason_code,request_payload,receipt) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb) on conflict(owner_id,chat_id,idempotency_key) do nothing returning run_id,status,reason_code,request_sha256,executor,hermes_job_id,receipt,created_at",
         [runId,ownerId,chat.chat_id,chat.task_id||null,idempotencyKey,requestSha256,executor,
          firstStatus,reasonCode,JSON.stringify({message,contextCapsule,modelId,confirmGitHubWrite:writeConfirmed}),
          JSON.stringify(initialReceipt)]);
        let run=inserted[0],duplicate=false;
        if(!run){
          const prior=await tx.unsafe("select run_id,status,reason_code,request_sha256,executor,hermes_job_id,receipt,created_at from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid and idempotency_key=$3 limit 1",[ownerId,chat.chat_id,idempotencyKey]);
          if(!prior.length)return {conflict:true};
          run=prior[0];duplicate=true;
          if(run.request_sha256!==requestSha256||run.run_id!==runId)return {idempotencyConflict:true};
        }else{
          const eventPayload={schema:"HH_COMMANDER_EVENT_V1",id:runId,
            kind:canDispatch?"execution_requested":"execution_blocked",
            author:"Hermes Dispatcher",text:pendingText,executor,status:firstStatus,reasonCode,
            sourceVerified:false,proofLevel:"NOT_STARTED_NO_EXECUTION_RECEIPT",createdAt:new Date().toISOString()};
          // Physical DB kind CHECK permits 'note', not custom payload event kinds.
          await tx.unsafe("insert into business_brain.commander_chat_events (event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'note',$4::jsonb,false) on conflict(event_id) do nothing",
           [runId,chat.chat_id,ownerId,JSON.stringify(eventPayload)]);
          await tx.unsafe("update business_brain.commander_chats set execution_state=$1,payload=jsonb_set(payload,'{executionState}',$2::jsonb,true),updated_at=now() where owner_id=$3::uuid and chat_id=$4::uuid",
           [firstStatus,JSON.stringify(firstStatus),ownerId,chat.chat_id]);
        }
        return {run,duplicate};
      });
      if(result.conflict)return reply(409,{error:"RUN_IDEMPOTENCY_CONFLICT"},origin);
      if(result.idempotencyConflict)return reply(409,{error:"IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST"},origin);
      if(result.duplicate){
        return reply(200,{schema:"HH_COMMANDER_EXECUTION_RUN_V1",run:result.run,duplicate:true,
          agentStarted:result.run.receipt?.agentStarted===true,liveVerified:false,
          status:result.run.status,reasonCode:result.run.reason_code,storage:"SUPABASE_PRIVATE"},origin);
      }
      if(!canDispatch)return reply(200,{schema:"HH_COMMANDER_EXECUTION_RUN_V1",run:result.run,
        duplicate:false,dispatchAttempted:false,agentStarted:false,liveVerified:false,
        status:"BLOCKED",reasonCode,storage:"SUPABASE_PRIVATE"},origin);
      try{
        const remote=await hermesCall(config,"/commander/runs","POST",{
          runId,chatId:chat.chat_id,ownerId,projectKey:"holistic-house",message,model:modelId,
          confirmGitHubWrite:writeConfirmed,contextCapsule});
        const verified=trustedHermesReceipt(remote,runId,null,modelId);
        await saveHermesReceipt(db,ownerId,chat.chat_id,runId,verified);
        return reply(202,{schema:"HH_COMMANDER_EXECUTION_RUN_V1",
          run:{...result.run,status:verified.status,hermes_job_id:verified.jobId},
          duplicate:false,dispatchAttempted:true,agentStarted:verified.agentStarted,
          executionVerified:verified.executionVerified,liveVerified:false,
          status:verified.status,sourceWrite:verified.sourceWrite,reasonCode:verified.reasonCode,
          storage:"SUPABASE_PRIVATE"},origin);
      }catch(error){
        console.error("COMMANDER_HERMES_DISPATCH_UNCONFIRMED",error&&error.name||"Error");
        // A timeout can mean the remote accepted the request; do not retry blindly.
        const reason="HERMES_DISPATCH_UNCONFIRMED_RECONCILE";
        await q(db,"update business_brain.commander_execution_runs set status='BLOCKED',reason_code=$1,receipt=$2::jsonb,updated_at=now() where run_id=$3::uuid and owner_id=$4::uuid and chat_id=$5::uuid and status='STARTING'",
          [reason,JSON.stringify({dispatchAttempted:true,agentStarted:false,executionVerified:false,
            status:"BLOCKED",sourceWrite:null,model:modelId}),runId,ownerId,chat.chat_id]);
        return reply(202,{schema:"HH_COMMANDER_EXECUTION_RUN_V1",
          run:{...result.run,status:"BLOCKED",reason_code:reason},duplicate:false,
          dispatchAttempted:true,agentStarted:false,liveVerified:false,
          status:"BLOCKED",reasonCode:reason,storage:"SUPABASE_PRIVATE"},origin);
      }
    }
    if(action==="commander_list_ci_events"){
      const limit=Math.max(1,Math.min(100,Number(body.limit)||30));
      const pr=body.pr===undefined?null:number(body.pr);
      if(body.pr!==undefined&&!pr)return reply(400,{error:"INVALID_PR_NUMBER"},origin);
      const rows=await q(db,
        `select ci_event_id,repository,workflow_run_id,run_attempt,pr_number,head_sha,
          conclusion,category,failed_jobs,failed_steps,run_url,association_status,created_at
         from business_brain.commander_ci_event_inbox
         where ($1::int is null or pr_number=$1)
         order by created_at desc limit $2`,[pr,limit]);
      return reply(200,{schema:"HH_COMMANDER_CI_EVENT_INBOX_V1",events:rows,
        count:rows.length,sourceVerifiedBy:"GITHUB_OIDC_AND_EXACT_PR_HEAD"},origin);
    }
    if(action==="commander_list_model_preferences"){
      const rows=await q(db,"select preference_key,model_id,model_name,catalog_verified_at,updated_at from business_brain.commander_model_preferences where owner_id=$1::uuid order by updated_at desc limit 400",[ownerId]);
      return reply(200,{schema:"HH_PM_MODEL_PREFERENCES_V1",preferences:rows.map(r=>({
        key:r.preference_key,modelId:r.model_id,modelName:r.model_name,
        verifiedAt:r.catalog_verified_at,updatedAt:r.updated_at
      })),storage:"SUPABASE_PRIVATE",observedAt:new Date().toISOString()},origin);
    }
    if(action==="commander_set_model_preference"){
      const key=preferenceKey(body.preferenceKey);
      if(body.modelId===null){
        const removed=await q(db,"delete from business_brain.commander_model_preferences where owner_id=$1::uuid and preference_key=$2 returning preference_key",[ownerId,key]);
        return reply(200,{saved:true,removed:removed.length>0,key,storage:"SUPABASE_PRIVATE",
          preferenceOnly:true,agentStarted:false,observedAt:new Date().toISOString()},origin);
      }
      const verified=await verifyFreeModel(body.modelId);
      const saved=await q(db,"insert into business_brain.commander_model_preferences(owner_id,preference_key,model_id,model_name,catalog_verified_at) values($1::uuid,$2,$3,$4,$5::timestamptz) on conflict(owner_id,preference_key) do update set model_id=excluded.model_id,model_name=excluded.model_name,catalog_verified_at=excluded.catalog_verified_at,updated_at=now() returning preference_key,model_id,model_name,catalog_verified_at,updated_at",
        [ownerId,key,verified.id,verified.name,verified.verifiedAt]);
      if(!saved.length)return reply(503,{error:"MODEL_PREFERENCE_SAVE_UNCONFIRMED"},origin);
      const row=saved[0];
      return reply(200,{saved:true,key:row.preference_key,modelId:row.model_id,
        modelName:row.model_name,verifiedAt:row.catalog_verified_at,updatedAt:row.updated_at,
        storage:"SUPABASE_PRIVATE",preferenceOnly:true,agentStarted:false},origin);
    }
    if(action==="status")return reply(200,{ok:true,service:"AGENT_COMMANDER_PRIVATE_STORE_V1",
      owner:true,authenticated:true,privateStoreConfigured:true,executorDispatch:Boolean(hermesConfiguration()),executionRunLedger:true,dispatchReason:hermesConfiguration()?"HERMES_CONFIGURED_AWAITING_LIVE_EXECUTION_PROOF":"HERMES_RUNTIME_NOT_CONFIGURED",
      liveVerification:false,checkedAt:new Date().toISOString()},origin);

    if(action==="commander_list_tasks"){
      const rows=await q(db,"select task_number,task_id,title,state,revision,updated_at,payload from business_brain.commander_tasks where owner_id=$1::uuid order by updated_at desc limit 40",[ownerId]);
      return reply(200,{tasks:rows.map(r=>({issueNumber:Number(r.task_number),taskId:r.task_id,title:r.title,
        state:r.state,revision:r.revision,updatedAt:r.updated_at,relatedPr:r.payload?.relatedPr||[]})),
        storage:"SUPABASE_PRIVATE",incomplete:false},origin);
    }
    if(action==="commander_read_task"){
      const id=number(body.issueNumber);if(!id)return reply(400,{error:"INVALID_TASK_NUMBER"},origin);
      const rows=await q(db,"select task_number,task_id,title,state,revision,updated_at,payload from business_brain.commander_tasks where owner_id=$1::uuid and task_number=$2 limit 1",[ownerId,id]);
      if(!rows.length)return reply(404,{error:"TASK_NOT_FOUND"},origin);
      return reply(200,{issueNumber:Number(rows[0].task_number),record:rows[0].payload,state:rows[0].state,
        revision:rows[0].revision,updatedAt:rows[0].updated_at},origin);
    }
    if(action==="commander_save_task"){
      const record=taskRecord(body.record);let prior=[];
      if(body.issueNumber!==undefined&&body.issueNumber!==null){
        const id=number(body.issueNumber);if(!id)return reply(400,{error:"INVALID_TASK_NUMBER"},origin);
        prior=await q(db,"select task_number,task_id,state from business_brain.commander_tasks where owner_id=$1::uuid and task_number=$2 limit 1",[ownerId,id]);
        if(!prior.length||prior[0].task_id!==record.taskId)return reply(409,{error:"TASK_OWNER_OR_ID_MISMATCH"},origin);
      }else prior=await q(db,"select task_number,task_id,state from business_brain.commander_tasks where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,record.taskId]);
      const state=prior[0]?.state==="queued_review"?"queued_review":"draft";
      const saved=await q(db,"insert into business_brain.commander_tasks(task_id,owner_id,project_key,title,payload,state,revision) values($1::uuid,$2::uuid,'agent-commander',$3,$4::jsonb,$5,1) on conflict(task_id) do update set title=excluded.title,payload=excluded.payload,state=case when business_brain.commander_tasks.state='queued_review' then 'queued_review' else 'draft' end,revision=business_brain.commander_tasks.revision+1,updated_at=now() where business_brain.commander_tasks.owner_id=excluded.owner_id returning task_number,task_id,state,revision,updated_at",[record.taskId,ownerId,record.title,JSON.stringify(record),state]);
      if(!saved.length)return reply(409,{error:"TASK_OWNER_OR_ID_MISMATCH"},origin);
      return reply(200,{saved:true,issueNumber:Number(saved[0].task_number),taskId:saved[0].task_id,
        state:saved[0].state,revision:saved[0].revision,agentStarted:false,storage:"SUPABASE_PRIVATE",
        observedAt:saved[0].updated_at},origin);
    }
    if(action==="commander_queue_task"){
      const id=number(body.issueNumber);if(!id)return reply(400,{error:"INVALID_TASK_NUMBER"},origin);
      const rows=await q(db,"update business_brain.commander_tasks set state='queued_review',revision=revision+1,updated_at=now() where owner_id=$1::uuid and task_number=$2 returning task_number,updated_at",[ownerId,id]);
      if(!rows.length)return reply(404,{error:"TASK_NOT_FOUND"},origin);
      return reply(200,{queuedForReview:true,issueNumber:Number(rows[0].task_number),agentStarted:false,
        executionState:"NOT_STARTED_NO_EXECUTION_GATEWAY",observedAt:rows[0].updated_at},origin);
    }
    if(action==="commander_list_chats"){
      const rows=await q(db,"select chat_number,chat_id,title,status,revision,execution_state,updated_at,payload from business_brain.commander_chats where owner_id=$1::uuid order by updated_at desc limit 100",[ownerId]);
      return reply(200,{chats:rows.map(r=>({...r.payload,issueNumber:Number(r.chat_number),chatNumber:Number(r.chat_number),
        githubUpdatedAt:r.updated_at,updatedAt:r.updated_at,revision:r.revision,status:r.status,executionState:r.execution_state})),
        incomplete:false,storage:"SUPABASE_PRIVATE"},origin);
    }
    if(action==="commander_read_chat"){
      const id=number(body.issueNumber);if(!id)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const rows=await q(db,"select chat_number,chat_id,task_id,status,revision,execution_state,updated_at,payload from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,id]);
      if(!rows.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      // Reconcile only one active run during an owner-driven chat read.
      // Never mark a task complete based on a queued or generated message.
      if(writable&&hermesConfiguration()){
        const active=await q(db,"select run_id from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid and status in ('STARTING','RUNNING','BLOCKED') and receipt->>'dispatchAttempted'='true' order by created_at desc limit 1",[ownerId,rows[0].chat_id]);
        if(active.length){
          try{await refreshHermesRun(db,ownerId,rows[0].chat_id,active[0].run_id);}
          catch(error){console.error("COMMANDER_HERMES_RECONCILE_UNCONFIRMED",error&&error.name||"Error");}
        }
      }
      const events=await q(db,"select payload from business_brain.commander_chat_events where owner_id=$1::uuid and chat_id=$2::uuid order by created_at asc limit 400",[ownerId,rows[0].chat_id]);
      const chat={...rows[0].payload,issueNumber:Number(rows[0].chat_number),githubUpdatedAt:rows[0].updated_at,
        updatedAt:rows[0].updated_at,revision:rows[0].revision,status:rows[0].status,executionState:rows[0].execution_state};
      return reply(200,{chat,messages:events.map(e=>e.payload),truncated:false},origin);
    }

    if(action==="commander_from_scope"){
      const resolved=await resolveScope(body.scope,body),taskId=await stableScopeId(ownerId,body.scope);
      const source={schema:"HH_COMMANDER_TASK_V1",taskId,title:resolved.title,project:"commander",
        priority:"4",area:"Agent Commander",source:"Public task scope "+body.scope,summary:resolved.summary,
        plan:"Continue this exact task. Verify project memory, owner policy, current PR HEAD, CI and executor lease before code changes.",
        prompt:"Continue the existing task conversation for "+resolved.title+". Preserve prior context and recheck all live facts.",
        executor:"manual",mode:"analysis",relatedPr:resolved.relatedPr,
        restrictions:{noCost:true,noDuplicate:true,verifyLive:true},taskScope:body.scope,
        scopePrHintsUnverified:resolved.scopePrHintsUnverified===true};
      const taskRows=await q(db,"insert into business_brain.commander_tasks(task_id,owner_id,project_key,title,payload,state,revision) values($1::uuid,$2::uuid,'agent-commander',$3,$4::jsonb,'draft',1) on conflict(task_id) do nothing returning task_number",[taskId,ownerId,resolved.title,JSON.stringify(source)]);
      let taskNumber=taskRows.length?Number(taskRows[0].task_number):null;
      if(!taskNumber){
        const priorTask=await q(db,"select task_number,owner_id,payload from business_brain.commander_tasks where task_id=$1::uuid limit 1",[taskId]);
        if(!priorTask.length||priorTask[0].owner_id!==ownerId||priorTask[0].payload?.taskScope!==body.scope)return reply(409,{error:"TASK_SCOPE_ID_COLLISION_HOLD"},origin);
        taskNumber=Number(priorTask[0].task_number);
      }
      const priorChat=await q(db,"select chat_number,payload from business_brain.commander_chats where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,taskId]);
      if(priorChat.length)return reply(200,{issueNumber:Number(priorChat[0].chat_number),created:false,
        chat:{...priorChat[0].payload,issueNumber:Number(priorChat[0].chat_number)},agentStarted:false},origin);
      const chat={schema:"HH_COMMANDER_THREAD_V1",id:taskId,title:resolved.title,project:resolved.project,
        description:resolved.summary,taskId,taskIssueNumber:taskNumber,taskScope:body.scope,tasks:resolved.tasks,
        executors:["manual"],prs:resolved.relatedPr,scopePrHintsUnverified:resolved.scopePrHintsUnverified===true,
        status:"assigned",revision:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
        executionState:"AWAITING_EXECUTOR_NOT_DISPATCHED",liveVerified:false};
      const inserted=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,task_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$1::uuid,$3,$4::jsonb,'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1) on conflict(task_id) do nothing returning chat_number",[taskId,ownerId,resolved.title,JSON.stringify(chat)]);
      if(!inserted.length){
        const raced=await q(db,"select chat_number,payload from business_brain.commander_chats where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,taskId]);
        if(!raced.length)return reply(409,{error:"TASK_CHAT_COLLISION_HOLD"},origin);
        return reply(200,{issueNumber:Number(raced[0].chat_number),created:false,chat:{...raced[0].payload,issueNumber:Number(raced[0].chat_number)},agentStarted:false},origin);
      }
      return reply(201,{issueNumber:Number(inserted[0].chat_number),created:true,chat,agentStarted:false},origin);
    }
    if(action==="commander_from_task"){
      const taskId=String(body.taskId||"");if(!uuid(taskId))return reply(400,{error:"INVALID_TASK_ID"},origin);
      const tasks=await q(db,"select task_number,task_id,payload from business_brain.commander_tasks where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,taskId]);
      if(!tasks.length)return reply(404,{error:"TASK_NOT_SAVED"},origin);
      const task=tasks[0],existing=await q(db,"select chat_number,payload from business_brain.commander_chats where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,taskId]);
      if(existing.length)return reply(200,{issueNumber:Number(existing[0].chat_number),created:false,
        chat:{...existing[0].payload,issueNumber:Number(existing[0].chat_number)},agentStarted:false},origin);
      const r=task.payload,title=clean(r.title,110)||"Agent Commander task";
      const chat={schema:"HH_COMMANDER_THREAD_V1",id:taskId,title,
        project:PROJECTS.has(r.project)?r.project:"commander",description:clean(r.summary||r.source,1000),
        taskId,taskIssueNumber:Number(task.task_number),tasks:[],
        prs:Array.isArray(r.relatedPr)?r.relatedPr.filter(n=>Number.isSafeInteger(n)&&n>0&&n<100000).slice(0,15):[],
        executors:EXECUTORS.has(r.executor)?[r.executor]:["manual"],status:"assigned",revision:1,
        createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
        executionState:"AWAITING_EXECUTOR_NOT_DISPATCHED",liveVerified:false};
      const inserted=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,task_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$1::uuid,$3,$4::jsonb,'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1) on conflict(task_id) do nothing returning chat_number",[taskId,ownerId,title,JSON.stringify(chat)]);
      if(!inserted.length){
        const raced=await q(db,"select chat_number,payload from business_brain.commander_chats where owner_id=$1::uuid and task_id=$2::uuid limit 1",[ownerId,taskId]);
        if(!raced.length)return reply(409,{error:"TASK_CHAT_COLLISION_HOLD"},origin);
        return reply(200,{issueNumber:Number(raced[0].chat_number),created:false,chat:{...raced[0].payload,issueNumber:Number(raced[0].chat_number)},agentStarted:false},origin);
      }
      return reply(201,{issueNumber:Number(inserted[0].chat_number),created:true,chat,agentStarted:false},origin);
    }
    if(action==="commander_create_chat"){
      const chat=normalizeChat(body.chat);
      const existing=await q(db,"select chat_number,payload from business_brain.commander_chats where owner_id=$1::uuid and chat_id=$2::uuid limit 1",[ownerId,chat.id]);
      if(existing.length)return reply(200,{issueNumber:Number(existing[0].chat_number),created:false,alreadyExists:true,
        chat:{...existing[0].payload,issueNumber:Number(existing[0].chat_number)}},origin);
      const rows=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$3,$4::jsonb,$5,'UNVERIFIED_ASSIGNMENT_ONLY',$6) on conflict(chat_id) do nothing returning chat_number",[chat.id,ownerId,chat.title,JSON.stringify(chat),chat.status,chat.revision]);
      if(!rows.length)return reply(409,{error:"CHAT_OWNER_OR_ID_MISMATCH"},origin);
      return reply(201,{issueNumber:Number(rows[0].chat_number),created:true,chat,agentStarted:false},origin);
    }
    if(action==="commander_update_chat"){
      const id=number(body.issueNumber);if(!id)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const prior=await q(db,"select chat_number,chat_id,task_id,payload,status,revision from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,id]);
      if(!prior.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      if(body.expectedRevision!==prior[0].revision)return reply(409,{error:"STALE_CHAT_REVISION",revision:prior[0].revision},origin);
      const updated=normalizeChat(body.chat,prior[0].payload);
      const payload={...updated,taskId:prior[0].task_id||prior[0].payload.taskId||null,
        taskIssueNumber:prior[0].payload.taskIssueNumber||null};
      const rows=await q(db,"update business_brain.commander_chats set title=$1,payload=$2::jsonb,status=$3,revision=$4,updated_at=now() where owner_id=$5::uuid and chat_number=$6 and revision=$7 returning chat_number",[payload.title,JSON.stringify(payload),payload.status,payload.revision,ownerId,id,prior[0].revision]);
      if(!rows.length)return reply(409,{error:"STALE_CHAT_REVISION"},origin);
      return reply(200,{updated:true,issueNumber:Number(rows[0].chat_number),chat:payload,agentStarted:false},origin);
    }
    if(action==="commander_append_event"){
      const chatNumber=number(body.issueNumber);if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const rows=await q(db,"select chat_id from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!rows.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const event=cleanEvent(body);
      const prior=await q(db,"select payload from business_brain.commander_chat_events where event_id=$1::uuid and owner_id=$2::uuid limit 1",[event.id,ownerId]);
      if(prior.length)return reply(200,{appended:false,duplicate:true,event:prior[0].payload},origin);
      const count=await q(db,"select count(*)::int as total from business_brain.commander_chat_events where owner_id=$1::uuid and chat_id=$2::uuid",[ownerId,rows[0].chat_id]);
      if(count[0].total>=400)return reply(409,{error:"CHAT_EVENT_LIMIT_REACHED_EXPORT_REQUIRED"},origin);
      const inserted=await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb,false) on conflict(event_id) do nothing returning event_id",[event.id,rows[0].chat_id,ownerId,event.kind,JSON.stringify(event)]);
      if(!inserted.length)return reply(200,{appended:false,duplicate:true,event},origin);
      await q(db,"update business_brain.commander_chats set updated_at=now() where owner_id=$1::uuid and chat_id=$2::uuid",[ownerId,rows[0].chat_id]);
      return reply(201,{appended:true,event,agentStarted:false},origin);
    }
    if(action==="commander_attach_event"){
      const chatNumber=number(body.issueNumber);if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const rows=await q(db,"select chat_id from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!rows.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const m=String(body.url||"").match(/^https:\/\/github\.com\/andylitvinov-design\/books\/issues\/(1419|3128|3890)#issuecomment-(\d{1,14})$/);
      if(!m)return reply(400,{error:"REPORT_URL_NOT_ALLOWED"},origin);
      const comment=await githubPublic("/issues/comments/"+m[2]);
      if(!Number.isSafeInteger(comment.id)||String(comment.id)!==m[2]||
        comment.issue_url!=="https://api.github.com/repos/andylitvinov-design/books/issues/"+m[1])
        return reply(400,{error:"REPORT_PROVENANCE_UNVERIFIED"},origin);
      const eventId=body.eventId;if(!uuid(eventId))return reply(400,{error:"INVALID_EVENT_ID"},origin);
      const text=clean(String(comment.body||"").replace(/<!--[\s\S]*?-->/g,"").replace(/(?:ghp_|gho_|sk-)[A-Za-z0-9_-]{16,}/g,"[REDACTED]"),1600);
      const event={schema:"HH_COMMANDER_EVENT_V1",id:eventId,kind:"github_report",author:"GitHub report",
        text,url:body.url,sourceVerified:false,proofLevel:"REPORT_ONLY_NOT_COMMIT",createdAt:new Date().toISOString()};
      const inserted=await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::jsonb,false) on conflict(event_id) do nothing returning event_id",[eventId,rows[0].chat_id,ownerId,JSON.stringify(event)]);
      if(!inserted.length)return reply(200,{appended:false,duplicate:true,event},origin);
      await q(db,"update business_brain.commander_chats set updated_at=now() where owner_id=$1::uuid and chat_id=$2::uuid",[ownerId,rows[0].chat_id]);
      return reply(201,{appended:true,event,agentStarted:false},origin);
    }
    if(action==="commander_pr_proof"){
      const pr=number(body.pr);if(!pr)return reply(400,{error:"INVALID_PR"},origin);
      const value=await githubPublic("/pulls/"+pr);
      if(value.number!==pr)return reply(400,{error:"PR_NUMBER_MISMATCH"},origin);
      return reply(200,{pr,open:value.state==="open",draft:!!value.draft,
        headSha:clean(value.head?.sha,40),base:value.base?.ref||"UNKNOWN",
        merged:!!value.merged_at,mergedAt:value.merged_at||null,mergeSha:value.merge_commit_sha||null,
        ciVerified:false,liveVerified:false,
        meaning:"PR metadata only; exact-HEAD checks and LIVE require independent receipts"},origin);
    }
    return reply(400,{error:"UNKNOWN_ACTION"},origin);
  }catch(error){
    console.error("AGENT_COMMANDER_PRIVATE_STORE_ERROR",error&&error.name?error.name:"unknown");
    const message=String(error&&error.message||"STORE_UNAVAILABLE").slice(0,120);
    const known=/^(INVALID_|TASK_|CHAT_|STALE_|REPORT_|UNKNOWN_|OWNER_)/.test(message);
    return reply(known?400:503,{error:known?message:"PRIVATE_STORE_UNAVAILABLE"},origin);
  }finally{await db.end({timeout:2});}
}
Deno.serve(handler);
