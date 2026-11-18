/** Small developer-authored RU/EN challenge. Not blind, independent or LIVE proof. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildTrainingSet,trainRuEnArtifact} from './train-native-ru-en-offline.mjs';
import {scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';

export function validateChallenge(challenge,training){
 if(challenge?.schema!=='hh-native-ru-en-challenge-v1'||challenge.synthetic!==true||challenge.privateClientData!==false||!Array.isArray(challenge.cases))throw Error('INVALID_CHALLENGE');
 const labels=Object.keys(training),seen=new Set(Object.values(training).flatMap(v=>[...v.ru,...v.en]).map(normalizeNativeText));
 for(const row of challenge.cases){
  if(!Array.isArray(row)||row.length!==3||!['ru','en'].includes(row[0])||
     !(row[1]===null||labels.includes(row[1]))||typeof row[2]!=='string')throw Error('INVALID_CHALLENGE_CASE');
  const key=normalizeNativeText(row[2]);if(!key||seen.has(key))throw Error('CHALLENGE_OVERLAP');seen.add(key);
 }
 if(!['ru','en'].every(locale=>challenge.cases.some(row=>row[0]===locale&&row[1]===null)&&
  challenge.cases.some(row=>row[0]===locale&&row[1]!==null)))throw Error('INVALID_CHALLENGE_COVERAGE');
 return true;
}
export function scoreChallenge(challenge,training,models){
 validateChallenge(challenge,training);const labels=Object.keys(training);
 return Object.fromEntries(['ru','en'].map(locale=>[locale,Object.fromEntries(Object.entries(models).map(([name,model])=>{
  const rows=challenge.cases.filter(row=>row[0]===locale).map(([,expected,message])=>{
   const p=predictNativeIntent(model,message);
   return {expected,intent:p.intent,accepted:p.accepted,eligible:p.accepted&&nativeSecretaryAllowsUtterance(message)&&nativeSecretaryAllowsIntent(message,locale,p.intent)};
  });
  return [name,{...scoreRuEnPredictions(rows,labels),
   guarded:scoreRuEnPredictions(rows.map(row=>({...row,accepted:row.eligible})),labels)}];
 }))]));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const path=new URL('../tests/fixtures/native-ai-ru-en-challenge-v1.json',import.meta.url),raw=readFileSync(path,'utf8'),challenge=JSON.parse(raw),training=buildTrainingSet('v4');
 const normal=trainRuEnArtifact(null,'v4'),balanced=trainRuEnArtifact(null,'v4',{balancePower:.5});
 const model=artifact=>({labels:artifact.labelMap,weights:artifact.weights,bias:artifact.bias});
 console.log(JSON.stringify({schema:'hh-native-challenge-result-v1',challengeSha256:createHash('sha256').update(raw).digest('hex'),
  artifactIntegrity:{normal:normal.integrity,balanced:balanced.integrity},
  limitation:'Small developer-authored synthetic challenge; not blind, independent, or LIVE. Guarded means eligibility only.',
  metrics:scoreChallenge(challenge,training,{normal:model(normal),balanced:model(balanced)})}));
}
