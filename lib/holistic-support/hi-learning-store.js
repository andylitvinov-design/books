import 'server-only';
import {transaction} from '../app/database.js';
import {validateHiLearningFeedback,observedHiLearningVersion,
  HI_LEARNING_POLICY_VERSION} from './hi-learning-policy.mjs';

/** Server-only explicit opt-in. No user text is an argument, ever. */
export async function insertHiLearningQuality(config,raw,{trustedTelegram=false}={}){
  const feedback=validateHiLearningFeedback(raw,{trustedTelegram});
  if(!feedback) return {saved:false,reason:'INVALID_FEEDBACK'};
  if(process.env.HH_LEARNING_OBSERVATORY_ENABLED!=='true')
    return {saved:false,reason:'OBSERVATORY_DISABLED'};
  const version=observedHiLearningVersion(feedback.channel);
  await transaction(config,null,async db=>{
    await db.query(
      'insert into app_private.hi_learning_quality_daily '+
      '(day,channel,locale,signal,algorithm_version,event_count,refreshed_at) '+
      "values((now() at time zone 'America/Toronto')::date,$1,$2,$3,$4,1,now()) "+
      'on conflict(day,channel,locale,signal,algorithm_version) do update set '+
      'event_count=app_private.hi_learning_quality_daily.event_count+1, '+
      'refreshed_at=now()',
      [feedback.channel,feedback.locale,feedback.signal,version]);
  },{server:true});
  return {saved:true,policyVersion:HI_LEARNING_POLICY_VERSION};
}

/** Owner-only caller must enforce requireAdminRequest before invoking this. */
export async function readHiLearningOwnerSnapshot(config){
  return transaction(config,null,async db=>{
    const [metrics,releases]=await Promise.all([
      db.query("select day,channel,locale,signal,algorithm_version,event_count "+
        'from app_private.hi_learning_quality_daily '+
        "where day >= (now() at time zone 'America/Toronto')::date - 30 "+
        'order by day desc,channel,locale,signal limit 500'),
      db.query('select created_at,candidate_version,baseline_version,evaluation_sha256,'+
        'decision,pr_number,deployment_sha,note_code from app_private.hi_learning_release_decisions '+
        'order by created_at desc limit 20'),
    ]);
    return {windowDays:31,modelAttribution:'cohort-only, not per-turn proof',
      metrics:metrics.rows.map(x=>({...x,event_count:Number(x.event_count)})),
      releases:releases.rows};
  },{server:true});
}
