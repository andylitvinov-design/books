// Synced from production Supabase Edge Function v19. Keep this repository copy deployable and authoritative.
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

const DIRECTOR_RUN_SCHEMA="HH_AGENT_DIRECTOR_RUN_V1";
const DIRECTOR_STATES=new Set(["COMPLETED","BLOCKED"]);
const DIRECTOR_ORIGIN="https://holistichouse.vercel.app";
async function ownedDirectorCall(req,data){
 const authorization=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._-]{120,8000}$/.test(authorization))throw Error("OWNER_TOKEN_NOT_AVAILABLE");
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),27000);
 try{
  const response=await fetch(DIRECTOR_ORIGIN+"/api/agent-director/commander-run",{
   method:"POST",redirect:"error",cache:"no-store",signal:ctl.signal,
   headers:{authorization,"content-type":"application/json","accept":"application/json"},body:JSON.stringify(data)});
  const raw=await response.text();if(raw.length>8000)throw Error("AGENT_DIRECTOR_RECEIPT_TOO_LARGE");
  let value;try{value=JSON.parse(raw)}catch{throw Error("AGENT_DIRECTOR_RECEIPT_INVALID_JSON")}
  if(!response.ok)throw Error("AGENT_DIRECTOR_HTTP_"+response.status);
  return value;
 }finally{clearTimeout(timer)}
}
function trustedOwnedDirectorReceipt(value,run){
 if(!value||value.schema!==DIRECTOR_RUN_SCHEMA||value.runId!==run.run_id||value.chatId!==run.chat_id||
  value.ownerId!==run.owner_id||!DIRECTOR_STATES.has(value.status)||
  typeof value.agentStarted!=="boolean"||typeof value.executionVerified!=="boolean"||
  (value.status==="COMPLETED"&&(!value.agentStarted||!value.executionVerified||
    typeof value.result!=="string"||!value.result.trim()))||
  (value.status==="BLOCKED"&&(value.executionVerified||value.agentStarted))||value.sourceWrite!==null||
  value.proofLevel!==(value.status==="COMPLETED"?"AGENT_DIRECTOR_READ_ONLY_RESPONSE":"NOT_STARTED"))
  throw Error("AGENT_DIRECTOR_RECEIPT_NOT_VERIFIED");
 return {status:value.status,reasonCode:clean(value.reasonCode,110)||null,
  agentStarted:value.agentStarted,executionVerified:value.executionVerified,model:clean(value.model,120)||null,
  result:value.status==="COMPLETED"?clean(value.result,1800):"",sourceWrite:null,proofLevel:value.proofLevel};
}
async function saveOwnedDirectorReceipt(db,ownerId,chatId,runId,report){
 const selected=await q(db,"select request_payload from business_brain.commander_execution_runs where run_id=$1::uuid and owner_id=$2::uuid and chat_id=$3::uuid limit 1",[runId,ownerId,chatId]);
 if(!selected.length||selected[0].request_payload?.confirmGitHubWrite===true)throw Error("AGENT_DIRECTOR_RUN_PROVENANCE_MISMATCH");
 const done=report.status==="COMPLETED";
 const receipt={schema:DIRECTOR_RUN_SCHEMA,dispatchAttempted:true,agentStarted:report.agentStarted,
  executionVerified:report.executionVerified,model:report.model,status:report.status,sourceWrite:null,
  result:report.result,proofLevel:report.proofLevel,checkedAt:new Date().toISOString()};
 const rows=await q(db,"update business_brain.commander_execution_runs set status=$1,reason_code=$2,receipt=$3::text::jsonb,started_at=case when $4::boolean then coalesce(started_at,now()) else started_at end,completed_at=case when $5::boolean then coalesce(completed_at,now()) else completed_at end,updated_at=now() where run_id=$6::uuid and owner_id=$7::uuid and chat_id=$8::uuid and status not in ('COMPLETED','FAILED','CANCELLED') returning run_id",
  [report.status,report.reasonCode||"AGENT_DIRECTOR_"+report.status,jsonbText(receipt),report.agentStarted,done,runId,ownerId,chatId]);
 if(!rows.length)return report;
 const eventId=await stableScopeId(ownerId,"agent-director:"+runId+":final");
 const text=done?"Ответ Agent Director (собственная модель, read-only): "+report.result+"\nИсходный код не менялся. GitHub PR, CI и LIVE не подтверждены.":
  "Запуск Agent Director заблокирован: "+(report.reasonCode||"OWNED_MODEL_RUNTIME_NOT_CONFIGURED")+".";
 const event={schema:"HH_COMMANDER_EVENT_V1",id:eventId,kind:"agent_final",author:"Agent Director",
  text:clean(text,1800),status:report.status,model:report.model,sourceWrite:null,sourceVerified:false,
  proofLevel:report.proofLevel,createdAt:new Date().toISOString()};
 await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'note',$4::text::jsonb,false) on conflict(event_id) do nothing",
  [eventId,chatId,ownerId,jsonbText(event)]);
 await q(db,"update business_brain.commander_chats set execution_state=$1,updated_at=now() where owner_id=$2::uuid and chat_id=$3::uuid",
  [done?"COMPLETED_UNVERIFIED":"BLOCKED",ownerId,chatId]);
 return report;
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
  const goal=clean(input.goal===undefined?(previous?.goal||description||title):input.goal,2000);
  if(String(input.goal||"").length>2000||!goal)throw Error("INVALID_CHAT_GOAL");
  const criteria=input.acceptanceCriteria===undefined?(previous?.acceptanceCriteria||[]):input.acceptanceCriteria;
  if(!Array.isArray(criteria)||criteria.length>5||
     criteria.some(v=>typeof v!=="string"||!clean(v,500)||v.length>500)||
     criteria.reduce((sum,v)=>sum+v.length,0)>2500)throw Error("INVALID_CHAT_ACCEPTANCE_CRITERIA");
  const skills=input.skillIds===undefined?(previous?.skillIds||[]):input.skillIds;
  if(!Array.isArray(skills)||skills.length>10||
     skills.some(v=>typeof v!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(v))||
     new Set(skills).size!==skills.length)throw Error("INVALID_CHAT_SKILL_IDS");
  const now=new Date().toISOString();
  return {schema:"HH_COMMANDER_THREAD_V1",id,title,project:input.project,description,goal,
    acceptanceCriteria:criteria.map(v=>clean(v,500)),skillIds:[...skills],
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

// postgres.js encodes values according to the SQL parameter type. A pre-serialized
// JSON string bound as jsonb becomes a JSON string scalar; bind it as TEXT and
// cast once in SQL to preserve objects and arrays as native JSONB values.
function jsonbText(value){
  const encoded=JSON.stringify(value);
  if(typeof encoded!=="string")throw Error("INVALID_JSONB_PARAMETER");
  return encoded;
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
  const categories = new Set(["SECURITY","ACCESS_CONFIG","MERGE_CONFLICT","BASE_ADVANCED",
    "BASE_OR_CI_ROUTING","INFRASTRUCTURE","AUTOMATION_PROCESS","AI_EXECUTOR","INTEGRATION",
    "TYPESCRIPT","TEST_FAILURE","SOURCE_CODE","UNKNOWN"]);
  if (!categories.has(category)) return null;
  const incoming = body.diagnostics?.classification;
  let classification = null;
  if (incoming !== undefined && incoming !== null) {
    if (!incoming || incoming.schema !== "HH_CI_ERROR_CLASSIFICATION_V1" ||
        incoming.ruleset_version !== "1.1.0" || incoming.category !== category ||
        !Number.isFinite(incoming.confidence) || incoming.confidence < 0 || incoming.confidence > 1 ||
        typeof incoming.reason_code !== "string" || !/^[A-Z0-9_]{3,90}$/.test(incoming.reason_code) ||
        typeof incoming.recommended_action !== "string" || incoming.recommended_action.length > 500 ||
        typeof incoming.recommended_status !== "string" || incoming.recommended_status.length > 48 ||
        typeof incoming.responsible_role !== "string" || incoming.responsible_role.length > 80 ||
        typeof incoming.requires_human !== "boolean" || incoming.status !== "DIAGNOSTIC_ONLY" ||
        incoming.source_write_authorized !== false || incoming.execution_authorized !== false ||
        !incoming.retry || typeof incoming.retry.allowed !== "boolean" ||
        !Number.isInteger(incoming.retry.max_attempts) || incoming.retry.max_attempts < 0 ||
        incoming.retry.max_attempts > 2 ||
        (incoming.strategy_code!==undefined &&
          (typeof incoming.strategy_code!=="string" || !/^[A-Z0-9_]{3,90}$/.test(incoming.strategy_code))) ||
        (incoming.next_action!==undefined &&
          (typeof incoming.next_action!=="string" || !/^[A-Z0-9_]{3,90}$/.test(incoming.next_action))) ||
        typeof incoming.retry.condition !== "string" || incoming.retry.condition.length > 300) return null;
    classification = {
      schema: incoming.schema, ruleset_version: incoming.ruleset_version,
      category: incoming.category, confidence: incoming.confidence,
      reason_code: incoming.reason_code,
      strategy_code: typeof incoming.strategy_code==="string"?incoming.strategy_code:null,
      next_action: typeof incoming.next_action==="string"?incoming.next_action:null,
      evidence_code: typeof incoming.evidence_code === "string" ? clean(incoming.evidence_code, 90) : null,
      recommended_action: clean(incoming.recommended_action, 500),
      recommended_status: clean(incoming.recommended_status, 48),
      responsible_role: clean(incoming.responsible_role, 80),
      retry: { allowed: incoming.retry.allowed, max_attempts: incoming.retry.max_attempts,
        condition: clean(incoming.retry.condition, 300) },
      requires_human: incoming.requires_human,
      status: incoming.status,
      source_write_authorized: false, execution_authorized: false
    };
  }
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
    classification,
    failed_jobs: safeList(body.diagnostics?.failedJobs),
    failed_steps: safeList(body.diagnostics?.failedSteps),
    run_url: "https://github.com/" + repo + "/actions/runs/" + run.id,
    source_run_created_at: run.created_at || null
  };
}


// Never drop an owner-scoped Core failure for lack of a pre-existing task.
// Task/chat are idempotent per PR+HEAD; this is NOT a worker dispatch.
async function ensureCiIncidentTask(db,ownerId,e){
 const scope="github-ci:"+e.repository+":"+e.pr_number+":"+e.head_sha;
 const id=await stableScopeId(ownerId,scope),at=new Date().toISOString();
 const strategy=e.classification?.strategy_code||"SECONDARY_DIAGNOSIS";
 const next=e.classification?.next_action||"INSPECT_CAUSAL_JOB_AND_CLASSIFY_AGAIN";
 const role=e.classification?.responsible_role||"ci-diagnostic-triage";
 const title=clean("CI PR #"+e.pr_number+" · "+e.category,110);
 const desc=clean("Core CI failed: "+e.category+"; "+
  (e.classification?.reason_code||"UNCLASSIFIED_FAILURE")+"; HEAD "+e.head_sha+
  "; evidence "+e.run_url,3000);
 const incident={schema:"HH_CI_INCIDENT_TASK_V1",repository:e.repository,
  pr_number:e.pr_number,head_sha:e.head_sha,category:e.category,
  ruleset_version:e.classification?.ruleset_version||"UNCLASSIFIED",
  reason_code:e.classification?.reason_code||"UNCLASSIFIED_FAILURE",
  strategy_code:strategy,responsible_role:role,next_action:next,
  next_check_at:new Date(Date.now()+900000).toISOString(),first_run_id:e.workflow_run_id,
  run_url:e.run_url,state:"CLASSIFIED_NOT_DISPATCHED",
  executor_started:false,source_verified:false,live_verified:false};
 const payload={schema:"HH_COMMANDER_TASK_V1",taskId:id,title,project:"commander",
  priority:"1",area:"PR CI repair",source:e.run_url,summary:desc,
  plan:"Verify exact HEAD and strategy "+strategy+". Owner "+role+
   ". Next: "+next+". Use only the guarded dispatcher; independently verify new SHA and required checks.",
  prompt:"Diagnose PR #"+e.pr_number+" HEAD "+e.head_sha+
   "; strategy "+strategy+"; next "+next+"; proof "+e.run_url+
   ". This task is NOT authorization for writes, retries, merge, or deployment.",
  executor:"manual",mode:"analysis",relatedPr:[e.pr_number],
  restrictions:{noCost:true,noDuplicate:true,verifyLive:true},ciIncident:incident};
 const inserted=await q(db,
  "insert into business_brain.commander_tasks(task_id,owner_id,project_key,title,payload,state,revision) "+
  "values($1::uuid,$2::uuid,'agent-commander',$3,$4::text::jsonb,'queued_review',1) "+
  "on conflict(task_id) do nothing returning task_id",[id,ownerId,title,jsonbText(payload)]);
 const tasks=await q(db,
  "select task_number,owner_id,project_key,payload from business_brain.commander_tasks "+
  "where task_id=$1::uuid limit 2",[id]);
 if(tasks.length!==1||tasks[0].owner_id!==ownerId||tasks[0].project_key!=="agent-commander"||
    tasks[0].payload?.ciIncident?.repository!==e.repository||
    tasks[0].payload?.ciIncident?.pr_number!==e.pr_number||
    tasks[0].payload?.ciIncident?.head_sha!==e.head_sha)throw Error("CI_TASK_IDENTITY_UNVERIFIED");
 const chat={schema:"HH_COMMANDER_THREAD_V1",id,title,project:"commander",
  description:desc,taskId:id,taskIssueNumber:Number(tasks[0].task_number),
  taskScope:scope,tasks:[],executors:["manual"],prs:[e.pr_number],
  status:"assigned",revision:1,createdAt:at,updatedAt:at,
  executionState:"AWAITING_EXECUTOR_NOT_DISPATCHED",liveVerified:false};
 await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,task_id,title,payload,status,execution_state,revision) "+
  "values($1::uuid,$2::uuid,$1::uuid,$3,$4::text::jsonb,'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1) "+
  "on conflict(task_id) do nothing",[id,ownerId,title,jsonbText(chat)]);
 const chats=await q(db,"select chat_id,owner_id from business_brain.commander_chats "+
  "where task_id=$1::uuid and owner_id=$2::uuid limit 2",[id,ownerId]);
 if(chats.length!==1||chats[0].owner_id!==ownerId)throw Error("CI_TASK_CHAT_UNVERIFIED");
 const eventId=await stableScopeId(ownerId,
  "github-ci:"+e.workflow_run_id+":"+e.run_attempt+":"+e.pr_number+":"+e.head_sha);
 const report={schema:"HH_COMMANDER_EVENT_V1",id:eventId,kind:"github_report",
  author:"GitHub Actions · verified CI",
  text:"Core failure PR #"+e.pr_number+": "+e.category+
   "; strategy "+strategy+"; owner "+role+"; next "+next+
   ". Task recorded; executor NOT started.",
  source:{repository:e.repository,workflow_run_id:e.workflow_run_id,
   run_attempt:e.run_attempt,head_sha:e.head_sha,run_url:e.run_url},
  sourceVerified:true,proofLevel:"GITHUB_OIDC_AND_EXACT_PR_HEAD",createdAt:at};
 await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) "+
  "values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::text::jsonb,true) "+
  "on conflict(event_id) do nothing",[eventId,chats[0].chat_id,ownerId,jsonbText(report)]);
 return {taskId:id,created:inserted.length===1};
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
    const readableOwners=await q(db,
      "select user_id from business_brain.owner_access where can_read=true order by approved_at desc limit 2");
    if(readableOwners.length!==1)return reply(503,
      {accepted:false,outcome:"CI_INBOX_OWNER_SCOPE_AMBIGUOUS"},origin);
    const inboxOwnerId=readableOwners[0].user_id;
    const inserted = await q(db,
      `insert into business_brain.commander_ci_event_inbox(
        repository, workflow_name, workflow_path, workflow_run_id, run_attempt,
        workflow_run_head_sha, head_branch, pr_number, base_ref, base_sha,
        head_ref, head_sha, conclusion, category, classification, failed_jobs, failed_steps,
        run_url, source_run_created_at, oidc_workflow_ref, inbox_owner_id
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::text::jsonb,$16::text::jsonb,$17::text::jsonb,$18,$19::timestamptz,$20,$21::uuid)
      on conflict(repository,workflow_run_id,run_attempt,pr_number,head_sha) do nothing
      returning ci_event_id`,
      [event.repository,event.workflow_name,event.workflow_path,event.workflow_run_id,event.run_attempt,
       event.workflow_run_head_sha,event.head_branch,event.pr_number,event.base_ref,event.base_sha,
       event.head_ref,event.head_sha,event.conclusion,event.category,
       event.classification ? jsonbText(event.classification) : null,
       jsonbText(event.failed_jobs),jsonbText(event.failed_steps),event.run_url,
       event.source_run_created_at,claims.workflow_ref,inboxOwnerId]);
    let inboxId=inserted[0]?.ci_event_id||null,duplicate=false;
    if (!inboxId) {
      duplicate=true;
      const existing = await q(db,
        `select ci_event_id,inbox_owner_id from business_brain.commander_ci_event_inbox
         where repository=$1 and workflow_run_id=$2 and run_attempt=$3 and pr_number=$4 and head_sha=$5 limit 1`,
        [event.repository,event.workflow_run_id,event.run_attempt,event.pr_number,event.head_sha]);
      if(existing[0]?.inbox_owner_id!==inboxOwnerId)
        return reply(409,{accepted:false,outcome:"CI_EVENT_OWNER_SCOPE_MISMATCH"},origin);
      inboxId=existing[0]?.ci_event_id||null;
    }
    if(!inboxId)throw Error("CI_EVENT_IDEMPOTENCY_READBACK_MISSING");

    // Re-run task/chat association after an idempotent insert, so a previous
    // partial write is recoverable. Deterministic event IDs prevent duplicates.
    const matches = await q(db,
      `select task_id, owner_id from business_brain.commander_tasks
       where project_key='agent-commander' and owner_id=$1::uuid
         and state not in ('completed','superseded')
         and coalesce(payload->'relatedPr','[]'::jsonb) @> to_jsonb($2::int)
       order by updated_at desc limit 2`, [inboxOwnerId,event.pr_number]);
    let association = "UNMATCHED",associatedTaskId=null,associatedOwnerId=null;
    if (matches.length === 1) {
      associatedTaskId=matches[0].task_id;associatedOwnerId=matches[0].owner_id;
      const chats = await q(db,
        `select chat_id from business_brain.commander_chats
         where task_id=$1::uuid and owner_id=$2::uuid order by updated_at desc limit 2`,
        [associatedTaskId,associatedOwnerId]);
      if (chats.length === 1) {
        const chatEventId=await stableScopeId(associatedOwnerId,
          "github-ci:"+event.workflow_run_id+":"+event.run_attempt+":"+event.pr_number+":"+event.head_sha);
        const chatEvent = {
          schema: "HH_COMMANDER_EVENT_V1", id: chatEventId,
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
           values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::text::jsonb,true)
           on conflict(event_id) do nothing`,
          [chatEventId,chats[0].chat_id,associatedOwnerId,jsonbText(chatEvent)]);
        await q(db, `update business_brain.commander_chats set updated_at=now()
          where chat_id=$1::uuid and owner_id=$2::uuid`, [chats[0].chat_id,associatedOwnerId]);
        association = "MATCHED_CHAT_EVENT_RECORDED";
      } else if (chats.length > 1) association = "AMBIGUOUS_TASK_CHATS";
      else association = "MATCHED_TASK_NO_CHAT";
    } else if (matches.length > 1) association = "AMBIGUOUS_TASKS";

    // Every verified failure must have a durable task and associated chat.
    if(association!=="MATCHED_CHAT_EVENT_RECORDED"){
      const incident=await ensureCiIncidentTask(db,inboxOwnerId,event);
      associatedTaskId=incident.taskId;associatedOwnerId=inboxOwnerId;
      association=incident.created?"AUTO_TASK_CREATED_NOT_DISPATCHED":
        "TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED";
    }
    await q(db, `update business_brain.commander_ci_event_inbox
      set associated_task_id=$1::uuid,associated_owner_id=$2::uuid,association_status=$3
      where ci_event_id=$4::uuid and inbox_owner_id=$5::uuid`,
      [associatedTaskId,associatedOwnerId,association,inboxId,inboxOwnerId]);
    return reply(202, { accepted: true, outcome: duplicate?"ALREADY_RECORDED":"RECORDED",
      inbox_id: inboxId, association, pr_number: event.pr_number, head_sha: event.head_sha }, origin);
  } catch (error) {
    console.error("COMMANDER_GITHUB_CI_INBOX_ERROR " + String(error?.name||"unknown") +
      " code=" + String(error?.code||"unknown"));
    return reply(503, { accepted: false, outcome: "CI_EVENT_STORE_UNAVAILABLE" }, origin);
  } finally {
    await db.end({ timeout: 2 });
  }
}


// Authenticated callback from the ALREADY RUNNING failed-Core GitHub workflow.
// A dispatch decision is never proof of a worker start, source patch or LIVE.
const CI_ROUTE_STATES = new Set([
  "TASK_REQUIRES_REVIEW","TASK_ROUTED_TO_REVIEW","TASK_AWAITING_EXISTING_RECOVERY",
  "EXISTING_RECOVERY_ACCEPTED","DISPATCH_ACCEPTED_NOT_WORKER_STARTED",
  "TASK_WAITING_FOR_DISPATCH","DISPATCH_UNCONFIRMED_RECONCILE"
]);
async function exactCoreFailureTaskId(e: {pr_number:number;head_sha:string;
    workflow_run_id:string|number;run_attempt:number}):Promise<string> {
  const identity=["andylitvinov-design/books",e.pr_number,e.head_sha.toLowerCase(),
    e.workflow_run_id,e.run_attempt,"CORE"].join(":");
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(bytes)).slice(0,16)
    .map((value)=>value.toString(16).padStart(2,"0")).join("");
}
// Map detailed CI strategy outcomes to the existing seven-value chat state contract.
// The full factual route remains in the immutable inbox receipt and chat timeline;
// no dispatch, worker start, source write, CI or LIVE success is implied.
function commanderCiChatExecutionState(routeState: string): string {
  switch(routeState) {
    case "TASK_REQUIRES_REVIEW":
    case "TASK_ROUTED_TO_REVIEW":
      return "BLOCKED";
    case "EXISTING_RECOVERY_ACCEPTED":
    case "DISPATCH_ACCEPTED_NOT_WORKER_STARTED":
    case "DISPATCH_UNCONFIRMED_RECONCILE":
      return "DISPATCHED_UNVERIFIED";
    case "TASK_AWAITING_EXISTING_RECOVERY":
    case "TASK_WAITING_FOR_DISPATCH":
      return "AWAITING_EXECUTOR_NOT_DISPATCHED";
    default:
      return "BLOCKED";
  }
}
// Backward-compatible, no-write receipt for verified older workflow runs.
// Only the all-absent optional ACK fields and ZERO accepted dispatches are
// normalized. Any positive or partially specified dispatch still requires the
// complete modern signed causal ACK (executor, task key and error task ID).
function normalizeLegacyZeroDispatchCiRoute(p: any): any {
  if(p && typeof p==="object" && !Array.isArray(p) &&
     p.dispatchAccepted===0 && p.dispatchAcknowledged===undefined &&
     !Object.hasOwn(p,"executorId") && !Object.hasOwn(p,"workerTaskKey") &&
     !Object.hasOwn(p,"errorTaskId")) {
    return {...p,dispatchAcknowledged:false,executorId:null,
      workerTaskKey:null,errorTaskId:null};
  }
  return p;
}
// A low-confidence/backstop receipt may arrive before the authenticated
// dispatcher accepts the *same* exact Core event. Permit only a one-way
// 0→1 promotion after all OIDC, task, PR and causal checks below pass.
// Never downgrade an accepted dispatch or rewrite a completed review route.
function isMonotonicCiDispatchUpgrade(prior: any, next: any): boolean {
  if(!prior||!next||prior.schema!=="HH_COMMANDER_CI_ROUTE_RECEIPT_V1"||
     next.schema!==prior.schema||prior.dispatchAccepted!==0||
     prior.dispatchAcknowledged!==false||next.dispatchAccepted!==1||
     next.dispatchAcknowledged!==true||
     next.state!=="DISPATCH_ACCEPTED_NOT_WORKER_STARTED"||
     !["TASK_WAITING_FOR_DISPATCH","DISPATCH_UNCONFIRMED_RECONCILE",
       "TASK_AWAITING_EXISTING_RECOVERY"].includes(prior.state)||
     prior.workerStarted!==false||prior.sourceWriteVerified!==false||
     prior.liveVerified!==false||prior.executorId!==null||
     prior.workerTaskKey!==null||prior.errorTaskId!==null||
     next.workerStarted!==false||next.sourceWriteVerified!==false||
     next.liveVerified!==false||
     next.executorId!=="github-actions:hh-pr-repair-worker.yml"||
     !/^[a-f0-9]{32}$/.test(next.workerTaskKey||"")||
     !/^[a-f0-9]{32}$/.test(next.errorTaskId||""))return false;
  return ["inboxId","prNumber","headSha","runId","category","router",
    "responsibleRole"].every(k=>prior[k]===next[k]);
}
async function receiveCommanderCiRoute(req,origin){
  const claims=await verifyGitHubActionsOidc(req);
  if(!claims)return reply(401,{recorded:false,outcome:"GITHUB_OIDC_IDENTITY_REJECTED"},origin);
  if(Number(req.headers.get("content-length")||"0")>6000)return reply(413,{recorded:false,outcome:"BODY_TOO_LARGE"},origin);
  const raw=await req.text();
  if(raw.length>6000)return reply(413,{recorded:false,outcome:"BODY_TOO_LARGE"},origin);
  let p;try{p=JSON.parse(raw);}catch{return reply(400,{recorded:false,outcome:"INVALID_JSON"},origin);}
  p=normalizeLegacyZeroDispatchCiRoute(p);
  if(!p||p.schema!=="HH_COMMANDER_CI_ROUTE_RECEIPT_V1"||
    !uuid(p.inboxId)||!number(p.prNumber)||!Number.isSafeInteger(p.runId)||p.runId<1||
    !/^[a-f0-9]{40}$/.test(p.headSha||"")||
    !CI_ROUTE_STATES.has(p.state)||typeof p.reason!=="string"||
    !/^[A-Z0-9_]{3,120}$/.test(p.reason)||
    typeof p.router!=="string"||!/^[A-Z0-9_]{3,90}$/.test(p.router)||
    typeof p.responsibleRole!=="string"||p.responsibleRole.length>80||
    !Number.isSafeInteger(p.dispatchAccepted)||p.dispatchAccepted<0||p.dispatchAccepted>1||
    typeof p.category!=="string"||
    p.workerStarted!==false||p.sourceWriteVerified!==false||p.liveVerified!==false||
    (p.state==="DISPATCH_ACCEPTED_NOT_WORKER_STARTED")!==(p.dispatchAccepted===1)||
    p.dispatchAcknowledged!==(p.dispatchAccepted===1)||
    (p.dispatchAccepted===1?(
      p.executorId!=="github-actions:hh-pr-repair-worker.yml"||
      !/^[a-f0-9]{32}$/.test(p.workerTaskKey||"")||
      !/^[a-f0-9]{32}$/.test(p.errorTaskId||"")):
      (p.executorId!==null||p.workerTaskKey!==null||p.errorTaskId!==null))||
    !p.blocked||typeof p.blocked!=="object"||Array.isArray(p.blocked)||
    Object.entries(p.blocked).length>12||
    Object.entries(p.blocked).some(([k,v])=>!/^[A-Z0-9_]{3,80}$/.test(k)||
      !Number.isSafeInteger(v)||v<1||v>100))
    return reply(400,{recorded:false,outcome:"INVALID_ROUTE_RECEIPT"},origin);
  if(p.dispatchAccepted>0&&!(p.category==="TYPESCRIPT"||p.category==="SOURCE_CODE"))
    return reply(403,{recorded:false,outcome:"UNSAFE_CATEGORY_DISPATCH_REJECTED"},origin);
  const dbUrl=Deno.env.get("SUPABASE_DB_URL");
  if(!dbUrl)return reply(503,{recorded:false,outcome:"PRIVATE_DATABASE_NOT_CONFIGURED"},origin);
  const db=postgres(dbUrl,{max:1,connect_timeout:6,idle_timeout:4,ssl:"require",prepare:false});
  try{
    const result=await db.begin(async tx=>{
      const rows=await tx.unsafe(
        "select ci_event_id,repository,workflow_run_id,run_attempt,pr_number,head_sha,head_ref,category,classification,association_status,associated_task_id,inbox_owner_id,oidc_workflow_ref,route_receipt from business_brain.commander_ci_event_inbox where ci_event_id=$1::uuid for update",
        [p.inboxId]);
      const e=rows[0];
      if(!e)return {code:404,outcome:"CI_EVENT_NOT_FOUND"};
      const c=e.classification;
      if(e.repository!=="andylitvinov-design/books"||
        e.oidc_workflow_ref!==claims.workflow_ref||
        String(e.workflow_run_id)!==String(p.runId)||e.pr_number!==p.prNumber||
        e.head_sha!==p.headSha||e.category!==p.category||
        !["MATCHED_CHAT_EVENT_RECORDED","TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED","AUTO_TASK_CREATED_NOT_DISPATCHED"].includes(e.association_status)||
        !uuid(e.associated_task_id)||!c||
        c.schema!=="HH_CI_ERROR_CLASSIFICATION_V1"||
        c.category!==p.category||c.responsible_role!==p.responsibleRole||
        c.status!=="DIAGNOSTIC_ONLY"||c.source_write_authorized!==false||
        c.execution_authorized!==false||
        (p.dispatchAccepted>0&&(
          c.requires_human!==false||c.retry?.allowed!==true||
          c.recommended_status!=="REROUTED")))
        return {code:409,outcome:"CI_ROUTE_SOURCE_NOT_VERIFIED"};
      if(p.dispatchAccepted===1&&(
        !Number.isInteger(e.run_attempt)||e.run_attempt<1||
        p.errorTaskId!==await exactCoreFailureTaskId(e)))
        return {code:409,outcome:"CI_ROUTE_CAUSAL_TASK_MISMATCH"};
      const record={schema:p.schema,inboxId:p.inboxId,prNumber:p.prNumber,
        headSha:p.headSha,runId:p.runId,category:p.category,router:p.router,
        responsibleRole:p.responsibleRole,state:p.state,reason:p.reason,
        dispatchAccepted:p.dispatchAccepted,blocked:p.blocked,
        executorId:p.executorId,workerTaskKey:p.workerTaskKey,
        errorTaskId:p.errorTaskId,
        dispatchAcknowledged:p.dispatchAcknowledged,
        workerStarted:false,sourceWriteVerified:false,liveVerified:false,
        proofLevel:"GITHUB_OIDC_ROUTE_ONLY_NOT_EXECUTION"};
      const prior=e.route_receipt||null;
      if(prior){
        const equivalent=Object.entries(record).every(([k,v])=>
          JSON.stringify(prior[k])===JSON.stringify(v));
        if(equivalent)return {code:200,outcome:"ALREADY_RECORDED"};
        if(!isMonotonicCiDispatchUpgrade(prior,record))
          return {code:409,outcome:"ROUTE_RECEIPT_IMMUTABLE_CONFLICT"};
        // Historical route preserved for diagnosis. A later cron backstop
        // cannot overwrite this stronger accepted-dispatch receipt.
        record.previousRouteState=prior.state;
        record.previousRouteReason=prior.reason;
      }
      const tasks=await tx.unsafe(
        "select task_id,payload from business_brain.commander_tasks where task_id=$1::uuid and owner_id=$2::uuid and project_key='agent-commander' for update",
        [e.associated_task_id,e.inbox_owner_id]);
      if(tasks.length!==1||!Array.isArray(tasks[0].payload?.relatedPr)||
        !tasks[0].payload.relatedPr.includes(e.pr_number))
        return {code:409,outcome:"COMMANDER_TASK_NOT_VERIFIED"};
      const chats=await tx.unsafe(
        "select chat_id from business_brain.commander_chats where task_id=$1::uuid and owner_id=$2::uuid limit 2",
        [e.associated_task_id,e.inbox_owner_id]);
      if(chats.length!==1)return {code:409,outcome:"COMMANDER_CHAT_NOT_UNIQUE"};
      const written=prior
        ?await tx.unsafe(
          "update business_brain.commander_ci_event_inbox set route_receipt=$1::text::jsonb,route_recorded_at=now() where ci_event_id=$2::uuid and inbox_owner_id=$3::uuid and route_receipt=$4::text::jsonb returning ci_event_id",
          [jsonbText(record),p.inboxId,e.inbox_owner_id,jsonbText(prior)])
        :await tx.unsafe(
          "update business_brain.commander_ci_event_inbox set route_receipt=$1::text::jsonb,route_recorded_at=now() where ci_event_id=$2::uuid and inbox_owner_id=$3::uuid and route_receipt is null returning ci_event_id",
          [jsonbText(record),p.inboxId,e.inbox_owner_id]);
      if(written.length!==1)
        throw Error("CI_ROUTE_CONCURRENT_WRITE_ABORTED");
      await tx.unsafe(
        "update business_brain.commander_tasks set payload=jsonb_set(payload,'{ciLatestRoute}',$1::text::jsonb,true),updated_at=now() where task_id=$2::uuid and owner_id=$3::uuid",
        [jsonbText(record),e.associated_task_id,e.inbox_owner_id]);
      const chatEventId=await stableScopeId(e.inbox_owner_id,"github-ci-route:"+p.inboxId+(prior?":dispatch-accepted":""));
      const event={schema:"HH_COMMANDER_EVENT_V1",id:chatEventId,
        kind:"github_report",author:"GitHub Actions · verified CI routing",
        text:clean("CI task PR #"+p.prNumber+" strategy "+p.router+
          "; route state "+p.state+"; "+p.reason+
          "; dispatch accepted "+p.dispatchAccepted+
          (p.executorId?"; selected executor "+p.executorId+
            "; exact worker task "+p.workerTaskKey+
            "; error task "+p.errorTaskId:"; assigned owner review, no worker dispatch")+
          ". Worker start, source commit, CI and LIVE are NOT verified.",1800),
        ciRoute:record,sourceVerified:true,
        proofLevel:"GITHUB_OIDC_ROUTE_ONLY_NOT_EXECUTION",
        createdAt:new Date().toISOString()};
      await tx.unsafe(
        "insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::text::jsonb,true) on conflict(event_id) do nothing",
        [chatEventId,chats[0].chat_id,e.inbox_owner_id,jsonbText(event)]);
      await tx.unsafe(
        "update business_brain.commander_chats set execution_state=$1,updated_at=now() where chat_id=$2::uuid and owner_id=$3::uuid",
        [commanderCiChatExecutionState(p.state),chats[0].chat_id,e.inbox_owner_id]);
      return {code:202,outcome:prior?"UPGRADED_TO_DISPATCH_ACCEPTED":"RECORDED"};
    });
    return reply(result.code,{recorded:result.code===200||result.code===202,
      outcome:result.outcome,inbox_id:p.inboxId,workerStarted:false,liveVerified:false},origin);
  }catch(error){
    console.error("COMMANDER_CI_ROUTE_RECEIPT_ERROR "+String(error?.name||"Error")+
      " code="+String(error?.code||"unknown"));
    return reply(503,{recorded:false,outcome:"CI_ROUTE_STORAGE_UNAVAILABLE"},origin);
  }finally{await db.end({timeout:2});}
}

async function handler(req){
  const origin=req.headers.get("origin")||"";
  const pathname=new URL(req.url).pathname;
  if(req.method==="POST"&&pathname.endsWith("/webhooks/github-workflow-run"))
    return await receiveGitHubWorkflowRun(req,origin);
  if(req.method==="POST"&&pathname.endsWith("/webhooks/github-ci-route"))
    return await receiveCommanderCiRoute(req,origin);
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


    const openRouterKey=Deno.env.get("HH_PM_OPENROUTER_API_KEY")||Deno.env.get("OPENROUTER_API_KEY")||"";
    const openRouterReady=Boolean(openRouterKey);
    if(action==="commander_free_model_quota"){
      // Owner-only, read-only. Return only a verified numeric shared quota, never the key or balance.
      if(!openRouterKey)return reply(200,{schema:"HH_OPENROUTER_FREE_QUOTA_V1",quota:null,observedAt:new Date().toISOString()},origin);
      try{
        const res=await fetch("https://openrouter.ai/api/v1/key",{
          method:"GET",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(6000),
          headers:{Authorization:"Bearer "+openRouterKey,Accept:"application/json"}
        });
        if(!res.ok)return reply(200,{schema:"HH_OPENROUTER_FREE_QUOTA_V1",quota:null,observedAt:new Date().toISOString()},origin);
        const raw=await res.text();if(raw.length>16384)throw Error("FREE_QUOTA_TOO_LARGE");
        const counter=JSON.parse(raw)?.data?.free_model_daily_requests;
        const limit=counter?.limit,used=counter?.used,remaining=counter?.remaining;
        const quota=[limit,used,remaining].every(Number.isSafeInteger)&&limit>=0&&used>=0&&remaining>=0&&remaining<=limit?
          {used,limit,remaining,shared:true,period:"UTC_DAY"}:null;
        return reply(200,{schema:"HH_OPENROUTER_FREE_QUOTA_V1",quota,observedAt:new Date().toISOString()},origin);
      }catch{
        return reply(200,{schema:"HH_OPENROUTER_FREE_QUOTA_V1",quota:null,observedAt:new Date().toISOString()},origin);
      }
    }
    if(action==="commander_list_execution_runs"){
      const chatNumber=number(body.issueNumber);if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const chats=await q(db,"select chat_id from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!chats.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const runsSql="select run_id,executor,status,reason_code,request_sha256,hermes_job_id,executor_session_id,receipt,started_at,completed_at,worker_attempt_count,worker_lease_expires_at,worker_checkpoint,worker_next_attempt_at,actual_model_id,cost_usd,worker_last_error_code,created_at,updated_at from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid order by created_at desc limit 30";
      let runs=await q(db,runsSql,[ownerId,chats[0].chat_id]);
      return reply(200,{schema:"HH_COMMANDER_EXECUTION_RUNS_V1",chatId:chats[0].chat_id,runs,storage:"SUPABASE_PRIVATE",
        dispatchEnabled:false,dispatchAvailable:openRouterReady,openRouterConfigured:openRouterReady,workerMode:"SUPABASE_OPENROUTER_CLOUD_WORKER",dispatchMode:"FIRST_PARTY_AGENT_DIRECTOR",liveVerified:false,observedAt:new Date().toISOString()},origin);
    }
    if(action==="commander_start_run"){
      const chatNumber=number(body.issueNumber);
      if(!chatNumber)return reply(400,{error:"INVALID_CHAT_NUMBER"},origin);
      const runId=body.runId,idempotencyKey=body.idempotencyKey,executor=body.executor;
      const message=clean(body.message,5000);
      if(!uuid(runId)||!uuid(idempotencyKey)||!EXECUTORS.has(executor)||message.length<2||
         String(body.message||"").length>5000||(executor==="local"&&String(body.message||"").length>3000))
        return reply(400,{error:"INVALID_EXECUTION_REQUEST"},origin);
      const chats=await q(db,"select chat_id,task_id,payload,revision from business_brain.commander_chats where owner_id=$1::uuid and chat_number=$2 limit 1",[ownerId,chatNumber]);
      if(!chats.length)return reply(404,{error:"CHAT_NOT_FOUND"},origin);
      const chat=chats[0],rawChat=chat.payload&&typeof chat.payload==="object"?chat.payload:{};
      const goal=clean(rawChat.goal||rawChat.description||rawChat.title||message,2000);
      const acceptanceCriteria=Array.isArray(rawChat.acceptanceCriteria)?rawChat.acceptanceCriteria.slice(0,5).map(v=>clean(v,500)).filter(Boolean):[];
      const skillIds=Array.isArray(rawChat.skillIds)?rawChat.skillIds.slice(0,10):[];
      const prior=executor==="local"?await q(db,"select run_id from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid and executor='local' and status='COMPLETED' order by completed_at desc nulls last,created_at desc limit 1",[ownerId,chat.chat_id]):[];
      const parentTaskId=prior[0]?.run_id||null;
      const contextCapsule={
        schema:"HH_COMMANDER_TASK_CONTEXT_V1",chatId:chat.chat_id,taskId:chat.task_id||null,
        chatRevision:Number.isSafeInteger(chat.revision)?chat.revision:0,
        title:clean(rawChat.title,160),project:clean(rawChat.project,80),goal,acceptanceCriteria,skillIds,parentTaskId,
        description:clean(rawChat.description,700),
        linkedPrHints:Array.isArray(rawChat.prs)?rawChat.prs.filter(x=>Number.isSafeInteger(x)&&x>0&&x<100000).slice(0,8):[],
        linkedPrHintsVerified:false,
        requiredBeforeSourceChange:"Resolve live GitHub PR and exact HEAD before any source change."
      };
      const modelId=typeof body.modelId==="string"&&body.modelId.length?clean(body.modelId,120):"owned-default";
      // No arbitrary model IDs: a named local model must be a live, strictly zero-priced text chat model.
      if((executor==="local"||executor==="openrouter")&&modelId!=="owned-default"&&modelId!=="openrouter/free"){
        if(!MODEL_ID.test(modelId))return reply(400,{error:"VERIFIED_FREE_MODEL_REQUIRED"},origin);
        try{await verifyFreeModel(modelId)}
        catch(error){return reply(422,{error:"OPENROUTER_FREE_MODEL_UNAVAILABLE",reasonCode:String(error?.message||"FREE_MODEL_NOT_VERIFIED").slice(0,100)},origin);}
      }
      if(executor==="local"&&modelId==="openrouter/free")
        return reply(400,{error:"VERIFIED_FREE_MODEL_REQUIRED"},origin);
      const writeConfirmed=body.confirmGitHubWrite===true;
      const canDispatch=(executor==="local"||executor==="openrouter")&&!writeConfirmed&&openRouterReady;
      let reasonCode="EXECUTOR_TRANSPORT_NOT_CONFIGURED";
      if(executor==="local"||executor==="openrouter")reasonCode=writeConfirmed?"GITHUB_WRITE_REQUIRES_SEPARATE_APPROVAL":openRouterReady?"OPENROUTER_WORKER_QUEUED":"OPENROUTER_API_KEY_NOT_CONFIGURED";
      else if(executor==="hermes")reasonCode="EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY";
      else if(executor==="codex")reasonCode="CODEX_LOCAL_AGENT_NOT_CONNECTED";
      else if(executor==="repair-worker")reasonCode="REPAIR_WORKER_REQUIRES_EXACT_PR_HEAD_AND_ACTIVE_LEASE";
      else if(executor==="chatgpt-work")reasonCode="CHATGPT_WORK_TRANSPORT_NOT_AVAILABLE";

      else if(executor==="manual")reasonCode="MANUAL_EXECUTOR_REQUIRES_OWNER_HANDOFF";
      const firstStatus=canDispatch?"QUEUED":"BLOCKED";
      const hashInput=[chat.chat_id,executor,String(contextCapsule.chatRevision),message,modelId,String(writeConfirmed),goal,JSON.stringify(acceptanceCriteria),JSON.stringify(skillIds),parentTaskId||""].join(String.fromCharCode(31));
      const hashed=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(hashInput)));
      const requestSha256=Array.from(hashed,x=>x.toString(16).padStart(2,"0")).join("");
      const initialReceipt={dispatchAttempted:false,agentStarted:false,executionVerified:false,
        status:firstStatus,sourceWrite:null,model:modelId==="owned-default"?"openrouter/free":modelId};
      const pendingText=canDispatch?"Задача поставлена в очередь OpenRouter Free; запуск Worker ожидает подтверждения.":
        "Задача сохранена, но запуск не подтверждён. Причина: "+reasonCode+".";
      const result=await db.begin(async tx=>{
        const inserted=await tx.unsafe("insert into business_brain.commander_execution_runs (run_id,owner_id,chat_id,task_id,idempotency_key,request_sha256,executor,status,reason_code,request_payload,receipt) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10::text::jsonb,$11::text::jsonb) on conflict(owner_id,chat_id,idempotency_key) do nothing returning run_id,status,reason_code,request_sha256,executor,hermes_job_id,receipt,created_at",
         [runId,ownerId,chat.chat_id,chat.task_id||null,idempotencyKey,requestSha256,executor,
          firstStatus,reasonCode,jsonbText({message,goal,acceptanceCriteria,skillIds,parentTaskId,contextCapsule,modelId,confirmGitHubWrite:writeConfirmed}),
          jsonbText(initialReceipt)]);
        let run=inserted[0],duplicate=false;
        if(!run){
          const prior=await tx.unsafe("select run_id,status,reason_code,request_sha256,executor,hermes_job_id,receipt,created_at from business_brain.commander_execution_runs where owner_id=$1::uuid and chat_id=$2::uuid and idempotency_key=$3 limit 1",[ownerId,chat.chat_id,idempotencyKey]);
          if(!prior.length)return {conflict:true};
          run=prior[0];duplicate=true;
          if(run.request_sha256!==requestSha256||run.run_id!==runId)return {idempotencyConflict:true};
        }else{
          const eventPayload={schema:"HH_COMMANDER_EVENT_V1",id:runId,
            kind:canDispatch?"execution_requested":"execution_blocked",
            author:"Agent Director",text:pendingText,executor,status:firstStatus,reasonCode,
            sourceVerified:false,proofLevel:"NOT_STARTED_NO_EXECUTION_RECEIPT",createdAt:new Date().toISOString()};
          // Physical DB kind CHECK permits 'note', not custom payload event kinds.
          await tx.unsafe("insert into business_brain.commander_chat_events (event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'note',$4::text::jsonb,false) on conflict(event_id) do nothing",
           [runId,chat.chat_id,ownerId,jsonbText(eventPayload)]);
          await tx.unsafe("update business_brain.commander_chats set execution_state=$1,updated_at=now() where owner_id=$2::uuid and chat_id=$3::uuid",
           [canDispatch?"AWAITING_EXECUTOR_NOT_DISPATCHED":"BLOCKED",ownerId,chat.chat_id]);
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
      return reply(202,{schema:"HH_COMMANDER_EXECUTION_RUN_V1",
        run:{...result.run,status:"QUEUED",reason_code:"OPENROUTER_WORKER_QUEUED",receipt:initialReceipt},
        duplicate:false,dispatchAttempted:false,agentStarted:false,executionVerified:false,
        liveVerified:false,status:"QUEUED",reasonCode:"OPENROUTER_WORKER_QUEUED",
        model:modelId==="owned-default"?"openrouter/free":modelId,sourceWrite:null,storage:"SUPABASE_PRIVATE"},origin);
    }
    if(action==="commander_list_ci_events"){
      const limit=Math.max(1,Math.min(100,Number(body.limit)||30));
      const pr=body.pr===undefined?null:number(body.pr);
      if(body.pr!==undefined&&!pr)return reply(400,{error:"INVALID_PR_NUMBER"},origin);
      const cursorAt=body.before===undefined?null:body.before;
      const cursorId=body.beforeId===undefined?null:body.beforeId;
      if((cursorAt===null)!==(cursorId===null)||
         (cursorAt!==null&&(
           typeof cursorAt!=="string"||cursorAt.length>40||
           !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(cursorAt)||
           !Number.isFinite(Date.parse(cursorAt))||
           typeof cursorId!=="string"||
           !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(cursorId))))
        return reply(400,{error:"INVALID_CI_EVENT_CURSOR"},origin);
      // Stable keyset ordering prevents losing same-millisecond events at a
      // page boundary. The owner OIDC gate stays unchanged; 101 rows max/read.
      const page=await q(db,
        `select ci_event_id,repository,workflow_run_id,run_attempt,pr_number,head_sha,
          conclusion,category,classification,failed_jobs,failed_steps,run_url,association_status,assignment_receipt,route_receipt,route_recorded_at,triage_receipt,triage_recorded_at,historical_pr_readback,created_at,
          to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_created_at
         from business_brain.commander_ci_event_inbox
         where inbox_owner_id=$3::uuid and ($1::int is null or pr_number=$1)
           and ($4::timestamptz is null or (created_at,ci_event_id)<($4::timestamptz,$5::uuid))
         order by created_at desc,ci_event_id desc limit $2`,
         [pr,limit+1,ownerId,cursorAt,cursorId]);
      const hasMore=page.length>limit,rows=page.slice(0,limit),last=rows[rows.length-1];
      return reply(200,{schema:"HH_COMMANDER_CI_EVENT_INBOX_V1",events:rows,
        count:rows.length,has_more:hasMore,
        next_cursor:hasMore&&last?{before:last.cursor_created_at,
          beforeId:last.ci_event_id}:null,
        sourceVerifiedBy:"GITHUB_OIDC_AND_EXACT_PR_HEAD"},origin);
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
      owner:true,canWrite:writable,authenticated:true,privateStoreConfigured:true,executorDispatch:false,dispatchEnabled:false,dispatchAvailable:openRouterReady,openRouterConfigured:openRouterReady,workerMode:"SUPABASE_OPENROUTER_CLOUD_WORKER",executionRunLedger:true,dispatchMode:"FIRST_PARTY_AGENT_DIRECTOR",dispatchReason:openRouterReady?"OPENROUTER_WORKER_WAKEUP_REQUIRED":"OPENROUTER_API_KEY_NOT_CONFIGURED",liveVerification:false,checkedAt:new Date().toISOString()},origin);

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
      const saved=await q(db,"insert into business_brain.commander_tasks(task_id,owner_id,project_key,title,payload,state,revision) values($1::uuid,$2::uuid,'agent-commander',$3,$4::text::jsonb,$5,1) on conflict(task_id) do update set title=excluded.title,payload=excluded.payload,state=case when business_brain.commander_tasks.state='queued_review' then 'queued_review' else 'draft' end,revision=business_brain.commander_tasks.revision+1,updated_at=now() where business_brain.commander_tasks.owner_id=excluded.owner_id returning task_number,task_id,state,revision,updated_at",[record.taskId,ownerId,record.title,jsonbText(record),state]);
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
      const taskRows=await q(db,"insert into business_brain.commander_tasks(task_id,owner_id,project_key,title,payload,state,revision) values($1::uuid,$2::uuid,'agent-commander',$3,$4::text::jsonb,'draft',1) on conflict(task_id) do nothing returning task_number",[taskId,ownerId,resolved.title,jsonbText(source)]);
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
      const inserted=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,task_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$1::uuid,$3,$4::text::jsonb,'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1) on conflict(task_id) do nothing returning chat_number",[taskId,ownerId,resolved.title,jsonbText(chat)]);
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
      const inserted=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,task_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$1::uuid,$3,$4::text::jsonb,'assigned','AWAITING_EXECUTOR_NOT_DISPATCHED',1) on conflict(task_id) do nothing returning chat_number",[taskId,ownerId,title,jsonbText(chat)]);
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
      const rows=await q(db,"insert into business_brain.commander_chats(chat_id,owner_id,title,payload,status,execution_state,revision) values($1::uuid,$2::uuid,$3,$4::text::jsonb,$5,'UNVERIFIED_ASSIGNMENT_ONLY',$6) on conflict(chat_id) do nothing returning chat_number",[chat.id,ownerId,chat.title,jsonbText(chat),chat.status,chat.revision]);
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
      const rows=await q(db,"update business_brain.commander_chats set title=$1,payload=$2::text::jsonb,status=$3,revision=$4,updated_at=now() where owner_id=$5::uuid and chat_number=$6 and revision=$7 returning chat_number",[payload.title,jsonbText(payload),payload.status,payload.revision,ownerId,id,prior[0].revision]);
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
      const inserted=await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,$4,$5::text::jsonb,false) on conflict(event_id) do nothing returning event_id",[event.id,rows[0].chat_id,ownerId,event.kind,jsonbText(event)]);
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
      const inserted=await q(db,"insert into business_brain.commander_chat_events(event_id,chat_id,owner_id,kind,payload,source_verified) values($1::uuid,$2::uuid,$3::uuid,'github_report',$4::text::jsonb,false) on conflict(event_id) do nothing returning event_id",[eventId,rows[0].chat_id,ownerId,jsonbText(event)]);
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
