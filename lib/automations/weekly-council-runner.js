import 'server-only';
import {getAppConfig} from '../app/config.js';
import {transaction} from '../app/database.js';
import {auditVideoSiteCoverage} from '../video-library/coverage.mjs';
import {runOwnerCouncilFive} from '../practitioners/owner-ai-five.mjs';
import {latestScoutSlot} from './video-scout.mjs';
import {councilIsDue,buildCouncilCoverageQuestion,normalizeCouncilProposal} from './weekly-council.mjs';
import {claimCouncilWeekly,previousCouncilOutcomes,settleCouncilWeekly} from './weekly-council-store.mjs';

export async function runWeeklyCouncilPlanner({
  config=getAppConfig(),env=process.env,fetcher=fetch,now=new Date(),
}={}){
 if(env.VERCEL_ENV!=='production'||env.HH_AUTOMATION_COUNCIL_ENABLED!=='true')
  return {status:'disabled',aiCalls:0};
 const slotUtc=latestScoutSlot(now);
 if(!councilIsDue(slotUtc))return {status:'not_due',aiCalls:0};
 const claim=await transaction(config,null,db=>claimCouncilWeekly(db,slotUtc),{server:true});
 if(!claim.claimed)return {status:claim.status,aiCalls:0};
 let proposal=null,reason='COUNCIL_UNAVAILABLE';
 try{
  const previous=await transaction(config,null,db=>previousCouncilOutcomes(db),{server:true});
  const coverage=auditVideoSiteCoverage({aspect:'landscape'});
  const question=buildCouncilCoverageQuestion(coverage,{previous});
  // Explicitly exclude optional Argon AI Gateway (nonzero-priced credit model).
  const freeOnlyEnv={...env,HH_COUNCIL_ARGON_GATEWAY_ENABLED:'false'};
  const reply=await runOwnerCouncilFive(question,freeOnlyEnv,fetcher);
  proposal=normalizeCouncilProposal(reply);
  if(!proposal)reason='COUNCIL_NO_VERIFIED_FREE_SYNTHESIS';
 }catch{reason='COUNCIL_EXECUTION_FAILED';}
 try{return await transaction(config,null,db=>settleCouncilWeekly(db,claim,{proposal,reason}),{server:true});}
 catch{return {status:'unconfirmed',error:'COUNCIL_COMMIT_UNVERIFIED'};}
}
