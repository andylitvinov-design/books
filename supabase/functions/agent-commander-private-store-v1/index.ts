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
async function handler(req){
  const origin=req.headers.get("origin")||"";
  if(req.method==="OPTIONS")return ALLOWED_ORIGINS.has(origin)?reply(204,{},origin):reply(403,{error:"ORIGIN_DENIED"},origin);
  if(!["GET","POST"].includes(req.method))return reply(405,{error:"METHOD_NOT_ALLOWED"},origin);
  if(origin&&!ALLOWED_ORIGINS.has(origin))return reply(403,{error:"ORIGIN_DENIED"},origin);
  let body={},action;
  if(req.method==="GET"){
    const params=new URL(req.url).searchParams;
    action=params.get("action")||"status";
    for(const [key,value] of params.entries()){
      if(key==="action")continue;
      if(!["issueNumber","pr"].includes(key))return reply(400,{error:"UNKNOWN_QUERY_PARAMETER"},origin);
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
    const writeActions=new Set(["commander_save_task","commander_queue_task","commander_from_task",
      "commander_create_chat","commander_update_chat","commander_append_event","commander_attach_event"]);
    if(writeActions.has(action)&&!writable)return reply(403,{error:"OWNER_WRITE_DENIED"},origin);

    if(action==="status")return reply(200,{ok:true,service:"AGENT_COMMANDER_PRIVATE_STORE_V1",
      owner:true,authenticated:true,privateStoreConfigured:true,executorDispatch:false,
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
      const events=await q(db,"select payload from business_brain.commander_chat_events where owner_id=$1::uuid and chat_id=$2::uuid order by created_at asc limit 400",[ownerId,rows[0].chat_id]);
      const chat={...rows[0].payload,issueNumber:Number(rows[0].chat_number),githubUpdatedAt:rows[0].updated_at,
        updatedAt:rows[0].updated_at,revision:rows[0].revision,status:rows[0].status,executionState:rows[0].execution_state};
      return reply(200,{chat,messages:events.map(e=>e.payload),truncated:false},origin);
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
      const m=String(body.url||"").match(/^https:\/\/github\.com\/andylitvinov-design\/books\/issues\/(1419|3128)#issuecomment-(\d{1,14})$/);
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
