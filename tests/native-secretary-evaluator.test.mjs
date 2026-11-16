import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {readGoldFile,validateNativeGoldSet,evaluateNativeGoldCases,evaluateNativeDialogues}
  from '../scripts/evaluate-native-secretary-gold.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
import {nativeSecretaryTurn} from '../lib/holistic-support/native-secretary.mjs';
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../data/holistic-support/native-secretary-examples.mjs';
const {gold,sha256}=readGoldFile();
test('locked original synthetic RU EN ES gold is diverse and isolated from authored training phrases',()=>{
  const training=Object.values(NATIVE_SECRETARY_EXAMPLES_V1).flatMap(x=>Object.values(x).flat());
  const s=validateNativeGoldSet(gold,{trainingPhrases:training});
  assert.equal(s.cases,183);assert.equal(s.dialogues,12);
  assert.equal(gold.cases.filter(x=>x.kind==='intent').length,135);
  assert.equal(gold.cases.filter(x=>x.kind==='abstain').length,48);
  assert.deepEqual(['ru','en','es'].map(l=>gold.cases.filter(x=>x.locale===l).length),[61,61,61]);
  assert.match(sha256,/^[0-9a-f]{64}$/);
  assert.ok(s.groups>=55);
});
test('corrupt, duplicated, or training-overlapping benchmarks fail closed',()=>{
  assert.throws(()=>validateNativeGoldSet({...gold,locked:false}),/NATIVE_GOLD_SCHEMA_INVALID/);
  assert.throws(()=>validateNativeGoldSet({...gold,cases:[...gold.cases,gold.cases[0]]}),/NATIVE_GOLD_CASE_INVALID/);
  const changed=structuredClone(gold);changed.cases[0].expectedIntent='invented_label';
  assert.throws(()=>validateNativeGoldSet(changed),/NATIVE_GOLD_CASE_INVALID/);
  assert.throws(()=>validateNativeGoldSet(gold,{trainingPhrases:[gold.cases[0].utterance]}),/NATIVE_GOLD_DUPLICATE_OR_TRAIN_LEAK/);
});
test('metric functions do not confuse abstention, wrong accepted intent and out-of-domain false acceptance',()=>{
  const byMessage=new Map(gold.cases.map(x=>[x.utterance,x]));
  const perfect=evaluateNativeGoldCases(gold,text=>{
    const g=byMessage.get(text);
    return g.kind==='intent'?{accepted:true,intent:g.expectedIntent}:{accepted:false,intent:null};
  });
  assert.equal(perfect.overall.correct,183);
  assert.equal(perfect.overall.recall,1);
  assert.equal(perfect.overall.falseAcceptRate,0);
  assert.equal(perfect.perLanguage.es.macroF1,1);
  assert.equal(perfect.failures.length,0);
  const neverAbstain=evaluateNativeGoldCases(gold,()=>({accepted:true,intent:'hello'}));
  assert.equal(neverAbstain.overall.falseAcceptRate,1);
  assert.ok(neverAbstain.overall.acceptedPrecision<.1);
  assert.equal(neverAbstain.failures.length,174);
});
test('twelve dialogues cover time, refusal, correction, follow-up price in each language',()=>{
  const answers=new Map([
    ['Лучше вечером','Понял, вам удобнее вечером.'],
    ['Не записывай меня, просто поговорим','Конечно, можем просто поговорить.'],
    ['Нет, не коучинг, а консультация','Понял, нужна консультация.'],
    ['А сколько стоит?','Стоимость указана в карточке.'],
    ['In the evening would be best','Evening works for you.'],
    ['No, do not book it, I only want to talk','We can simply talk.'],
    ['Not a course, I mean a personal consultation','A personal consultation, understood.'],
    ['How much is it?','The price is on the listing.'],
    ['Prefiero por la tarde','Entendido, por la tarde.'],
    ['No reserves nada, solo quiero charlar','Claro, podemos charlar.'],
    ['No un curso, sino una consulta','Entiendo, una consulta.'],
    ['¿Y cuánto cuesta?','El precio figura en la ficha.']
  ]);
  const result=evaluateNativeDialogues(gold,({message})=>({reply:answers.get(message)||'Understood.'}));
  assert.equal(result.total,12);assert.equal(result.passed,12);assert.equal(result.rate,1);
  assert.equal(evaluateNativeDialogues(gold,()=>null).passed,0);
});
test('offline runner never accesses external AI or records client data',()=>{
  const source=readFileSync(new URL('../scripts/evaluate-native-secretary-gold.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|axios|XMLHttpRequest|child_process|https:\/\/api|supabase.*insert/iu);
  assert.ok(gold.cases.every(x=>!('personId' in x)&&!('email' in x)));
});
test('first-party baseline is observable without falsely passing future quality gates',()=>{
  const cls=evaluateNativeGoldCases(gold,classifyNativeSecretaryIntent);
  const turns=evaluateNativeDialogues(gold,nativeSecretaryTurn);
  assert.equal(cls.overall.total,183);assert.equal(turns.total,12);
  console.log('NATIVE_GOLD_BASELINE_V1 '+JSON.stringify({
    datasetHash:sha256,
    macroF1:Object.fromEntries(Object.entries(cls.perLanguage).map(([k,v])=>[k,v.macroF1])),
    recall:Object.fromEntries(Object.entries(cls.perLanguage).map(([k,v])=>[k,v.recall])),
    falseAcceptRate:Object.fromEntries(Object.entries(cls.perLanguage).map(([k,v])=>[k,v.falseAcceptRate])),
    contextualSuccess:turns.passed+'/'+turns.total
  }));
});
