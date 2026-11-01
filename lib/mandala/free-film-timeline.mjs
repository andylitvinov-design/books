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
