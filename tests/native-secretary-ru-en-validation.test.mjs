import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {makeRuEnFolds,scoreRuEnPredictions} from '../scripts/evaluate-native-ru-en-internal.mjs';
import {buildTrainingSet} from '../scripts/train-native-ru-en-offline.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../data/holistic-support/native-secretary-examples.mjs';
import {evaluatePublishedRuEn,parsePublishedArgs,loadCommittedSecretary} from '../scripts/evaluate-native-ru-en-published.mjs';
import {createComparableFolds} from '../scripts/compare-native-ru-en-datasets.mjs';
import {researchOpenSetAccepts} from '../scripts/evaluate-native-ru-en-open-set.mjs';
import {validateChallenge} from '../scripts/evaluate-native-ru-en-challenge.mjs';

test('internal folds hold out every original example once and never train on it',()=>{
 const folds=makeRuEnFolds();assert.equal(folds.length,3);
 const held=new Set();let count=0;
 for(const {training,validation} of folds){
  const train=new Set(Object.values(training).flatMap(v=>[...v.ru,...v.en]).map(normalizeNativeText));
  for(const row of validation){const key=normalizeNativeText(row.message);assert.equal(train.has(key),false);
   if(row.expected){assert.equal(held.has(key),false);held.add(key);count++;}}
 }
 assert.equal(count,479);
});
test('v3 internal folds hold out every one of the 563 examples exactly once',()=>{
 const folds=makeRuEnFolds('v3'),held=new Set();
 for(const {training,validation} of folds){
  const train=new Set(Object.values(training).flatMap(v=>[...v.ru,...v.en]).map(normalizeNativeText));
  for(const row of validation.filter(row=>row.expected!==null)){
   const key=normalizeNativeText(row.message);
   assert.equal(train.has(key),false);assert.equal(held.has(key),false);held.add(key);
  }
 }
 assert.equal(held.size,563);
});
test('extended synthetic negatives are held out and never enter training',()=>{
 const folds=makeRuEnFolds('v3',{extendedNegatives:true});
 const negative=folds.flatMap(fold=>fold.validation.filter(row=>row.expected===null));
 assert.equal(negative.length,63);
 assert.deepEqual(new Set(negative.map(row=>normalizeNativeText(row.message))).size,63);
 for(const {training} of folds){
  const train=new Set(Object.values(training).flatMap(v=>[...v.ru,...v.en]).map(normalizeNativeText));
  for(const row of negative)assert.equal(train.has(normalizeNativeText(row.message)),false);
 }
});
test('dataset comparison uses the same held-out turns without adding them to training',()=>{
 for(const fold of createComparableFolds()){
  const validation=new Set(fold.validation.map(row=>normalizeNativeText(row.message)));
  const base=new Set(Object.values(fold.baseline).flatMap(x=>[...x.ru,...x.en]).map(normalizeNativeText));
  const candidate=new Set(Object.values(fold.candidate).flatMap(x=>[...x.ru,...x.en]).map(normalizeNativeText));
  assert.equal(candidate.size-base.size,48);
  for(const key of validation){assert.equal(base.has(key),false);assert.equal(candidate.has(key),false);}
 }
});
test('open-set training examples are disjoint and the unknown class always abstains',()=>{
 const data=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-unknown-v1.json',import.meta.url)));
 assert.deepEqual(Object.keys(data).sort(),['en','ru']);
 const examples=[...data.ru,...data.en],keys=examples.map(normalizeNativeText),unique=new Set(keys);
 assert.equal(unique.size,32);
 for(const {training,validation} of makeRuEnFolds('v4',{extendedNegatives:true})){
  const other=[...validation.map(row=>row.message),...Object.values(training).flatMap(v=>[...v.ru,...v.en])];
  assert.equal(other.some(message=>unique.has(normalizeNativeText(message))),false);
 }
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const held=[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0])));
 assert.equal(held.some(message=>unique.has(normalizeNativeText(message))),false);
 assert.equal(researchOpenSetAccepts({intent:'__out_of_scope',score:.99,margin:4},.42),false);
 assert.equal(researchOpenSetAccepts({intent:'services',score:.5,margin:.5},.42),true);
 assert.equal(researchOpenSetAccepts({intent:'services',score:.5,margin:.2},.42),false);
});
test('the synthetic challenge is RU/EN-only and disjoint from training and other evaluation sets',()=>{
 const challenge=JSON.parse(readFileSync(new URL('./fixtures/native-ai-ru-en-challenge-v1.json',import.meta.url)));
 assert.equal(challenge.schema,'hh-native-ru-en-challenge-v1');assert.equal(challenge.synthetic,true);assert.equal(challenge.privateClientData,false);
 const labels=new Set(Object.keys(NATIVE_SECRETARY_EXAMPLES_V1)),training=buildTrainingSet('v4');
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const unknown=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-unknown-v1.json',import.meta.url)));
 const excluded=[...Object.values(training).flatMap(v=>[...v.ru,...v.en]),...unknown.ru,...unknown.en,
  ...makeRuEnFolds('v4',{extendedNegatives:true}).flatMap(fold=>fold.validation.filter(row=>row.expected===null).map(row=>row.message)),
  ...[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2]),
  ...gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0]))];
 const seen=new Set(excluded.map(normalizeNativeText));assert.equal(challenge.cases.length,40);
 for(const [locale,label,message] of challenge.cases){
  assert.ok(['ru','en'].includes(locale));assert.ok(label===null||labels.has(label));
  const key=normalizeNativeText(message);assert.ok(key);assert.equal(seen.has(key),false,message);seen.add(key);
 }
 assert.equal(validateChallenge(challenge,training),true);
 assert.throws(()=>validateChallenge({...challenge,privateClientData:true},training),/INVALID_CHALLENGE/);
 assert.throws(()=>validateChallenge({...challenge,cases:[...challenge.cases,['es',null,'hola']]},training),/INVALID_CHALLENGE_CASE/);
 assert.throws(()=>validateChallenge({...challenge,cases:[...challenge.cases,challenge.cases[0]]},training),/CHALLENGE_OVERLAP/);
});
test('negative validation examples are disjoint from RU/EN published evaluation',()=>{
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const held=new Set([...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0]))).map(normalizeNativeText));
 for(const fold of makeRuEnFolds('v3',{extendedNegatives:true}))for(const row of fold.validation.filter(x=>x.expected===null))
  assert.equal(held.has(normalizeNativeText(row.message)),false);
});
test('scoring counts wrong accepted labels as both false positives and false negatives',()=>{
 const result=scoreRuEnPredictions([
  {expected:'hello',intent:'thanks',accepted:true},
  {expected:'thanks',intent:'thanks',accepted:true},
  {expected:null,intent:'hello',accepted:true},
  {expected:null,intent:null,accepted:false},
 ],['hello','thanks']);
 assert.equal(result.correct,1);assert.equal(result.wrongAccepted,1);assert.equal(result.falseAccepts,1);
 assert.equal(result.recall,.5);assert.equal(result.precision,1/3);assert.equal(result.macroF1,1/3);
 assert.deepEqual(result.perClass.hello,{support:1,truePositive:0,falsePositive:1,falseNegative:1,recall:0,precision:0,f1:0});
 assert.equal(result.confusions['hello->thanks'],1);assert.equal(result.abstainedPositive,0);
});
test('validation uses the exact production classifier including abstention and rounding',()=>{
 const model=fitNativeIntent(NATIVE_SECRETARY_EXAMPLES_V1);
 for(const message of ['hello','Сколько это стоит?','unrelated quantum unicorn waffle theory',''])
  assert.deepEqual(predictNativeIntent(model,message),classifyNativeSecretaryIntent(message));
});
test('published diagnostic scores only RU/EN and rejects overlap including dialogue turns',()=>{
 const gold={classes:['hello'],cases:[
  {id:'ru-1',locale:'ru',expectedIntent:'hello',utterance:'привет'},
  {id:'en-1',locale:'en',expectedIntent:null,utterance:'weather'},
  {id:'es-1',locale:'es',expectedIntent:'hello',utterance:'hola'},
 ],dialogues:[{locale:'en',turns:[{user:'another turn'}]},{locale:'es',turns:[{user:'ignored'}]}]};
 const called=[],classify=(message,locale)=>{called.push(locale);return {intent:'hello',accepted:message==='привет'};};
 const training={hello:{ru:['добрый день'],en:['hello there']}};
 const result=evaluatePublishedRuEn({gold,training,baseline:classify,candidate:classify});
 assert.deepEqual(called,['ru','ru','en','en']);
 assert.equal(result.ru.baseline.correct,1);assert.equal(result.en.candidate.falseAccepts,0);
 assert.throws(()=>evaluatePublishedRuEn({gold,baseline:classify,candidate:classify,
  training:{hello:{ru:[],en:['another turn']}}}),/PUBLISHED_TEST_TRAIN_OVERLAP/);
 const guarded=evaluatePublishedRuEn({gold,training,baseline:classify,candidate:classify,guard:()=>false});
 assert.equal(guarded.ru.baseline.correct,1);assert.equal(guarded.ru.baselineGuarded.correct,0);
 assert.equal(guarded.ru.candidateGuarded.abstainedPositive,1);
 called.length=0;
 const ruOnly=evaluatePublishedRuEn({gold,training,baseline:classify,candidate:classify,languages:['ru']});
 assert.deepEqual(Object.keys(ruOnly),['ru']);assert.deepEqual(called,['ru','ru']);
 assert.throws(()=>evaluatePublishedRuEn({gold,training,baseline:classify,candidate:classify,languages:['es']}),/INVALID_LANGUAGE/);
});
test('published diagnostic selects only a valid reproducible dataset and balance mode',()=>{
 assert.deepEqual(parsePublishedArgs([]),{version:'v3',balancePower:0,productionCommit:null,artifactPath:null,pinPath:null,language:null});
 assert.deepEqual(parsePublishedArgs(['--dataset','v4','--balance','sqrt','--production-commit','a'.repeat(40)]),
  {version:'v4',balancePower:.5,productionCommit:'a'.repeat(40),artifactPath:null,pinPath:null,language:null});
 assert.deepEqual(parsePublishedArgs(['--artifact','/tmp/model.json','--pin','/tmp/pin.json']),
  {version:'v3',balancePower:0,productionCommit:null,artifactPath:'/tmp/model.json',pinPath:'/tmp/pin.json',language:null});
 assert.equal(parsePublishedArgs(['--language','ru']).language,'ru');
 assert.throws(()=>parsePublishedArgs(['--language','es']),/INVALID_ARGUMENTS/);
 assert.throws(()=>parsePublishedArgs(['--dataset','v5','--language','ru']),/INVALID_ARGUMENTS/);
 assert.throws(()=>parsePublishedArgs(['--dataset','v5','--language','en','--artifact','a','--pin','b']),/INVALID_ARGUMENTS/);
 assert.equal(parsePublishedArgs(['--dataset','v5','--language','ru','--artifact','a','--pin','b']).version,'v5');
 assert.throws(()=>parsePublishedArgs(['--dataset','v6','--artifact','a','--pin','b']),/INVALID_ARGUMENTS/);
 assert.equal(parsePublishedArgs(['--dataset','v6','--language','en','--artifact','a','--pin','b']).version,'v6');
 assert.throws(()=>parsePublishedArgs(['--artifact','/tmp/model.json']),/INVALID_ARGUMENTS/);
 assert.throws(()=>parsePublishedArgs(['--balance','invalid']),/INVALID_ARGUMENTS/);
 assert.throws(()=>parsePublishedArgs(['--production-commit','main']),/INVALID_ARGUMENTS/);
 assert.throws(()=>parsePublishedArgs(['--dataset','v4','--dataset','v3']),/INVALID_ARGUMENTS/);
});
test('production baseline loader rejects mutable refs and command-like inputs',async()=>{
 for(const value of ['main','HEAD','a'.repeat(39),'a'.repeat(40)+';echo x','A'.repeat(40)])
  await assert.rejects(loadCommittedSecretary(value),/INVALID_COMMIT/);
});
