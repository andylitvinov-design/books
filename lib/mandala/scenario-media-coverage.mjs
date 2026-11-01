/**
 * Holistic House scenario-video coverage.
 * Pure and deterministic. It never invents footage, marks a missing MP4 as ready,
 * calls a stock provider, or rewrites a live storyboard when coverage is partial.
 */
const RIGHTS=new Set(["existing_approved_first_party_master","dareful_cc_by_4_0"]);
const COLLECTIONS=new Set(["money-films-v1","film-collection-v2","film-collection-v3"]);
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isUsableFilm(scene){
  return !!scene&&slug.test(scene.id||"")&&COLLECTIONS.has(scene.collection)&&
    RIGHTS.has(scene.rightsReference?.kind)&&scene.status==="approved"&&
    scene.media==="licensed_mp4"&&
    scene.video==="/videos/holistic-house/"+scene.collection+"/"+scene.id+".mp4"&&
    scene.poster==="/videos/holistic-house/"+scene.collection+"/"+scene.id+".jpg";
}

/** Four distinct source IDs is necessary, but NOT sufficient for dedicated scenes. */
export function auditScenarioMedia(presets,scenes){
  if(!Array.isArray(presets)||!Array.isArray(scenes))throw Error("invalid_media_catalog");
  const sceneById=new Map(scenes.filter(isUsableFilm).map(s=>[s.id,s]));
  const ids=new Set(),referenceCount=new Map(),errors=[];
  const themes=new Map();
  for(const scene of scenes){
    if(ids.has(scene.id))errors.push({type:"duplicate_scene_id",scene:scene.id});
    ids.add(scene.id);
    if(!isUsableFilm(scene))errors.push({type:"unapproved_scene",scene:scene?.id||null});
    if(!themes.has(scene.theme))themes.set(scene.theme,{theme:scene.theme,scenarios:0,slots:0,available:0,missing:0,uniqueAssigned:0});
    if(isUsableFilm(scene))themes.get(scene.theme).available++;
  }
  const presetIds=new Set();
  for(const preset of presets){
    if(!preset||!slug.test(preset.id||"")||!slug.test(preset.theme||"")||presetIds.has(preset.id))
      errors.push({type:"invalid_scenario_id",scenario:preset?.id||null});
    presetIds.add(preset?.id);
    if(!themes.has(preset?.theme))themes.set(preset.theme,{theme:preset.theme,scenarios:0,slots:0,available:0,missing:0,uniqueAssigned:0});
    const row=themes.get(preset.theme);row.scenarios++;row.slots+=4;
    if(!Array.isArray(preset.clips)||preset.clips.length!==4||new Set(preset.clips).size!==4)
      errors.push({type:"scenario_requires_four_distinct_clips",scenario:preset.id});
    for(const id of preset.clips||[]){
      if(!sceneById.has(id))errors.push({type:"missing_or_unapproved_clip",scenario:preset.id,clip:id});
      else referenceCount.set(id,(referenceCount.get(id)||0)+1);
    }
  }
  for(const [theme,row] of themes){
    row.missing=Math.max(0,row.slots-row.available);
    row.uniqueAssigned=[...referenceCount.keys()].filter(id=>sceneById.get(id).theme===theme).length;
  }
  const byTheme=[...themes.values()].sort((a,b)=>a.theme.localeCompare(b.theme));
  const repeatedClips=[...referenceCount].filter(([,n])=>n>1)
    .map(([id,used])=>({id,used})).sort((a,b)=>b.used-a.used||a.id.localeCompare(b.id));
  return {
    scenarios:presets.length,requiredSlots:presets.length*4,approvedScenes:sceneById.size,
    assignedUniqueClips:referenceCount.size,
    unusedApprovedSceneIds:[...sceneById.keys()].filter(id=>!referenceCount.has(id)).sort(),
    repeatedClips,byTheme,
    minimumNewDedicatedScenes:byTheme.reduce((sum,t)=>sum+t.missing,0),
    errors,
    fourClipsPerScenarioReady:errors.length===0,
    dedicatedScenesReady:errors.length===0&&byTheme.every(t=>t.missing===0)&&repeatedClips.length===0,
  };
}

/**
 * Fair allocation per theme, one stage per scenario in each round.
 * Prefer existing matching footage, then matching licensed scene tags.
 * Returns null slots when stock is insufficient; caller must NOT publish partial plans.
 */
export function planDedicatedScenarioMedia(presets,scenes){
  const audit=auditScenarioMedia(presets,scenes);
  if(audit.errors.length)throw Error("fix_catalog_errors_before_planning");
  const allScenes=scenes.filter(isUsableFilm),chosen=new Set(),plan=new Map();
  for(const preset of presets)plan.set(preset.id,[null,null,null,null]);
  const themeNames=[...new Set(presets.map(p=>p.theme))];
  for(const theme of themeNames){
    const group=presets.filter(p=>p.theme===theme);
    const candidates=allScenes.filter(s=>s.theme===theme);
    for(let stage=0;stage<4;stage++){
      for(const preset of group){
        const original=preset.clips[stage];
        const current=allScenes.find(s=>s.id===original);
        const preferredTags=new Set([...(preset.focusTags||[]),...(current?.tags||[])]);
        const scored=candidates.filter(s=>!chosen.has(s.id)).map(s=>({
          scene:s,
          score:(s.id===original?1000:0)+
            (s.tags||[]).filter(t=>preferredTags.has(t)).length*8+
            (s.categories||[]).filter(t=>preferredTags.has(t)).length*4,
        })).sort((a,b)=>b.score-a.score||a.scene.id.localeCompare(b.scene.id));
        if(scored[0]){
          const id=scored[0].scene.id;chosen.add(id);plan.get(preset.id)[stage]=id;
        }
      }
    }
  }
  return {
    ready:audit.errors.length===0&&[...plan.values()].every(clips=>clips.every(Boolean)),
    missingSlots:[...plan].flatMap(([scenario,clips])=>clips.flatMap((id,stage)=>id?[]:[{scenario,stage:stage+1}])),
    assignments:Object.fromEntries(plan),
  };
}
