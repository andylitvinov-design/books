/**
 * Editorial intake queue for the 4-distinct-MP4-per-scenario contract.
 * Nothing in this queue is approved media; no third-party URLs are fabricated.
 */
import {planDedicatedScenarioMedia,auditScenarioMedia} from "./scenario-media-coverage.mjs";

export function createScenarioAcquisitionQueue(presets,scenes){
  const audit=auditScenarioMedia(presets,scenes);
  if(audit.errors.length)throw Error("invalid_existing_scenario_catalog");
  const plan=planDedicatedScenarioMedia(presets,scenes);
  const byPreset=new Map(presets.map(p=>[p.id,p]));
  const byClip=new Map(scenes.map(s=>[s.id,s]));
  const slots=plan.missingSlots.map(({scenario,stage})=>{
    const preset=byPreset.get(scenario);
    const reference=byClip.get(preset.clips[stage-1]);
    return {
      id:scenario+"-shot-"+stage,
      theme:preset.theme,scenarioId:scenario,shot:stage,
      requiredAsset:"unique_licensed_h264_mp4",
      suggestedEnglishSubject:reference?.description?.en||reference?.label?.en||scenario,
      relevantTags:[...new Set([...(preset.focusTags||[]),...(reference?.tags||[])])].slice(0,7),
      newIndependentVideoRequired:true,
      sourceUrl:null,creator:null,license:null,sha256:null,
      rightsStatus:"needs_individual_editorial_review",
      importStatus:"not_imported",
    };
  });
  return {
    version:1,scope:"currently_live_24_free_film_presets",requiredPerScenario:4,
    expectedNewMp4:slots.length,
    notCountingFutureGoalTopicTree:true,
    byTheme:Object.fromEntries(audit.byTheme.filter(t=>t.missing>0).map(t=>[t.theme,t.missing])),
    ready:slots.length===0&&plan.ready,slots,
  };
}
