/**
 * Psychological meaning director. Reuses the existing reviewed composer as
 * the allowlist / eligibility gate, never lets the writer decide permissions.
 *
 * Call ONLY with server-validated program and purpose-specific consent.
 */
import { composePersonalMeditation } from "../psychologist-meditation-composer.mjs";
import { KIP_MOTIF_BY_ID } from "../kip-symbol-registry.mjs";
import { normalizeWriterRequest, WRITER_BEAT_IDS } from "./contract.mjs";
import { getLiteraryStyle } from "./styles.mjs";
import { selectMeditationPractice,
  enhanceMeditationTemplateWithPractice } from "./practice-director.mjs";
export const CREATIVE_BRIEF_VERSION="writer-creative-brief-v1";
const guidance={
  ru:[
    "Мягкое необязательное начало, ориентация здесь и сейчас.",
    "Право выбирать, не представлять, оставить глаза открытыми и прервать практику.",
    "Один разрешённый ресурсный образ, обычные нейтральные детали.",
    "Постепенное раскрытие этого же образа, без скрытых интерпретаций.",
    "Небольшая возможность личного выбора без внушения обязательной установки.",
    "Плавное возвращение к комнате и окружающим звукам.",
    "Короткое завершение без навязывания позитивного результата.",
  ],
  en:[
    "A gentle optional beginning and orientation to the present.",
    "Permission to choose, not imagine, keep eyes open or stop.",
    "One allowed resource image with neutral everyday details.",
    "Gradual development of the same image, without hidden interpretations.",
    "A small optional personal choice, not a compulsory affirmation.",
    "A gentle return to the room and surrounding sounds.",
    "A brief ending without forcing a positive result.",
  ],
  es:[
    "Un comienzo suave y opcional, orientado al presente.",
    "Libertad para elegir, no imaginar, abrir los ojos o detenerse.",
    "Una imagen de apoyo permitida con detalles cotidianos neutros.",
    "Desarrollo gradual de la misma imagen, sin interpretaciones impuestas.",
    "Una pequeña elección personal opcional, sin afirmaciones obligatorias.",
    "Regreso suave al entorno y a sus sonidos.",
    "Un cierre breve, sin imponer resultados positivos.",
  ],
};
const stop = (status,code)=>Object.freeze({status,code,brief:null,template:null});
export function prepareMeditationCreativeBrief({request,program,consent,sessionNumber=null}={}) {
  const input=normalizeWriterRequest(request);
  if(input.status!=="valid")return stop("invalid_input",input.code);
  if(input.noImagery)return stop("unsupported_mode","GROUNDING_NOT_ENABLED");
  // Do not accept a caller-written bool for risk or ownership as an input.
  if(!program || program.status!=="ready" || program.mode!=="self_guided")
    return stop("human_review_required","PSYCHOLOGIST_NOT_READY");
  if(consent?.resourceImagery!==true)
    return stop("imagery_consent_required","IMAGERY_OPT_IN_REQUIRED");
  if(program.focus!==input.focus)
    return stop("invalid_input","FOCUS_MISMATCH");
  const legacyStyle=input.styleId==="grounded_practical"?"practical":
    input.styleId==="poetic_contained"?"poetic":"gentle";
  const template=composePersonalMeditation(program,{
    locale:input.locale,consent:{resourceImagery:true},
    intent:{intentionCode:input.intentionCode||undefined,
      motifId:input.motifId||undefined,symbolId:input.symbolId||undefined,
      durationMinutes:input.durationMinutes},
    preferences:{style:legacyStyle,channel:input.channel,
      avoidElements:input.avoidElements,noImagery:false},
  });
  if(template.status!=="script_ready")
    return stop(template.status,template.message||"MOTIF_OR_PREFERENCE_REJECTED");
  const selected=selectMeditationPractice({
    program,locale:input.locale,goal:input.intentionCode||template.intentionCode,
    sessionNumber,avoidElements:input.avoidElements,
  });
  if(selected.status!=="ready")
    return stop("human_review_required",selected.reason||"PRACTICAL_SKILL_NOT_ELIGIBLE");
  const enriched=enhanceMeditationTemplateWithPractice(
    template,selected.practice,input.locale);
  if(!enriched)return stop("human_review_required","PRACTICAL_TEMPLATE_INVALID");
  const motif=KIP_MOTIF_BY_ID[enriched.motifId];
  if(!motif?.selfGuided || motif.clinicalReviewRequired)
    return stop("clinician_review_required","CLINICAL_MOTIF_BLOCKED");
  const style=getLiteraryStyle(input.styleId,input.locale);
  if(!style)return stop("invalid_input","STYLE_NOT_FOUND");
  const total=enriched.plannedDurationSeconds;
  const seconds=enriched.segments.map(s=>s.seconds);
  // Estimate only: actual audio duration is measured after TTS.
  const weights=seconds.reduce((sum,v)=>sum+v,0);
  if(weights!==total || seconds.length!==WRITER_BEAT_IDS.length)
    return stop("human_review_required","UNEXPECTED_COMPOSER_SHAPE");
  const plannedSpeechSeconds=Math.round(total*0.66);
  const beats=WRITER_BEAT_IDS.map((id,i)=>{
    const targetWords=Math.max(15,Math.round(seconds[i]*0.66*1.6));
    return Object.freeze({id,order:i+1,purpose:guidance[input.locale][i],
      allocatedSeconds:seconds[i],targetWords,maxWords:Math.ceil(targetWords*1.4),
      // Concrete skill cues are curated by Psychologist Mind, never invented
      // from the user's open text by a language provider.
      ...(id==="supportive_choice"?{practiceCue:selected.practice.invitation}:{}) ,
      ...(id==="closing"?{transferCue:selected.practice.transferAction}:{})});

  });
  const brief=Object.freeze({
    schemaVersion:CREATIVE_BRIEF_VERSION,locale:input.locale,
    directorPracticeVersion:selected.practice.version,
    practice:selected.practice,sessionNumber,
    mode:"resource",focus:program.focus,
    goal:input.intentionCode||template.intentionCode,
    selectedMotifId:template.motifId,symbolId:template.symbolId,
    styleId:style.id,style, channel:input.channel,
    targetDurationSeconds:total,
    estimatedSpeechSeconds:plannedSpeechSeconds,
    clientPhrase:input.clientPhrase,desiredExperience:input.desiredExperience,
    // The problem frame is bounded, client-authored context, NOT a diagnosis.
    problemFrame:input.problemFrame,
    avoidElements:input.avoidElements,
    agencyRules:Object.freeze(["may_stop","may_skip","eyes_may_remain_open",
      "no_breath_control","no_fixed_symbol_interpretation"]),
    beats:Object.freeze(beats),oneCentralImage:true,
    source:"psychologist_mind_self_guided_template",
    requiresEditorialReview:true,
  });
  return {status:"brief_ready",brief,
    // Separate template preview. It must never be mislabeled as AI-generated.
    template:{...enriched,generationMode:"template"}};
}
