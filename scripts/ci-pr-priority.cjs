'use strict';

/**
 * A PR inherits priority from its DEVELOPMENT DIRECTION. This module does not
 * grant permission to edit or merge a PR. The trusted Direction Watcher writes
 * labels only as an index of the central policy, not owner-selected PR rankings.
 */
const POLICY=require('../.github/hh-pr-directions.json');
const MINUTE=60_000;
const LEVEL_BASE=Object.freeze({1:500,2:400,3:300,4:200,5:100});
const SHA=/^[a-f0-9]{40}$/i;
if(POLICY.schema!=='HH_PR_DIRECTION_POLICY_V1'||
   !Array.isArray(POLICY.directions)||!Array.isArray(POLICY.levels)||
   POLICY.levels.length!==5 ||
   new Set(POLICY.directions.map(x=>x.id)).size!==POLICY.directions.length ||
   POLICY.directions.some(x=>!Number.isInteger(x.level)||x.level<1||x.level>5||
     !/^[a-z0-9-]+$/.test(x.id)||!Array.isArray(x.scopes)||
     !Array.isArray(x.terms)||!Array.isArray(x.paths)))
  throw Error('Invalid trusted development direction policy');

const BY_ID=new Map(POLICY.directions.map(x=>[x.id,x]));
const DIRECTION_PREFIX='hh:direction:';
const OVERRIDE_PREFIX='hh:direction-override:';
const PRIORITY_PREFIX='hh:priority:';

function labelNames(pr){
  return new Set((Array.isArray(pr?.labels)?pr.labels:[])
    .map(x=>typeof x==='string'?x:x?.name)
    .filter(x=>typeof x==='string').map(x=>x.toLowerCase()));
}
function existingDirection(labels){
  const names=[...labels].filter(x=>x.startsWith(DIRECTION_PREFIX))
    .map(x=>x.slice(DIRECTION_PREFIX.length));
  if(names.length!==1||!BY_ID.has(names[0]))return null;
  return BY_ID.get(names[0]);
}
function declaredOverride(labels){
  const matches=[...labels].filter(x=>x.startsWith(OVERRIDE_PREFIX))
    .map(x=>x.slice(OVERRIDE_PREFIX.length));
  if(matches.length>1||matches.some(id=>!BY_ID.has(id)))
    return {conflicted:true,source:'ambiguous direction override'};
  return matches.length?{direction:BY_ID.get(matches[0]),source:'direction override'}:null;
}
function titleScope(title){
  const m=String(title||'').match(/^[a-z][a-z0-9-]*\(([^)]{1,80})\)\s*:/i);
  return m?m[1].trim().toLowerCase():null;
}
function inferLevel(pr){
  const x=classifyDirection(pr);
  return ['P'+x.level,x.source];
}
function classifyDirection(pr,files=null){
  const labels=labelNames(pr);
  const override=declaredOverride(labels);
  if(override?.conflicted)return {id:'other',level:5,source:override.source,conflicted:true};
  if(override?.direction)
    return {id:override.direction.id,level:override.direction.level,
      source:override.source,conflicted:false};

  const title=String(pr?.title||'').toLowerCase();
  const scope=titleScope(title);
  if(scope){
    const direct=POLICY.directions.find(d=>d.id!=='other'&&
      d.scopes.some(word=>word.toLowerCase()===scope));
    if(direct)return {id:direct.id,level:direct.level,source:'PR scope',conflicted:false};
  }
  const matched=POLICY.directions.filter(d=>d.id!=='other').map(d=>{
    const matching=d.terms.filter(w=>title.includes(String(w).toLowerCase()));
    return {direction:d,score:matching.reduce((sum,w)=>sum+Math.max(2,w.length),0),
      matches:matching.length};
  }).filter(x=>x.matches>0).sort((a,b)=>
    b.score-a.score||a.direction.level-b.direction.level);
  if(matched.length){
    const d=matched[0].direction;
    return {id:d.id,level:d.level,source:'title classification',conflicted:false};
  }
  if(Array.isArray(files)&&files.length>0){
    const paths=files.filter(x=>typeof x==='string').map(x=>x.toLowerCase());
    const matchedByPath=POLICY.directions.filter(d=>d.id!=='other').map(d=>({
      direction:d,
      count:paths.filter(path=>d.paths.some(pattern=>
        path.includes(String(pattern).toLowerCase()))).length
    })).filter(x=>x.count>0).sort((a,b)=>
      b.count-a.count||a.direction.level-b.direction.level);
    if(matchedByPath.length){
      const d=matchedByPath[0].direction;
      return {id:d.id,level:d.level,source:'changed files',conflicted:false};
    }
  }
  // Preserve a previously path-classified direction when the title is too
  // vague. The label is still bound to the central policy's current level.
  const old=existingDirection(labels);
  if(old&&old.id!=='other')return {
    id:old.id,level:old.level,source:'prior direction classification',conflicted:false
  };
  return {id:'other',level:5,source:'unclassified fallback',conflicted:false};
}

function managedLabels(pr){
  return [...labelNames(pr)].filter(x=>
    x.startsWith(DIRECTION_PREFIX) ||
    (x.startsWith(PRIORITY_PREFIX) && /^hh:priority:(?:p[0-9]+|[0-9]+)$/.test(x)));
}
function desiredLabels(pr,files=null){
  const result=classifyDirection(pr,files);
  if(result.conflicted)return {...result,desired:[],obsolete:[],needsSync:false};
  const desired=[DIRECTION_PREFIX+result.id,PRIORITY_PREFIX+result.level];
  const current=labelNames(pr);
  const obsolete=managedLabels(pr).filter(x=>!desired.includes(x));
  return {...result,desired,obsolete,
    needsSync:desired.some(x=>!current.has(x))||obsolete.length>0};
}
function priorityFor(pr,now=Date.now()){
  const d=classifyDirection(pr);
  if(d.conflicted)return {tier:'P5',level:5,score:0,source:d.source,
    direction:'other',conflicted:true,ageDays:0};
  const created=Date.parse(pr?.created_at||'');
  const ageDays=Number.isFinite(created)?
    Math.max(0,Math.floor((now-created)/(24*60*MINUTE))):0;
  const names=labelNames(pr);
  // Age and ready-queue bonuses stay below the gap between priority levels.
  const ageBonus=Math.min(30,Math.floor(ageDays/3));
  const queueBonus=names.has('hh:repair-needed')?12:
    names.has('hh:ci-needed')?6:0;
  return {tier:'P'+d.level,level:d.level,direction:d.id,
    score:LEVEL_BASE[d.level]+ageBonus+queueBonus,
    source:d.source,conflicted:false,ageDays};
}
/**
 * Read-only preliminary availability. Final source ownership/leases, exact
 * head, CI and branch protection are ALWAYS checked by the real worker.
 */
function isFreeFor(pr,lane='inspect'){
  if(!pr||pr.state==='closed'||pr.state==='CLOSED'||pr.draft)return false;
  const names=labelNames(pr);
  if(names.has('hh:hold')||names.has('hh:repair-manual')||
     names.has('hh:blocked')||names.has('hh:worker-claimed'))return false;
  if(declaredOverride(names)?.conflicted)return false;
  if(lane==='repair')return names.has('hh:repair-needed');
  if(lane==='ci')return names.has('hh:ci-needed')&&
    !names.has('hh:ci-bootstrap-attempted');
  if(lane==='merge')return !names.has('hh:conflict-repair-needed');
  return true;
}
function rankedCandidates(items,now=Date.now()){
  return (Array.isArray(items)?items:[])
    .filter(x=>Number.isSafeInteger(x?.number)&&x.number>0)
    .filter(x=>!priorityFor(x,now).conflicted)
    .sort((a,b)=>{
      const diff=priorityFor(b,now).score-priorityFor(a,now).score;
      if(diff)return diff;
      const aa=Date.parse(a.updated_at||''),bb=Date.parse(b.updated_at||'');
      if(Number.isFinite(aa)&&Number.isFinite(bb)&&aa!==bb)return bb-aa;
      return a.number-b.number;
    });
}
function selectNextAvailable(items,lane,now=Date.now()){
  return rankedCandidates((items||[]).filter(x=>isFreeFor(x,lane)),now)[0]||null;
}
function pickQueueCandidates(items,now=Date.now(),max=4,fastSlots=3){
  if(!Number.isSafeInteger(max)||max<1||max>20||
    !Number.isSafeInteger(fastSlots)||fastSlots<0||fastSlots>max)
    throw Error('Unsafe bounded priority queue size');
  const all=rankedCandidates(items,now);
  if(all.length<=max)return all;
  const top=all.slice(0,fastSlots);
  const ids=new Set(top.map(x=>x.number));
  const pool=all.filter(x=>!ids.has(x.number)).sort((a,b)=>a.number-b.number);
  const count=max-top.length;
  if(!count)return top;
  const offset=(Math.floor(now/(10*MINUTE))*count)%pool.length;
  return [...top,...Array.from({length:Math.min(count,pool.length)},
    (_,i)=>pool[(offset+i)%pool.length])];
}
module.exports={POLICY,priorityFor,rankedCandidates,pickQueueCandidates,
  labelNames,classifyDirection,inferLevel,desiredLabels,managedLabels,
  isFreeFor,selectNextAvailable,titleScope,SHA};
