'use server'
// Explicitly opt-in owner-only offline queue simulation.
// NEVER connects to, sends to or schedules at any social provider.
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GrowthStudioError} from '@/lib/growth-studio/model.mjs'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
import {
  GROWTH_DRY_RUN_FLAG,createDryRunJob,createGrowthDryRunQueueStore,simulateDueDryRunJobs,
} from '@/lib/growth-studio/dry-run-queue.mjs'

const ALLOWED=new Set(['invalid_queue_request','invalid_queue_time','source_changed',
  'not_found','conflict','capacity_reached'])
const safeError=error=>error instanceof GrowthStudioError&&ALLOWED.has(error.code)
  ?error.code:'storage_unavailable'
async function ownerReady(){
  if(!await requireAdminRequest())return 'unauthorized'
  if(process.env[GROWTH_DRY_RUN_FLAG]!=='true')return 'dry_run_disabled'
  return null
}
function createQueue(){return createGrowthDryRunQueueStore()}
export async function createGrowthDryRunJobAction(input){
  const deny=await ownerReady();if(deny)return {ok:false,error:deny}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>!['sourceId','expectedRevision','scheduledAt','occurrenceId'].includes(key))||
    typeof input.sourceId!=='string'||!/^[0-9a-f-]{36}$/i.test(input.sourceId))
    return {ok:false,error:'invalid_queue_request'}
  try{
    const editorial=getGrowthStudioStore(),queue=createQueue()
    if(!editorial||!queue)return {ok:false,error:'storage_unavailable'}
    const source=await editorial.get(input.sourceId)
    if(!source)return {ok:false,error:'not_found'}
    const job=createDryRunJob(source,input)
    const saved=await queue.enqueue(job)
    return {ok:true,job:saved.job,reused:saved.reused,externalPublishing:false}
  }catch(error){return {ok:false,error:safeError(error)}}
}
export async function listGrowthDryRunJobsAction(){
  const deny=await ownerReady();if(deny)return {ok:false,error:deny}
  try{
    const queue=createQueue()
    return queue?{ok:true,jobs:await queue.list(),externalPublishing:false}
      :{ok:false,error:'storage_unavailable'}
  }catch{return {ok:false,error:'storage_unavailable'}}
}
export async function cancelGrowthDryRunJobAction(input){
  const deny=await ownerReady();if(deny)return {ok:false,error:deny}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!['id','expectedRevision'].includes(k)))
    return {ok:false,error:'invalid_queue_request'}
  try{
    const queue=createQueue()
    if(!queue)return {ok:false,error:'storage_unavailable'}
    const job=await queue.cancel(input.id,input.expectedRevision)
    return {ok:true,job,externalPublishing:false}
  }catch(e){return {ok:false,error:safeError(e)}}
}
// User-triggered, no cron: a bounded deterministic simulation, never an API send.
// Reuses the source-approval/revision check inside Redis's atomic Lua claim.
export async function simulateGrowthDryRunJobsAction(input={}){
  const deny=await ownerReady();if(deny)return {ok:false,error:deny}
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!['limit'].includes(k))||
    (input.limit!==undefined&&(!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>10)))
    return {ok:false,error:'invalid_queue_request'}
  try{
    const queue=createQueue()
    if(!queue)return {ok:false,error:'storage_unavailable'}
    const jobs=await simulateDueDryRunJobs(queue,{limit:input.limit??5})
    return {ok:true,jobs,simulated:jobs.length,externalPublishing:false}
  }catch(e){return {ok:false,error:safeError(e)}}
}
