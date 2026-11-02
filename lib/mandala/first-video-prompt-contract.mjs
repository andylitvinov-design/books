/**
 * Holistic House first-video AI input contract v1.
 *
 * Single source of truth for the consented Gemini/OpenRouter/Groq prompt
 * request. Client options are data, not provider instructions. The server
 * revalidates every option, then regenerates a VERIFIED local scene plan.
 *
 * No account, tests, private portrait, uploaded audio or payment data.
 * A change to this contract requires RU/EN/ES request and privacy tests.
 */
import { buildFirstVideoDraft, analyzeFirstVideoVisualIntent } from "./first-video-director.mjs";
import { QUESTION_REGISTRY } from "./video-studio-question-registry.mjs";
import { VIDEO_QUICK_TEMPLATES } from "./video-quick-templates.mjs";

export const FIRST_VIDEO_PROMPT_CONTRACT_VERSION = "hh-first-video-prompt-v1";
export const FIRST_VIDEO_PROMPT_FILTER_KEYS = Object.freeze([
  "theme","style","aspect","durationSeconds","motion","music","caption","avoid",
]);
export const FIRST_VIDEO_PROMPT_ALLOWED_FIELDS = Object.freeze([
  "schemaVersion","locale","wish",...FIRST_VIDEO_PROMPT_FILTER_KEYS,
  "templateId","variant","manualPrompt","selectedFields","renderOptions","directorSelections","consent",
]);
const ALLOWED = Object.freeze({
  locale:["ru","en","es"],
  theme:["auto","money","energy","relationships","goals","life","health"],
  style:["warm","nature","dream","minimal"],
  aspect:["landscape","portrait","square"],
  durationSeconds:[20,30,60],
  motion:["slow","dynamic"],
  music:["none","harmony","meditation"],
  quality:["hd","fullhd"],
  brightness:["soft","bright"],
});
const TEMPLATES=new Set(VIDEO_QUICK_TEMPLATES.map(item=>item.id));
const C0=/[\u0000-\u0008\u000B-\u001F\u007F]/u;
const isRecord=value=>value!==null && typeof value==="object" &&
  !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype;
const isEnum=(value,key)=>ALLOWED[key].includes(value);
const hasOnly=(obj,keys)=>Object.keys(obj).every(key=>keys.includes(key));
const DIRECTOR_QUESTIONS=new Map(QUESTION_REGISTRY.map(question=>[question.id,question]));
/** Validated option IDs only; never submit custom answers, photo, owner profile
 * or clinical data to external text models as a directing preference.
 */
export function parseFirstVideoDirectorSelections(value) {
  if(value===undefined || value===null)return [];
  if(!Array.isArray(value)||value.length>49)return null;
  const result=[],seen=new Set();
  for(const item of value) {
    if(!isRecord(item)||!hasOnly(item,["id","optionId","shotNumber"]) ||
       typeof item.id!=="string"||typeof item.optionId!=="string")return null;
    const question=DIRECTOR_QUESTIONS.get(item.id);
    if(!question || !question.options.some(option=>option.id===item.optionId))return null;
    const perShot=question.scope==="scene";
    if(perShot ? (!Number.isInteger(item.shotNumber)||item.shotNumber<1||item.shotNumber>4) :
      item.shotNumber!==undefined)return null;
    const key=item.id+":"+(perShot?item.shotNumber:"all");
    if(seen.has(key))return null;
    seen.add(key);
    result.push(perShot?{id:item.id,optionId:item.optionId,shotNumber:item.shotNumber}:
      {id:item.id,optionId:item.optionId});
  }
  return result;
}

/**
 * Called by the first-video UI ONLY after user opt-in; always includes every
 * effective local filter, including deliberate false/none choices. Separate
 * selectedFields records explicit edits and template-chosen values.
 */
export function makeFirstVideoPromptRequest({
  locale,wish,preferences,templateId=null,variant=0,manualPrompt=null,
  selectedFields=[],renderOptions=null,directorSelections=null,
}) {
  const request={
    schemaVersion:FIRST_VIDEO_PROMPT_CONTRACT_VERSION,
    locale,wish,
    theme:preferences.theme,style:preferences.style,aspect:preferences.aspect,
    durationSeconds:preferences.durationSeconds,motion:preferences.motion,
    music:preferences.music,caption:preferences.caption,avoid:preferences.avoid,
    variant,selectedFields:[...selectedFields],consent:true,
  };
  if(templateId!==null)request.templateId=templateId;
  if(manualPrompt!==null&&manualPrompt!=="")request.manualPrompt=manualPrompt;
  if(renderOptions!==null)request.renderOptions={...renderOptions};
  if(directorSelections!==null)request.directorSelections=directorSelections.map(item=>({...item}));
  return request;
}

/**
 * A null return is a 400 invalid input; the route independently enforces
 * same-origin, explicit consent, atomic shared quotas and private responses.
 * Old clients that do not yet supply v1's four extra filters retain safe
 * defaults, but all new clients must send the full v1 payload.
 */
export function parseFirstVideoPromptInput(body) {
  if(!isRecord(body)||!hasOnly(body,FIRST_VIDEO_PROMPT_ALLOWED_FIELDS) ||
    (body.schemaVersion!==undefined && body.schemaVersion!==FIRST_VIDEO_PROMPT_CONTRACT_VERSION) ||
    !isEnum(body.locale,"locale")||!isEnum(body.theme,"theme") ||
    !isEnum(body.style,"style")||!isEnum(body.aspect,"aspect")||
    !isEnum(body.durationSeconds,"durationSeconds")||
    typeof body.wish!=="string"||body.wish.length<3||body.wish.length>800||
    body.wish.trim().length<3||C0.test(body.wish))
    return null;
  const motion=body.motion===undefined?"slow":body.motion;
  const music=body.music===undefined?"none":body.music;
  const caption=body.caption===undefined?false:body.caption;
  const avoid=body.avoid===undefined?"":body.avoid;
  const variant=body.variant===undefined?0:body.variant;
  const templateId=body.templateId===undefined?null:body.templateId;
  const manualPrompt=body.manualPrompt===undefined?null:body.manualPrompt;
  const selectedFields=body.selectedFields===undefined?[]:body.selectedFields;
  const renderOptions=body.renderOptions===undefined?null:body.renderOptions;
  const directorSelections=parseFirstVideoDirectorSelections(body.directorSelections);
  if(!isEnum(motion,"motion")||!isEnum(music,"music")||
    typeof caption!=="boolean" || typeof avoid!=="string" ||
    avoid.length>140||C0.test(avoid) ||
    !Number.isInteger(variant)||variant<0||variant>99 ||
    !(templateId===null || typeof templateId==="string"&&TEMPLATES.has(templateId))||
    !(manualPrompt===null || typeof manualPrompt==="string"&&
      manualPrompt.length<=1000&&!C0.test(manualPrompt))||
    !Array.isArray(selectedFields)||selectedFields.length>FIRST_VIDEO_PROMPT_FILTER_KEYS.length||
    selectedFields.some(key=>typeof key!=="string"||!FIRST_VIDEO_PROMPT_FILTER_KEYS.includes(key))||
    new Set(selectedFields).size!==selectedFields.length)
    return null;
  if(directorSelections===null)return null;
  if(renderOptions!==null && (!isRecord(renderOptions)||
    !hasOnly(renderOptions,["quality","brightness","audioVolumePercent"]) ||
    !isEnum(renderOptions.quality,"quality")||
    !isEnum(renderOptions.brightness,"brightness")||
    !Number.isInteger(renderOptions.audioVolumePercent)||
    renderOptions.audioVolumePercent<0||renderOptions.audioVolumePercent>100))
    return null;
  return {
    schemaVersion:FIRST_VIDEO_PROMPT_CONTRACT_VERSION,
    locale:body.locale,wish:body.wish.trim(),theme:body.theme,
    style:body.style,aspect:body.aspect,durationSeconds:body.durationSeconds,
    motion,music,caption,avoid:avoid.trim(),
    templateId,variant,manualPrompt:manualPrompt?.trim()||null,
    selectedFields:[...selectedFields],
    renderOptions:renderOptions?{...renderOptions}:null,
    directorSelections,
  };
}

/** Provider-neutral payload, rebuilt on server from validated, local inputs. */
export function buildFirstVideoPromptContext(input) {
  const draft=buildFirstVideoDraft({
    locale:input.locale,wish:input.wish,theme:input.theme,
    style:input.style,aspect:input.aspect,durationSeconds:input.durationSeconds,
    motion:input.motion,music:input.music,caption:input.caption,
    avoid:input.avoid,variant:input.variant,
    promptOverride:input.manualPrompt||"",
    renderOptions:input.renderOptions,
  });
  const available=[...new Set([
    ...draft.plan.shots.map(shot=>shot.sceneId),
    ...draft.plan.sceneChoices.map(choice=>choice.sceneId),
  ])].slice(0,18);
  const choiceById=new Map(draft.plan.sceneChoices.map(choice=>[choice.sceneId,choice]));
  const effectiveFilters={
    theme:input.theme,style:input.style,aspect:input.aspect,
    durationSeconds:input.durationSeconds,motion:input.motion,
    music:input.music,caption:input.caption,
    ...(input.avoid?{avoid:input.avoid}:{}),
  };
  return {
    contractVersion:FIRST_VIDEO_PROMPT_CONTRACT_VERSION,
    locale:input.locale,visitorWish:input.wish,
    effectiveFilters,
    explicitlySelectedFilters:input.selectedFields,
    ...(input.templateId?{selectedTemplateId:input.templateId}:{}),
    scenarioVariant:input.variant,
    ...(input.manualPrompt?{userEditedStoryboard:input.manualPrompt}:{}),
    ...(input.renderOptions?{localRendering:input.renderOptions}:{}),
    visualIntent:analyzeFirstVideoVisualIntent(input.wish),
    directingPreferences:(input.directorSelections||[]).map(choice=>{
      const question=DIRECTOR_QUESTIONS.get(choice.id);
      const label=question.options.find(option=>option.id===choice.optionId)?.labels?.[input.locale]||choice.optionId;
      return {id:choice.id,optionId:choice.optionId,option:label,
        ...(choice.shotNumber?{shotNumber:choice.shotNumber}:{}),
        application:"creative_reference_only_not_in_local_renderer"};
    }),
    instructionPriority:["verified_existing_scenes_and_exclusions",
      "explicitly_selected_filters","client_positive_visual_subject","safe_defaults"],
    defaultDirection:{continuity:"consistent_visual_style",
      transitions:"gentle_no_flicker",source:"verified_local_scenes_only"},
    verifiedLocalStoryboard:{
      shotCount:draft.plan.shotCount,
      scenes:draft.plan.shots.map(shot=>({
        sceneId:shot.sceneId,seconds:shot.durationSeconds,
        visualCue:shot.visualCue,
      })),
    },
    availableSceneChoices:available.map(sceneId=>({
      sceneId,visualCue:choiceById.get(sceneId)?.visualCue,
    })),
    ...(draft.descriptionLimited?{honestLimitation:draft.limitationNote}:{}),
    mediaGeneration:"existing_local_scenes_only",
  };
}
