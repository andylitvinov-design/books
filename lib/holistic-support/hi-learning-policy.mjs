/** Privacy-minimal, explicit-feedback-only observatory and fail-closed candidate gate. */
export const HI_LEARNING_POLICY_VERSION = 'hi-learning-observatory-v1';
export const HI_LEARNING_CHANNELS = Object.freeze(['messenger','services','my_coach','telegram']);
export const HI_LEARNING_LOCALES = Object.freeze(['ru','en','es']);
export const HI_LEARNING_SIGNALS = Object.freeze([
  'helpful','unhelpful','correction','no_advice','topic_change',
  'unresolved','order_completed','order_failed',
]);
const owned=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&Object.keys(value).every(k=>keys.includes(k));
const finiteRate=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;

/** No free-form fields, IDs, client texts, prompts, answers, secrets, or IPs. */
export function validateHiLearningFeedback(value,{trustedTelegram=false}={}){
  if(!exactKeys(value,['channel','locale','signal','consent'])||
    value.consent!==true||!HI_LEARNING_CHANNELS.includes(value.channel)||
    !HI_LEARNING_LOCALES.includes(value.locale)||
    !HI_LEARNING_SIGNALS.includes(value.signal)||
    (value.channel==='telegram'&&!trustedTelegram)||
    (value.channel!=='telegram'&&['order_completed','order_failed'].includes(value.signal)))return null;
  return {channel:value.channel,locale:value.locale,signal:value.signal};
}
/** Cohorts do not claim that a particular model generated a particular turn. */
export function observedHiLearningVersion(channel){
  const versions={
    messenger:'hi-messenger-router-mixed-v1',
    services:'hi-services-router-mixed-v1',
    my_coach:'hi-my-coach-external-model-unattributed-v1',
    telegram:'hi-telegram-business-script-v1',
  };
  return versions[channel]||null;
}
function validScore(x){
  return x&&typeof x==='object'&&finiteRate(x.macroF1)&&finiteRate(x.accuracy)&&
    Number.isSafeInteger(x.positives)&&x.positives>=30&&
    Number.isSafeInteger(x.negatives)&&x.negatives>=10&&
    Number.isSafeInteger(x.falseAccepts)&&x.falseAccepts>=0&&x.falseAccepts<=x.negatives&&
    Number.isSafeInteger(x.safetyFailures)&&x.safetyFailures>=0;
}
/** A research comparison can only nominate a candidate for protected human review. */
export function gateHiLearningCandidate({baseline,candidate}={}){
  const reasons=[];
  if(!baseline||!candidate||!exactKeys(candidate.dataPolicy,
    ['privateClientData','trainingHoldoutOverlap','humanReviewComplete','provenanceVerified'])||
    candidate.dataPolicy.privateClientData!==false||
    candidate.dataPolicy.trainingHoldoutOverlap!==false||
    candidate.dataPolicy.provenanceVerified!==true||
    candidate.dataPolicy.humanReviewComplete!==true)reasons.push('DATA_CONSENT_OR_REVIEW_NOT_PROVEN');
  if(typeof candidate?.version!=='string'||!/^hh-native-intent-(?:ru|en)-research-v[0-9]+-[a-z0-9-]+$/.test(candidate.version)||
    candidate?.deployable===true||candidate?.automaticPromotion===true)reasons.push('CANDIDATE_ARTIFACT_UNTRUSTED');
  if(candidate?.evaluation?.locked!==true||candidate?.evaluation?.independentRuEn!==true||
    candidate?.evaluation?.esRegression!==true||candidate?.evaluation?.telegramOrders!==true||
    candidate?.evaluation?.safetyPassed!==true)reasons.push('EVALUATION_COVERAGE_MISSING');
  if(!candidate?.holdoutHash||typeof candidate.holdoutHash!=='string'||
    !/^[a-f0-9]{64}$/.test(candidate.holdoutHash)||
    candidate.holdoutHash!==baseline?.holdoutHash)reasons.push('HOLDOUT_PROVENANCE_MISMATCH');
  const baseScores=baseline?.scores||{},nextScores=candidate?.scores||{};
  for(const lang of ['ru','en']){
    const b=baseScores[lang],c=nextScores[lang];
    if(!validScore(b)||!validScore(c)){
      reasons.push(lang.toUpperCase()+'_METRICS_MISSING');continue;
    }
    if(c.positives!==b.positives||c.negatives!==b.negatives||
      c.macroF1+1e-9<b.macroF1||c.accuracy+1e-9<b.accuracy||
      c.falseAccepts>b.falseAccepts||c.safetyFailures!==0){
      reasons.push(lang.toUpperCase()+'_REGRESSION');
    }
  }
  if(!validScore(baseScores.es)||!validScore(nextScores.es)||
    JSON.stringify(baseScores.es)!==JSON.stringify(nextScores.es))reasons.push('ES_REGRESSION');
  if(!reasons.length){
    const improved=['ru','en'].some(lang=>nextScores[lang].macroF1>=baseScores[lang].macroF1+0.01);
    if(!improved)reasons.push('NO_MEASURABLE_IMPROVEMENT');
  }
  return {status:reasons.length?'BLOCKED':'ELIGIBLE_FOR_PROTECTED_REVIEW',
    reasons,automaticPromotion:false,productionChanged:false};
}

/** Explicit Telegram Business chat commands; never infer consent from an order. */
export function parseHiTelegramRating(value){
  if(typeof value!=='string'||value.length>48)return null;
  const text=value.trim().toLocaleLowerCase('en').normalize('NFKC')
    .replace(/\s+/gu,' ');
  const commands={
    '/quality helpful':{locale:'en',signal:'helpful'},
    '/quality unhelpful':{locale:'en',signal:'unhelpful'},
    '/оценка полезно':{locale:'ru',signal:'helpful'},
    '/оценка не помогло':{locale:'ru',signal:'unhelpful'},
    '/calidad util':{locale:'es',signal:'helpful'},
    '/calidad no util':{locale:'es',signal:'unhelpful'},
  };
  return Object.hasOwn(commands,text)?{...commands[text]}:null;
}
