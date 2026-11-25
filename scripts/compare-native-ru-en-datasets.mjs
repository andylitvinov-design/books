/** Fixed-fold development comparison; published gold is never used here. */
import {pathToFileURL} from 'node:url';
import {buildTrainingSet} from './train-native-ru-en-offline.mjs';
import {makeRuEnFolds,scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';

export function createComparableFolds(){
 const old=buildTrainingSet('v3'),next=buildTrainingSet('v4');
 const additions=Object.fromEntries(Object.keys(old).map(label=>[label,Object.fromEntries(['ru','en'].map(locale=>{
  const existing=new Set(old[label][locale].map(normalizeNativeText));
  return [locale,next[label][locale].filter(message=>!existing.has(normalizeNativeText(message)))];
 }))]));
 return makeRuEnFolds('v3',{extendedNegatives:true}).map(({training,validation})=>{
  const held=new Set(validation.map(row=>normalizeNativeText(row.message)));
  const candidate=Object.fromEntries(Object.entries(training).map(([label,langs])=>[label,
   Object.fromEntries(['ru','en'].map(locale=>{
    if(additions[label][locale].some(message=>held.has(normalizeNativeText(message))))throw Error('INTERNAL_VALIDATION_OVERLAP');
    return [locale,[...langs[locale],...additions[label][locale]]];
   }))]));
  return {baseline:training,candidate,validation};
 });
}

export function compareRuEnDatasets(){
 const outcomes={baseline:[],candidate:[]},folds=createComparableFolds(),labels=Object.keys(folds[0].baseline);
 for(const fold of folds)for(const variant of Object.keys(outcomes)){
  const model=fitNativeIntent(fold[variant]);
  for(const row of fold.validation){
   const prediction=predictNativeIntent(model,row.message);
   outcomes[variant].push({...row,intent:prediction.intent,accepted:prediction.accepted,
    eligible:prediction.accepted&&nativeSecretaryAllowsUtterance(row.message)&&nativeSecretaryAllowsIntent(row.message,row.locale,prediction.intent)});
  }
 }
 return Object.fromEntries(['ru','en'].map(locale=>[locale,Object.fromEntries(Object.entries(outcomes).map(([variant,all])=>{
  const rows=all.filter(row=>row.locale===locale);
  return [variant,{...scoreRuEnPredictions(rows,labels),
   guardedFalseAccepts:rows.filter(row=>row.expected===null&&row.eligible).length}];
 }))]));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify({method:'Fixed v3 three-fold development set plus v4 additions in candidate training; not blind.',
  versions:{baseline:'v3',candidate:'v4'},metrics:compareRuEnDatasets()}));
