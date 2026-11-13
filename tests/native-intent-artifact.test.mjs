import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {trainRuEnArtifact} from '../scripts/train-native-ru-en-offline.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {loadNativeIntentArtifact,createNativeArtifactSelector} from '../lib/holistic-support/native-intent-artifact.mjs';
import {validateResearchProvenance} from '../scripts/evaluate-native-ru-en-published.mjs';
import {buildTrainingSet} from '../scripts/train-native-ru-en-offline.mjs';

const artifact=trainRuEnArtifact(null,'v4',{balancePower:.5});
const pin={integrity:artifact.integrity,modelVersion:artifact.modelVersion,featureCodeSha:artifact.featureCodeSha,predictorCodeSha:artifact.predictorCodeSha};
const model={labels:artifact.labelMap,weights:artifact.weights,bias:artifact.bias};

test('8192 research profiles are pinned, locale-scoped and fail closed on invalid dimensions',()=>{
 for(const [locale,version] of [['ru','v7'],['en','v8']]){
  const candidate=trainRuEnArtifact(locale,version,{balancePower:.5,characterWeight:2,dimensions:8192});
  assert.equal(candidate.schemaVersion,5);assert.equal(candidate.featureDimensions,8192);
  assert.deepEqual(candidate.languages,[locale]);
  const pin={integrity:candidate.integrity,modelVersion:candidate.modelVersion,featureCodeSha:candidate.featureCodeSha,predictorCodeSha:candidate.predictorCodeSha};
  const predict=loadNativeIntentArtifact(candidate,pin);
  const raw={labels:candidate.labelMap,weights:candidate.weights,bias:candidate.bias,characterWeight:2,dimensions:8192};
  assert.deepEqual(predict(locale==='ru'?'Здравствуйте':'Hello'),predictNativeIntent(raw,locale==='ru'?'Здравствуйте':'Hello'));
  const bad=structuredClone(candidate);bad.featureDimensions=4096;delete bad.integrity;
  bad.integrity=createHash('sha256').update(JSON.stringify(bad)).digest('hex');
  assert.throws(()=>loadNativeIntentArtifact(bad,{...pin,integrity:bad.integrity}),/ARTIFACT_SCHEMA/);
 }
 assert.throws(()=>trainRuEnArtifact('es','v8',{characterWeight:2,dimensions:8192}),/INVALID_LANGUAGE/);
 assert.throws(()=>trainRuEnArtifact(null,'v8',{characterWeight:2,dimensions:8192}),/INVALID_FEATURE_PROFILE/);
});

test('a pinned RU/EN artifact uses the same first-party predictor and copies its weights',()=>{
 const mutable=structuredClone(artifact),predict=loadNativeIntentArtifact(mutable,pin);
 for(const message of ['Здравствуйте','Where are the courses?','Please do not book me'])
  assert.deepEqual(predict(message),predictNativeIntent(model,message));
 const before=predict('Здравствуйте');mutable.weights[0].fill(0);mutable.bias.fill(0);
 assert.deepEqual(predict('Здравствуйте'),before);
});
test('tampering, forged integrity and unpinned versions fail closed',()=>{
 const changed=structuredClone(artifact);changed.bias[0]+=1;
 assert.throws(()=>loadNativeIntentArtifact(changed,pin),/ARTIFACT_INTEGRITY/);
 const payload=structuredClone(changed);delete payload.integrity;changed.integrity=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 assert.throws(()=>loadNativeIntentArtifact(changed,pin),/ARTIFACT_INTEGRITY/);
 assert.throws(()=>loadNativeIntentArtifact(artifact,{...pin,modelVersion:'other'}),/ARTIFACT_SCHEMA/);
 assert.throws(()=>loadNativeIntentArtifact(artifact,{...pin,featureCodeSha:'0'.repeat(64)}),/ARTIFACT_SCHEMA/);
 assert.throws(()=>loadNativeIntentArtifact(artifact,{...pin,predictorCodeSha:'0'.repeat(64)}),/ARTIFACT_SCHEMA/);
 assert.throws(()=>loadNativeIntentArtifact(artifact,{...pin,integrity:'not-a-digest'}),/ARTIFACT_PIN/);
});
test('a pinned but structurally invalid artifact is rejected',()=>{
 for(const change of [x=>x.languages.push('es'),x=>x.weights[0].pop(),x=>{x.bias[0]=1e9;},x=>{x.labelMap[0]='invented';},x=>{x.balancePower=.17;},x=>{delete x.holdoutHash;},x=>{delete x.predictorCodeSha;},x=>{x.schemaVersion=3;},x=>{x.featureProfile='ru-char2-v1';}]){
  const bad=structuredClone(artifact);change(bad);delete bad.integrity;
  bad.integrity=createHash('sha256').update(JSON.stringify(bad)).digest('hex');
  assert.throws(()=>loadNativeIntentArtifact(bad,{...pin,integrity:bad.integrity}),/ARTIFACT_SCHEMA/);
 }
});
test('RU research profile is pinned and falls back for EN and ES',()=>{
 const ru=trainRuEnArtifact('ru','v4',{balancePower:.5,characterWeight:2});
 assert.equal(ru.featureProfile,'ru-char2-v1');assert.deepEqual(ru.languages,['ru']);
 assert.match(ru.modelVersion,/-ru-char2-v1$/);
 const ruPin={integrity:ru.integrity,modelVersion:ru.modelVersion,featureCodeSha:ru.featureCodeSha,predictorCodeSha:ru.predictorCodeSha};
 const expectedVersion=ru.modelVersion;
 const expected={labels:ru.labelMap,weights:ru.weights,bias:ru.bias,characterWeight:2};
 const fallback=()=>({intent:'fallback',accepted:false});
 const selector=createNativeArtifactSelector({enabled:true,artifact:ru,pin:ruPin,fallback});
 assert.deepEqual(selector.classify('Здравствуйте','ru').prediction,predictNativeIntent(expected,'Здравствуйте'));
 ru.languages.push('en');ruPin.modelVersion='mutated';
 assert.equal(selector.classify('Здравствуйте','ru').modelVersion,expectedVersion);
 for(const locale of ['en','es'])assert.equal(selector.classify('Hello',locale).prediction.intent,'fallback');
 assert.throws(()=>trainRuEnArtifact('en','v4',{characterWeight:2}),/INVALID_FEATURE_PROFILE/);
 assert.throws(()=>trainRuEnArtifact(null,'v4',{characterWeight:2}),/INVALID_FEATURE_PROFILE/);
});
test('artifact fingerprints match the current offline training and feature sources',()=>{
 const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const sha=text=>createHash('sha256').update(text).digest('hex');
 assert.equal(artifact.featureCodeSha,sha(source('../lib/holistic-support/native-intent-features.mjs')));
 assert.equal(artifact.predictorCodeSha,sha(source('../lib/holistic-support/native-intent-predict.mjs')));
 assert.equal(artifact.trainingCodeSha,sha(source('../scripts/train-native-ru-en-offline.mjs')+source('../lib/holistic-support/native-intent-training.mjs')));
 assert.equal(artifact.holdoutHash,sha(source('./fixtures/native-ai-secretary-gold-v1.json')));
});
test('evaluation rejects artifacts from another dataset, code or balance setting',()=>{
 const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
 const args={artifact,training:buildTrainingSet('v4'),balancePower:.5,
  featureSource:source('../lib/holistic-support/native-intent-features.mjs'),
  trainingSource:source('../scripts/train-native-ru-en-offline.mjs')+source('../lib/holistic-support/native-intent-training.mjs'),
  holdoutSource:source('./fixtures/native-ai-secretary-gold-v1.json'),predictorSource:source('../lib/holistic-support/native-intent-predict.mjs')};
 assert.equal(validateResearchProvenance(args),true);
 for(const change of [{balancePower:0},{featureSource:args.featureSource+' '},
  {trainingSource:args.trainingSource+' '},{holdoutSource:args.holdoutSource+' '},{predictorSource:args.predictorSource+' '},{training:buildTrainingSet('v3')}])
  assert.throws(()=>validateResearchProvenance({...args,...change}),/ARTIFACT_PROVENANCE/);
});
test('candidate is disabled by default, falls back on failure and never replaces Spanish',()=>{
 let calls=0;const fallback=message=>{calls++;return {intent:'fallback',score:0,margin:0,accepted:false,message};};
 const disabled=createNativeArtifactSelector({artifact,pin,fallback});
 assert.equal(disabled.available,false);assert.equal(disabled.classify('hello','en').prediction.intent,'fallback');
 const enabled=createNativeArtifactSelector({enabled:true,artifact,pin,fallback});assert.equal(enabled.available,true);
 assert.equal(enabled.classify('hello','en').modelVersion,artifact.modelVersion);
 assert.equal(enabled.classify('hola','es').prediction.intent,'fallback');
 const broken=createNativeArtifactSelector({enabled:true,artifact:{...artifact,integrity:'bad'},pin,fallback});
 assert.equal(broken.available,false);assert.equal(broken.classify('hello','en').prediction.intent,'fallback');
 assert.equal(calls,3);
});
