/**
 * Psychologist Mind / Meditation Director — practical skill bridge v1.
 *
 * Select one low-intensity, approved psychoeducational skill and one
 * OPTIONAL, realistic transfer action for a resource meditation.
 * Reuses the reviewed PSYCHOLOGY_VIDEO_SKILLS catalogue: no new clinical
 * protocols, inferred diagnoses, symbolic interpretations or profile reads.
 * The caller must have passed a trusted Psychologist Mind preflight.
 */
import { PSYCHOLOGY_VIDEO_SKILLS } from "../psychologist-video-curricula.mjs";
import { PSYCHOLOGIST_METHODS } from "../psychologist-mind.mjs";

export const MEDITATION_PRACTICE_DIRECTOR_VERSION = "meditation-practice-director-v1";

const FOCUS_GOAL_SKILL = Object.freeze({
  stress: Object.freeze({
    settle:"present_orientation",support:"resource_inventory",
    clarity:"thought_reflection",energy:"resource_inventory",
    confidence:"small_behavior_experiment",boundaries:"mindful_choice",
    relationships:"resource_inventory",goals:"small_behavior_experiment",
    meaning:"resource_inventory",
  }),
  relationships: Object.freeze({
    boundaries:"boundary_rehearsal",relationships:"boundary_rehearsal",
    confidence:"boundary_rehearsal",clarity:"map_trigger_response",
    support:"resource_inventory",settle:"resource_inventory",
    energy:"resource_inventory",goals:"small_behavior_experiment",
    meaning:"mindful_choice",
  }),
  self_worth: Object.freeze({
    confidence:"self_compassion",support:"self_compassion",
    clarity:"thought_reflection",settle:"self_compassion",
    energy:"self_compassion",boundaries:"self_compassion",
    relationships:"self_compassion",goals:"values_clarification",
    meaning:"values_clarification",
  }),
  meaning: Object.freeze({
    meaning:"values_clarification",goals:"values_clarification",
    clarity:"mindful_choice",confidence:"mindful_choice",
    support:"resource_inventory",settle:"resource_inventory",
    energy:"resource_inventory",boundaries:"mindful_choice",
    relationships:"mindful_choice",
  }),
});
const DEFAULT_GOAL=Object.freeze({
  stress:"settle",relationships:"boundaries",
  self_worth:"confidence",meaning:"meaning",
});
const SAFE_FALLBACKS=Object.freeze([
  "present_orientation","mindful_choice","self_compassion",
  "resource_inventory","values_clarification","thought_reflection",
  "map_trigger_response","boundary_rehearsal","small_behavior_experiment",
  "goal_contract","progress_review",
]);
const METHOD_AVOID_TAGS=Object.freeze({
  boundary_rehearsal:["people"],
  resource_inventory:["people"],
  self_compassion:["people"],
});
const LANG=new Set(["ru","en","es"]);
const COPY=Object.freeze({
  ru:Object.freeze({
    invitation:"Если сейчас подходит, можно попробовать небольшой шаг. Вы вправе его пропустить.",
    introduction:"Не нужно добиваться определённого чувства. Достаточно заметить, насколько этот способ вам подходит.",
    after:"Что вы заметили? Что было полезным, нейтральным или неудобным? Отвечать необязательно.",
    next:"В повседневной жизни можно попробовать один небольшой безопасный шаг — или просто заметить такую возможность.",
    beforeCheckin:"Насколько посильным кажется этот шаг сейчас по шкале 0–10? Вопрос можно пропустить.",
    afterCheckin:"После практики кажется ли этот шаг более, менее или так же посильным? Можно не оценивать.",
    section:"Небольшая практика",transfer:"Необязательный шаг на потом",
  }),
  en:Object.freeze({
    invitation:"If it suits you, you can try one small step. You may skip it.",
    introduction:"You do not need to feel a particular way. Simply notice whether this approach suits you.",
    after:"What did you notice? What felt useful, neutral or uncomfortable? You may skip the question.",
    next:"In daily life you can try one small, safe step—or simply notice that the option exists.",
    beforeCheckin:"How manageable does this step feel now, from 0 to 10? You may skip.",
    afterCheckin:"After the practice, does the step feel more, less or just as manageable? You may skip.",
    section:"Small practice",transfer:"Optional next step",
  }),
  es:Object.freeze({
    invitation:"Si te resulta adecuado, puedes probar un paso pequeño. Puedes omitirlo.",
    introduction:"No necesitas sentir nada concreto. Observa si este enfoque te sirve.",
    after:"¿Qué notaste? ¿Qué fue útil, neutro o incómodo? Puedes no responder.",
    next:"En tu vida diaria puedes probar un paso pequeño y seguro, o solo notar esa posibilidad.",
    beforeCheckin:"¿Qué tan posible parece este paso ahora, de 0 a 10? Puedes omitir la respuesta.",
    afterCheckin:"Después, ¿parece más, menos o igual de posible? Puedes omitir la respuesta.",
    section:"Práctica pequeña",transfer:"Próximo paso opcional",
  }),
});
const localeOf=x=>LANG.has(x)?x:"en";
const stop=reason=>Object.freeze({status:"not_eligible",reason,practice:null});
function allowedInProgram(program, methodId, sessionNumber){
  const method=PSYCHOLOGIST_METHODS[methodId];
  if(!method?.selfGuided || !PSYCHOLOGY_VIDEO_SKILLS[methodId]?.optional ||
      PSYCHOLOGY_VIDEO_SKILLS[methodId]?.clinicalProtocol!==false)return false;
  if(method.imageryConsent)return false; // The exercise must also work without imagery.
  if(!Array.isArray(program.sessions))return true; // Legacy trusted preview tests.
  if(program.sessions.length!==8)return false;
  const sessions=sessionNumber===null?program.sessions:
    [program.sessions[sessionNumber-1]];
  return sessions.some(s=>Array.isArray(s?.methodIds)&&s.methodIds.includes(methodId));
}
/** Never accept an arbitrary method ID from user input. */
export function selectMeditationPractice({
  program,locale="ru",goal=null,sessionNumber=null,avoidElements=[]
}={}){
  if(!program || program.status!=="ready" || program.mode!=="self_guided" ||
      !Object.hasOwn(FOCUS_GOAL_SKILL,program.focus))return stop("PROGRAM_NOT_READY");
  if(sessionNumber!==null &&
      (!Number.isInteger(sessionNumber)||sessionNumber<1||sessionNumber>8))
    return stop("INVALID_SESSION");
  const options=FOCUS_GOAL_SKILL[program.focus];
  const selectedGoal=Object.hasOwn(options,goal)?goal:DEFAULT_GOAL[program.focus];
  const requested=options[selectedGoal];
  const avoid=new Set(Array.isArray(avoidElements)
    ?avoidElements.filter(x=>typeof x==="string").slice(0,20):[]);
  const eligible=id=>allowedInProgram(program,id,sessionNumber)&&
    !(METHOD_AVOID_TAGS[id]||[]).some(tag=>avoid.has(tag));
  const id=eligible(requested)?requested:SAFE_FALLBACKS.find(eligible);
  if(!id)return stop("NO_APPROVED_PRACTICAL_SKILL");
  const skill=PSYCHOLOGY_VIDEO_SKILLS[id];
  const lang=localeOf(locale),copy=COPY[lang];
  const steps=[...skill.steps[lang]];
  // Every displayed and spoken instruction below is authored in our own
  // approved, language-specific skill catalogue, never invented by a model.
  const practice=Object.freeze({
    version:MEDITATION_PRACTICE_DIRECTOR_VERSION,
    focus:program.focus,goalCode:selectedGoal,methodId:id,
    title:skill.label[lang],steps:Object.freeze(steps),
    invitation:copy.invitation+" "+steps[0]+" "+steps[1],
    reflectionQuestion:copy.after,
    transferAction:steps[2],
    beforeCheckinPrompt:copy.beforeCheckin,
    afterCheckinPrompt:copy.afterCheckin,
    labels:Object.freeze({section:copy.section,transfer:copy.transfer}),
    methodSource:skill.source,
    explanationCode:id===requested?"goal_matched_allowed_method":"safe_allowed_fallback",
    needsExplicitStart:true,canPauseOrSkip:true,
    clinicalProtocol:false,diagnosis:null,
    efficacyClaim:false,checkinOptional:true,saveRequiresConsent:true,
    humanReviewBeforePublication:true,
  });
  return {status:"ready",practice};
}
export function enhanceMeditationTemplateWithPractice(template,practice,locale="ru"){
  if(!template || template.status!=="script_ready" ||
    !practice || practice.clinicalProtocol!==false ||
    !Array.isArray(template.segments)||template.segments.length!==7)
    return null;
  const lang=localeOf(locale),copy=COPY[lang];
  const segments=template.segments.map(segment=>{
    if(segment.id==="supportive_choice")return {
      ...segment,text:segment.text+" "+copy.introduction+" "+practice.invitation,
    };
    if(segment.id==="closing")return {
      ...segment,text:segment.text+" "+copy.next+" "+practice.transferAction,
    };
    return {...segment};
  });
  if(!segments.some(s=>s.id==="supportive_choice") ||
     !segments.some(s=>s.id==="closing"))return null;
  const script=segments.map(s=>s.text+"\n["+(
    lang==="ru"?"Пауза":lang==="es"?"Pausa":"Pause")+
    ": "+s.optionalSilenceSeconds+" s]").join("\n\n");
  return {...template,segments,script,
    practiceMethodId:practice.methodId,
    practiceCard:practice,rendered:false,published:false};
}
