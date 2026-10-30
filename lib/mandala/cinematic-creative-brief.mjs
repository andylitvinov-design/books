/**
 * Local-first creative request compiler for the EXISTING Holistic House director.
 * Generates a text-only reference pack, NOT new AI imagery, quotes or submissions.
 * The raw brief is never serialized into public packets or provider prompts.
 * Actual external generation requires a separately reviewed outbound contract.
 */
import {safeCinematicPrompt,CINEMATIC_STYLES,CINEMATIC_PLAN_VERSION} from './cinematic-director.mjs';
import {QUESTION_REGISTRY as V15_CONTEXTUAL_QUESTIONS} from './video-studio-question-registry.mjs';

export const VIDEO_STUDIO_BRIEF_SCHEMA='hh-video-brief-v1.4';
export const VIDEO_STUDIO_QUESTION_COUNTS=Object.freeze({
  PERSONAL:16,BASIC:12,ADV:18,PRO:34,EXTRA:16,
});
// The v1.5 registry is the single source for the 49 contextual questions,
// including their EN/RU/ES labels, three options, conditions and legacy IDs.
// The 96-ID map below is retained solely for compatibility with older plans.
const GROUP_TO_SECTION=Object.freeze({personalization:'PERSONAL',principal:'BASIC',advanced:'ADV',pro:'PRO',extra:'EXTRA'});
const SOURCE_ORDER=['PERSONAL','BASIC','ADV','PRO','EXTRA'];
const CONTEXTUAL=Object.freeze(Object.fromEntries(SOURCE_ORDER.map(section=>[section,
  V15_CONTEXTUAL_QUESTIONS.filter(question=>GROUP_TO_SECTION[question.group]===section)
    .map(question=>question.id.slice(-2))
])));
export const VIDEO_STUDIO_CONTEXTUAL_QUESTION_DEFINITIONS=V15_CONTEXTUAL_QUESTIONS;
const ALWAYS_WORKFLOW=new Set(['PERSONAL_09','BASIC_02','PRO_28','EXTRA_03']);
const EXACT_LOCAL=new Set(['BASIC_05','BASIC_06','BASIC_09','BASIC_10','ADV_09','ADV_14',
  'ADV_15','PRO_18','PRO_26','EXTRA_02','EXTRA_04','EXTRA_05']);
export const VIDEO_STUDIO_QUESTION_REGISTRY=Object.freeze(SOURCE_ORDER.flatMap(section=>
  Array.from({length:VIDEO_STUDIO_QUESTION_COUNTS[section]},(_,i)=>{
    const id=section+'_'+String(i+1).padStart(2,'0');
    return Object.freeze({
      id,section,active:CONTEXTUAL[section].includes(String(i+1).padStart(2,'0')),
      kind:ALWAYS_WORKFLOW.has(id)?'separate_permission_or_workflow':
        EXACT_LOCAL.has(id)?'local_control':'creative_hint_or_future_model',
      optional:true,options:3,acceptsCustomText:true,
    });
  })
));
export const VIDEO_STUDIO_CONTEXTUAL_QUESTION_IDS=Object.freeze(
  SOURCE_ORDER.flatMap(section=>CONTEXTUAL[section].map(n=>section+'_'+n))
);
const SCALE_FIELDS=Object.freeze({
  PERSONAL:['personalization','intensity','sensitivity','visibility','meditative_pause','embodiment','likeness'],
  BASIC:['duration','aspect_ratio','budget_mode'],
  ADV:['pace','camera_motion','subject_motion','realism','warmth','saturation','contrast',
    'light_softness','haze','transition_strength','music_energy','voice_pace','text_density'],
  PRO:['shot_duration','depth_of_field','grain','continuity','resolution','qa_level'],
  EXTRA:['bloom','mandala_speed','mandala_symmetry','morph_strength'],
});
// Owner's document calls these "30 original scales" and adds 3 new values:
// embodiment, likeness, morph_strength => exactly 33 named scale identifiers.
export const VIDEO_STUDIO_SCALE_REGISTRY=Object.freeze(
  SOURCE_ORDER.flatMap(section=>SCALE_FIELDS[section].map(id=>Object.freeze({id,section})))
);
const palette=Object.freeze({
  warm:Object.freeze(['#edc68e','#bf8050','#586f48']),
  nature:Object.freeze(['#c6d7ae','#517d5b','#c6d2dc']),
  dream:Object.freeze(['#9d94c7','#7fa9bd','#e3c6a7']),
  minimal:Object.freeze(['#d4d1bd','#909e94','#f2e6d0']),
});
const LEXICON=Object.freeze({
  subject:Object.freeze([
    {id:'eagle',kind:'fictional_bird',test:/ор[её]л|орл[а-я]*|eagle|águila|aguila/i,labels:{en:'fictional eagle',ru:'вымышленный орёл',es:'águila ficticia'}},
    {id:'phoenix',kind:'fictional_bird',test:/феникс|phoenix|f[eé]nix/i,labels:{en:'fictional phoenix',ru:'вымышленный феникс',es:'fénix ficticio'}},
    {id:'wolf',kind:'fictional_animal',test:/волк|волч|wolf|lobo/i,labels:{en:'fictional wolf',ru:'вымышленный волк',es:'lobo ficticio'}},
    {id:'fox',kind:'fictional_animal',test:/лисиц|лис[ауы]|fox|zorro/i,labels:{en:'fictional fox',ru:'вымышленная лисица',es:'zorro ficticio'}},
    {id:'dolphin',kind:'fictional_animal',test:/дельфин|dolphin|delf[ií]n/i,labels:{en:'fictional dolphin',ru:'вымышленный дельфин',es:'delfín ficticio'}},
    {id:'landscape',kind:'nature',test:/лу[гж]|природ|ландшафт|пейзаж|nature|landscape|meadow|paisaje|naturaleza/i,labels:{en:'natural landscape',ru:'природный пейзаж',es:'paisaje natural'}},
  ]),
  action:Object.freeze([
    {id:'metamorphosis',test:/превращ|преображ|transform|metamorph|turns? into|becomes?|convierte|transforma/i,
      labels:{en:'transforms',ru:'превращается',es:'se transforma'}},
    {id:'flight',test:/лет[ие]|полет|пол[её]т|fly|flies|flying|vuela|volar/i,
      labels:{en:'flies',ru:'летит',es:'vuela'}},
    {id:'journey',test:/ид[её]т|путешеств|движет|walk|travel|journey|camina|viaja/i,
      labels:{en:'travels',ru:'путешествует',es:'viaja'}},
    {id:'emergence',test:/появля|раскрыва|расцвет|appears|emerges|blooms|aparece|florece/i,
      labels:{en:'emerges',ru:'появляется',es:'aparece'}},
    {id:'dance',test:/танц|dance|dancing|baila/i,labels:{en:'moves gently',ru:'плавно движется',es:'se mueve suavemente'}},
  ]),
  setting:Object.freeze([
    {id:'mountains',test:/гор[аые]|горы|mountain|monta[nñ]a/i,labels:{en:'mountains',ru:'горы',es:'montañas'}},
    {id:'valley',test:/долин|valley|valle/i,labels:{en:'valley',ru:'долина',es:'valle'}},
    {id:'starfield',test:/звезд|звёзд|созвезд|star|constellation|estrella|constelaci[oó]n/i,
      labels:{en:'starfield',ru:'звёздное небо',es:'cielo estrellado'}},
    {id:'forest',test:/лес[ауе]?|forest|bosque/i,labels:{en:'forest',ru:'лес',es:'bosque'}},
    {id:'sky',test:/неб[аоеу]|sky|cielo/i,labels:{en:'open sky',ru:'открытое небо',es:'cielo abierto'}},
    {id:'sea',test:/мор[еяю]|океан|sea|ocean|mar|oc[eé]ano/i,labels:{en:'sea',ru:'море',es:'mar'}},
  ]),
  destination:Object.freeze([
    {id:'constellation',test:/созвезд|constellation|constelaci[oó]n/i,
      labels:{en:'constellation of lights',ru:'созвездие огней',es:'constelación de luces'}},
    {id:'light',test:/свет[аоу]?|light|glow|luz/i,labels:{en:'soft light',ru:'мягкий свет',es:'luz suave'}},
  ]),
  color:Object.freeze([
    {id:'white',test:/бел[а-я]*|white|blanc[oa]/i,labels:{en:'white',ru:'белый',es:'blanco'}},
    {id:'golden',test:/золот|golden|dorado/i,labels:{en:'golden',ru:'золотой',es:'dorado'}},
    {id:'blue',test:/син[яие]|голуб|blue|azul/i,labels:{en:'blue',ru:'синий',es:'azul'}},
  ]),
});
// A negated creature is an EXCLUSION, not the requested lead character.
// Prefer a later positive candidate; never export excluded fictional identities.
function isNegatedSubjectMatch(input,match){
  const before=input.slice(Math.max(0,match.index-34),match.index);
  return /(?:^|[\s,;])(?:без|не\s+хочу|избегать|no|without|avoid|don['’]t\s+want|do\s+not\s+want|sin|no\s+quiero)\s+(?:(?:an?|the|этот|этого|эту)\s+)?$/i.test(before);
}
function lookup(type,input){
  return (LEXICON[type]||[]).find(item=>{
    const match=item.test.exec(input);
    if(!match)return false;
    if(type!=='subject')return true;
    return !isNegatedSubjectMatch(input,match);
  })||null;
}
const ALLOWED_SUBJECT_CHOICES=Object.freeze(['eagle','phoenix','wolf','fox','dolphin','landscape']);
const ALLOWED_ACTION_CHOICES=Object.freeze(['flight','metamorphosis','journey','emergence','dance']);
function validSubjectChoice(input,choice){
  if(!ALLOWED_SUBJECT_CHOICES.includes(choice))return null;
  const item=LEXICON.subject.find(entry=>entry.id===choice);
  const match=item.test.exec(input);
  // Preserve confirmed answers unless the latest brief explicitly excludes one.
  return match&&isNegatedSubjectMatch(input,match)?null:item;
}
function word(entry,locale){return entry?.labels?.[locale]||entry?.labels?.en||null;}
function safeString(value,max=2000){
  return typeof value==='string'?Array.from(value.replace(/[\x00-\x1f\x7f]/g,' ').trim()).slice(0,max).join(''):'';
}
const STAGE_ACTIONS=Object.freeze([
  'establishing view','gentle introduction','revealing transformation','quiet integration',
]);
const PRO_ART_DIRECTIONS=Object.freeze({
  PRO_09:Object.freeze({wide:'wide view',medium:'medium view',close:'close-up view'}),
  PRO_10:Object.freeze({eye:'eye-level angle',high:'high angle',low:'low angle'}),
  PRO_13:Object.freeze({sharp:'deep focus',soft:'soft background',blur:'strong background blur'}),
  PRO_16:Object.freeze({toward:'moving toward the subject',follow:'following the character',around:'moving around the character'}),
  PRO_18:Object.freeze({normal:'natural action speed',slow:'slow motion',fast:'accelerated action'}),
  PRO_19:Object.freeze({front:'front light',side:'side light',back:'back light'}),
  PRO_20:Object.freeze({soft:'soft contrast',natural:'natural contrast',dramatic:'dramatic contrast'}),
});
function artDirectionsForShot(shotDirections,shotId){
  if(!Array.isArray(shotDirections))return Object.freeze([]);
  const shot=shotDirections.find(item=>item&&item.shotId===shotId);
  if(!shot||!shot.answers||typeof shot.answers!=="object")return Object.freeze([]);
  return Object.freeze(Object.entries(PRO_ART_DIRECTIONS).flatMap(([questionId,options])=>{
    const answer=shot.answers[questionId];
    const optionId=answer?.confirmed===true?answer.selectedOptionId:null;
    return typeof optionId==='string'&&options[optionId]?[options[optionId]]:[];
  }));
}
function validPlan(plan){
  if(!plan||plan.version!==CINEMATIC_PLAN_VERSION||plan.noExternalClientData!==true||
    plan.paidRenderApproved!==false||plan.shotCount!==4||
    !Array.isArray(plan.shots)||plan.shots.length!==4||
    !Object.hasOwn(CINEMATIC_STYLES,plan.styleId)||
    new Set(plan.shots.map(s=>s.sceneId)).size!==4)throw Error('invalid_cinematic_reference_plan');
  for(const s of plan.shots){
    if(!Number.isInteger(s.number)||s.number<1||s.number>4||
      s.providerPrompt!==safeCinematicPrompt(plan,s.number))
      throw Error('untrusted_cinematic_reference_shot');
  }
}
export function videoStudioContextQuestions(visualIdea,answers={}){
  const raw=safeString(visualIdea);
  if(!raw)return Object.freeze([]); // Blank free mix needs no questionnaire.
  const result=[];
  if(!lookup('subject',raw)&&!validSubjectChoice(raw,answers?.subjectChoice))result.push('subject');
  if(!lookup('action',raw)&&!ALLOWED_ACTION_CHOICES.includes(answers?.actionChoice))result.push('action');
  return Object.freeze(result);
}
/** @param {{visualIdea?: string, plan: any, answers?: {subjectChoice?: string, actionChoice?: string}, shotDirections?: {shotId: string, answers: Record<string, {confirmed?: boolean, selectedOptionId?: string|null}>}[]}} input */
export function compileCinematicReferencePack({visualIdea='',plan,answers={},shotDirections=[]}){
  validPlan(plan);
  const idea=safeString(visualIdea);
  const locale=['ru','es','en'].includes(plan.locale)?plan.locale:'en';
  const interpreted={
    subject:lookup('subject',idea),action:lookup('action',idea),
    setting:lookup('setting',idea),destination:lookup('destination',idea),
    color:lookup('color',idea),
  };
  if(!interpreted.subject)interpreted.subject=validSubjectChoice(idea,answers?.subjectChoice);
  if(!interpreted.action&&ALLOWED_ACTION_CHOICES.includes(answers?.actionChoice)){
    interpreted.action=LEXICON.action.find(item=>item.id===answers.actionChoice);
  }
  const subject=interpreted.subject,action=interpreted.action;
  const requiresNewVideo=Boolean(idea && (subject?.id!=='landscape' && subject || action || interpreted.destination));
  const questions=videoStudioContextQuestions(idea,answers);
  const style=CINEMATIC_STYLES[plan.styleId];
  const identity=subject?subject.id+':fictional:v1':null;
  const paletteColors=palette[plan.styleId]??palette.warm;
  const artWords=Object.freeze({
    subject:subject?.id||null,subjectKind:subject?.kind||null,
    action:action?.id||null,setting:interpreted.setting?.id||null,
    destination:interpreted.destination?.id||null,color:interpreted.color?.id||null,
  });
  const styleBible=Object.freeze({
    version:'hh-style-bible-v1',styleId:plan.styleId,
    palette:paletteColors,lighting:style.visual,motion:style.motion,
    camera:style.camera,fictionalCharacterKey:identity,
    keyframes:'text_descriptions_only',actualGeneratedImages:false,
  });
  const sceneNames=Object.freeze(plan.shots.map(s=>s.sceneId));
  const shots=Object.freeze(plan.shots.map((s,i)=>{
    const chapter=STAGE_ACTIONS[i];
    const textCue=[
      word(interpreted.color,'en'),word(subject,'en'),word(action,'en'),
      word(interpreted.setting,'en'),i===2?word(interpreted.destination,'en'):null,
    ].filter(Boolean).join(' ');
    // This is the complete, reviewable art-only description for a future
    // provider boundary. It is built solely from allow-listed visual tokens,
    // never from the raw local brief or private profile fields.
    const artOnlyPrompt=[
      `Shot ${s.number}:`,textCue||'abstract cinematic scene',
      [...artDirectionsForShot(shotDirections,s.id),`${style.camera} camera`,style.visual,style.motion].join(', ')+'.',
      `${chapter}; fictional only, no captions, no logos.`,
    ].join(' ');
    return Object.freeze({
      shotId:s.id,number:s.number,localSceneId:s.sceneId,localTheme:s.theme,
      seconds:s.durationSeconds,startSeconds:s.startSeconds,role:chapter,
      reference: Object.freeze({
        kind:'text_reference_only',generatedImage:false,characterKey:identity,
        start:'Frame '+s.number+': '+(textCue||s.visualCue)+', '+style.visual+'. '+chapter,
        end:'End frame '+s.number+': '+(textCue||s.visualCue)+', continuous '+style.camera,
      }),
      existingFootage: true,newAiClipGenerated:false,providerPrompt:s.providerPrompt,artOnlyPrompt,
    });
  }));
  return Object.freeze({
    version:VIDEO_STUDIO_BRIEF_SCHEMA,
    source:'on_device_approved_scene_catalog',locale,
    inputMode:idea?'locally_interpreted_visual_description':'first_party_preset',
    noExternalClientData:true,privateWordsIncluded:false,
    rawUserPromptIncluded:false,externalTransferApproved:false,
    providerJobSubmitted:false,paidRenderApproved:false,
    requestedNovelVideo:requiresNewVideo,
    newAiVideoAvailable:false,localMontageAvailable:true,
    recognized:Object.freeze(artWords),
    understood:questions.length===0,
    contextualQuestions:questions,
    creativeSummary:subject&&action?
      [word(interpreted.color,locale),word(subject,locale),word(action,locale),
        word(interpreted.setting,locale),word(interpreted.destination,locale)].filter(Boolean).join(' '):
      null,
    styleBible,shots,realLocalSceneIds:sceneNames,
    outputStatus:requiresNewVideo?'concept_only_new_ai_generation_unavailable':'first_party_local_montage',
    ownerApprovalRequiredForAi:true,
  });
}
/** Pure local capability declaration, not an entitlement or fabricated quote. */
export function listCreativeVideoCapabilities(){
  return Object.freeze([
    Object.freeze({id:'local_canvas',ready:true,producesNovelAiPixels:false,
      modes:Object.freeze(['first_party_montage']),chargeMinor:0}),
    Object.freeze({id:'self_hosted_ltx',ready:false,producesNovelAiPixels:true,
      reason:'verified_gpu_model_license_and_worker_required',chargeMinor:null}),
    Object.freeze({id:'kling_owner',ready:false,producesNovelAiPixels:true,
      reason:'provider_entitlement_quote_budget_and_approval_required',chargeMinor:null}),
    Object.freeze({id:'runway_video',ready:false,producesNovelAiPixels:true,
      reason:'video_model_entitlement_not_confirmed',chargeMinor:null}),
  ]);
}
