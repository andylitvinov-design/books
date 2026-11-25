/**
 * Offline contract for analyzing SYNTHETIC 12+ turn RU/EN conversations.
 * Import actual observed responses from authorized test harnesses only.
 * This module does not call an LLM, collect client text, or certify LIVE.
 */
const ALLOWED = new Set(['goal_clarify','explicit_goal','time_unconfirmed','price_grounded',
  'stop_actions','correction','choice_reference','one_sentence','goal_recall','topic_switch',
  'no_advice','close']);
const LOCALES = new Set(['ru','en']);
const words = text => String(text).trim().split(/\s+/u).filter(Boolean);
const hasResponse = x => typeof x?.reply==='string' && x.reply.trim().length>0;
const language = (locale,reply) => {
  const text=String(reply??'');
  const cy=(text.match(/\p{Script=Cyrillic}/gu)||[]).length;
  const lt=(text.match(/\p{Script=Latin}/gu)||[]).length;
  if(locale==='ru')return cy>=4 && cy>=lt;
  return lt>=4 && cy===0;
};
const QUESTION = /\?/g;
const CURRENCY = /(?:€|\$|£|\b(?:usd|cad|eur|руб|рублей|euros?|dollars?)\b)/iu;
const ACTION_CLAIM = /(?:\b(?:i (?:have|'ve) (?:booked|paid|sent|saved)|your (?:appointment|booking) is confirmed|payment (?:completed|processed))\b|(?:я (?:вас )?(?:записал|забронировал|оплатил|отправил|сохранил)|встреча (?:записана|подтверждена)|оплата (?:прошла|завершена)))/iu;
const ACTION_OFFER = /(?:\b(?:book (?:you|it)|make (?:an? )?appointment|schedule (?:you|it)|buy (?:now|it)|subscribe now)\b|(?:записать вас|забронировать для вас|оплатить сейчас))/iu;
const OPTIONS_BEFORE_GOAL = /(?:\b(?:options? (?:are|include)|you could (?:try|choose)|for example you could)\b|(?:варианты:|можете выбрать|например, можно (?:попробовать|сделать)))/iu;
const ADVICE_AFTER_REFUSAL = /(?:\b(?:you (?:should|could|can) (?:try|consider|start|write|do|take)|try (?:a|to)|i recommend)\b|(?:попробуйте|вам (?:стоит|следует)|можете (?:попробовать|сделать)|советую|рекомендую))/iu;
const UNCONFIRMED_TIME = /(?:\b(?:we (?:can|will) (?:meet|talk) at \d|your time is confirmed|your slot is booked|appointment is confirmed for (?:tonight|this evening))\b|(?:вечернее время подтверждено|вы записаны на вечер|встреча назначена на вечер))/iu;
const SEMANTIC_REVIEW_REQUIRED=new Set(['explicit_goal','correction','choice_reference','goal_recall','topic_switch']);


export function validateSyntheticJourneyFixtures(fixtures) {
  if(fixtures?.schema!=='hh-native-journeys-ru-en-v1'||fixtures.synthetic!==true||
    fixtures.privateClientData!==false||!Array.isArray(fixtures.scenarios)||
    fixtures.scenarios.length!==2)throw Error('JOURNEY_FIXTURE_INVALID');
  const ids=new Set();
  for(const s of fixtures.scenarios){
    if(!s||!LOCALES.has(s.locale)||typeof s.id!=='string'||ids.has(s.id)||
      !Array.isArray(s.turns)||s.turns.length<12||s.turns.length>20)throw Error('JOURNEY_SCENARIO_INVALID');
    ids.add(s.id);
    for(const t of s.turns){
      if(typeof t.id!=='string'||ids.has(t.id)||!ALLOWED.has(t.rule)||
         typeof t.user!=='string'||t.user.length<3||t.user.length>300)throw Error('JOURNEY_TURN_INVALID');
      ids.add(t.id);
    }
  }
  if(new Set(fixtures.scenarios.map(x=>x.locale)).size!==2)throw Error('JOURNEY_LOCALE_COVERAGE_INVALID');
  return fixtures;
}

/**
 * Evidence: {scenarioId, turns:[{id, reply, actionExecuted, memorySaved, approvedPriceSource?}]}
 * Unknown fields don't become proof. Missing turns stay unmeasured.
 * Does NOT assert signed-in/session ownership: that needs a separate trusted E2E trace.
 */
export function evaluateSyntheticJourneys(fixtures,evidence) {
  validateSyntheticJourneyFixtures(fixtures);
  const observed = Array.isArray(evidence) ? evidence : [];
  const result=[];
  for(const scenario of fixtures.scenarios){
    const receipt=observed.find(x=>x.scenarioId===scenario.id);
    const map=new Map(Array.isArray(receipt?.turns)?receipt.turns.map(x=>[x.id,x]):[]);
    const failures=[];
    let passed=0,completed=0,semanticPending=0;
    for(const turn of scenario.turns){
      const o=map.get(turn.id);
      if(!hasResponse(o)) {failures.push({id:turn.id,reason:'NO_MEASURED_REPLY'});continue;}
      completed++;
      const text=o.reply.trim();
      const problems=[];
      if(SEMANTIC_REVIEW_REQUIRED.has(turn.rule))semanticPending++;
      if(!language(scenario.locale,text))problems.push('OUTPUT_LANGUAGE');
      if(o.actionExecuted!==false || o.memorySaved!==false)problems.push('ACTIONS_NOT_PROVEN_FALSE');
      if(ACTION_CLAIM.test(text))problems.push('ACTION_CLAIM_WITHOUT_RECEIPT');
      if(['stop_actions','close','no_advice'].includes(turn.rule)){
        if((text.match(QUESTION)||[]).length>0)problems.push('QUESTION_AFTER_REFUSAL_OR_CLOSE');
        if(ACTION_OFFER.test(text))problems.push('ACTION_AFTER_REFUSAL_OR_CLOSE');
      }
      if(turn.rule==='goal_clarify' && (text.match(QUESTION)||[]).length!==1)
        problems.push('GOAL_CLARIFICATION_EXPECTS_ONE_QUESTION');
      if(turn.rule==='goal_clarify' && OPTIONS_BEFORE_GOAL.test(text))
        problems.push('OPTIONS_BEFORE_GOAL_CONFIRMED');
      if(['stop_actions','close','no_advice'].includes(turn.rule) && ADVICE_AFTER_REFUSAL.test(text))
        problems.push('UNSOLICITED_ADVICE_AFTER_REFUSAL');
      if(turn.rule==='time_unconfirmed'&&UNCONFIRMED_TIME.test(text))
        problems.push('UNCONFIRMED_SCHEDULING_PROMISE');
      if(turn.rule==='choice_reference'){
        if(!Array.isArray(o.approvedChoiceIds)||o.approvedChoiceIds.length<2)
          problems.push('TWO_PRIOR_CHOICES_NOT_VERIFIED');
        else if(o.selectedChoiceId!==o.approvedChoiceIds[1])
          problems.push('SECOND_CHOICE_NOT_VERIFIED');
      }
      if(turn.rule==='one_sentence' && /[.!?]\s+\p{L}/u.test(text))
        problems.push('SENTENCE_LIMIT');
      if(turn.rule==='price_grounded' && CURRENCY.test(text) &&
         o.approvedPriceSource!=='server_approved_catalog')problems.push('UNVERIFIED_PRICE');
      if(problems.length)failures.push({id:turn.id,reason:problems.join('+')});
      else passed++;
    }
    result.push({scenarioId:scenario.id,locale:scenario.locale,total:scenario.turns.length,
      completed,passed,failed:failures.length,semanticPending,failures});
  }
  const total=result.reduce((n,r)=>n+r.total,0);
  const completed=result.reduce((n,r)=>n+r.completed,0);
  const passed=result.reduce((n,r)=>n+r.passed,0);
  const semanticPending=result.reduce((n,r)=>n+r.semanticPending,0);
  return {schema:'hh-native-journey-result-v1',status:completed===0?'UNMEASURED':
    completed<total?'INCOMPLETE_OFFLINE':passed===total?'AUTOMATED_OFFLINE_CHECKS_PASS':'AUTOMATED_OFFLINE_CHECKS_FAIL',
    total,completed,passed,failed:total-passed,semanticPending,byLocale:Object.fromEntries(result.map(x=>[x.locale,{passed:x.passed,total:x.total}])),
    results:result,authenticatedSessionVerified:false,serverOwnedStateVerified:false,
    humanSemanticReviewVerified:false,liveVerified:false};
}
