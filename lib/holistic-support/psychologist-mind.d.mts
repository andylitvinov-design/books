/** Public type contract: pure, offline, non-diagnostic Psychologist Mind. */
export type PsychologistLocale = "ru" | "en" | "es";
export type PsychologistFocus = "stress" | "relationships" | "self_worth" |
  "meaning" | "trauma_support";
export type PsychologistMode = "self_guided" | "practitioner_draft";
export type PsychologistStatus = "ready" | "clinician_draft" |
  "safety_handoff" | "human_review_required" | "safety_check_required" |
  "paused_for_review" | "client_paused" | "needs_focus";
export type PsychologistSafety = {
  status?: "clear" | "urgent" | "human_review" | "unknown";
  flags?: string[]; isMinor?: boolean;
};
export type PsychologistAccess = {
  authenticated?: boolean; ownerScoped?: boolean; verifiedPractitioner?: boolean;
};
export type PsychologistConsent = {
  profilePersonalization?: boolean; agentMemory?: boolean;
  confirmedResources?: boolean; resourceImagery?: boolean;
  processFeedback?: boolean;
};
export type PsychologistIntent = {
  focus?: PsychologistFocus; mode?: PsychologistMode;
  rawUtterance?: string; safetyStop?: boolean;
  requestedTraumaProcessing?: boolean;
  style?: "warm" | "concise" | "structured";
  durationMinutes?: number; noImagery?: boolean;
  avoidMethods?: string[];
  confirmedTrigger?: string; confirmedReaction?: string;
  courseId?: string; motifId?: string; symbolId?: string;
  selfGuidedOnly?: boolean; intentionCode?: string;
  sceneId?: string; metaphorId?: string; storyArcId?: string;
  includeClinical?: boolean; objectiveCode?: string;
  sessionNumber?: number; variationIndex?: number;
  historySceneIds?: string[]; historyMetaphorIds?: string[];
};
export type PsychologistProfile = {
  confirmedFocus?: PsychologistFocus; preferredStyle?: string;
  confirmedResourceCodes?: string[]; avoidMethods?: string[];
  noImagery?: boolean;
};
export type PsychologistFeedback = { discomfort?: boolean; worsening?: boolean };
export type PsychologyInput = {
  locale?: PsychologistLocale; intent?: PsychologistIntent;
  safety?: PsychologistSafety; access?: PsychologistAccess;
  consent?: PsychologistConsent; profile?: PsychologistProfile;
  feedback?: PsychologistFeedback;
  preferences?: {
    style?: "gentle" | "practical" | "poetic";
    channel?: "visual" | "auditory" | "tactile" | "neutral";
    avoidElements?: string[]; noImagery?: boolean; noMetaphor?: boolean;
  };
};
export type PsychologySession = {
  number: number; id: string; title: string; objectiveCode: string;
  focus: PsychologistFocus; methodIds: string[]; approachIds: string[];
  durationMinutes: number; editable: true; optional: true;
  clinicianDiscussionIds: string[]; clinicianMethodsRunnableByAI: false;
  stage: "orientation" | "practice" | "integration";
  requiresHumanApproval: boolean;
  canPauseOrSkip: true; needsSessionSafetyCheck: true;
  baselinePromptKey: "session_current_state";
  followupPromptKey: "session_current_state";
  videoAssetId: null; audioAssetId: null; mediaPublished: false;
};
export type CaseHypothesis = {
  id: string; evidence: string[]; tentative: true; confirmWithClient: true;
};
export type PsychologyCaseFormulation = {
  model: "5P"; presentingFocus: PsychologistFocus;
  predisposing: "unknown"; precipitating: string;
  perpetuating: "not_established"; protectiveResources: string[];
  hypotheses: CaseHypothesis[]; diagnosis: null;
  traumaInferred: false; sourcePriority: string[];
};
export type PsychologyProgram = {
  version: "psychologist-mind-v1"; locale: PsychologistLocale;
  mode: PsychologistMode; status: PsychologistStatus;
  focus: PsychologistFocus | null; message?: string | null;
  contextUsed: { profile: boolean; agentMemory: boolean; verifiedTestResults: boolean };
  formulation: PsychologyCaseFormulation | null;
  primaryApproach: string | null; sessions: PsychologySession[];
  courseRecipeId?: string | null; courseSelectionOrigin?: string;
  requiresHumanReview: boolean; publishable: false; saved: false;
  specialistDiscussionOptions: string[]; clinicalAssessmentRequired: boolean;
  modelUsed: false; clinicalTreatment: false;
  reviewBeforeDelivery?: true;
  releaseGate?: "review_and_content_approval_required";
};
export type VoluntaryCheckin = {
  promptKey: string; value: number; measuredAt: string;
};
export type PsychologyDialogueInput = PsychologyInput & {
  text?: string;
  state?: {
    sessionNumber?: number;
    phase?: "intake" | "exploration" | "checkin" |
      "practice_intro" | "reflection" | "next";
    beforeCheckin?: VoluntaryCheckin;
    afterCheckin?: VoluntaryCheckin;
  };
};
export type PsychologyDialogueTurn = {
  version: "psychologist-mind-v1"; locale: PsychologistLocale;
  status: PsychologistStatus | "dialogue";
  focus: PsychologistFocus | null; message?: string | null;
  question: {key: string; text: string} | null;
  sessionNumber: number | null; suggestedMethodIds: string[];
  requiresHumanReview: boolean; canStartExercise: false;
  modelUsed: false; saved: false; clinicalTreatment: false;
  currentObjective?: string;
  skillPreview?: {
    id: string; title: string; steps: string[];
    needsExplicitStart: true; optional: true; clinicalProtocol: false;
  } | null;
  voluntaryComparison?: {
    promptKey: string; before: number; after: number; change: number;
    evidenceType: string; efficacyClaim: false; saveRequiresConsent: true;
  } | null;
  dialogueContract?: {
    source: "psychologist_mind_policy"; needsExplicitStart: true;
    mayAskOneQuestion: true; mayDiagnose: false; mayInterpretTrauma: false;
  };
};
export const PSYCHOLOGIST_MIND_VERSION: "psychologist-mind-v1";
export const PSYCHOLOGIST_FOCI: readonly PsychologistFocus[];
export const PSYCHOLOGIST_APPROACHES: Readonly<Record<string, Readonly<{
  id: string; clinicalTreatment: boolean; purpose: string;
}>>>;
export const PSYCHOLOGIST_METHODS: Readonly<Record<string, Readonly<{
  approach: string; selfGuided: boolean; imageryConsent?: boolean; note?: string;
}>>>;
export function buildPsychologyProgram(input?: PsychologyInput): PsychologyProgram;
export function buildPsychologyDialogueTurn(input?: PsychologyDialogueInput): PsychologyDialogueTurn;

export type PsychologyVideoSegment = {
  id: string; seconds: number; narration: string; onScreen: string;
  requiresOptIn?: boolean; allowSilenceAndSkip?: boolean;
  requiresUserResponse?: boolean;
};
export type PsychologyVideoLesson = {
  number: number; sessionId: string; title: string;
  learningObjective: string; selectedSkillId: string | null;
  practicalSteps: string[]; plannedVideoSeconds: number;
  segments: PsychologyVideoSegment[]; transferExercise: string;
  needsSafetyRecheck: true; canStopOrSkip: true;
  videoAssetId: null; videoPlayable: false; audioAssetId: null;
  needsManualPublication: true;
  assessment: { t0: "optional_checkin"; t1: "optional_checkin"; noClaimsOfEfficacy: true };
};
export type PsychologyVideoCourseDraft = {
  version: "psychologist-video-course-v1"; status: string;
  courseId: string | null; title: string | null;
  lessons: PsychologyVideoLesson[];
  published: false; rendered: false; mediaAssetsVerified: false;
  requiresClinicalAndEditorialReview: true;
  focus?: PsychologistFocus; teachingModel?: string;
  selectionRationale?: string;
};
export type PsychologyMeditationSegment = {
  id: string; text: string; seconds: number; optionalSilenceSeconds: number;
  maySkip: true; forceBreathControl: false; eyesMayRemainOpen: true;
};
export type PsychologyMeditationDraft = {
  version: "psychologist-meditation-v1"; status: string;
  motifId: string | null; symbolId?: string | null; script: string | null;
  sceneId?: string; metaphorId?: string | null; storyArcId?: string;
  sessionNumber?: number; sessionObjective?: string;
  storySelection?: {scene:string;metaphor:string;arc:string};
  voiceSegments?: Array<{id:string;text:string;estimatedPauseAfterMs:number;timingApproximate:true}>;
  requiresTtsTimingVerification?: true;
  title?: string; language?: PsychologistLocale;
  intentionCode?: string; plannedDurationSeconds: number;
  segments: PsychologyMeditationSegment[];
  audioAssetId: null; videoAssetId: null; rendered: false;
  published: false; requiresEditorialReview: true;
  noSymbolInterpretation?: true; diagnosis?: null;
};
export type PsychologyCourseOptions = {
  version: "psychologist-mind-v1"; status: string;
  formats: Array<{id:string;title:string;teachingModel:string;eligibleFoci:PsychologistFocus[]}>;
  modelUsed: false; saved: false;
};
export type PsychologyMotifLibrary = {
  version: "psychologist-mind-v1";status:string;
  motifCount:number;symbolCount:number;
  motifs:Array<{id:string;title:string;tier:string;selfGuided:boolean;clinicalReviewRequired:boolean}>;
  noFixedInterpretations:true;modelUsed:false;saved:false;
};
export type PsychologyMeditationSeries = {
  version: "psychologist-meditation-series-v1";
  status: string; scripts: PsychologyMeditationDraft[];
  published: false; rendered: false; saved: false;
  requiresHumanContentReview: true;
  requiresFreshSafetyCheckBeforeEachSession: true;
  sessionCount: number; uniqueSceneCount?: number; uniqueMetaphorCount?: number;
  language?: PsychologistLocale; courseRecipeId?: string | null;
};
export type PsychologyStoryCatalog = {
  version: "meditation-story-architect-v2";
  status?: string; locale: PsychologistLocale;
  scenes: Array<{id:string;title:string;selfGuided:boolean;clinicalReviewRequired:boolean}>;
  metaphors: Array<{id:string;title:string;selfGuided:boolean;clinicalReviewRequired:boolean}>;
  arcs: Array<{id:string;title:string;selfGuided:true}>;
  selfGuidedOnly: boolean; clinicalReferencesVisible?: boolean;
  generatedMedia: false; requiresImageryConsent?: true;
};
export function consultPsychologistMind(
  input?: (PsychologyDialogueInput & {task:"dialogue"}) |
    (PsychologyInput & {task?:"program"|"video_course"|"course_options"|"meditation"|"meditation_series"|"story_library"|"kip_library"|"symbol_explore"}) |
    {task: string}
): PsychologyProgram | PsychologyDialogueTurn | PsychologyVideoCourseDraft |
   PsychologyMeditationDraft | PsychologyMeditationSeries | PsychologyStoryCatalog |
   PsychologyCourseOptions | PsychologyMotifLibrary | {
  version: "psychologist-mind-v1"; status: string;
  modelUsed: false; saved: false;
};
