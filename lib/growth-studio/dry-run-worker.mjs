import {
  GROWTH_DRY_RUN_FLAG,createGrowthDryRunQueueStore,simulateDueDryRunJobs,
} from './dry-run-queue.mjs'

/**
 * Runs only the existing durable simulation queue.
 * This worker can never call a social provider or turn a simulation into a receipt.
 */
export async function runGrowthDryRunWorker({
  environment=process.env,
  queueFactory=env=>createGrowthDryRunQueueStore({environment:env}),
  now=new Date(),
  limit=5,
}={}){
  if(environment.VERCEL_ENV!=='production')
    return {status:'not_production',simulated:0,jobs:[],externalPublishing:false}
  if(environment[GROWTH_DRY_RUN_FLAG]!=='true')
    return {status:'disabled',simulated:0,jobs:[],externalPublishing:false}
  if(!(now instanceof Date)||!Number.isFinite(now.getTime())||
     !Number.isSafeInteger(limit)||limit<1||limit>5)
    throw new TypeError('invalid_growth_dry_run_worker_request')
  const queue=queueFactory(environment)
  if(!queue)throw new Error('growth_dry_run_queue_unavailable')
  const completed=await simulateDueDryRunJobs(queue,{now,limit})
  return {
    status:'simulated',
    simulated:completed.length,
    externalPublishing:false,
    jobs:completed.map(job=>({
      id:job.id,postId:job.postId,channel:job.channel,
      socialAccountId:job.socialAccountId||null,
      scheduledAt:job.scheduledAt,simulatedAt:job.simulatedAt||null,
      state:job.state,deliveryMode:job.deliveryMode,
    })),
  }
}
