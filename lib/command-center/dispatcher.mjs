import {checkCommandPrWatches} from './pr-watch.mjs';
import {runOneDueCronJob} from './cron-jobs.mjs';
/** Short-lived, budget-capped dispatcher: never launches external coding runtimes. */
import {parseGithubSource} from './contracts.mjs';
import {claimNextCommandTask,claimSchedulerSlot,recoverExpiredCommandRuns,
  settleCommandRun,settleSchedulerSlot,storeDailyCommandReport} from './store.mjs';

export function commandSlotUtc(now=new Date()){
  const ms=now instanceof Date?now.getTime():NaN;
  if(!Number.isFinite(ms))throw Error('CC_INVALID_TIME');
  return new Date(Math.floor(ms/600000)*600000).toISOString();
}
export async function runPublicGithubRead(claim,{fetcher=fetch}={}){
  const source=parseGithubSource(claim?.source?.url);
  if(!source||source.kind!==claim.kind)return {ok:false,errorCode:'GITHUB_BAD_RESULT'};
  const route=source.kind==='repo_pr_audit'?'pulls':'issues';
  const url=`https://api.github.com/repos/andylitvinov-design/books/${route}/${source.number}`;
  try{
    const response=await fetcher(url,{method:'GET',redirect:'error',cache:'no-store',
      headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
      signal:AbortSignal.timeout(6500)});
    if(!response?.ok)return {ok:false,errorCode:'GITHUB_HTTP_ERROR'};
    if(Number(response.headers?.get?.('content-length')||0)>250000)
      return {ok:false,errorCode:'GITHUB_BAD_RESULT'};
    // The GitHub PR/issue body is untrusted; copy no body, comments, title or agent instructions.
    const raw=typeof response.text==='function'?await response.text():JSON.stringify(await response.json());
    if(Buffer.byteLength(raw,'utf8')>250000)return {ok:false,errorCode:'GITHUB_BAD_RESULT'};
    const data=JSON.parse(raw);
    if(data?.html_url!==source.url||!Number.isSafeInteger(data.number)||data.number!==source.number||
      !['open','closed'].includes(data.state))return {ok:false,errorCode:'GITHUB_BAD_RESULT'};
    const observed={number:data.number,state:data.state,updatedAt:typeof data.updated_at==='string'?data.updated_at:null,
      observedAt:new Date().toISOString(),repo:'andylitvinov-design/books'};
    if(source.kind==='repo_pr_audit'){
      if(!/^[a-f0-9]{40}$/i.test(data.head?.sha||'')||
        !['codex/public-book-library','codex/bootstrap-books'].includes(data.base?.ref))
        return {ok:false,errorCode:'GITHUB_BAD_RESULT'};
      observed.headSha=data.head.sha;observed.base=data.base.ref;
      observed.merged=Boolean(data.merged_at);observed.draft=Boolean(data.draft);
      // A merged PR is not proof of a production deployment or accepted browser flow.
    }
    return {ok:true,observed};
  }catch(error){
    return {ok:false,errorCode:error?.name==='TimeoutError'||error?.name==='AbortError'?
      'GITHUB_TIMEOUT':'GITHUB_UNAVAILABLE'};
  }
}
export async function executeOneCommandTask({config,transaction,fetcher=fetch,taskId=null}={}){
  const claim=await transaction(config,null,db=>claimNextCommandTask(db,{taskId}),{server:true});
  if(claim.status!=='claimed')return {status:claim.status};
  const result=await runPublicGithubRead(claim,{fetcher});
  const committed=await transaction(config,null,db=>settleCommandRun(db,claim,result),{server:true});
  return {...committed,worker:'github-public-reader',source:claim.source.url};
}
/** A successful cron invocation is not evidence that a task executed.
 * Retain one truthful result per existing ten-minute slot; no extra polling.
 */
export function classifyCommandSlot(result){
  const state=result?.status;
  if(state==='completed_verified')return {state:'succeeded',error:null};
  if(['no_ready_work','paused'].includes(state))return {state:'no_change',error:null};
  if(state==='budget_paused')return {state:'no_change',error:'DAILY_LIMIT'};
  if(state==='failed')return {state:'failed',error:'WORKER_FAILED'};
  if(state==='invalid_source')return {state:'failed',error:'INVALID_SOURCE'};
  return {state:'failed',error:'RUN_UNCONFIRMED'};
}
export async function commandCenterTick({config,transaction,env=process.env,fetcher=fetch,now=new Date()}={}){
  if(env.VERCEL_ENV!=='production'||env.HH_CC_TICK_ENABLED!=='true')
    return {status:'disabled',codeWorkersLaunched:0,paidModelCalls:0};
  const slotUtc=commandSlotUtc(now);
  const ownership=await transaction(config,null,db=>claimSchedulerSlot(db,slotUtc),{server:true});
  if(!ownership.claimed)return {status:ownership.status,slotUtc,codeWorkersLaunched:0,paidModelCalls:0};
  let result={status:'unconfirmed'};
  try{
    const expired=await transaction(config,null,db=>recoverExpiredCommandRuns(db),{server:true});
    // Observe owner-assigned PRs on the SAME existing tick, without another job, cron or paid model.
    const [audit,prWatch]=await Promise.all([
      executeOneCommandTask({config,transaction,fetcher}),
      checkCommandPrWatches({config,transaction,fetcher,env}).catch(()=>({status:'unconfirmed',checked:0,results:[]}))
    ]);
    result=audit;
    // One quota-bound database-only Cron Skill uses this SAME claimed slot.
    // This runs after the task auditor so it cannot pre-empt its existing budget claim.
    const cronSkill=await runOneDueCronJob({config,transaction})
      .catch(()=>({status:'unconfirmed'}));
    const oldSlot=classifyCommandSlot(result);
    const skillSuccess=cronSkill.status==='completed_verified';
    const slot=skillSuccess?{state:'succeeded',error:null}:oldSlot;
    await transaction(config,null,async db=>{
      await settleSchedulerSlot(db,slotUtc,slot.state,slot.error);
      await storeDailyCommandReport(db);
    },{server:true});
    return {status:result.status,slotUtc,recoveredExpired:expired,prWatch,cronSkill,
      verifiedTaskId:result.status==='completed_verified'?result.taskId:null,
      slotState:slot.state,codeWorkersLaunched:0,paidModelCalls:0};
  }catch{
    try{await transaction(config,null,db=>settleSchedulerSlot(db,slotUtc,'failed','TICK_UNCONFIRMED'),{server:true});}
    catch{ /* Do not claim completion if the database cannot confirm the receipt. */ }
    return {status:'unconfirmed',slotUtc,codeWorkersLaunched:0,paidModelCalls:0};
  }
}
