/** Shared, deterministic four-shot timing for the approved Free video catalog. */
export const FREE_FILM_DURATIONS=Object.freeze([10,15,20,30,60]);
/** @param {number} durationSeconds @param {readonly string[]} clipIds */
export function allocateFreeFilmTimeline(durationSeconds,clipIds){
  if(!Number.isInteger(durationSeconds)||!FREE_FILM_DURATIONS.includes(durationSeconds)||
    !Array.isArray(clipIds)||clipIds.length!==4||
    clipIds.some(id=>typeof id!=="string"||!id.trim())||new Set(clipIds).size!==4)
    throw Error("invalid_free_film_timeline");
  let cursor=0;
  const part=Math.floor(durationSeconds/4),remainder=durationSeconds%4;
  const shots=clipIds.map((sceneId,index)=>{
    const durationSeconds=part+(index<remainder?1:0);
    const shot=Object.freeze({sceneId,startSeconds:cursor,durationSeconds});
    cursor+=durationSeconds;
    return shot;
  });
  if(cursor!==durationSeconds)throw Error("free_film_timeline_duration_mismatch");
  return Object.freeze(shots);
}

/** Retain the selected source scenes and redistribute their timeline. */
export function retimeFreeFilmPlan(plan,durationSeconds){
  const timings=allocateFreeFilmTimeline(durationSeconds,plan.shots.map(shot=>shot.sceneId));
  return {...plan,durationSeconds,shots:plan.shots.map((shot,index)=>({...shot,...timings[index]}))};
}


/**
 * Adaptive pacing is opt-in for Auto Video Director. The legacy equal
 * allocator above is intentionally preserved for all existing callers.
 */
export const FREE_FILM_STAGE_WEIGHTS=Object.freeze([5,7,10,8]);
export const FREE_FILM_MIN_STAGE_SECONDS=2;

/** Deterministic, source-backed montage: no new footage is invented.
 * @param {number} durationSeconds
 * @param {readonly string[]} clipIds
 * @param {readonly number[]|null} [manualStageSeconds]
 */
export function allocateAdaptiveFilmTimeline(durationSeconds,clipIds,manualStageSeconds=null){
  allocateFreeFilmTimeline(durationSeconds,clipIds);
  let lengths;
  if(manualStageSeconds!==null){
    if(!Array.isArray(manualStageSeconds)||manualStageSeconds.length!==4||
      manualStageSeconds.some(n=>!Number.isInteger(n)||n<FREE_FILM_MIN_STAGE_SECONDS)||
      manualStageSeconds.reduce((sum,n)=>sum+n,0)!==durationSeconds)
      throw Error("invalid_adaptive_film_timing");
    lengths=[...manualStageSeconds];
  }else{
    const totalWeight=FREE_FILM_STAGE_WEIGHTS.reduce((sum,n)=>sum+n,0);
    const exact=FREE_FILM_STAGE_WEIGHTS.map(w=>durationSeconds*w/totalWeight);
    lengths=exact.map(n=>Math.max(FREE_FILM_MIN_STAGE_SECONDS,Math.floor(n)));
    while(lengths.reduce((sum,n)=>sum+n,0)<durationSeconds){
      let best=0;
      for(let i=1;i<lengths.length;i++)
        if(exact[i]-lengths[i]>exact[best]-lengths[best]+1e-9)best=i;
      lengths[best]++;
    }
    while(lengths.reduce((sum,n)=>sum+n,0)>durationSeconds){
      let best=-1;
      for(let i=0;i<lengths.length;i++){
        if(lengths[i]<=FREE_FILM_MIN_STAGE_SECONDS)continue;
        if(best<0||lengths[i]-exact[i]>lengths[best]-exact[best]+1e-9)best=i;
      }
      if(best<0)throw Error("invalid_adaptive_film_timing");
      lengths[best]--;
    }
  }
  let cursor=0;
  const shots=clipIds.map((sceneId,index)=>{
    const shot=Object.freeze({sceneId,startSeconds:cursor,durationSeconds:lengths[index]});
    cursor+=lengths[index];
    return shot;
  });
  if(cursor!==durationSeconds)throw Error("invalid_adaptive_film_timing");
  return Object.freeze(shots);
}

/** One-second transfer between adjacent stages, minimum two seconds each. */
export function shiftAdaptiveFilmBoundary(lengths,boundary,direction){
  if(!Array.isArray(lengths)||lengths.length!==4||
    lengths.some(n=>!Number.isInteger(n)||n<FREE_FILM_MIN_STAGE_SECONDS)||
    !Number.isInteger(boundary)||boundary<0||boundary>=3||
    (direction!==1&&direction!==-1))
    throw Error("invalid_adaptive_film_boundary");
  const next=[...lengths];
  if(next[boundary]+direction<FREE_FILM_MIN_STAGE_SECONDS||
     next[boundary+1]-direction<FREE_FILM_MIN_STAGE_SECONDS)
    return Object.freeze(next);
  next[boundary]+=direction;
  next[boundary+1]-=direction;
  return Object.freeze(next);
}

/** Preserve source IDs/shot metadata while resetting a new total to adaptive pacing. */
export function retimeAdaptiveFilmPlan(plan,durationSeconds){
  if(!plan||!Array.isArray(plan.shots))throw Error("invalid_adaptive_film_plan");
  const timing=allocateAdaptiveFilmTimeline(durationSeconds,plan.shots.map(s=>s.sceneId));
  return {...plan,durationSeconds,shots:plan.shots.map((shot,i)=>({...shot,...timing[i]}))};
}
