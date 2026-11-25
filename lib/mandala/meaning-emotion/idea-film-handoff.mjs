/**
 * Explicit consent handoff: selected creative meaning -> Psychologist Mind
 * nonclinical process -> STSE emotional stages -> editorial film/story options.
 * Actual physical MP4, audio rights, captions and export remain owned by
 * the existing Auto Video Director. No user text is sent to a provider.
 */
import {reviewCreativeMeaningIdea} from "../../holistic-support/psychologist-mind.mjs";
import {recommendScenario,normalizeStates,planTransitions} from "../state-transition/scenario-engine.mjs";
import {getStateDefinition} from "../state-transition/state-catalog.mjs";
import {getMyTubeTopic} from "../mytube-content-taxonomy.mjs";
import newMeaningMap from "../../../data/video-catalog/mytube-meaning-motifs-v1.json" with {type:"json"};

export const MEANING_HANDOFF_VERSION="meaning-film-handoff-v1";
// Curated semantic associations for symbolic film templates; they are not
// evidence that a physical shot depicts the chosen motif.
const MOTIF_BY_AXIS=Object.freeze(newMeaningMap.motifsByAxis);
const disallowedCopy={
 ru:"Смысловая идея не подходит для автоматического сюжета. Выберите нейтральный вариант или уточните запрос.",
 en:"This idea cannot safely drive an automatic story. Choose a neutral version or refine your request.",
 es:"Esta idea no permite un guion automático seguro. Elige una versión neutra o precisa la solicitud.",
};
export function buildMeaningFilmHandoff(ideaBrief,{locale="ru"}={}){
 const result={schemaVersion:MEANING_HANDOFF_VERSION,status:"not_confirmed",
   psychologistMind:null,emotionalScenario:null,filmScenario:null,
   ideaBrief:null,mayChangeExistingMedia:false,mayPublishVideo:false,
   renderReady:false,notes:["no_auto_video_render_or_therapy"]};
 if(!ideaBrief||ideaBrief.schemaVersion!=="meaning-idea-brief-v1"||
    !["confirmed","neutral_confirmed"].includes(ideaBrief.status)||
    !getMyTubeTopic(ideaBrief.topicId))
   return result;
 const lang=["ru","en","es"].includes(locale)?locale:"ru";
 const flow=ideaBrief.emotionalTransition||{};
 if(!getStateDefinition(flow.from)||!getStateDefinition(flow.to))
   return {...result,status:"invalid_emotional_transition"};
 const mind=reviewCreativeMeaningIdea(ideaBrief);
 if(!["creative_supportive","neutral_supportive_creative"].includes(mind.status))
   return {...result,status:"safety_or_confirmation_required",psychologistMind:mind};
 if(ideaBrief.status==="neutral_confirmed")
   return {...result,status:"neutral_supportive",psychologistMind:mind,ideaBrief,
     emotionalScenario:{status:"neutral",stages:mind.processCodes,pace:"gentle"},
     notes:["neutral_video_only","no_imposed_meaning","media_requires_separate_rights_check"]};
 const pace=ideaBrief.deliveryConstraints?.pace==="steady"?"steady":"gentle";
 const intensity=ideaBrief.deliveryConstraints?.activationLimit==="low"?"high":"medium";
 const stse=recommendScenario({
   schemaVersion:"state-transition-request-v1",locale:lang,topicId:ideaBrief.topicId,
   current:{stateId:flow.from,intensity},
   desired:{stateId:flow.to,intensity:"medium"},
   preferences:{pace:pace==="gentle"?"gentle":null},
 });
 if(stse.status!=="ok"||!stse.path||!stse.recommendations.length)
   return {...result,status:"no_safe_scenario",psychologistMind:mind,ideaBrief,
     notes:["stse_no_verified_transition"]};
 // S1: Narrative Director jointly ranks a reusable FILM template and motif
 // against the already confirmed meaning, while staying inside STSE's safe
 // candidate set. This is an editorial match, not a physical visual claim.
 const motifs=MOTIF_BY_AXIS[ideaBrief.meaningAxisId]||[];
 const scored=stse.recommendations.map((candidate)=>{
   const matches=candidate.suggestedMotifIds.filter(id=>motifs.includes(id));
   const best=motifs.find(id=>matches.includes(id))||
     candidate.suggestedMotifIds[0]||null;
   const strength=matches.length*10+(best&&motifs.includes(best)?4:0);
   return {candidate,best,strength};
 }).sort((a,b)=>b.strength-a.strength||
   a.candidate.rank-b.candidate.rank||
   a.candidate.scenarioId.localeCompare(b.candidate.scenarioId));
 const selected=scored[0]?.candidate;
 if(!selected)return {...result,status:"no_safe_scenario",psychologistMind:mind,ideaBrief};
 const motifId=scored[0].best;
 // S2: after selecting the creative film template/motif, take the
 // compatible bounded STSE path and the Psychologist Mind creative support
 // hints. Neither step asserts clinical change or prescribes feelings.
 const normalized=normalizeStates({
   current:{stateId:flow.from},desired:{stateId:flow.to}
 },lang);
 const matchingPaths=planTransitions({current:normalized.current,desired:normalized.desired,
   intensity,pace:pace==="gentle"?"gentle":null});
 const emotionalPath=matchingPaths.find(x=>x.templateId===selected.transitionTemplateId)||
   stse.path;
 const stages=[...emotionalPath.stages];
 // S3: scene intent only. A literal action, source MP4, right and duration
 // must come from the existing approved MyTube plot and montage pipeline.
 const sceneBeats=selected.fourBeats.map((description,index)=>({
   index:index+1,description,emotionalStage:stages[Math.min(index,stages.length-1)],
   verifiedVisualAction:null,approvedClipId:null,durationSeconds:null,
   requiresVisualEvidence:true,
 }));
 return {...result,status:"editorial_only",ideaBrief,psychologistMind:mind,
   emotionalScenario:{status:"planned_editorial",transitionTemplateId:emotionalPath.templateId,
     stages,pace:emotionalPath.pace,
     intent:ideaBrief.narrativeIntent,source:"stse",psychologicalProcess:mind.processCodes},
   filmScenario:{scenarioId:selected.scenarioId,topicId:ideaBrief.topicId,
     label:selected.label,creativeBrief:selected.creativeBrief,
     narrativeBeats:[...selected.fourBeats],centralIdea:ideaBrief.ideaText,
     motifId,motifSuggestions:[...selected.suggestedMotifIds],
     axisMotifMatch:motifId&&motifs.includes(motifId)?"editorial_fit":"no_semantic_motif_match",
     suggestedStyleId:selected.suggestedStyleId,
     sourceStatus:selected.editorialReviewStatus,
     mediaStatus:"needs_verified_media",visualMatchVerified:false},
   sceneScenario:{status:"needs_verified_plot_and_media",beats:sceneBeats,
     storyboardVerified:false,approvedSceneCount:0,plannedDurationSeconds:null},
   notes:["editorial_story_only","client_must_approve_film_and_captions",
     "physical_clips_and_rights_require_existing_gates"]};
}
/** Caption is suggested but never silently overwrites an edited track. */
export function suggestMeaningCaption(handoff,maxChars=110){
 if(handoff?.status!=="editorial_only"||!handoff.ideaBrief?.ideaText)return null;
 const text=handoff.ideaBrief.ideaText.trim().replace(/\s+/g," ");
 if(!text||text.length<20)return null;
 if(text.length<=maxChars)return text;
 // Do not silently truncate a meaningful idea into a misleading assertion.
 return null;
}
