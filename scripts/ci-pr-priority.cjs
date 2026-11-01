'use strict';

/**
 * Deterministic, read-only PR priority scheduler. Changes order only, not
 * protected-merge authorization or exact-HEAD/owner safety checks.
 */
const MINUTE=60000;
const BASE=Object.freeze({P0:400,P1:300,P2:200,P3:100});
const LEVELS=['p0','p1','p2','p3'];

function labelNames(pr){
  return new Set((Array.isArray(pr?.labels)?pr.labels:[])
    .map(l=>typeof l==='string'?l:l?.name).filter(l=>typeof l==='string')
    .map(l=>l.toLowerCase()));
}
function inferLevel(pr){
  const title=String(pr?.title||''), labels=labelNames(pr);
  if(labels.has('security')||labels.has('bug:production')||
     labels.has('hh:production-regression'))return ['P0','production/security'];
  if(/^(fix|hotfix)\((ci|actions|infra|pipeline|release)\)/i.test(title) ||
     /^(fix|hotfix):.*\b(watchdog|automerge|auto.merge|repair worker|core ci)\b/i.test(title)){
    // A historical test-only PR is not an urgent CI outage just because its
    // title starts with fix(ci). Reserve automatic P0 for genuine delivery
    // control incidents. Owner labels can always override this inference.
    if(/\b(watchdog|auto.?merge|repair worker|core ci|release[- ]ready|branch protection|ci slots?|deadlock|blocking workers|stuck queue)\b/i.test(title))
      return ['P0','critical delivery CI'];
    if(/\b(unblock|blocked|broken|failed|failure|crash|release)\b/i.test(title))
      return ['P1','pipeline repair'];
    return ['P2','CI/test maintenance'];
  }
  if(/^(fix|hotfix)\((video|voice|audio|messages|messenger|auth|payments?|support)\)/i.test(title) &&
     /\b(unblock|broken|crash|regression|restore|fail(?:ed|ing)?|stuck|cannot|not working)\b/i.test(title))
    return ['P0','broken client functionality'];
  if(/^(chore|docs|style|test)(\(|:)/i.test(title))return ['P3','maintenance'];
  if(/\b(video|videos|voice|audio|tts|messenger|messages|hypno|hypnosis|telegram|payment|payments|checkout)\b/i.test(title) ||
     /\b(видео|голос|аудио|мессенджер|оплат|гипно)\w*/i.test(title))
    return ['P1','client media/communications'];
  return ['P2','normal product delivery'];
}
function priorityFor(pr,now=Date.now()){
  const labels=labelNames(pr);
  const explicit=LEVELS.filter(tier=>labels.has('hh:priority:'+tier));
  if(explicit.length>1)return {tier:'P3',score:0,source:'ambiguous labels',
    conflicted:true,ageDays:0};
  const inference=inferLevel(pr);
  const tier=explicit.length?explicit[0].toUpperCase():inference[0];
  const created=Date.parse(pr?.created_at||'');
  const ageDays=Number.isFinite(created)?Math.max(0,Math.floor((now-created)/(24*60*MINUTE))):0;
  const ageBonus=Math.min(30,Math.floor(ageDays/3));
  const queueBonus=labels.has('hh:repair-needed')?12:
    labels.has('hh:conflict-repair-needed')?8:
    labels.has('hh:ci-needed')?6:0;
  return {tier,score:BASE[tier]+ageBonus+queueBonus,
    source:explicit.length?'owner priority label':inference[1],conflicted:false,ageDays};
}
function rankedCandidates(items,now=Date.now()){
  return (Array.isArray(items)?items:[]).filter(i=>Number.isSafeInteger(i?.number))
    .filter(i=>!priorityFor(i,now).conflicted)
    .sort((a,b)=>{
      const scoreDiff=priorityFor(b,now).score-priorityFor(a,now).score;
      if(scoreDiff)return scoreDiff;
      const aTime=Date.parse(a.updated_at||''),bTime=Date.parse(b.updated_at||'');
      if(Number.isFinite(aTime)&&Number.isFinite(bTime)&&aTime!==bTime)return bTime-aTime;
      return a.number-b.number;
    });
}
/** High-impact slots plus non-overlapping deterministic rotating slots. */
function pickQueueCandidates(items,now=Date.now(),max=4,fastSlots=3){
  if(!Number.isSafeInteger(max)||max<1||max>20||
     !Number.isSafeInteger(fastSlots)||fastSlots<0||fastSlots>max)
    throw Error('Unsafe bounded priority queue size');
  const all=rankedCandidates(items,now);
  if(all.length<=max)return all;
  const top=all.slice(0,fastSlots);
  const picked=new Set(top.map(x=>x.number));
  const pool=all.filter(x=>!picked.has(x.number)).sort((a,b)=>a.number-b.number);
  const count=max-top.length;
  if(count===0)return top;
  const offset=(Math.floor(now/(10*MINUTE))*count)%pool.length;
  const rotating=Array.from({length:Math.min(pool.length,count)},(_,i)=>pool[(offset+i)%pool.length]);
  return [...top,...rotating];
}
module.exports={priorityFor,rankedCandidates,pickQueueCandidates,labelNames,inferLevel};
