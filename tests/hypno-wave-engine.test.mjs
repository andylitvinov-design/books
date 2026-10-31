import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaveNarrativeDraft, interpretWaveNotes, WAVE_ENGINE_VERSION } from '../lib/mandala/hypno-wave-engine.mjs';

const common = { theme:'relationships',problemIndex:0,goalId:'dialogue',tone:'gentle',kind:'support',focus:'support',length:'medium',round:0,
  fallbackStrategy:'Selected-category strategy',fallbackPhrases:['Ready A','Ready B','Ready C','Ready D','Ready E'] };
const request = (locale,currentText,goalText,overrides={})=>buildWaveNarrativeDraft({...common,locale,currentText,goalText,...overrides});

test('Wave v2 understands distinct now/goal narratives despite identical selected chips',()=>{
  const speaking=request('ru','Боюсь выступать на совещаниях, меня оценивают','Хочу спокойно выражать мысли');
  const boundaries=request('ru','После встреч выгораю и не хочу контактов','Хочу беречь силы и говорить нет');
  assert.equal(speaking.status,'personalized');
  assert.equal(boundaries.status,'personalized');
  assert.ok(speaking.goalConcepts.includes('voice'));
  assert.ok(boundaries.goalConcepts.includes('boundaries'));
  assert.ok(boundaries.goalConcepts.includes('rest'));
  assert.ok(!boundaries.goalConcepts.includes('voice'));
  assert.notEqual(speaking.strategy,boundaries.strategy);
  assert.notDeepEqual(speaking.phrases,boundaries.phrases);
  assert.ok(speaking.phrases.some(s=>/голос|говор|мысл/iu.test(s)));
  assert.ok(boundaries.phrases.some(s=>/границ|нет|сил|отдых/iu.test(s)));
});

test('Wave uses goal note, not just current note',()=>{
  const now='Я устаю после встреч и чувствую напряжение';
  const talk=request('ru',now,'Хочу свободнее выражать свои мысли');
  const rest=request('ru',now,'Хочу отдыхать и беречь силы');
  assert.ok(talk.goalConcepts.includes('voice'));
  assert.ok(rest.goalConcepts.includes('rest'));
  assert.notDeepEqual(talk.phrases,rest.phrases);
});

test('Wave recognizes goals in RU EN ES and stays within existing canvas text bounds',()=>{
  const pairs={
    ru:['Я боюсь критики','Хочу увереннее говорить'],
    en:['I am afraid of being judged','I want to speak with confidence'],
    es:['Me da miedo la crítica','Quiero hablar con confianza'],
  };
  for(const [locale,[currentText,goalText]] of Object.entries(pairs)){
    const draft=request(locale,currentText,goalText);
    assert.equal(draft.status,'personalized',locale);
    assert.ok(draft.goalConcepts.includes('voice'),locale);
    assert.equal(draft.phrases.length,5,locale);
    assert.equal(new Set(draft.phrases).size,5,locale);
    assert.ok(draft.phrases.every(text=>[...text].length<=36),locale);
    assert.ok(draft.strategy.length>50,locale);
  }
});

test('Negation does not turn a wish to avoid presenting into confident speaking advice',()=>{
  const a=request('ru','Я устаю','Не хочу выступать, хочу отдыхать');
  assert.ok(!a.goalConcepts.includes('voice'));
  assert.ok(a.goalConcepts.includes('rest'));
  const b=request('en','I am overloaded','I do not want to speak, I want to rest');
  assert.ok(!b.goalConcepts.includes('voice'));
  assert.ok(b.goalConcepts.includes('rest'));
});

test('Safety handoff takes precedence and provides no normal phrases',()=>{
  for(const [locale,currentText] of [['ru','Я хочу умереть'],['en','I want to die'],['es','Quiero morir']]){
    const draft=request(locale,currentText,'Хочу спокойно жить');
    assert.equal(draft.status,'safety_handoff');
    assert.deepEqual(draft.phrases,[]);
    assert.ok(draft.strategy.length>30);
  }
});

test('Opaque free-text is not echoed as a falsely personalized insight',()=>{
  const marker='PRIVATE_9374_PERSONAL';
  const draft=request('ru',marker,'хочу вспомнить '+marker);
  assert.equal(draft.status,'category_only');
  assert.equal(draft.strategy,common.fallbackStrategy);
  assert.deepEqual(draft.phrases,common.fallbackPhrases);
  assert.ok(!JSON.stringify(draft).includes(marker));
});

test('Round regeneration yields new text, while selected goal remains stable',()=>{
  const a=request('ru','Боюсь оценки','Хочу выражать свои мысли',{round:0});
  const b=request('ru','Боюсь оценки','Хочу выражать свои мысли',{round:1});
  assert.deepEqual(a.goalConcepts,b.goalConcepts);
  assert.ok(b.phrases.some(x=>!a.phrases.includes(x)));
});

test('Short filter obeys 26-character limit without silently truncating phrases',()=>{
  for(const locale of ['ru','en','es']){
    const a=request(locale,'I feel stressed','Quiero descansar',{length:'short'});
    assert.ok(a.phrases.every(x=>[...x].length<=26));
    assert.ok(a.phrases.length>=3);
  }
});

test('Wave results contain no raw client narrative or identifying fields',()=>{
  const value='My name is Alex 5588 and I am afraid of judgment';
  const out=request('en',value,'I want to speak confidently');
  assert.ok(!JSON.stringify(out).includes('Alex'));
  assert.ok(!JSON.stringify(out).includes('5588'));
  assert.equal(out.engineVersion,WAVE_ENGINE_VERSION);
});

test('Intent extraction is pure and deterministic',()=>{
  const input={locale:'ru',currentText:'Боюсь выступать',goalText:'Хочу говорить свободнее'};
  assert.deepEqual(interpretWaveNotes(input),interpretWaveNotes(input));
  assert.equal(interpretWaveNotes({locale:'ru'}).status,'category_only');
});


test('Reduced speaking is treated as a boundary, not encouragement to perform',()=>{
  for(const [locale,goalText] of [['ru','Хочу меньше говорить на встречах'],['en','I want to speak less'],['es','Quiero hablar menos']]){
    const draft=request(locale,'I feel tired',goalText);
    assert.ok(draft.goalConcepts.includes('boundaries'),locale);
    assert.ok(!draft.goalConcepts.includes('voice'),locale);
  }
});

test('Generic day planning is not treated as financial planning',()=>{
  const result=request('ru','Я постоянно спешу','Хочу планировать свой день');
  assert.ok(result.goalConcepts.includes('steps'));
  assert.ok(!result.goalConcepts.includes('planning'));
});

test('Negated fear is not misclassified as present fear',()=>{
  const result=interpretWaveNotes({locale:'ru',currentText:'Я не боюсь критики',goalText:'Хочу говорить уверенно'});
  assert.ok(!result.currentKeys.includes('fear'));
  assert.ok(result.goalKeys.includes('voice'));
});