import 'server-only';
import {getAppConfig} from '../app/config.js';
import {transaction} from '../app/database.js';
import {latestScoutSlot} from './video-scout.mjs';
import {classifyPublicVideos} from './free-classifier.mjs';
import {shouldTryGeminiFallback,classifyGeminiFreePublicMetadata} from './gemini-classifier-free.mjs';
import {claimClassifierBatch,classifierInput,settleClassifierBatch} from './classifier-store.mjs';

/** Distinct, optional free-AI task. No AI calls unless DB and env enable. */
export async function runFourHourlyClassification({
  config=getAppConfig(),env=process.env,fetcher=fetch,now=new Date(),
}={}){
  if(env.VERCEL_ENV!=='production'||env.HH_VIDEO_CLASSIFIER_ENABLED!=='true')
    return {status:'disabled',aiCalls:0};
  const slotUtc=latestScoutSlot(now);
  if(new Date(slotUtc).getUTCHours()%4!==0)return {status:'not_due',aiCalls:0};
  const claim=await transaction(config,null,db=>claimClassifierBatch(db,slotUtc),{server:true});
  if(!claim.claimed)return {status:claim.status,aiCalls:0};
  let result;
  try{
    const rows=await transaction(config,null,db=>classifierInput(db),{server:true});
    result=await classifyPublicVideos(rows,{key:env.HH_COUNCIL_OPENROUTER_API_KEY,fetcher});
    // Only explicit OpenRouter 429: one attempt with the already owner-verified
    // direct Gemini Free Tier account. No paid/unknown-tier fallback.
    if(shouldTryGeminiFallback(result,env)){
      try{
        const alternative=await classifyGeminiFreePublicMetadata(rows,{env,fetcher});
        const totalCalls=Math.min(4,(result.apiCalls||0)+(alternative.apiCalls||0));
        if(['ok','quota_paused'].includes(alternative.status))
          result={...alternative,apiCalls:totalCalls};
        else result={...result,apiCalls:totalCalls};
      }catch{ /* Preserve the original quota pause, never retry uncertainty. */ }
    }
  }catch{result={status:'failed',reason:'CLASSIFIER_EXECUTION_FAILED',results:[],apiCalls:0};}
  try{return await transaction(config,null,db=>settleClassifierBatch(db,claim,result),{server:true});}
  catch{return {status:'unconfirmed',error:'CLASSIFIER_COMMIT_UNVERIFIED'};}
}
