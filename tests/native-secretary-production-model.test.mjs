import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {classifyNativeSecretaryIntent, classifyNativeSecretaryIntentForLocale, NATIVE_SECRETARY_MODEL_VERSION} from '../lib/holistic-support/native-intent-model.mjs';
import {nativeSecretaryTurn} from '../lib/holistic-support/native-secretary.mjs';

test('production uses pinned RU and EN models with a reversible legacy fallback',()=>{
 const previous=process.env.HH_NATIVE_RU_EN_MODEL_ENABLED;
 try {
  delete process.env.HH_NATIVE_RU_EN_MODEL_ENABLED;
  for(const [locale,message,version] of [['ru','здравствуйте','hh-native-intent-ru-research-v7-balanced-sqrt-char2-8192-v1'],['en','hello there','hh-native-intent-en-research-v8-balanced-sqrt-char2-8192-v1']]){
   assert.equal(classifyNativeSecretaryIntentForLocale(message,locale).modelVersion,version);
   assert.equal(nativeSecretaryTurn({message,locale}).modelVersion,version);
  }
  for(const [locale,message] of [['ru','Не записывайте меня к специалисту'],['en','Do not book me with a specialist'],['ru','хочу умереть'],['en','diagnose my depression']])
   assert.equal(nativeSecretaryTurn({message,locale}),null,message);
  assert.deepEqual(classifyNativeSecretaryIntentForLocale('hola buenos dias','es').prediction,classifyNativeSecretaryIntent('hola buenos dias'));
  process.env.HH_NATIVE_RU_EN_MODEL_ENABLED='false';
  assert.equal(classifyNativeSecretaryIntentForLocale('здравствуйте','ru').modelVersion,NATIVE_SECRETARY_MODEL_VERSION);
  assert.deepEqual(classifyNativeSecretaryIntentForLocale('hello there','en').prediction,classifyNativeSecretaryIntent('hello there'));
  assert.equal(nativeSecretaryTurn({message:'Не записывайте меня к специалисту',locale:'ru'}),null);
 } finally {if(previous===undefined)delete process.env.HH_NATIVE_RU_EN_MODEL_ENABLED;else process.env.HH_NATIVE_RU_EN_MODEL_ENABLED=previous;}
});

test('pinned models use the reviewed feature and predictor code',()=>{
 for(const [file,hash] of [['native-intent-features.mjs','5d11b7eed603ff99b82ac6eb34dd6c2683aeefc1cd4c0a7b462366344f65836c'],['native-intent-predict.mjs','7a83cca4f5de1aee4011af646aa95d2e5e7030c57fc76617660bfb2b701b34f8']]){
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../lib/holistic-support/${file}`,import.meta.url))).digest('hex'),hash);
 }
});
