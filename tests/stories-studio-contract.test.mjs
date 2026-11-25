import test from "node:test";
import assert from "node:assert/strict";
import { STORY_FORMATS, STORY_ACCOUNTS, STORY_FORMULAS, STORY_STYLE_RECIPES, STORY_CHARACTERS,
 buildStoryProject,getStoryExecutionPolicy,getStoryFormatCopy,getStoryStyleRecipes,
 buildStoryDirectorBrief,createStoryLocaleVariant,createStoryAssetCacheKey } from "../lib/mandala/stories-studio.mjs";
const scenes=Array.from({length:5},(_,i)=>({id:"scene-"+(i+1),durationMs:6000,
 role:i===0?"hook":i===4?"cta":"beat",scriptText:"Scene "+(i+1),overlayText:"Beat "+(i+1),
 voiceoverText:"Narration "+(i+1),assetRef:"/videos/scene-"+(i+1)+".mp4"}));
const approved=scenes.map(s=>s.assetRef);
const project=(patch={})=>buildStoryProject({id:"story-demo",locale:"ru",format:"visual",targetDuration:30,
 scenes,approvedAssetRefs:approved,...patch});

test("four formats have localized RU/EN/ES labels and descriptions",()=>{
 assert.deepEqual(STORY_FORMATS,["visual","motion","talking_character","ai_cinematic"]);
 for(const f of STORY_FORMATS)for(const l of ["ru","en","es"]){const copy=getStoryFormatCopy(f,l);assert.ok(copy.label);assert.ok(copy.description);}
});
test("brand profiles, 10 narrative formulas, 12 recipes and Wizard Sage are separated",()=>{
 assert.equal(STORY_ACCOUNTS.wizards_secrets.handle,"@wizards.secrets");
 assert.equal(STORY_ACCOUNTS.andy_therapist.handle,"@andy.therapist");
 assert.equal(STORY_FORMULAS.length,10);assert.equal(STORY_STYLE_RECIPES.length,12);
 assert.ok(getStoryStyleRecipes("wizards_secrets").some(s=>s.id==="wizard_fantasy"));
 assert.ok(!getStoryStyleRecipes("andy_therapist").some(s=>s.id==="wizard_fantasy"));
 assert.equal(STORY_CHARACTERS.wizard_sage.brandProfile,"wizards_secrets");
});
test("Director brief plans 3/4/5/7 scene EN/RU/ES hooks and ending before rendering",()=>{
 for(const locale of ["ru","en","es"])for(const frameCount of [3,4,5,7]){
  const brief=buildStoryDirectorBrief({account:"wizards_secrets",topic:"A hidden secret",locale,format:"visual",frameCount,targetDuration:20});
  assert.equal(brief.sceneRoles.length,frameCount);assert.equal(brief.sceneRoles[0].role,"hook");
  assert.ok(["cta","next_step","reflection"].includes(brief.sceneRoles.at(-1).role));
  assert.equal(brief.paidGenerationAuthorized,false);assert.equal(brief.providerCallsAuthorized,false);
 }
});
test("creates five-scene 9:16 Visual Story with verified local assets and zero paid calls",()=>{
 const story=project();assert.equal(story.scenes.length,5);assert.equal(story.aspectRatio,"9:16");
 assert.ok(story.scenes.every(s=>s.rightsStatus==="approved"));assert.equal(story.costEstimateUsd,0);
 assert.equal(story.paidProviderRequests,0);assert.equal(story.billingReceipts,0);assert.equal(story.autoPublish,false);
});
test("untrusted rights flags do not approve an asset absent from trusted allowlist",()=>{
 const story=buildStoryProject({id:"story-untrusted",targetDuration:30,scenes:scenes.map(s=>({...s,rightsStatus:"approved"}))});
 assert.ok(story.scenes.every(s=>s.rightsStatus==="unverified"&&s.generationStatus==="needs_asset"));
});
test("rejects URL, traversal, protocol-relative, encoded traversal and unsafe asset refs",()=>{
 for(const assetRef of ["https://evil.test/a.mp4","//evil.test/a.mp4","/../../private.mp4","/%2e%2e/private.mp4","/\\\\evil/file.mp4","data:image/png,abc"]){
  assert.throws(()=>buildStoryProject({id:"story-invalid",targetDuration:30,scenes:scenes.map((s,i)=>({...s,assetRef:i===0?assetRef:s.assetRef})),approvedAssetRefs:[...approved,assetRef]}));
 }
});
test("Motion Story uses local motion and never authorizes a paid provider",()=>{
 const story=project({id:"story-motion",format:"motion"});assert.ok(story.scenes.every(s=>s.motionPreset==="gentle-pan-zoom"));
 assert.equal(getStoryExecutionPolicy({format:"motion"}).mayCallPaidProvider,false);
});
test("Talking Character requires an approved existing character and explicit voice consent",()=>{
 assert.throws(()=>project({id:"talking-no-consent",format:"talking_character",characterId:"wizard_sage",voiceAssetRef:"voice-1"}),/story_voice_consent_required/);
 const story=project({id:"talking-consented",format:"talking_character",characterId:"wizard_sage",voiceAssetRef:"voice_1",voiceConsentRef:"consent_1"});
 assert.equal(story.characterId,"wizard_sage");assert.equal(getStoryExecutionPolicy({format:"talking_character"}).mayUseExistingVoice,true);
 assert.throws(()=>project({id:"wrong-brand",brandProfile:"andy_therapist",characterId:"wizard_sage"}),/invalid_story_character/);
});
test("AI Cinematic fails closed without exact quote, scene approval, budget, idempotency and feature flags",()=>{
 const valid={format:"ai_cinematic",ownerOptIn:true,featureEnabled:true,
  quote:{status:"verified",sceneId:"scene-3",provider:"existing-veo-lite",model:"veo-3.1-lite",amount:0.3,currency:"USD",quoteId:"quote_003"},
  sceneApprovalIds:["scene-3"],budgetLimitUsd:0.5,spentBudgetUsd:0.1,idempotencyKeys:["story-demo:scene-3:0001"],existingOperationStatus:"not_submitted"};
 assert.equal(getStoryExecutionPolicy(valid).mayCallPaidProvider,true);
 for(const patch of [{ownerOptIn:false},{featureEnabled:false},{budgetLimitUsd:0.1},{sceneApprovalIds:[]},
  {quote:{...valid.quote,sceneId:"scene-4"}},{quote:{...valid.quote,status:"unverified"}},
  {idempotencyKeys:[]},{existingOperationStatus:"unknown"},{existingOperationStatus:"submitted"},
  {sceneApprovalIds:["scene-3","scene-4"],idempotencyKeys:["story-demo:scene-3:0001","story-demo:scene-4:0001"]},
  {spentBudgetUsd:0.3},{quote:{...valid.quote,amount:0.6}}])
  assert.equal(getStoryExecutionPolicy({...valid,...patch}).mayCallPaidProvider,false);
});
test("local language variants reuse the same assets and never publish or call providers",()=>{
 const original=project();const variant=createStoryLocaleVariant(original,{locale:"es",sceneTexts:scenes.map((s,i)=>({overlayText:"Texto "+i,voiceoverText:"Voz "+i}))});
 assert.equal(variant.locale,"es");assert.equal(variant.reusedSourceAssets,true);
 assert.deepEqual(variant.scenes.map(s=>s.assetRef),original.scenes.map(s=>s.assetRef));
 assert.equal(variant.providerCallsAuthorized,false);assert.equal(variant.autoPublish,false);
});
test("rejects invalid locales, formats, frame counts, IDs, styles and non-vertical output",()=>{
 for(const input of [{locale:"fr"},{format:"unknown"},{aspectRatio:"16:9"},{scenes:scenes.slice(0,2)},
  {scenes:[...scenes,{...scenes[0]}]},{brandProfile:"unknown"},{styleRecipeId:"wizard_fantasy",brandProfile:"andy_therapist"}])
  assert.throws(()=>project(input));
});
test("requires exact story duration to match the scene timeline",()=>{
 assert.throws(()=>project({id:"story-time",scenes:scenes.map(s=>({...s,durationMs:5000}))}),/story_duration_mismatch/);
});

test("asset cache shares identical approved visuals across locales but separates language-dependent media",async()=>{
 const base={contentHash:"sha256:approved-frame",model:"owned-library",modelVersion:"v1",parameters:{width:1080,crop:"cover"},resolution:"1080x1920",
  rights:{status:"approved",cacheAllowed:true,licenseRef:"owned-license-v1",ownerScope:"same_owner",private:true}};
 const en=await createStoryAssetCacheKey({...base,locale:"en"});
 const ru=await createStoryAssetCacheKey({...base,locale:"ru"});
 assert.equal(en,ru);
 const enVoice=await createStoryAssetCacheKey({...base,locale:"en",languageDependent:true});
 const ruVoice=await createStoryAssetCacheKey({...base,locale:"ru",languageDependent:true});
 assert.notEqual(enVoice,ruVoice);assert.equal(await createStoryAssetCacheKey({...base,rights:{...base.rights,cacheAllowed:false}}),null);
 assert.equal(await createStoryAssetCacheKey({...base,rights:{...base.rights,ownerScope:"other_owner"}}),null);
});
