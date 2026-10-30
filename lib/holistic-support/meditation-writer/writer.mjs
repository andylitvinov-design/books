/**
 * Meditation Writer / seven-beat literary generator.
 *
 * A safe, trusted PsychologicalCreativeBrief is REQUIRED. The caller may
 * inject an owned LLM writer provider, but it never gets authority over
 * clinical permissions, imagery consent, media, identity or billing.
 */
import { WRITER_BEAT_IDS } from "./contract.mjs";
import { ORIGINAL_STYLE_EXAMPLES, LITERARY_TECHNIQUES } from "./styles.mjs";
import { reviewMeditationDraft, reviewNarrationSegment } from "./editor.mjs";
export const LITERARY_WRITER_VERSION="literary-writer-v1";
const defaultPause = [3000,4500,7000,6000,6000,4000,2500];
const refocus=(text,max=240)=>typeof text==="string"?text.slice(-max):"";
const templateReady=prepared=>({
  version:LITERARY_WRITER_VERSION,status:"template_ready",generationMode:"template",
  title:prepared.template.title,locale:prepared.brief.locale,
  briefVersion:prepared.brief.schemaVersion,
  motifId:prepared.brief.selectedMotifId,styleId:prepared.brief.styleId,
  script:prepared.template.script,segments:prepared.template.segments,
  plannedDurationSeconds:prepared.template.plannedDurationSeconds,
  audioAssetId:null,videoAssetId:null,rendered:false,published:false,
  modelUsed:false,requiresEditorialReview:true,
});
/** A single provider implementation may stream or use bounded chunks. */
export async function writeMeditationDraft(prepared,{writeBeat,writeSegments,signal}={}) {
  if(!prepared || prepared.status!=="brief_ready" || !prepared.brief ||
    !prepared.template || prepared.template.status!=="script_ready")
    return {status:"blocked",generationMode:"none",modelUsed:false,
      audioAssetId:null,rendered:false,published:false};
  if(typeof writeBeat!=="function" && typeof writeSegments!=="function")return templateReady(prepared);
  const brief=prepared.brief;
  if(brief.beats?.length!==WRITER_BEAT_IDS.length)
    return {status:"blocked",generationMode:"none",reason:"INVALID_BRIEF"};
  const segments=[];
  let anchor="";
  try {
    // The single-call external writer receives ONLY the allowlisted, anonymous
    // creative parameters. In particular, no client phrase, problem description,
    // clinical notes, profile, auth details or history cross this boundary.
    const batch=typeof writeSegments==="function" ? await writeSegments({brief:{
      locale:brief.locale,focus:brief.focus,goal:brief.goal,
      selectedMotifId:brief.selectedMotifId,styleId:brief.styleId,
      channel:brief.channel,avoidElements:brief.avoidElements,
      targetDurationSeconds:brief.targetDurationSeconds,
      beats:brief.beats.map(({id,purpose,targetWords,maxWords})=>({
        id,purpose,targetWords,maxWords,
      })),
    }},{signal}) : null;
    if(batch!==null && (!Array.isArray(batch) || batch.length!==WRITER_BEAT_IDS.length))
      return {status:"rejected",generationMode:"none",reason:"SEGMENT_COUNT_INVALID",
        modelUsed:true,audioAssetId:null,rendered:false,published:false};
    for(let i=0;i<WRITER_BEAT_IDS.length;i++){
      if(signal?.aborted) return {status:"cancelled",generationMode:"none",modelUsed:false};
      const beat=brief.beats[i];
      if(beat.id!==WRITER_BEAT_IDS[i])
        return {status:"blocked",generationMode:"none",reason:"BEAT_SEQUENCE_INVALID"};
      const response=batch ? batch[i] : await writeBeat({
        brief: {schemaVersion:brief.schemaVersion,locale:brief.locale,
          focus:brief.focus,goal:brief.goal,selectedMotifId:brief.selectedMotifId,
          symbolId:brief.symbolId,styleId:brief.styleId,channel:brief.channel,
          avoidElements:brief.avoidElements,agencyRules:brief.agencyRules,
          desiredExperience:brief.desiredExperience,clientPhrase:brief.clientPhrase},
        style:brief.style,beat,precedingAnchor:anchor,
        example:ORIGINAL_STYLE_EXAMPLES[brief.locale]?.[brief.styleId]||"",
        techniqueNotes:brief.style.techniques.map(id=>LITERARY_TECHNIQUES[id]),
      },{signal});
      const text=typeof response==="string"?response:response?.text;
      const checked=reviewNarrationSegment({brief,beat,text});
      if(!checked.ok)return {status:"rejected",generationMode:"none",
        modelUsed:true,reason:checked.issues[0],rejectedBeatId:beat.id,
        audioAssetId:null,rendered:false,published:false};
      const pauseAfterMs=defaultPause[i];
      segments.push(Object.freeze({beatId:beat.id,text:text.trim(),pauseAfterMs,
        voiceStyle:"warm_calm",maySkip:true,eyesMayRemainOpen:true}));
      anchor=refocus(text);
    }
    const review=reviewMeditationDraft({brief,segments});
    if(review.status==="rejected")return {status:"rejected",generationMode:"none",
      modelUsed:true,reason:review.errors[0],review,
      audioAssetId:null,rendered:false,published:false};
    return Object.freeze({
      version:LITERARY_WRITER_VERSION,status:"draft_review_required",
      generationMode:"llm",modelUsed:true,locale:brief.locale,
      motifId:brief.selectedMotifId,styleId:brief.styleId,
      goal:brief.goal,clientPhraseUsed:!batch&&!!brief.clientPhrase,
      title:prepared.template.title,segments:Object.freeze(segments),
      script:segments.map(s=>s.text).join("\n\n"),
      // Planned duration and estimate are distinct. Real duration only after TTS.
      plannedDurationSeconds:brief.targetDurationSeconds,
      estimatedDurationSeconds:review.estimatedDurationSeconds,
      review,requiresEditorialReview:true,audioAssetId:null,
      videoAssetId:null,rendered:false,published:false,
    });
  } catch {
    // Do not echo prompt/provider error, raw personal text or tokens.
    return {status:"model_unavailable",generationMode:"none",modelUsed:false,
      audioAssetId:null,rendered:false,published:false};
  }
}
