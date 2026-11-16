/**
 * HH Meaning × Emotion Idea Engine v1.
 * Deterministic, offline, consent-before-use creative ideas. NOT diagnosis,
 * psychometric scoring, therapy, evidence of benefit, or video rights.
 */
import catalog from "../../../data/video-catalog/meaning-emotion-ideas-v1.json" with {type:"json"};
import {getMyTubeTopic} from "../mytube-content-taxonomy.mjs";
import {getStateDefinition,STSE_LOCALES} from "../state-transition/state-catalog.mjs";
import {normalizeStates} from "../state-transition/scenario-engine.mjs";
import {getEmotionalVectorByStates,calculateEmotionalRelief} from "./emotional-vector-matrix.mjs";
import {MATRIX_MEANING_IDEAS,auditMatrixMeaningAtlas} from "./emotional-meaning-atlas.mjs";

export const MEANING_IDEA_VERSION="meaning-emotion-v1";
export const MEANING_RANKER_VERSION="meaning-selector-v1";
export const MEANING_AXES=Object.freeze(catalog.axes);
export const EMOTIONAL_VECTORS=Object.freeze(catalog.vectors);
export const MEANING_IDEAS=Object.freeze(catalog.ideas);
export const COMPOSED_MEANING_IDEAS=MATRIX_MEANING_IDEAS;
export {auditMatrixMeaningAtlas};
export const INCOMPATIBLE_FRAMES=Object.freeze(catalog.incompatibleFrames);
const axes=new Map(MEANING_AXES.map(x=>[x.id,x]));
const vectors=new Map(EMOTIONAL_VECTORS.map(x=>[x.id,x]));
const ideas=new Map([...MEANING_IDEAS,...MATRIX_MEANING_IDEAS].map(x=>[x.id,x]));
const pairs=new Map(EMOTIONAL_VECTORS.map(x=>[x.currentStateId+">"+x.desiredStateId,x]));
const langOf=x=>STSE_LOCALES.includes(x)?x:"ru";
const normal=x=>String(x??"").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g," ").trim();
const crisis=/(суицид|самоубийств|хочу умереть|убить себя|порезать себя|самоповрежден|непосредственн(?:ая|ой) опасност|self[\s-]?harm|kill myself|suicid|want to die|immediate danger|quiero morir|suicid|hacerme da[nñ]o|peligro inmediato|острая боль в груди|severe chest pain)/iu;
const coercion=/(обязан(?:а|ы)? прощать|долж(?:ен|на) терпеть|нужно терпеть насилие|всегда всё хорошо|травма дана для роста|(?:must|have to) forgive|(?:must|have to) tolerate abuse|trauma is a gift|you are cured|debo perdonar|tengo que soportar abusos|trauma es un regalo)/iu;
const safetyCopy=Object.freeze({
 ru:"Если вы сейчас в опасности или кризисе, обратитесь к экстренной помощи или человеку, которому доверяете; подбор видео не заменяет помощь.",
 en:"If you are in immediate danger or crisis, seek emergency or trusted human support; a video cannot replace it.",
 es:"Si estás en peligro o crisis, busca ayuda de emergencias o de una persona de confianza; un vídeo no sustituye esa ayuda.",
});
const clarifyCopy=Object.freeze({
 ru:"Выберите пару состояний из списка. Пока нет проверенной смысловой матрицы для этого сочетания.",
 en:"Choose a listed state transition. This combination does not yet have a reviewed idea matrix.",
 es:"Elige una transición de la lista. Esta combinación aún no tiene una matriz de ideas revisada.",
});
const axisCopy=Object.freeze({
 ru:"Какую область смысла вы хотите исследовать? Выберите ось либо продолжите без смысловой идеи.",
 en:"Which area of meaning would you like to explore? Choose an axis or continue without a meaning idea.",
 es:"¿Qué ámbito de sentido quieres explorar? Elige un eje o sigue sin idea de sentido.",
});
const bounded=x=>x===null||x===undefined||x===""?null:
  (Number.isInteger(x)&&x>=0&&x<=10?x:NaN);
const finiteOrNull=x=>x===null||Number.isInteger(x)&&x>=0&&x<=10;
const properInput=x=>x&&typeof x==="object"&&!Array.isArray(x);
export function listMeaningAxes(locale="ru"){
 const l=langOf(locale);
 return MEANING_AXES.map(x=>({id:x.id,label:x.labels[l],description:x.shortDescription[l],
   facets:x.facets.map(f=>({id:f.id,label:f.labels[l]}))}));
}
export function listEmotionalVectors(locale="ru"){
 const l=langOf(locale);
 return EMOTIONAL_VECTORS.map(v=>({id:v.id,currentStateId:v.currentStateId,
   desiredStateId:v.desiredStateId,label:v.labels[l]}));
}
export function auditMeaningIdeaCatalog(){
 const errors=[],ids=new Set(),sentences={ru:new Set(),en:new Set(),es:new Set()};
 const facetIds=MEANING_AXES.flatMap(a=>a.facets.map(f=>f.id));
 if(MEANING_AXES.length!==8||new Set(MEANING_AXES.map(a=>a.id)).size!==8)errors.push("axes");
 if(facetIds.length!==11||new Set(facetIds).size!==11)errors.push("facets");
 if(EMOTIONAL_VECTORS.length<6||new Set(EMOTIONAL_VECTORS.map(x=>x.id)).size!==EMOTIONAL_VECTORS.length)
   errors.push("vectors");
 for(const v of EMOTIONAL_VECTORS){
   if(!getStateDefinition(v.currentStateId)||!getStateDefinition(v.desiredStateId))errors.push("state:"+v.id);
   for(const axis of MEANING_AXES){
     const rows=MEANING_IDEAS.filter(x=>x.vectorId===v.id&&x.axisId===axis.id);
     if(rows.length<3)errors.push("cell:"+v.id+":"+axis.id);
     if(new Set(rows.map(x=>x.premiseType)).size<3)errors.push("ideas_not_diverse:"+v.id+":"+axis.id);
   }
 }
 for(const x of MEANING_IDEAS){
   if(ids.has(x.id))errors.push("duplicate_id:"+x.id);ids.add(x.id);
   if(!axes.has(x.axisId)||!vectors.has(x.vectorId))errors.push("unknown_fk:"+x.id);
   if(x.approvedByOwner!==false&&x.approvedByOwner!==true)errors.push("editorial_flag:"+x.id);
   for(const l of STSE_LOCALES){
     const body=x.semanticPremise?.[l];
     if(typeof body!=="string"||body.length<35||body.length>260||coercion.test(body)||crisis.test(body))
       errors.push("invalid_idea:"+x.id+":"+l);
     const key=normal(body);
     if(sentences[l].has(key))errors.push("duplicate_text:"+x.id+":"+l);
     sentences[l].add(key);
   }
 }
 for(const frame of INCOMPATIBLE_FRAMES)
   if(!axes.has(frame.axisId)||!vectors.has(frame.vectorId)||!frame.frame||!frame.reason)
     errors.push("bad_incompatibility:"+frame.frame);
 const total=MEANING_AXES.length*EMOTIONAL_VECTORS.length;
 return {ok:errors.length===0,errors,counts:{meaningAxes:MEANING_AXES.length,facets:facetIds.length,
   emotionalVectors:EMOTIONAL_VECTORS.length,compatibleCells:total,
   coveredCells:total-errors.filter(x=>x.startsWith("cell:")).length,
   incompatibleFrames:INCOMPATIBLE_FRAMES.length,
   distinctIdeaIds:ids.size,editorApprovedIdeas:MEANING_IDEAS.filter(x=>x.approvedByOwner===true).length,
   sourceCuratedIdeas:MEANING_IDEAS.filter(x=>x.reviewStatus==="source_curated").length,
   locales:STSE_LOCALES.length}};
}
function check(req){
 if(!properInput(req))return "invalid_request";
 if(req.schemaVersion!=="meaning-idea-request-v1")return "invalid_version";
 if(!STSE_LOCALES.includes(req.locale))return "invalid_locale";
 if(typeof req.topicId!=="string"||!getMyTubeTopic(req.topicId))return "invalid_topic";
 if(!properInput(req.current)||!properInput(req.desired))return "missing_emotions";
 for(const side of [req.current,req.desired]){
   if(side.stateId!==undefined&&side.stateId!==null&&
      (typeof side.stateId!=="string"||!getStateDefinition(side.stateId)))return "invalid_state";
   if(side.text!==undefined&&side.text!==null&&
      (typeof side.text!=="string"||side.text.length>160))return "invalid_state_text";
 }
 if(!finiteOrNull(bounded(req.current.intensity)))return "invalid_intensity";
 if(!finiteOrNull(bounded(req.energy)))return "invalid_energy";
 const v=req.current.valence;
 if(v!==undefined&&v!==null&&(!Number.isInteger(v)||v< -3||v>3))return "invalid_valence";
 if(req.meaningAxisId!==null&&req.meaningAxisId!==undefined&&!axes.has(req.meaningAxisId))
   return "invalid_meaning_axis";
 if(req.optionalContext!==undefined&&req.optionalContext!==null&&
   (typeof req.optionalContext!=="string"||req.optionalContext.length>220))return "invalid_context";
 const p=req.preferences??{};
 if(!properInput(p))return "invalid_preferences";
 if(p.pace!==undefined&&p.pace!==null&&!["gentle","steady"].includes(p.pace))return "invalid_pace";
 if(p.premiseType!==undefined&&p.premiseType!==null&&
   !["recognition","possibility","reframe"].includes(p.premiseType))return "invalid_premise";
 if(req.excludedIdeas!==undefined&&(!Array.isArray(req.excludedIdeas)||req.excludedIdeas.length>20||
     req.excludedIdeas.some(id=>!ideas.has(id))))return "invalid_exclusions";
 if(req.consentScope!==undefined&&req.consentScope!==null&&!["this_video_only"].includes(req.consentScope))
   return "invalid_consent_scope";
 return null;
}
function delivery(intensity,energy,preference=null){
 const pace=(intensity!==null&&intensity>=8)||(energy!==null&&energy<=3)?
   "gentle":preference==="steady"?"steady":"gentle";
 return {pace,activationLimit:pace==="gentle"?"low":"moderate",intensityKnown:intensity!==null,
   energyKnown:energy!==null,consentBeforeRendering:true,mayPause:true,
   noForcedCloseness:true,noForcedCatharsis:true,noDangerDenial:true};
}
function baseResponse(req){
 return {schemaVersion:"meaning-idea-recommendation-v1",rankerVersion:MEANING_RANKER_VERSION,
   catalogVersion:MEANING_IDEA_VERSION,status:"clarify",meaningAxisId:null,
   normalizedInputs:null,ideas:[],axisOptions:[],clarification:null,safetyNotes:[],modelUsed:false,
   customerScoreVisible:false};
}
export function recommendMeaningIdeas(req){
 const response=baseResponse(req),bad=check(req);
 if(bad)return {...response,status:"clarify",clarification:bad};
 const speech=[req.current.text,req.desired.text,req.optionalContext].filter(x=>typeof x==="string").join(" ");
 if(crisis.test(speech))return {...response,status:"safety_support",clarification:safetyCopy[req.locale],
   safetyNotes:["do_not_generate_transformative_story","human_support"]};
 if(coercion.test(speech))return {...response,status:"no_safe_idea",
   clarification:clarifyCopy[req.locale],safetyNotes:["avoid_coercive_frame"]};
 const state=normalizeStates(req,req.locale);
 if(state.status!=="ok")return {...response,status:"clarify",clarification:clarifyCopy[req.locale],
   safetyNotes:[state.status]};
 const from=state.current.state.id,to=state.desired.state.id,vector=pairs.get(from+">"+to);
 const matchedCell=getEmotionalVectorByStates(from,to);
 const intensity=bounded(req.current.intensity),energy=bounded(req.energy);
 const normalizedInputs={topicId:req.topicId,currentStateId:from,desiredStateId:to,
   vectorId:vector?.id??null,currentIntensity:intensity,energy,
   emotionalVectorCellId:matchedCell?.id??null,
   emotionalRelief:calculateEmotionalRelief({currentStateId:from,
     valence:req.current.valence??null,intensity,energy}),
   confidenceBand:state.confidenceBand,source:"canonical_stse",rawContextStored:false};
 if(!vector&&!matchedCell)return {...response,status:"no_safe_idea",normalizedInputs,
   clarification:clarifyCopy[req.locale],safetyNotes:["unsupported_cluster_direction"]};
 if(!req.meaningAxisId){
   const suggested=["anchor","freedom","meaning"].filter(id=>axes.has(id));
   return {...response,status:"choose_axis",normalizedInputs,
     axisOptions:suggested.map(id=>({id,label:axes.get(id).labels[req.locale],
       description:axes.get(id).shortDescription[req.locale]})),
     clarification:axisCopy[req.locale]};
 }
 const p=req.preferences??{},limits=delivery(intensity,energy,p.pace);
 const excluded=new Set(req.excludedIdeas??[]);
 const candidatePool=vector?MEANING_IDEAS.filter(x=>x.vectorId===vector.id):
   MATRIX_MEANING_IDEAS.filter(x=>x.vectorId===matchedCell.id);
 const choices=candidatePool.filter(x=>x.axisId===req.meaningAxisId&&
   !excluded.has(x.id)&&["source_curated","editorial_composed_preview"].includes(x.reviewStatus)&&
   !coercion.test(x.semanticPremise[req.locale])&&!crisis.test(x.semanticPremise[req.locale]));
 // Semantic hard gate precedes score. No AI or random filler on missing cells.
 if(!choices.length)return {...response,status:"no_safe_idea",normalizedInputs,
   meaningAxisId:req.meaningAxisId,clarification:clarifyCopy[req.locale],
   safetyNotes:["no_curated_candidates"]};
 const order={recognition:0,possibility:1,reframe:2};
 const prefers=p.premiseType||(limits.pace==="gentle"?"recognition":"possibility");
 const ranking=choices.map(x=>({...x,score:(x.premiseType===prefers?100:0)+
   (limits.pace==="gentle"&&x.premiseType==="reframe"?0:20)+
   (3-order[x.premiseType])})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const ranked=[],seen=new Set();
 for(const x of ranking){
   if(ranked.length===3)break;
   if(seen.has(x.premiseType))continue;
   seen.add(x.premiseType);
   ranked.push({ideaId:x.id,ideaText:x.semanticPremise[req.locale],axisId:x.axisId,
     vectorId:x.vectorId,emotionalFrom:from,emotionalTo:to,premiseType:x.premiseType,
     rationaleCodes:["matches_confirmed_emotional_pair","matches_selected_meaning_axis",
       "distinct_"+x.premiseType],intensityGuidance:limits,
     editorReviewStatus:x.reviewStatus,approvedByOwner:x.approvedByOwner,
     sourceVersion:x.version});
 }
 return {...response,status:"ok",normalizedInputs,meaningAxisId:req.meaningAxisId,
   ideas:ranked,clarification:state.confidenceBand==="low"?clarifyCopy[req.locale]:null,
   safetyNotes:INCOMPATIBLE_FRAMES.filter(x=>x.vectorId===(vector?.id??matchedCell.id)&&x.axisId===req.meaningAxisId)
     .map(x=>"avoid_frame:"+x.frame)};
}
const cleanCustom=(raw)=>{
 if(typeof raw!=="string")return null;
 const s=raw.trim().replace(/\s+/g," ");
 if(s.length<20||s.length>220||crisis.test(s)||coercion.test(s)||/[<>]/.test(s))return null;
 if(/[.!?。！？].*?[.!?。！？]/u.test(s))return null; // one sentence
 return s;
};
/**
 * Accept only an exact recommendation recomputed from the same validated
 * request. This is local editorial consent, not account/auth/medical consent.
 */
export function confirmMeaningIdea(req,choice={}){
 const r=recommendMeaningIdeas(req);
 if(choice?.neutral===true&&["ok","choose_axis","no_safe_idea"].includes(r.status)&&
   r.normalizedInputs){
   return {schemaVersion:"meaning-idea-brief-v1",status:"neutral_confirmed",topicId:req.topicId,
     meaningAxisId:null,confirmedIdeaId:null,ideaText:null,
     emotionalTransition:{from:r.normalizedInputs.currentStateId,to:r.normalizedInputs.desiredStateId,
       vectorId:r.normalizedInputs.vectorId},
     deliveryConstraints:delivery(bounded(req.current.intensity),bounded(req.energy)),
     narrativeIntent:"supportive_abstract_without_imposed_meaning",intendedExperience:"rest_or_observation",
     disallowedImagery:["forced_intimacy","danger_denial","heroic_override"],
     customerConsent:"explicit_neutral",originVersion:MEANING_IDEA_VERSION,
     editorialReviewStatus:"not_applicable",rawContextStored:false};
 }
 if(r.status!=="ok"||typeof choice.ideaId!=="string")return null;
 const candidate=r.ideas.find(x=>x.ideaId===choice.ideaId);
 if(!candidate)return null;
 const hasEdit=choice.customIdeaText!==undefined&&choice.customIdeaText!==null&&
   choice.customIdeaText!==candidate.ideaText;
 const custom=hasEdit?cleanCustom(choice.customIdeaText):null;
 if(hasEdit&&!custom)return null;
 const exact=ideas.get(candidate.ideaId);
 const text=custom??candidate.ideaText;
 return {schemaVersion:"meaning-idea-brief-v1",status:"confirmed",topicId:req.topicId,
   locale:req.locale,meaningAxisId:candidate.axisId,confirmedIdeaId:exact.id,
   ideaText:text,originalIdeaText:candidate.ideaText,userEdited:Boolean(custom),
   emotionalTransition:{from:candidate.emotionalFrom,to:candidate.emotionalTo,
     vectorId:candidate.vectorId},
   deliveryConstraints:candidate.intensityGuidance,
   narrativeIntent:"explore_"+candidate.premiseType+"_through_"+candidate.axisId,
   intendedExperience:"client_chosen_nonclinical_narrative",
   disallowedImagery:["forced_intimacy","danger_denial","unverified_threat","forced_catharsis",
     ...INCOMPATIBLE_FRAMES.filter(x=>x.vectorId===candidate.vectorId&&x.axisId===candidate.axisId).map(x=>x.frame)],
   customerConsent:"explicit_idea_confirmation",originVersion:MEANING_IDEA_VERSION,
   editorialReviewStatus:custom?"user_edited_unreviewed":exact.reviewStatus,
   ownerEditorialApproved:exact.approvedByOwner,rawContextStored:false};
}
