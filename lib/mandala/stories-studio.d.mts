export const STORY_FORMATS: readonly ["visual","motion","talking_character","ai_cinematic"];
export type StoryFormat = typeof STORY_FORMATS[number];
export const STORY_LOCALES: readonly ["ru","en","es"];
export type StoryLocale = typeof STORY_LOCALES[number];
export const STORY_MIN_SCENES: 3;
export const STORY_MAX_SCENES: 7;
export const STORY_DEFAULT_SCENES: 5;
export const STORY_ACCOUNTS: Readonly<Record<"wizards_secrets"|"andy_therapist",Readonly<Record<string,unknown>>>>;
export const STORY_FORMULAS: readonly Readonly<{id:string;beats:readonly string[]}>[];
export const STORY_STYLE_RECIPES: readonly Readonly<{id:string;label:string;brands:readonly string[];layout:string;transition:string;motion:string;aspectRatio:"9:16";safeZones:Readonly<{top:number;bottom:number;sides:number}>}>[];
export const STORY_CHARACTERS: Readonly<Record<string,Readonly<Record<string,unknown>>>>;
export interface StorySceneInput {
  id:string;durationMs:number;scriptText:string;overlayText:string;
  role?:string;purpose?:string;visualPrompt?:string;voiceoverText?:string;
  assetRef?:string|null;assetKind?:string;motionPreset?:string;
}
export interface StoryProject {
  schema:"hh-stories-studio-v1";id:string;accountId:string|null;
  brandProfile:"wizards_secrets"|"andy_therapist";brandHandle:string;
  locale:StoryLocale;localeVariants:readonly StoryLocale[];format:StoryFormat;
  aspectRatio:"9:16";targetDuration:number;title:string;topic:string;
  formulaId:string;styleRecipeId:string;characterId:string|null;
  voiceAssetRef:string|null;voiceConsentRef:string|null;cta:string;
  status:"storyboard_draft";scenes:readonly Readonly<Record<string,unknown>>[];
  costMode:"free";budgetLimitUsd:number;costEstimateUsd:0;actualCostUsd:0;
  paidProviderRequests:0;billingReceipts:0;providerCallsAuthorized:false;autoPublish:false;
  createdAt:null;updatedAt:null;
}
export function getStoryFormatCopy(format:StoryFormat,locale:StoryLocale):Readonly<{label:string;description:string}>;
export function getStoryStyleRecipes(brandProfile:"wizards_secrets"|"andy_therapist"):typeof STORY_STYLE_RECIPES[number][];
export function buildStoryDirectorBrief(input:{account?:"wizards_secrets"|"andy_therapist";topic:string;locale:StoryLocale;format:StoryFormat;frameCount?:number;targetDuration?:number;formulaId?:string;cta?:string}):Readonly<Record<string,unknown>>;
export function buildStoryProject(input:{id:string;accountId?:string|null;brandProfile?:"wizards_secrets"|"andy_therapist";locale?:StoryLocale;format?:StoryFormat;targetDuration:number;aspectRatio?:"9:16";scenes:readonly StorySceneInput[];approvedAssetRefs?:readonly string[];characterId?:string|null;voiceAssetRef?:string|null;voiceConsentRef?:string|null;styleRecipeId?:string|null;budgetLimitUsd?:number;formulaId?:string;topic?:string;title?:string;cta?:string}):StoryProject;
export function createStoryLocaleVariant(story:StoryProject,input:{locale:StoryLocale;sceneTexts:readonly {overlayText?:string;voiceoverText?:string}[]}):StoryProject & {reusedSourceAssets:true};
export function createStoryAssetCacheKey(input:{contentHash:string;model:string;modelVersion:string;parameters?:Record<string,unknown>;resolution?:string;locale?:StoryLocale;languageDependent?:boolean;rights:{status:"approved";cacheAllowed:true;licenseRef?:string;consentRef?:string;ownerScope?:string;private?:boolean}}):Promise<string|null>;
export function getStoryExecutionPolicy(input?:{format?:StoryFormat;ownerOptIn?:boolean;quote?:{status:"verified";sceneId:string;provider:string;model:string;amount:number;currency:"USD";quoteId:string}|null;featureEnabled?:boolean;sceneApprovalIds?:readonly string[];budgetLimitUsd?:number;existingOperationStatus?:string;idempotencyKeys?:readonly string[];spentBudgetUsd?:number}):Readonly<{renderer:"existing-local-canvas";mayUseLocalAssets:true;mayUseExistingVoice:boolean;mayCallPaidProvider:boolean;authorizedSceneIds:readonly string[];quotedCostUsd:number;spentBudgetUsd:number;remainingBudgetUsd:number;quoteId:string|null;idempotencyKeys:readonly string[];autoRetryPaidRequests:false;autoUpgradeModel:false;autoPublish:false;maximumSceneCount:7}>;
