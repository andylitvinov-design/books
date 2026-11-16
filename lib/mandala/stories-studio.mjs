/**
 * Local-first Stories Studio contracts. This module never calls providers,
 * uploads assets, creates billing receipts, or publishes content.
 */
export const STORY_FORMATS = Object.freeze(["visual","motion","talking_character","ai_cinematic"]);
export const STORY_LOCALES = Object.freeze(["ru","en","es"]);
export const STORY_MIN_SCENES = 3;
export const STORY_MAX_SCENES = 7;
export const STORY_DEFAULT_SCENES = 5;
export const STORY_ACCOUNTS = Object.freeze({
  wizards_secrets: Object.freeze({ id:"wizards_secrets",handle:"@wizards.secrets",tone:"witty_warm_playful_surprising",visual:"original_wizard_fantasy",palette:"midnight_indigo_warm_gold_violet",defaultStyle:"wizard_fantasy",cta:Object.freeze({ru:"Открой секрет",en:"Discover the secret",es:"Descubre el secreto"}),prohibited:Object.freeze(["franchise_characters","preachy_copy","unlicensed_music","therapist_brand_style"])}),
  andy_therapist: Object.freeze({ id:"andy_therapist",handle:"@andy.therapist",tone:"professional_human_warm_grounded",visual:"calm_psychological_editorial",palette:"warm_neutral_deep_teal_muted_earth",defaultStyle:"minimal_editorial",cta:Object.freeze({ru:"Выберите следующий шаг",en:"Explore your next step",es:"Explora el siguiente paso"}),prohibited:Object.freeze(["viewer_diagnosis","guaranteed_outcomes","fear_based_copy","fantasy_brand_style"])}),
});
export const STORY_FORMULAS = Object.freeze([
  Object.freeze({id:"mystery_reveal",beats:["hook","clue","reveal","meaning","cta"]}),
  Object.freeze({id:"two_choices",beats:["question","choice_a","choice_b","consequence","cta"]}),
  Object.freeze({id:"hidden_pattern",beats:["everyday_scene","hidden_pattern","reframe","reflection","cta"]}),
  Object.freeze({id:"turning_point",beats:["before","tension","turning_point","after","cta"]}),
  Object.freeze({id:"three_mistakes",beats:["hook","mistake_one","mistake_two","mistake_three","next_step"]}),
  Object.freeze({id:"myth_truth",beats:["myth","surprise","truth","example","cta"]}),
  Object.freeze({id:"character_dialogue",beats:["character_a","character_b","disagreement","punchline","insight"]}),
  Object.freeze({id:"viewer_choice",beats:["question","choice","pause","reveal","cta"]}),
  Object.freeze({id:"micro_case",beats:["situation","pattern","turning_point","learning","cta"]}),
  Object.freeze({id:"symbol_meaning",beats:["symbol","curiosity","context","meaning","reflection"]}),
]);
export const STORY_STYLE_RECIPES = Object.freeze([
  ["storybook","Illustrated storybook",["wizards_secrets"],"full_bleed","page_turn","gentle_parallax"],
  ["comic_panels","Comic panels",["wizards_secrets"],"dynamic_panels","panel_wipe","panel_reveal"],
  ["papercraft","Paper cut-out",["wizards_secrets","andy_therapist"],"layered_paper","paper_slide","parallax"],
  ["watercolor","Watercolor",["wizards_secrets","andy_therapist"],"soft_full_bleed","crossfade","slow_drift"],
  ["minimal_editorial","Minimal editorial",["andy_therapist"],"large_type","clean_cut","subtle_zoom"],
  ["cinematic_portrait","Cinematic portrait",["wizards_secrets","andy_therapist"],"portrait_focus","cinematic_fade","slow_push"],
  ["wizard_fantasy","Magical fantasy",["wizards_secrets"],"fantasy_environment","light_reveal","depth_drift"],
  ["character_2d","2D character scenes",["wizards_secrets","andy_therapist"],"character_stage","character_wipe","pose_sequence"],
  ["clay_3d","3D clay look",["wizards_secrets"],"sculpted_scene","soft_morph","local_scale"],
  ["whiteboard","Whiteboard explainer",["andy_therapist"],"diagram_canvas","draw_on","stroke_reveal"],
  ["collage","Collage scrapbook",["wizards_secrets","andy_therapist"],"layered_collage","paper_cut","layer_float"],
  ["kinetic_type","Kinetic typography",["wizards_secrets","andy_therapist"],"type_led","word_wipe","text_kinetic"],
].map(([id,label,brands,layout,transition,motion])=>Object.freeze({id,label,brands:Object.freeze(brands),layout,transition,motion,aspectRatio:"9:16",safeZones:Object.freeze({top:0.12,bottom:0.18,sides:0.08})})));
export const STORY_CHARACTERS = Object.freeze({
  wizard_sage:Object.freeze({id:"wizard_sage",brandProfile:"wizards_secrets",name:"Wizard Sage",referenceAssetIds:Object.freeze([]),expressions:Object.freeze(["neutral","curious","amused","wise","surprised"]),poses:Object.freeze(["front","three_quarter","speaking","gesturing"]),voiceConsentRequired:true,identityLock:"approved_reference_only",prohibited:Object.freeze(["costume_drift","face_identity_drift","franchise_similarity","unapproved_voice_clone"])})
});
const labels = Object.freeze({
  visual:{ru:"Визуальная история",en:"Visual Story",es:"Historia visual"},
  motion:{ru:"Динамическая история",en:"Motion Story",es:"Historia animada"},
  talking_character:{ru:"Говорящий персонаж",en:"Talking Character",es:"Personaje parlante"},
  ai_cinematic:{ru:"AI Cinematic",en:"AI Cinematic",es:"Cine con IA"},
});
const descriptions = Object.freeze({
  visual:{
    ru:"Фото и проверенные видеосцены, текст и переходы. Сборка локально.",
    en:"Photos and approved video scenes with local typography and transitions.",
    es:"Fotos y vídeos aprobados con texto y transiciones locales.",
  },
  motion:{
    ru:"Те же материалы с локальным движением, масштабированием и параллаксом.",
    en:"The same approved assets with local pan, zoom and parallax.",
    es:"Los mismos recursos con movimiento, zoom y paralaje locales.",
  },
  talking_character:{
    ru:"Персонаж и озвучка из существующих библиотек. Без отдельного TTS-сервиса.",
    en:"Reuse an existing character and the current Voice workspace.",
    es:"Reutiliza un personaje y el espacio de Voz existente.",
  },
  ai_cinematic:{
    ru:"Сложные сцены можно добавить отдельно после ручного согласования стоимости.",
    en:"Optional cinematic scenes require a separate owner-approved quote.",
    es:"Las escenas cinematográficas requieren presupuesto y aprobación del propietario.",
  },
});
export function getStoryFormatCopy(format,locale="en"){
  if(!STORY_FORMATS.includes(format)||!STORY_LOCALES.includes(locale))throw new Error("invalid_story_format");
  return Object.freeze({label:labels[format][locale],description:descriptions[format][locale]});
}
function safeId(value){return typeof value==="string"&&/^[a-z0-9][a-z0-9_-]{1,79}$/i.test(value);}
const safeLocalAssetRef = value => typeof value === "string" && value.startsWith("/") &&
  !value.startsWith("//") && !value.includes("\\") && !/[?#\u0000-\u001f]/.test(value) &&
  !value.split("/").some(part=>part==="."||part==="..") &&
  !/%(?:2e|2f|5c)/i.test(value) && !/^(?:https?:|data:|javascript:|file:)/i.test(value);
const isRecord = value => value!==null && typeof value==="object" && !Array.isArray(value);
const clean = (value,max=1200)=>String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);

export function getStoryStyleRecipes(brandProfile="wizards_secrets"){
  if(!STORY_ACCOUNTS[brandProfile])throw new Error("invalid_story_brand");
  return Object.freeze(STORY_STYLE_RECIPES.filter(style=>style.brands.includes(brandProfile)));
}

export function buildStoryDirectorBrief({account="wizards_secrets",topic,locale="en",format="visual",frameCount=5,
  targetDuration=20,formulaId="mystery_reveal",cta=""}={}){
  const brand=STORY_ACCOUNTS[account];
  if(!brand||!STORY_LOCALES.includes(locale)||!STORY_FORMATS.includes(format)||
    typeof topic!=="string"||!clean(topic,800)||!Number.isInteger(frameCount)||frameCount<3||frameCount>7||
    !Number.isFinite(targetDuration)||targetDuration<6||targetDuration>60||
    !STORY_FORMULAS.some(item=>item.id===formulaId))throw new Error("invalid_story_director_input");
  const formula=STORY_FORMULAS.find(item=>item.id===formulaId);
  const finalBeat=formula.beats.includes("cta")?"cta":formula.beats.includes("next_step")?"next_step":"reflection";
  let beats=frameCount===3?[formula.beats[0],formula.beats[Math.floor((formula.beats.length-1)/2)],finalBeat]:
    frameCount===4?[formula.beats[0],formula.beats[1],formula.beats.at(-2),finalBeat]:
    [...formula.beats.slice(0,frameCount-1),finalBeat];
  if(beats.length<frameCount)beats.splice(beats.length-1,0,...Array.from({length:frameCount-beats.length},(_,index)=>`supporting_beat_${index+1}`));
  return Object.freeze({version:"hh-story-director-brief-v1",account,handle:brand.handle,topic:clean(topic,800),locale,format,
    frameCount,targetDuration,formulaId,sceneRoles:Object.freeze(beats.map((role,index)=>Object.freeze({order:index,role}))),
    brandTone:brand.tone,visualIdentity:brand.visual,palette:brand.palette,cta:clean(cta,180)||brand.cta[locale],
    providerCallsAuthorized:false,paidGenerationAuthorized:false,requiresOwnerStoryboardApproval:true});
}

/**
 * Pure scene manifest. `approvedAssetRefs` must come from a trusted, existing
 * server-side asset/catalogue review; client-provided rights flags are ignored.
 */
export function buildStoryProject({
  id,accountId=null,brandProfile="wizards_secrets",locale="en",format="visual",
  targetDuration=30,aspectRatio="9:16",scenes=[],approvedAssetRefs=[],
  characterId=null,voiceAssetRef=null,voiceConsentRef=null,styleRecipeId=null,budgetLimitUsd=0,
  formulaId="mystery_reveal",topic="",title="",cta=""
}={}){
  if(!safeId(id)||!STORY_ACCOUNTS[brandProfile]||!STORY_LOCALES.includes(locale)||!STORY_FORMATS.includes(format)||
    ![10,15,20,30,60].includes(targetDuration)||aspectRatio!=="9:16"||
    !Array.isArray(scenes)||scenes.length<STORY_MIN_SCENES||scenes.length>STORY_MAX_SCENES||
    !Array.isArray(approvedAssetRefs)||!approvedAssetRefs.every(safeLocalAssetRef)||
    !Number.isFinite(budgetLimitUsd)||budgetLimitUsd<0||
    !STORY_FORMULAS.some(item=>item.id===formulaId))throw new Error("invalid_story_project");
  if(characterId&&(!STORY_CHARACTERS[characterId]||STORY_CHARACTERS[characterId].brandProfile!==brandProfile))throw new Error("invalid_story_character");
  if(voiceAssetRef&&(!clean(voiceConsentRef,180)||!safeId(voiceAssetRef)))throw new Error("story_voice_consent_required");
  const styleId=styleRecipeId||STORY_ACCOUNTS[brandProfile].defaultStyle;
  const style=STORY_STYLE_RECIPES.find(item=>item.id===styleId&&item.brands.includes(brandProfile));
  if(!style)throw new Error("invalid_story_style_for_brand");
  const approved=new Set(approvedAssetRefs),seen=new Set();
  const normalized=scenes.map((scene,index)=>{
    if(!isRecord(scene)||!safeId(scene.id)||seen.has(scene.id)||!Number.isInteger(scene.durationMs)||
      scene.durationMs<1000||scene.durationMs>30000||typeof scene.scriptText!=="string"||
      typeof scene.overlayText!=="string"||(scene.assetRef!==null&&scene.assetRef!==undefined&&!safeLocalAssetRef(scene.assetRef)))
      throw new Error("invalid_story_scene");
    seen.add(scene.id);
    const assetRef=scene.assetRef??null,assetApproved=Boolean(assetRef&&approved.has(assetRef));
    return Object.freeze({
      id:scene.id,order:index+1,role:clean(scene.role|| (index===0?"hook":index===scenes.length-1?"cta":"beat"),48),
      durationMs:scene.durationMs,scriptText:clean(scene.scriptText,600),overlayText:clean(scene.overlayText,180),
      purpose:clean(scene.purpose,240),visualPrompt:clean(scene.visualPrompt,1200),voiceoverText:clean(scene.voiceoverText,900),
      assetRef,assetKind:assetApproved?(scene.assetKind||"approved_existing_asset"):"unresolved",
      rightsStatus:assetApproved?"approved":assetRef?"unverified":"missing",
      motionPreset:format==="motion"?(scene.motionPreset||"gentle-pan-zoom"):"none",
      provider:null,model:null,estimatedCostUsd:0,actualCostUsd:0,
      generationStatus:assetApproved?"ready":"needs_asset",
      approvalState:"draft",sceneVersion:1,
    });
  });
  const total=normalized.reduce((sum,scene)=>sum+scene.durationMs,0);
  if(Math.abs(total-targetDuration*1000)>1000)throw new Error("story_duration_mismatch");
  return Object.freeze({
    schema:"hh-stories-studio-v1",id,accountId,brandProfile,brandHandle:STORY_ACCOUNTS[brandProfile].handle,locale,
    localeVariants:Object.freeze(STORY_LOCALES.filter(item=>item!==locale)),format,aspectRatio,targetDuration,
    title:clean(title,180),topic:clean(topic,800),formulaId,styleRecipeId:style.id,characterId,
    voiceAssetRef:voiceAssetRef||null,voiceConsentRef:voiceConsentRef||null,cta:clean(cta,180)||STORY_ACCOUNTS[brandProfile].cta[locale],
    status:"storyboard_draft",scenes:Object.freeze(normalized),costMode:"free",budgetLimitUsd,
    costEstimateUsd:0,actualCostUsd:0,paidProviderRequests:0,billingReceipts:0,
    providerCallsAuthorized:false,autoPublish:false,createdAt:null,updatedAt:null,
  });
}

export function createStoryLocaleVariant(story,{locale,sceneTexts=[]}={}){
  if(!story||story.schema!=="hh-stories-studio-v1"||!STORY_LOCALES.includes(locale)||
    !Array.isArray(sceneTexts)||sceneTexts.length!==story.scenes.length)throw new Error("invalid_story_locale_variant");
  const scenes=story.scenes.map((scene,index)=>{
    const text=sceneTexts[index];if(!isRecord(text))throw new Error("invalid_story_locale_scene");
    return Object.freeze({...scene,overlayText:clean(text.overlayText,180),voiceoverText:clean(text.voiceoverText,900)});
  });
  return Object.freeze({...story,id:`${story.id}-${locale}`,locale,scenes:Object.freeze(scenes),
    reusedSourceAssets:true,providerCallsAuthorized:false,autoPublish:false});
}

export async function createStoryAssetCacheKey({contentHash,model,modelVersion,parameters={},resolution="1080x1920",locale="en",languageDependent=false,rights={}}={}){
  if(!isRecord(rights)||rights.status!=="approved"||rights.cacheAllowed!==true||
    !clean(rights.licenseRef||rights.consentRef,240)||
    (rights.private===true&&rights.ownerScope!=="same_owner"))return null;
  if(typeof contentHash!=="string"||!contentHash||typeof model!=="string"||!model||
    typeof modelVersion!=="string"||!modelVersion||!isRecord(parameters)||
    !/^(?:[1-9][0-9]{2,3})x(?:[1-9][0-9]{2,3})$/.test(resolution)||
    !STORY_LOCALES.includes(locale))throw new Error("invalid_story_cache_identity");
  const canonical=value=>{
    if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
    if(isRecord(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    if(typeof value==="number"&&!Number.isFinite(value))throw new Error("invalid_story_cache_parameter");
    if(value===undefined)throw new Error("invalid_story_cache_parameter");
    return JSON.stringify(value);
  };
  const material={contentHash,model,modelVersion,parameters,resolution,
    locale:languageDependent?locale:"shared_visual",
    rights:{licenseRef:clean(rights.licenseRef,240),consentRef:clean(rights.consentRef,240),ownerScope:clean(rights.ownerScope,48)}};
  const bytes=new TextEncoder().encode(canonical(material));
  const digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);
  const hex=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
  return `hh-story-asset-v1:${hex}`;
}

export function getStoryExecutionPolicy({format="visual",ownerOptIn=false,quote=null,
  featureEnabled=false,sceneApprovalIds=[],budgetLimitUsd=0,existingOperationStatus="not_submitted",
  idempotencyKeys=[],spentBudgetUsd=0}={}){
  if(!STORY_FORMATS.includes(format))throw new Error("invalid_story_format");
  if(!Array.isArray(sceneApprovalIds)||!Array.isArray(idempotencyKeys)||
    !Number.isFinite(budgetLimitUsd)||budgetLimitUsd<0||!Number.isFinite(spentBudgetUsd)||spentBudgetUsd<0)throw new Error("invalid_story_paid_policy");
  const quoteOk=isRecord(quote)&&quote.status==="verified"&&quote.currency==="USD"&&
    Number.isFinite(quote.amount)&&quote.amount>=0&&safeId(quote.sceneId)&&
    typeof quote.provider==="string"&&clean(quote.provider,100).length>0&&
    typeof quote.model==="string"&&clean(quote.model,120).length>0&&
    typeof quote.quoteId==="string"&&safeId(quote.quoteId);
  const approvalsOk=sceneApprovalIds.length===1&&new Set(sceneApprovalIds).size===1&&
    sceneApprovalIds.every(safeId)&&sceneApprovalIds[0]===quote?.sceneId;
  const operationResolved=!(["unknown","submitted","running","processing"].includes(existingOperationStatus));
  const idempotencyOk=idempotencyKeys.length===1&&
    new Set(idempotencyKeys).size===1&&idempotencyKeys.every(key=>typeof key==="string"&&/^[a-zA-Z0-9:_-]{12,160}$/.test(key));
  const paidAllowed=format==="ai_cinematic"&&ownerOptIn===true&&featureEnabled===true&&quoteOk&&
    spentBudgetUsd+quote.amount<=budgetLimitUsd&&approvalsOk&&operationResolved&&idempotencyOk;
  return Object.freeze({
    renderer:"existing-local-canvas",mayUseLocalAssets:true,
    mayUseExistingVoice:format==="talking_character",mayCallPaidProvider:paidAllowed,
    authorizedSceneIds:Object.freeze(paidAllowed?[quote.sceneId]:[]),
    quotedCostUsd:paidAllowed?quote.amount:0,spentBudgetUsd:paidAllowed?spentBudgetUsd:0,
    remainingBudgetUsd:paidAllowed?Math.max(0,budgetLimitUsd-spentBudgetUsd-quote.amount):budgetLimitUsd,
    quoteId:paidAllowed?quote.quoteId:null,
    idempotencyKeys:Object.freeze(paidAllowed?[...idempotencyKeys]:[]),
    autoRetryPaidRequests:false,autoUpgradeModel:false,autoPublish:false,
    maximumSceneCount:STORY_MAX_SCENES,
  });
}
