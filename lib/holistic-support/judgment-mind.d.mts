/** Judgment Mind v1.1 pure, non-clinical conversational contract. */
export type JudgmentLocale="ru"|"en"|"es";
export type JudgmentSituation="overload"|"starting"|"conflict"|"loneliness"|"self_criticism"|"uncertainty"|"fatigue"|"stress";
export type JudgmentEvidenceTier="E0"|"E1"|"E2"|"E3";
export type JudgmentState="abstained"|"awaiting_choice"|"step_offered"|"feedback_received"|"paused"|"safety_handoff"|"reframed"|"emotion_acknowledged";
export type JudgmentChoiceId="a"|"b"|"helpful"|"not_helpful";
export interface JudgmentChoice {id:JudgmentChoiceId;label:string}
export interface JudgmentPending {stage:"awaiting_choice"|"feedback";situationCode:JudgmentSituation;choiceId?:"a"|"b"}
export interface JudgmentTurn {
  schemaVersion:"hh-judgment-mind-v1.1";
  status:"handled"|"abstain"|"handoff";
  state:JudgmentState;
  situationCode:JudgmentSituation|null;
  evidenceTier:JudgmentEvidenceTier;
  hypotheses:string[];
  uncertainty:string;
  turnId:string|null;
  conversationRevision:number|null;
  expiresInSeconds:number;
  choices:JudgmentChoice[];
  needsChoice:boolean;
  actionExecuted:false;
  clinicalConclusion:false;
  memorySaved:false;
  reply:string;
  pending:JudgmentPending|null;
}
export interface JudgmentTurnInput {
  message?:string;
  locale?:JudgmentLocale;
  safety?:{status?:string};
  pending?:JudgmentPending|null;
  choiceId?:JudgmentChoiceId|null;
  history?:Array<{role:"user"|"assistant";text:string}>;
}
export declare const JUDGMENT_MIND_VERSION:"hh-judgment-mind-v1.1";
export declare const PILOT_SITUATION_CODES:readonly JudgmentSituation[];
export declare function judgmentSituationCatalog():Array<{code:JudgmentSituation;active:true;clinical:false}>;
export declare function planJudgmentTurn(options?:JudgmentTurnInput):JudgmentTurn;
export declare function continueJudgmentTurn(options?:JudgmentTurnInput):JudgmentTurn;
