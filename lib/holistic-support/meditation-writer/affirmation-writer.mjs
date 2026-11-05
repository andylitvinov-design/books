/**
 * Affirmation Writer Mind. Psychologist-directed, anonymous creative plan:
 * no raw client wishes, test data or medical/psychological records leave
 * this module. External models only write five revisable, short phrases.
 */
import { requestAnonymousFreeJson } from "./free-json.mjs";
import { PSYCHOLOGIST_METHODS, PSYCHOLOGIST_APPROACHES } from "../psychologist-mind.mjs";
export const AFFIRMATION_WRITER_VERSION="affirmation-writer-v1";
const ISSUES=Object.freeze({
  energy:["daily_tension","low_energy","rushing"],
  money:["fear_of_pricing","financial_uncertainty","self_doubt"],
  relationships:["fear_of_rejection","personal_boundaries","difficult_dialogue"],
  goals:["unclear_direction","procrastination","fear_of_mistakes"],
  life:["life_changes","life_uncertainty","low_joy"],
  health:["overload","low_energy","tension"],
});
const GOALS=Object.freeze({
  energy:["rhythm","recovery","strength"],
  money:["value","planning","stability"],
  relationships:["connection","boundaries","dialogue"],
  goals:["clarity","progress","meaning"],
  life:["meaning","rhythm","connection"],
  health:["recovery","rhythm","strength"],
});
const PSYCHOLOGY_BY_THEME=Object.freeze({
  energy:{focus:"stress",method:"present_orientation"},
  money:{focus:"self_worth",method:"thought_reflection"},
  relationships:{focus:"relationships",method:"boundary_rehearsal"},
  goals:{focus:"meaning",method:"values_clarification"},
  life:{focus:"meaning",method:"mindful_choice"},
  health:{focus:"stress",method:"self_compassion"},
});
const FOCI=new Set(["self_kindness","agency","small_step"]);
const TONES=new Set(["gentle","grounded","inspiring"]);
/** Psychologist Mind's eligible theme is translated into a concrete, non-clinical
 * writing strategy. No inferred cause, diagnosis or private client history. */
const STRATEGY_BY_THEME=Object.freeze({
  energy:Object.freeze([
    "acknowledge ordinary fatigue or tension without labelling a disorder",
    "offer an achievable choice of pace, pause or small restorative action",
    "never force calm, breathing exercises or required relaxation",
  ]),
  money:Object.freeze([
    "support the person's agency and realistic professional self-worth",
    "suggest one manageable planning or communication step",
    "never guarantee earnings, wealth or financial outcomes",
  ]),
  relationships:Object.freeze([
    "validate choice and interpersonal boundaries without predicting rejection",
    "frame connection and clear communication as optional achievable steps",
    "never prescribe a partner decision or imply guaranteed reconciliation",
  ]),
  goals:Object.freeze([
    "clarify values and reduce goals to one controllable first step",
    "allow uncertainty, exploration and imperfect progress",
    "avoid moral pressure, grandiose success claims or perfectionism",
  ]),
  life:Object.freeze([
    "support tolerance of uncertainty and the ability to make choices",
    "orient gently toward personally meaningful everyday actions",
    "do not assert all change is positive or promise lasting happiness",
  ]),
  health:Object.freeze([
    "support practical self-care, pacing and asking qualified people for help",
    "affirm dignity and available choices rather than symptom disappearance",
    "never claim medical recovery or replace professional care",
  ]),
});
const LOCALES=new Set(["ru","en","es"]);
const fail=code=>Object.assign(new Error(code),{code});
const BAD=/https?:\/\/|www\.|<|>|[{}]|(?:system prompt|ignore instructions|developer message|инструкци[ию]|системный промпт|prompt injection)|(?:гарантирую|гарантированно|исцел|излеч|разбогате|не болею|травма исчез|я всегда|я никогда|должен|обязан|замри|задержи дыхание)|(?:guaranteed|always|never|must|have to|cured|healed|rich forever|hold your breath|close your eyes)|(?:garantizad|siempre|nunca|debes|curaci[oó]n|cont[eé]n la respiraci[oó]n)/iu;

export function compileAnonymousAffirmationStrategy(input) {
  if(!input || typeof input!=="object" || Array.isArray(input) ||
     Object.keys(input).some(k=>!["locale","theme","problemIndex",
       "goalId","tone","focus"].includes(k)) ||
     !LOCALES.has(input.locale) || !Object.hasOwn(ISSUES,input.theme) ||
     !Number.isInteger(input.problemIndex) ||
     input.problemIndex<0 || input.problemIndex>=ISSUES[input.theme].length ||
     !GOALS[input.theme].includes(input.goalId) ||
     (input.tone!==undefined&&!TONES.has(input.tone)) ||
     (input.focus!==undefined&&!FOCI.has(input.focus)))
    throw fail("AFFIRMATION_STRATEGY_INVALID");
  const source=PSYCHOLOGY_BY_THEME[input.theme];
  const skill=PSYCHOLOGIST_METHODS[source.method];
  if(!skill?.selfGuided || PSYCHOLOGIST_APPROACHES[skill.approach]?.clinicalTreatment!==false)
    throw fail("AFFIRMATION_PSYCHOLOGY_UNAPPROVED");
  const strategy=Object.freeze({
    version:AFFIRMATION_WRITER_VERSION,locale:input.locale,
    issueCode:ISSUES[input.theme][input.problemIndex],
    themeCode:input.theme,goalCode:input.goalId,
    toneCode:input.tone||"gentle",focusCode:input.focus||"agency",
    psychologicalFocusCode:source.focus,
    approvedSkillId:source.method,approvedApproachId:skill.approach,
    psychologicalApproach:STRATEGY_BY_THEME[input.theme],
    outputCode:"five_distinct_first_person_revisable_short_phrases",
    maxCharacters:36,
  });
  return strategy;
}

export function reviewAffirmationPhrases(phrases,locale) {
  if(!LOCALES.has(locale)||!Array.isArray(phrases)||phrases.length!==5)
    return {ok:false,code:"AFFIRMATION_COUNT_INVALID"};
  const unique=new Set();
  const approved=[];
  for(const raw of phrases){
    if(typeof raw!=="string"||raw!==raw.trim()||
       /[\r\n\u0000-\u001F]/u.test(raw))return {ok:false,code:"AFFIRMATION_FORMAT_INVALID"};
    const value=raw.replace(/\s+/gu," ").trim();
    const count=Array.from(value).length;
    if(count<8||count>36||value.length>36||value.split(/\s+/u).length>9||
       BAD.test(value)||!/\p{L}/u.test(value))
      return {ok:false,code:"AFFIRMATION_CONTENT_REJECTED"};
    if(locale==="ru"&&!/[А-Яа-яЁё]/u.test(value) ||
       locale!=="ru"&&/[А-Яа-яЁё]/u.test(value))
      return {ok:false,code:"AFFIRMATION_LOCALE_MISMATCH"};
    const key=value.toLocaleLowerCase(locale);
    if(unique.has(key))return {ok:false,code:"AFFIRMATION_DUPLICATE"};
    unique.add(key);approved.push(value);
  }
  return {ok:true,phrases:Object.freeze(approved)};
}

export function createAnonymousFreeAffirmationProvider({provider,key,fetcher=fetch}={}) {
  return async function writeAffirmations({strategy},{signal}={}) {
    // Re-validate the trust boundary even if callers pass a forged strategy.
    if(!strategy || strategy.version!==AFFIRMATION_WRITER_VERSION ||
       !LOCALES.has(strategy.locale)||!Object.hasOwn(ISSUES,strategy.themeCode)||
       !ISSUES[strategy.themeCode].includes(strategy.issueCode) ||
       !GOALS[strategy.themeCode].includes(strategy.goalCode) ||
       !TONES.has(strategy.toneCode)||!FOCI.has(strategy.focusCode))
      throw fail("AFFIRMATION_STRATEGY_INVALID");
    const safe=compileAnonymousAffirmationStrategy({
      locale:strategy.locale,theme:strategy.themeCode,
      problemIndex:ISSUES[strategy.themeCode].indexOf(strategy.issueCode),
      goalId:strategy.goalCode,tone:strategy.toneCode,focus:strategy.focusCode,
    });
    const system=[
      "You are a compassionate, original, NON-CLINICAL affirmation copywriter.",
      "The creative strategy uses safe skill codes from the approved Psychologist Mind catalogue.",
      "Return ONLY JSON with exactly five phrases, no extra keys or commentary.",
      "Write in the requested language, first person, at most 36 characters each.",
      "Five different believable lines: self-kindness, choice, support, small action, hope.",
      "Respect the selected nonclinical psychological approach and skill,",
      "but do not perform an exercise or clinical intervention.",
      "Respect the goal, generic issue, tone and focus codes; do not invent client facts.",
      "Avoid certainty, magic, forced happiness, commands, diagnosis, medical advice,",
      "trauma processing, unconscious manipulation, treatment or financial promises.",
      "Never demand breathing, closed eyes or physical contact. No names or URLs.",
      "If no detail is available, write generally and do not pretend personalization.",
    ].join(" ");
    const data=await requestAnonymousFreeJson({
      provider,key,task:"affirmations",system,data:safe,
      maxOutputTokens:700,fetcher,signal,
    });
    const checked=reviewAffirmationPhrases(data.phrases,safe.locale);
    if(!checked.ok)throw fail(checked.code);
    return Object.freeze({
      status:"draft_review_required",generationMode:"llm",
      modelUsed:true,requiresEditorialReview:true,published:false,
      provider,phrases:checked.phrases,
      strategyVersion:AFFIRMATION_WRITER_VERSION,
    });
  };
}
