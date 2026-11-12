/**
 * Deterministic, local-only expansion of an already approved FOUR-beat film.
 * This selects IDs, not URLs or rights: callers MUST provide independently
 * verified, same-origin/rights-safe, physically playable candidates.
 * Existing four acts remain the first shot of each act; never loop a master
 * or silently replace an explicitly edited storyboard.
 */
export const AUTO_FILM_MAX_SHOTS = 12;
const DURATIONS = new Set([10,15,20,30,60]);
const IDS = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GENERIC = new Set(['motion','abstract','scene','nature','video','landscape','energy','light','original']);
const tokenSet = values => new Set(values.filter(x=>typeof x==='string')
  .flatMap(x=>x.toLowerCase().split(/[^a-z0-9-]+/)).filter(x=>x&&!GENERIC.has(x)));
const fail = code => Object.freeze({ok:false,code,clipIds:[]});
const sameMaster = (a,b) => Boolean(a.masterKey===b.masterKey ||
  a.group&&b.group&&a.group===b.group ||
  a.origins.some(k=>b.origins.includes(k)));
const validRow = x => x&&x.certified===true&&IDS.test(x.id||'')&&
  typeof x.theme==='string'&&Number.isFinite(x.durationSeconds)&&
  x.durationSeconds>=2&&typeof x.masterKey==='string'&&x.masterKey.length>0&&
  Array.isArray(x.tags)&&Array.isArray(x.motifs)&&Array.isArray(x.origins)&&
  x.origins.every(y=>typeof y==='string'&&y.length>0)&&
  (x.group===null||typeof x.group==='string');
const stages = (seeds,extra) => {
  const beats=seeds.map(scene=>[scene]);
  extra.forEach((scene,index)=>beats[index%4].push(scene));
  return beats.flat();
};
const fits = (ordered,seconds) => {
  if(seconds<ordered.length*2)return false;
  const whole=Math.floor(seconds/ordered.length),remain=seconds%ordered.length;
  return ordered.every((scene,index)=>scene.durationSeconds+0.00001>=whole+(index<remain?1:0));
};

/** @param {{ initialIds:string[], scenes:object[], theme:string,
 * durationSeconds:number, legacyStageSeconds?:number[], maxShots?:number }} input
 */
export function autoFillApprovedFilm({initialIds,scenes,theme,durationSeconds,
  legacyStageSeconds=null,maxShots=AUTO_FILM_MAX_SHOTS}={}) {
  if(!DURATIONS.has(durationSeconds)||!Array.isArray(initialIds)||initialIds.length!==4||
    new Set(initialIds).size!==4||initialIds.some(id=>!IDS.test(id||''))||
    !Array.isArray(scenes)||typeof theme!=='string'||!theme||
    !Number.isInteger(maxShots)||maxShots<4||maxShots>AUTO_FILM_MAX_SHOTS)
    return fail('INVALID_INPUT');
  const catalog=new Map(scenes.filter(validRow).map(scene=>[scene.id,scene]));
  const seed=initialIds.map(id=>catalog.get(id));
  if(seed.some(x=>!x))return fail('INITIAL_SOURCES_NOT_VERIFIED');
  if(seed.some((s,i)=>seed.slice(0,i).some(x=>sameMaster(s,x))))
    return fail('DUPLICATE_ORIGINAL_MASTER');
  const all=(ordered,detail)=>Object.freeze({ok:true,clipIds:ordered.map(x=>x.id),
    addedCount:ordered.length-4,uniqueMasters:ordered.length,
    usedVariableTiming:detail,containsAbstractMotion:ordered.some(x=>x.media==='original_motion_mp4')});
  if(Array.isArray(legacyStageSeconds)&&legacyStageSeconds.length===4&&
    legacyStageSeconds.every(x=>Number.isInteger(x)&&x>=2)&&
    legacyStageSeconds.reduce((a,b)=>a+b,0)===durationSeconds&&
    seed.every((x,i)=>x.durationSeconds+0.00001>=legacyStageSeconds[i]))
    return all(seed,false);
  if(fits(seed,durationSeconds))return all(seed,true);
  const keyWords=tokenSet(seed.flatMap(s=>[...s.tags,...s.motifs]));
  const seedTopics=new Set(seed.map(s=>s.sourceId).filter(Boolean));
  const pool=[...catalog.values()].filter(s=>s.theme===theme&&!initialIds.includes(s.id))
    .map(s=>({scene:s,score:(seedTopics.has(s.sourceId)?110:0)+
      [...tokenSet([...s.tags,...s.motifs])].filter(x=>keyWords.has(x)).length*12+
      (s.media==='licensed_mp4'?40:0)}))
    .sort((a,b)=>b.score-a.score||a.scene.id.localeCompare(b.scene.id));
  const extras=[];
  for(const item of pool){
    if(seed.some(x=>sameMaster(x,item.scene))||
       extras.some(x=>sameMaster(x,item.scene)))continue;
    extras.push(item.scene);
    const next=stages(seed,extras);
    if(fits(next,durationSeconds))return all(next,true);
    if(next.length>=maxShots)break;
  }
  return fail('INSUFFICIENT_DISTINCT_APPROVED_FOOTAGE');
}
