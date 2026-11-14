/** Developer-authored synthetic negative challenge; not blind or LIVE proof. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadNativeIntentArtifact} from '../lib/holistic-support/native-intent-artifact.mjs';
import {nativeSecretaryAllowsIntent,nativeSecretaryAllowsUtterance} from '../lib/holistic-support/native-secretary.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {buildTrainingSet} from './train-native-ru-en-offline.mjs';

const [locale,version,artifactPath,pinPath]=process.argv.slice(2);
if(!['ru','en'].includes(locale)||!['v7','v8','v9'].includes(version)||!artifactPath||!pinPath||process.argv.length!==6)throw Error('USAGE: locale version artifact pin');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const raw=readFileSync(new URL('../tests/fixtures/native-ai-ru-en-open-challenge-v2.json',import.meta.url),'utf8');
const challenge=JSON.parse(raw), rows=challenge.samples?.[locale];
if(challenge.schema!=='hh-native-open-challenge-v2'||challenge.synthetic!==true||challenge.privateClientData!==false||!Array.isArray(rows))throw Error('INVALID_CHALLENGE');
const training=buildTrainingSet(version);
const used=new Set(Object.values(training).flatMap(x=>[...x.ru,...x.en]).map(normalizeNativeText));
const artifact=read(artifactPath);
if(JSON.stringify(artifact.languages)!==JSON.stringify([locale])||!artifact.modelVersion?.includes(`research-${version}-`))throw Error('ARTIFACT_LOCALE_OR_VERSION');
const classify=loadNativeIntentArtifact(artifact,read(pinPath));
const errors=[];
for(const [category,message] of rows){
 if(!['other','emotion','refusal'].includes(category)||typeof message!=='string')throw Error('INVALID_CASE');
 const normalized=normalizeNativeText(message);
 if(!normalized||used.has(normalized))throw Error('TRAINING_OVERLAP');
 used.add(normalized);
 const p=classify(message);
 if(p.accepted&&nativeSecretaryAllowsUtterance(message)&&nativeSecretaryAllowsIntent(message,locale,p.intent))errors.push({category,message,intent:p.intent,score:p.score,margin:p.margin});
}
console.log(JSON.stringify({locale,version,total:rows.length,falseAccepts:errors.length,errors,
 challengeSha256:createHash('sha256').update(raw).digest('hex'),limitation:'Developer-authored synthetic cases; exposed, not blind or full route.'},null,2));
