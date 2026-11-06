import 'server-only';
import {getAppConfig} from '../app/config.js';
import {transaction} from '../app/database.js';
import {auditVideoSiteCoverage} from '../video-library/coverage.mjs';
import {latestScoutSlot,performScoutCycle,SCOUT_POLICY_VERSION} from './video-scout.mjs';
import {claimVideoScout,settleVideoScout} from './scout-db.mjs';

/**
 * One bounded metadata-only run, reused by Vercel cron and owner-only manual run.
 * L0 never asks a model, downloads a video, or writes into the generator's Vault.
 */
export async function runHourlyVideoScout({
  config=getAppConfig(),env=process.env,fetcher=fetch,now=new Date(),actor='cron',
}={}){
  if(env.HH_VIDEO_SCOUT_ENABLED==='false')return {status:'emergency_paused',
    note:'explicit_server_kill_switch',calls:0};
  if(env.VERCEL_ENV!=='production' && env.HH_APP_TEST_RUNTIME!=='isolated')
    return {status:'not_production',calls:0};
  const slotUtc=latestScoutSlot(now);
  const claim=await transaction(config,null,
    db=>claimVideoScout(db,{slotUtc,actor}),{server:true});
  if(!claim.claimed)return {status:claim.status,slotUtc,calls:0};
  try{
    const coverage=auditVideoSiteCoverage({aspect:'landscape'});
    return await performScoutCycle({slotUtc,coverage,fetcher,
      commit:payload=>transaction(config,null,
        db=>settleVideoScout(db,claim,payload),{server:true}),
    });
  }catch(error){
    // No retry against possibly committed results, avoid leaking upstream text.
    const status=error?.message==='SCOUT_INVALID_CANDIDATE'?'SCOUT_INVALID_CANDIDATE':
      'SCOUT_EXECUTION_FAILED';
    try{
      const settled=await transaction(config,null,db=>settleVideoScout(db,claim,{
        items:[],requestedStatus:'failed',sourceCalls:0,received:0,rejected:0,
        duplicateWithinBatch:0,warnings:[status],
      }),{server:true});
      return {status:settled.status||'failed',slotUtc,policyVersion:SCOUT_POLICY_VERSION,
        errorCode:status};
    }catch{
      // Lease eventually expires; future ticks classify its state as failed.
      return {status:'unconfirmed',slotUtc,errorCode:'DB_COMMIT_UNVERIFIED'};
    }
  }
}
