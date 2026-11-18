/**
 * Ali / Wave Magic: first-contact evidence gate v1.
 *
 * Pure dialogue-control policy. NOT a semantic classifier, consent grant,
 * persistence layer, catalogue, medical detector, booking/payment tool or LLM.
 * A trusted host must authenticate the actor, check safety/consent first,
 * extract explicit facts from the current message, verify catalogue/action
 * events, bind revisions/turn IDs, and persist encrypted session state.
 */
export const FIRST_CONTACT_DIRECTOR_VERSION = 'wave-first-contact-director-v1';
export const FIRST_CONTACT_STAGES = Object.freeze(['contact', 'understand', 'goal', 'match', 'act']);
const LOCALES = new Set(['ru', 'en', 'es']);
const SLOT_WEIGHTS = Object.freeze({
  contact: Object.freeze({intent:70, topic:30}),
  understand: Object.freeze({situation:50, difficulty:30, circumstances:20}),
  goal: Object.freeze({desiredOutcome:70, depthPreference:30}),
  match: Object.freeze({verifiedOptions:40, fitExplanation:20, selectedOption:40}),
  act: Object.freeze({chosenAction:40, verifiedReceipt:60}),
});
const THRESHOLDS = Object.freeze({contact:70, understand:80, goal:70, match:80, act:100});
const REQUIRED = Object.freeze({
  contact:['intent'], understand:['situation','difficulty'], goal:['desiredOutcome'],
  match:['verifiedOptions','selectedOption'], act:['chosenAction','verifiedReceipt'],
});
const CLIENT_SLOTS = new Set(['intent','topic','situation','difficulty','circumstances','desiredOutcome','depthPreference']);
const RECEIPT_STATUSES = new Set(['enquiry_sent','booked','practice_started','test_started','course_started','completed']);
const PROMPTS = {
  ru: {
    intent:['С чем вам хотелось бы разобраться в первую очередь?','Что сейчас для вас особенно важно?'],
    topic:['Какую часть ситуации вы хотели бы обсудить?'],
    situation:['Что именно происходит в этой ситуации?','Можете описать один конкретный пример?'],
    difficulty:['Что в этой ситуации для вас самое трудное?','Что беспокоит вас больше всего?'],
    circumstances:['В каких обстоятельствах это особенно проявляется?'],
    desiredOutcome:['Что вы хотели бы изменить прежде всего?','Как вы поймёте, что стало хотя бы немного лучше?'],
    depthPreference:['Вам сейчас ближе короткая поддержка или более глубокая работа?'],
    selectedOption:['Какой из двух путей вам ближе?','Хотели бы выбрать первый или второй вариант?'],
    chosenAction:['Какой следующий шаг вам сейчас подходит?'],
    cap:'Можем пойти дальше с тем, что уже понятно, или вернуться к этому позже. Как вам удобнее?',
  },
  en: {
    intent:['What would you most like help with today?','What feels most important to explore?'],
    topic:['Which part of this would you like to discuss?'],
    situation:['What is happening in this situation?','Could you share one concrete example?'],
    difficulty:['What feels hardest about it?','What concerns you most?'],
    circumstances:['When does this tend to happen?'],
    desiredOutcome:['What would you most like to change?','What would tell you that things are a little better?'],
    depthPreference:['Would brief support or deeper exploration suit you better?'],
    selectedOption:['Which of these two paths feels closer to what you need?','Would you choose the first or second option?'],
    chosenAction:['What next step would suit you?'],
    cap:'We can continue with what is already clear or return to this later. What would suit you?',
  },
  es: {
    intent:['¿Qué te gustaría explorar primero?','¿Qué es lo más importante para ti ahora?'],
    topic:['¿Qué parte de esto quieres comentar?'],
    situation:['¿Qué está pasando en esta situación?','¿Puedes contar un ejemplo concreto?'],
    difficulty:['¿Qué es lo más difícil para ti?','¿Qué es lo que más te preocupa?'],
    circumstances:['¿En qué circunstancias suele ocurrir?'],
    desiredOutcome:['¿Qué te gustaría cambiar primero?','¿Cómo notarías que las cosas mejoran un poco?'],
    depthPreference:['¿Prefieres un apoyo breve o explorar el tema con más profundidad?'],
    selectedOption:['¿Cuál de los dos caminos te resulta más adecuado?','¿Prefieres la primera o la segunda opción?'],
    chosenAction:['¿Qué siguiente paso te vendría bien?'],
    cap:'Podemos continuar con lo que ya sabemos o retomarlo más tarde. ¿Qué prefieres?',
  },
};
const norm = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ').trim();
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/.test(value);
const deepCopy = value => JSON.parse(JSON.stringify(value));
const contentful = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 400;

export function emptyFirstContactState({locale='ru',role='secretary'}={}) {
  return {
    version:FIRST_CONTACT_DIRECTOR_VERSION, revision:0,
    locale:LOCALES.has(locale)?locale:'en',
    role:role==='secretary_psychologist'?'secretary_psychologist':'secretary',
    stage:'contact', stageResults:{}, evidence:{}, questionCounts:{},
    askedQuestionIds:[], status:'active', selectedOfferId:null, actionStatus:null,
  };
}

export function assessFirstContactStage(state, stage=state?.stage) {
  if (!FIRST_CONTACT_STAGES.includes(stage)) throw Error('INVALID_FIRST_CONTACT_STAGE');
  const evidence = state?.evidence || {};
  const weights = SLOT_WEIGHTS[stage];
  const quality = slot => {
    const row = evidence[slot];
    if (slot==='verifiedOptions') return Array.isArray(row) && row.length===2 && row.every(validId) && row[0]!==row[1] ? 1 : 0;
    if (slot==='fitExplanation') return row===true?1:0;
    if (slot==='selectedOption') return validId(row) && Array.isArray(evidence.verifiedOptions) && evidence.verifiedOptions.includes(row)?1:0;
    if (slot==='chosenAction') return validId(row)?1:0;
    if (slot==='verifiedReceipt') return row && typeof row==='object' && validId(row.id) && RECEIPT_STATUSES.has(row.status)?1:0;
    return row && typeof row==='object' && contentful(row.value) && Number.isFinite(row.quality)
      ? Math.max(0,Math.min(1,row.quality)):0;
  };
  const score = Math.round(Object.entries(weights).reduce((sum,[slot,w])=>sum+w*quality(slot),0));
  const missing = Object.keys(weights).filter(slot=>quality(slot)<1);
  const requiredMissing = REQUIRED[stage].filter(slot=>quality(slot)<1);
  return {
    stage,score,threshold:THRESHOLDS[stage],requiredMissing,missing,
    ready:score>=THRESHOLDS[stage] && requiredMissing.length===0,
  };
}
function selectQuestion(state,assess) {
  const locale = LOCALES.has(state.locale)?state.locale:'en';
  const wanted = assess.requiredMissing.length?assess.requiredMissing:assess.missing;
  const possible = wanted.filter(slot=>CLIENT_SLOTS.has(slot)||slot==='selectedOption'||slot==='chosenAction')
    .sort((a,b)=>(SLOT_WEIGHTS[state.stage][b]||0)-(SLOT_WEIGHTS[state.stage][a]||0));
  if (state.stage==='match' && !Array.isArray(state.evidence.verifiedOptions)) return null;
  if (state.stage==='act' && state.evidence.chosenAction) return null;
  const asked = new Set(state.askedQuestionIds);
  for (const slot of possible) {
    const variants = PROMPTS[locale][slot] || [];
    const index = variants.findIndex((_,i)=>!asked.has(slot+':'+i));
    if(index<0)continue;
    const questionId=slot+':'+index;
    state.askedQuestionIds.push(questionId);
    state.questionCounts[state.stage]=(state.questionCounts[state.stage]||0)+1;
    return {questionId,question:variants[index]};
  }
  return null;
}
function applyClientEvidence(state,message,turnId,items=[]) {
  if (!Array.isArray(items) || items.length>12 || !validId(turnId) || typeof message!=='string') return;
  const haystack = norm(message);
  for (const item of items) {
    if (!item || !CLIENT_SLOTS.has(item.slot) || !contentful(item.value) ||
        !contentful(item.quote) || !haystack.includes(norm(item.quote))) continue;
    const quality = item.quality===undefined?1:Number(item.quality);
    if (!Number.isFinite(quality) || quality<0 || quality>1) continue;
    state.evidence[item.slot]={value:item.value.trim(),quality,sourceTurnId:turnId};
  }
}
function applyHostEvidence(state,host={}) {
  // NEVER supply host data from browser/Telegram input. Only the authorized
  // catalogue / CRM adapter can attest to these facts.
  if (!host || typeof host!=='object')return;
  if (Array.isArray(host.verifiedOfferIds) && host.verifiedOfferIds.length===2 &&
      host.verifiedOfferIds.every(validId) && host.verifiedOfferIds[0]!==host.verifiedOfferIds[1]) {
    state.evidence.verifiedOptions=[...host.verifiedOfferIds];
    state.evidence.fitExplanation=false;
    delete state.evidence.selectedOption;
  }
  if (host.fitExplained===true && Array.isArray(state.evidence.verifiedOptions))
    state.evidence.fitExplanation=true;
  if (validId(host.selectedOfferId) && state.evidence.verifiedOptions?.includes(host.selectedOfferId)) {
    state.selectedOfferId=host.selectedOfferId;
    state.evidence.selectedOption=host.selectedOfferId;
    state.evidence.chosenAction=host.selectedOfferId;
  }
  if (validId(host.directVerifiedServiceId) && host.explicitDirectAction===true) {
    state.selectedOfferId=host.directVerifiedServiceId;
    state.evidence.chosenAction=host.directVerifiedServiceId;
    state.stage='act';
    for (const s of FIRST_CONTACT_STAGES.slice(0,4)) state.stageResults[s]={status:'skipped_direct_action'};
  }
  if (host.receipt && validId(host.receipt.id) && RECEIPT_STATUSES.has(host.receipt.status) &&
      state.evidence.chosenAction) {
    state.evidence.verifiedReceipt={id:host.receipt.id,status:host.receipt.status};
    state.actionStatus=host.receipt.status;
  }
}
/**
 * The caller supplies ONLY server-validated events: utterance, turnId,
 * extracted explicit evidence (quote must occur in utterance) and trusted
 * host actions. The caller must atomically persist returned state with a
 * revision/turn-id guard; this pure function is not that guard.
 */
export function advanceFirstContact(state,event={}) {
  if (state?.version!==FIRST_CONTACT_DIRECTOR_VERSION || !FIRST_CONTACT_STAGES.includes(state.stage))
    throw Error('INVALID_FIRST_CONTACT_STATE');
  if (typeof event?.utterance!=='string' || !validId(event.turnId))
    throw Error('INVALID_FIRST_CONTACT_EVENT');
  const next=deepCopy(state);
  next.revision++;
  if (LOCALES.has(event.locale))next.locale=event.locale;
  if (event.boundary==='stop'||event.boundary==='pause'||event.boundary==='no_advice') {
    next.status='paused';
    return {state:next,move:'pause',assessment:assessFirstContactStage(next),question:null};
  }
  if (event.topicChanged===true) {
    next.stage='contact';next.stageResults={};next.evidence={};next.questionCounts={};
    next.askedQuestionIds=[];next.selectedOfferId=null;next.actionStatus=null;
  }
  if (event.skipCurrentStage===true && next.stage!=='act') {
    const skipped=next.stage;
    next.stageResults[skipped]={status:'skipped_by_client',score:assessFirstContactStage(next).score};
    next.stage=FIRST_CONTACT_STAGES[FIRST_CONTACT_STAGES.indexOf(skipped)+1];
  }
  applyClientEvidence(next,event.utterance,event.turnId,event.clientEvidence);
  applyHostEvidence(next,event.host);
  next.status='active';
  let changes=0;
  while(changes<5) {
    const check=assessFirstContactStage(next);
    if (!check.ready)break;
    next.stageResults[next.stage]={status:'completed',score:check.score};
    if(next.stage==='act') {
      next.status='completed';
      return {state:next,move:'completed',assessment:check,question:null};
    }
    next.stage=FIRST_CONTACT_STAGES[FIRST_CONTACT_STAGES.indexOf(next.stage)+1];
    changes++;
  }
  const assessment=assessFirstContactStage(next);
  if(next.stage==='match' && !Array.isArray(next.evidence.verifiedOptions))
    return {state:next,move:'await_verified_catalogue',assessment,question:null};
  if(next.stage==='act' && next.evidence.chosenAction)
    return {state:next,move:'await_authorized_action',assessment,question:null};
  const limit=next.role==='secretary_psychologist'?3:2;
  if((next.questionCounts[next.stage]||0)>=limit) {
    next.status='needs_client_choice';
    return {state:next,move:'offer_skip_or_pause',assessment,question:PROMPTS[next.locale].cap};
  }
  const q=selectQuestion(next,assessment);
  if(!q) return {state:next,move:'needs_clarification',assessment,question:null};
  return {state:next,move:'ask_one_question',assessment,question:q.question,questionId:q.questionId};
}
