/** Research only: compare existing training/inference with an extra abstention label. */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeRuEnFolds,scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';

const unknown=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-unknown-v1.json',import.meta.url),'utf8'));
export function researchOpenSetAccepts(prediction,threshold){
 return prediction.intent!=='__out_of_scope'&&prediction.score>=threshold&&prediction.margin>=.42;
}
export function evaluateRuEnOpenSet(){
 if(Object.keys(unknown).sort().join(',')!=='en,ru'||!['ru','en'].every(locale=>Array.isArray(unknown[locale])))throw Error('INVALID_UNKNOWN_EXAMPLES');
 const phrases=[...unknown.ru,...unknown.en],keys=phrases.map(normalizeNativeText),unique=new Set(keys);
 if(keys.length!==32||unique.size!==keys.length||keys.some(key=>!key))throw Error('INVALID_UNKNOWN_EXAMPLES');
 const rows={baseline:[],candidate042:[],candidate047:[]};let labels;
 for(const {training,validation} of makeRuEnFolds('v4',{extendedNegatives:true})){
  const existing=[...validation.map(row=>row.message),...Object.values(training).flatMap(v=>[...v.ru,...v.en])].map(normalizeNativeText);
  if(existing.some(key=>unique.has(key)))throw Error('UNKNOWN_EXAMPLE_OVERLAP');
  labels=Object.keys(training);
  for(const variant of ['baseline','candidate']){
   const model=fitNativeIntent(variant==='baseline'?training:{...training,__out_of_scope:unknown});
   for(const row of validation){
    const prediction=predictNativeIntent(model,row.message);
    const names=variant==='baseline'?['baseline']:['candidate042','candidate047'];
    for(const name of names){
     const accepted=name==='baseline'?prediction.accepted:researchOpenSetAccepts(prediction,name==='candidate042'?.42:.47);
     rows[name].push({...row,intent:prediction.intent,accepted,eligible:accepted&&nativeSecretaryAllowsUtterance(row.message)&&nativeSecretaryAllowsIntent(row.message,row.locale,prediction.intent)});
    }
   }
  }
 }
 return Object.fromEntries(['ru','en'].map(locale=>[locale,Object.fromEntries(Object.entries(rows).map(([name,all])=>{
  const subset=all.filter(row=>row.locale===locale);
  return [name,{...scoreRuEnPredictions(subset,labels),
   guardedFalseAccepts:subset.filter(row=>row.expected===null&&row.eligible).length}];
 }))]));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 console.log(JSON.stringify({method:'Internal v4 fixed folds with RU/EN-only synthetic unknown class. Thresholds use rounded scores; not blind or production.',
  metrics:evaluateRuEnOpenSet()}));
