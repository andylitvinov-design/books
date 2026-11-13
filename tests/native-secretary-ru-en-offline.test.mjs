import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../data/holistic-support/native-secretary-examples.mjs';
import {buildTrainingSet,trainRuEnArtifact,assertTrainingDisjointFromPublished,assertAddedTrainingDistantFromPublished} from '../scripts/train-native-ru-en-offline.mjs';

test('training rejects published RU/EN cases and dialogue turns before fitting',()=>{
 const training={hello:{ru:['Здравствуйте!'],en:['Hello there']}};
 const gold={P:[['en','hello','different'],['ru','hello','привет']],N:[['ru','other','что-то другое'],['en','other','unrelated']],D:[['en','task','criterion',[['Another turn','hello']]],['ru','task','criterion',[['другая реплика','hello']]]]};
 assert.equal(assertTrainingDisjointFromPublished(training,gold),true);
 for(const holdout of [
  {...gold,P:[['en','hello','HELLO THERE!'],gold.P[1]]},
  {...gold,N:[['ru','other','Здравствуйте'],gold.N[1]]},
  {...gold,D:[['en','task','criterion',[['Hello there.','hello']]],gold.D[1]]},
 ])assert.throws(()=>assertTrainingDisjointFromPublished(training,holdout),/PUBLISHED_TEST_TRAIN_OVERLAP/);
 assert.throws(()=>assertTrainingDisjointFromPublished(training,{P:[],N:[],D:[]}),/PUBLISHED_HOLDOUT_INVALID/);
});
test('new lexical near-duplicates are rejected while the original corpus remains intact',()=>{
 const phrase='Please show the current learning programs';
 const training={courses:{ru:['Здравствуйте'],en:[phrase]}};
 const gold={P:[['en','courses','Please show the current learning programs here'],['ru','hello','привет']],
  N:[['ru','other','что-то другое'],['en','other','unrelated']],
  D:[['en','task','criterion',[['Another turn','hello']]],['ru','task','criterion',[['другая реплика','hello']]]]};
 assert.throws(()=>assertAddedTrainingDistantFromPublished(training,gold,{}),/PUBLISHED_TEST_TRAIN_NEAR_DUPLICATE/);
 assert.equal(assertAddedTrainingDistantFromPublished(training,gold,training),true);
});
test('v5 adds only RU research examples and requires the RU feature profile',()=>{
 const v4=buildTrainingSet('v4'),v5=buildTrainingSet('v5');
 const total=language=>Object.values(v5).reduce((n,v)=>n+v[language].length,0);
 assert.equal(total('ru'),314);assert.equal(total('en'),314);
 for(const label of Object.keys(v4))assert.deepEqual(v5[label].en,v4[label].en);
 assert.throws(()=>trainRuEnArtifact(null,'v5',{characterWeight:2}),/INVALID_FEATURE_PROFILE/);
 assert.throws(()=>trainRuEnArtifact('ru','v5'),/INVALID_FEATURE_PROFILE/);
 const ru=trainRuEnArtifact('ru','v5',{balancePower:.5,characterWeight:2});
 assert.equal(ru.sampleCount,314);assert.deepEqual(ru.languages,['ru']);
 assert.match(ru.modelVersion,/research-v5-balanced-sqrt-ru-char2-v1$/);
});
test('v6 adds only EN research examples and retains language-scoped profiles',()=>{
 const v5=buildTrainingSet('v5'),v6=buildTrainingSet('v6');
 const total=language=>Object.values(v6).reduce((n,v)=>n+v[language].length,0);
 assert.equal(total('ru'),314);assert.equal(total('en'),322);
 for(const label of Object.keys(v5))assert.deepEqual(v6[label].ru,v5[label].ru);
 assert.throws(()=>trainRuEnArtifact(null,'v6'),/INVALID_FEATURE_PROFILE/);
 assert.throws(()=>trainRuEnArtifact('ru','v6'),/INVALID_FEATURE_PROFILE/);
 const en=trainRuEnArtifact('en','v6',{balancePower:.5});
 assert.equal(en.sampleCount,322);assert.deepEqual(en.languages,['en']);assert.equal(en.featureProfile,'base-v1');
});
test('v7 removes reviewed near duplicates from added EN data while preserving original examples',()=>{
 const v6=buildTrainingSet('v6'),v7=buildTrainingSet('v7');
 const excluded=['where can i browse the learning programs','Who is responding in this window'].map(normalizeNativeText);
 const before=Object.values(v6).flatMap(v=>v.en).map(normalizeNativeText);
 const after=Object.values(v7).flatMap(v=>v.en).map(normalizeNativeText);
 assert.equal(before.length,322);assert.equal(after.length,320);
 for(const value of excluded){assert.ok(before.includes(value));assert.ok(!after.includes(value));}
 for(const [label,locales] of Object.entries(NATIVE_SECRETARY_EXAMPLES_V1)){
  for(const locale of ['ru','en'])for(const phrase of locales[locale])assert.ok(v7[label][locale].includes(phrase));
 }
 assert.throws(()=>trainRuEnArtifact(null,'v7'),/INVALID_FEATURE_PROFILE/);
});
test('v8 adds only EN conversational examples and keeps the original RU data',()=>{
 const v7=buildTrainingSet('v7'),v8=buildTrainingSet('v8');
 assert.equal(Object.values(v8).reduce((n,v)=>n+v.en.length,0),368);
 assert.equal(Object.values(v8).reduce((n,v)=>n+v.ru.length,0),314);
 for(const label of Object.keys(v7))assert.deepEqual(v8[label].ru,v7[label].ru);
 assert.throws(()=>trainRuEnArtifact(null,'v8'),/INVALID_FEATURE_PROFILE/);
 assert.throws(()=>trainRuEnArtifact('ru','v8'),/INVALID_FEATURE_PROFILE/);
});
test('v9 adds only RU conversational examples and preserves EN data',()=>{
 const v8=buildTrainingSet('v8'),v9=buildTrainingSet('v9');
 assert.equal(Object.values(v9).reduce((n,v)=>n+v.ru.length,0),343);
 assert.equal(Object.values(v9).reduce((n,v)=>n+v.en.length,0),368);
 for(const label of Object.keys(v8))assert.deepEqual(v9[label].en,v8[label].en);
 assert.throws(()=>trainRuEnArtifact(null,'v9'),/INVALID_FEATURE_PROFILE/);
});

test('development challenge messages remain outside every versioned training set',()=>{
 const open=JSON.parse(readFileSync(new URL('./fixtures/native-ai-ru-en-open-challenge-v2.json',import.meta.url)));
 const challenge=JSON.parse(readFileSync(new URL('./fixtures/native-ai-ru-en-challenge-v1.json',import.meta.url)));
 assert.equal(open.synthetic,true);assert.equal(open.privateClientData,false);
 assert.equal(challenge.synthetic,true);assert.equal(challenge.privateClientData,false);
 const held=[...['ru','en'].flatMap(locale=>open.samples[locale].map(row=>row[1])),...challenge.cases.map(row=>row[2])];
 assert.equal(held.length,72);assert.equal(new Set(held.map(normalizeNativeText)).size,held.length);
 for(let version=1;version<=9;version++){
  const training=buildTrainingSet(`v${version}`);
  const phrases=new Set(Object.values(training).flatMap(byLocale=>[...byLocale.ru,...byLocale.en]).map(normalizeNativeText));
  for(const message of held)assert.equal(phrases.has(normalizeNativeText(message)),false,`v${version} challenge overlap`);
 }
});

test('offline candidate trains only authored RU/EN examples disjoint from published gold',()=>{
 const data=buildTrainingSet();
 const all=Object.values(data).flatMap(byLanguage=>{
  assert.deepEqual(Object.keys(byLanguage),['ru','en']);
  return [...byLanguage.ru,...byLanguage.en];
 });
 assert.equal(all.length,361);assert.equal(new Set(all.map(normalizeNativeText)).size,361);
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const heldout=[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0])));
 const training=new Set(all.map(normalizeNativeText));
 assert.equal(heldout.some(text=>training.has(normalizeNativeText(text))),false);
});
test('offline training produces reproducible, versioned first-party weights',()=>{
 const first=trainRuEnArtifact(),second=trainRuEnArtifact();
 assert.equal(first.integrity,second.integrity);assert.equal(first.datasetHash,second.datasetHash);
 assert.deepEqual(first.languages,['ru','en']);assert.equal(first.modelVersion,'hh-native-intent-ru-en-research-361-v1');
 assert.equal(first.evaluationHash,null);assert.equal(first.sampleCount,361);
});
test('language-specific offline research uses only the selected language',()=>{
 for(const [language,count] of [['ru',179],['en',182]]){
  const artifact=trainRuEnArtifact(language);
  assert.deepEqual(artifact.languages,[language]);assert.equal(artifact.sampleCount,count);
  assert.equal(artifact.modelVersion,`hh-native-intent-${language}-research-v1`);
 }
 assert.throws(()=>trainRuEnArtifact('es'),/INVALID_LANGUAGE/);
});
test('expanded RU/EN research data remain distinct from published evaluation',()=>{
 const data=buildTrainingSet('v2'),phrases=Object.values(data).flatMap(v=>[...v.ru,...v.en]);
 assert.equal(phrases.length,479);assert.equal(new Set(phrases.map(normalizeNativeText)).size,479);
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const heldout=[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0])));
 const training=new Set(phrases.map(normalizeNativeText));
 assert.equal(heldout.some(text=>training.has(normalizeNativeText(text))),false);
 const artifact=trainRuEnArtifact(null,'v2');
 assert.equal(artifact.sampleCount,479);assert.equal(artifact.modelVersion,'hh-native-intent-ru-en-research-479-v2');
});
test('focused research version stays RU/EN, unique, reproducible and disjoint from gold',()=>{
 const data=buildTrainingSet('v3'),phrases=Object.values(data).flatMap(v=>[...v.ru,...v.en]);
 assert.equal(phrases.length,563);assert.equal(new Set(phrases.map(normalizeNativeText)).size,563);
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const heldout=[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0])));
 const training=new Set(phrases.map(normalizeNativeText));
 assert.equal(heldout.some(text=>training.has(normalizeNativeText(text))),false);
 const a=trainRuEnArtifact(null,'v3'),b=trainRuEnArtifact(null,'v3');
 assert.deepEqual(a.languages,['ru','en']);assert.equal(a.sampleCount,563);
 assert.equal(a.modelVersion,'hh-native-intent-ru-en-research-563-v3');assert.equal(a.integrity,b.integrity);
});
test('v4 conversational examples remain RU/EN only and disjoint from published cases and dialogues',()=>{
 const data=buildTrainingSet('v4'),phrases=Object.values(data).flatMap(v=>[...v.ru,...v.en]);
 assert.equal(phrases.length,611);assert.equal(new Set(phrases.map(normalizeNativeText)).size,611);
 const gold=JSON.parse(readFileSync(new URL('./fixtures/native-ai-secretary-gold-v1.json',import.meta.url)));
 const held=[...gold.P,...gold.N].filter(x=>['ru','en'].includes(x[0])).map(x=>x[2])
  .concat(gold.D.filter(x=>['ru','en'].includes(x[0])).flatMap(x=>x[3].map(t=>t[0])));
 const training=new Set(phrases.map(normalizeNativeText));
 assert.equal(held.some(message=>training.has(normalizeNativeText(message))),false);
 const a=trainRuEnArtifact(null,'v4'),b=trainRuEnArtifact(null,'v4');
 assert.deepEqual(a.languages,['ru','en']);assert.equal(a.sampleCount,611);
 assert.equal(a.modelVersion,'hh-native-intent-ru-en-research-611-v4');assert.equal(a.integrity,b.integrity);
});
test('balanced research training is reproducible and does not alter the default model',()=>{
 const baseline=trainRuEnArtifact(null,'v4'),a=trainRuEnArtifact(null,'v4',{balancePower:.5}),b=trainRuEnArtifact(null,'v4',{balancePower:.5});
 assert.equal(a.modelVersion,'hh-native-intent-ru-en-research-611-v4-balanced-sqrt');
 assert.equal(a.balancePower,.5);assert.deepEqual(a.languages,['ru','en']);
 assert.equal(a.datasetHash,baseline.datasetHash);assert.equal(a.integrity,b.integrity);
 assert.notEqual(a.integrity,baseline.integrity);
 assert.throws(()=>trainRuEnArtifact(null,'v4',{balancePower:2}),/INVALID_BALANCE/);
});
test('existing production classifier preserves its predictions on the existing multilingual dataset',()=>{
 const rows=Object.values(NATIVE_SECRETARY_EXAMPLES_V1).flatMap(x=>Object.values(x).flat()).map(classifyNativeSecretaryIntent);
 assert.equal(rows.length,364);
 assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'a81f4c3748a91c15485f878e2d6949672f92a7f85a5f7a6d139ded4f2ccd138b');
});
