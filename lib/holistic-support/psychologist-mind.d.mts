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
export function consultPsychologistMind(
  input?: (PsychologyDialogueInput & {task?: "dialogue"}) |
    (PsychologyInput & {task?: "program"}) |
    {task: string}
): PsychologyProgram | PsychologyDialogueTurn | {
  version: "psychologist-mind-v1"; status: "unsupported_task";
  modelUsed: false; saved: false;
};
