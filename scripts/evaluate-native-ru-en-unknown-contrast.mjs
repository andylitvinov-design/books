/** Development-only synthetic contrast experiment. Never activates a model. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildTrainingSet,assertAddedTrainingDistantFromPublished} from './train-native-ru-en-offline.mjs';
import {makeRuEnFolds,scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const raw=readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-unknown-contrast-v2.json',import.meta.url),'utf8');
const contrast=JSON.parse(raw),challenge=read('../tests/fixtures/native-ai-ru-en-challenge-v1.json');
const open=read('../tests/fixtures/native-ai-ru-en-open-challenge-v2.json');
if(Object.keys(contrast).sort().join(',')!=='en,ru'||!['ru','en'].every(l=>Array.isArray(contrast[l])&&contrast[l].length===16))throw Error('INVALID_CONTRAST');
const keys=[...contrast.ru,...contrast.en].map(normalizeNativeText);
if(keys.some(x=>!x)||new Set(keys).size!==keys.length)throw Error('INVALID_CONTRAST');
const held=new Set([...challenge.cases.map(x=>x[2]),...['ru','en'].flatMap(l=>open.samples[l].map(x=>x[1]))].map(normalizeNativeText));
if(keys.some(x=>held.has(x)))throw Error('DEVELOPMENT_CHALLENGE_OVERLAP');
const results={};
for(const locale of ['ru','en']){
 const version=locale==='ru'?'v7':'v8',training=buildTrainingSet(version),labels=Object.keys(training);
 const trainingKeys=new Set(Object.values(training).flatMap(x=>[...x.ru,...x.en]).map(normalizeNativeText));
 if(keys.some(x=>trainingKeys.has(x)))throw Error('TRAINING_OVERLAP');
 assertAddedTrainingDistantFromPublished({...training,__out_of_scope:{ru:locale==='ru'?contrast.ru:[],en:locale==='en'?contrast.en:[]}});
 const sets={development:challenge.cases.filter(x=>x[0]===locale).map(([,expected,message])=>({expected,message})),
  open:open.samples[locale].map(([,message])=>({expected:null,message}))};
 const scored={baseline:{folds:[],development:[],open:[]},contrast:{folds:[],development:[],open:[]}};
 const evaluate=(model,rows)=>rows.map(row=>{
  const p=predictNativeIntent(model,row.message);
  return {...row,intent:p.intent,accepted:p.accepted&&p.intent!=='__out_of_scope'&&
   nativeSecretaryAllowsUtterance(row.message)&&nativeSecretaryAllowsIntent(row.message,locale,p.intent)};
 });
 const fit=(data,variant)=>{
  const localized=Object.fromEntries(labels.map(label=>[label,{[locale]:data[label][locale]}]));
  if(variant==='contrast')localized.__out_of_scope={[locale]:contrast[locale]};
  return fitNativeIntent(localized,{balancePower:.5,characterWeight:2,dimensions:8192});
 };
 for(const {training:fold,validation} of makeRuEnFolds(version,{extendedNegatives:true})){
  const foldKeys=new Set(validation.filter(x=>x.locale===locale).map(x=>normalizeNativeText(x.message)));
  if(contrast[locale].some(x=>foldKeys.has(normalizeNativeText(x))))throw Error('FOLD_OVERLAP');
  for(const variant of Object.keys(scored))scored[variant].folds.push(...evaluate(fit(fold,variant),validation.filter(x=>x.locale===locale)));
 }
 for(const variant of Object.keys(scored)){
  const model=fit(training,variant);
  for(const name of ['development','open'])scored[variant][name]=evaluate(model,sets[name]);
 }
 results[locale]=Object.fromEntries(Object.entries(scored).map(([variant,groups])=>[variant,Object.fromEntries(Object.entries(groups).map(([name,rows])=>{
  const x=scoreRuEnPredictions(rows,labels);
  return [name,{correct:x.correct,wrongAccepted:x.wrongAccepted,falseAccepts:x.falseAccepts,abstainedPositive:x.abstainedPositive,macroF1:x.macroF1}];
 }))]));
}
console.log(JSON.stringify({schema:'hh-native-unknown-contrast-diagnostic-v1',contrastSha256:createHash('sha256').update(raw).digest('hex'),
 limitation:'Exposed developer-authored synthetic sets, not blind or full route. Experimental label is not activated.',results},null,2));
