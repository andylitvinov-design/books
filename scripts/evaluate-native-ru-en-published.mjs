/** Reproducible RU/EN-only historical diagnostic. This is no longer a blind test. */
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {readGoldFile} from './evaluate-native-secretary-gold.mjs';
import {buildTrainingSet,trainRuEnArtifact} from './train-native-ru-en-offline.mjs';
import {scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';
import {loadNativeIntentArtifact} from '../lib/holistic-support/native-intent-artifact.mjs';

export function parsePublishedArgs(args){
 if(!Array.isArray(args)||args.length%2)throw Error('INVALID_ARGUMENTS');
 const options={};
 for(let i=0;i<args.length;i+=2){
  if(!['--dataset','--balance','--production-commit','--artifact','--pin','--language'].includes(args[i])||!args[i+1]||options[args[i]])throw Error('INVALID_ARGUMENTS');
  options[args[i]]=args[i+1];
 }
 const version=options['--dataset']||'v3',balances={none:0,sqrt:.5,full:1},balance=options['--balance']||'none';
 const productionCommit=options['--production-commit']||null;
 const artifactPath=options['--artifact']||null,pinPath=options['--pin']||null;
 const language=options['--language']||null;
 if(!['v1','v2','v3','v4','v5','v6','v7','v8','v9'].includes(version)||!Object.hasOwn(balances,balance)||
  language!==null&&!['ru','en'].includes(language)||
  version==='v5'&&(language!=='ru'||!artifactPath)||
  ['v6','v7','v8','v9'].includes(version)&&(!language||!artifactPath)||
  productionCommit!==null&&!/^[a-f0-9]{40}$/u.test(productionCommit)||Boolean(artifactPath)!==Boolean(pinPath))throw Error('INVALID_ARGUMENTS');
 return {version,balancePower:balances[balance],productionCommit,artifactPath,pinPath,language};
}
export function validateResearchProvenance({artifact,training,balancePower,featureSource,trainingSource,
 holdoutSource=readFileSync(new URL('../tests/fixtures/native-ai-secretary-gold-v1.json',import.meta.url),'utf8'),
 predictorSource=readFileSync(new URL('../lib/holistic-support/native-intent-predict.mjs',import.meta.url),'utf8')}){
 const sha=text=>createHash('sha256').update(text).digest('hex');
 if(!artifact||!training||typeof featureSource!=='string'||typeof trainingSource!=='string'||typeof holdoutSource!=='string'||typeof predictorSource!=='string'||
    artifact.datasetHash!==sha(JSON.stringify(training))||artifact.featureCodeSha!==sha(featureSource)||
    artifact.holdoutHash!==sha(holdoutSource)||artifact.predictorCodeSha!==sha(predictorSource)||
    artifact.trainingCodeSha!==sha(trainingSource)||(artifact.balancePower??0)!==balancePower)throw Error('ARTIFACT_PROVENANCE');
 return true;
}
/** Load the exact committed production secretary in an isolated module graph. */
export async function loadCommittedSecretary(commit){
 if(typeof commit!=='string'||!/^[a-f0-9]{40}$/u.test(commit))throw Error('INVALID_COMMIT');
 const cwd=fileURLToPath(new URL('..',import.meta.url));
 const source=path=>execFileSync('git',['show',commit+':'+path],{cwd,encoding:'utf8',timeout:10000,maxBuffer:2_000_000});
 const dataUrl=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
 const rewrite=(text,from,to)=>{
  const quoted="'"+from+"'";if(!text.includes(quoted))throw Error('COMMITTED_MODULE_LAYOUT_UNSUPPORTED');
  return text.replace(quoted,JSON.stringify(to));
 };
 const examples=dataUrl(source('data/holistic-support/native-secretary-examples.mjs'));
 const features=dataUrl(source('lib/holistic-support/native-intent-features.mjs'));
 let model=source('lib/holistic-support/native-intent-model.mjs');
 model=rewrite(model,'../../data/holistic-support/native-secretary-examples.mjs',examples);
 model=rewrite(model,'./native-intent-features.mjs',features);
 let secretary=source('lib/holistic-support/native-secretary.mjs');
 secretary=rewrite(secretary,'./native-intent-model.mjs',dataUrl(model));
 secretary=rewrite(secretary,'./native-intent-features.mjs',features);
 const committedModule=await import(dataUrl(secretary));
 if(typeof committedModule.nativeSecretaryTurn!=='function')throw Error('COMMITTED_SECRETARY_UNAVAILABLE');
 return committedModule.nativeSecretaryTurn;
}
export function evaluatePublishedRuEn({gold,baseline,candidate,training,guard=null,languages=['ru','en']}){
 if(!Array.isArray(languages)||languages.length<1||new Set(languages).size!==languages.length||languages.some(x=>!['ru','en'].includes(x)))throw Error('INVALID_LANGUAGE');
 const phrases=Object.values(training).flatMap(locales=>[...locales.ru,...locales.en]);
 const train=new Set(phrases.map(normalizeNativeText));
 const cases=gold.cases.filter(row=>languages.includes(row.locale));
 const dialogueMessages=gold.dialogues.filter(row=>languages.includes(row.locale)).flatMap(row=>row.turns.map(turn=>turn.user));
 if([...cases.map(row=>row.utterance),...dialogueMessages].some(message=>train.has(normalizeNativeText(message))))
  throw Error('PUBLISHED_TEST_TRAIN_OVERLAP');
 const labels=gold.classes;
 const classifiers={baseline,candidate};
 if(guard!==null){
  if(typeof guard!=='function')throw Error('INVALID_GUARD');
  for(const [name,classify] of Object.entries({baseline,candidate}))classifiers[name+'Guarded']=(message,locale)=>{
   const result=classify(message,locale);
   return {...result,accepted:result.accepted===true&&guard(message,locale,result.intent)};
  };
 }
 return Object.fromEntries(languages.map(locale=>{
  const subset=cases.filter(row=>row.locale===locale);
  return [locale,Object.fromEntries(Object.entries(classifiers).map(([name,classify])=>{
   const times=[],rows=subset.map(row=>{
    const start=performance.now(),prediction=classify(row.utterance,locale);
    times.push(performance.now()-start);
    return {id:row.id,expected:row.expectedIntent,intent:prediction.intent,accepted:prediction.accepted===true};
   });
   times.sort((a,b)=>a-b);
   const score=scoreRuEnPredictions(rows,labels);
   const errors=rows.filter(row=>row.expected===null?row.accepted:!row.accepted||row.intent!==row.expected)
    .map(row=>({id:row.id,expected:row.expected??'abstain',got:row.accepted?row.intent:'abstain'}));
   return [name,{...score,errors,p50ms:times[Math.floor(times.length*.5)],p95ms:times[Math.floor(times.length*.95)]}];
  }))];
 }));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {version,balancePower,productionCommit,artifactPath,pinPath,language}=parsePublishedArgs(process.argv.slice(2));
 const {gold,sha256}=readGoldFile(),training=buildTrainingSet(version);
 const selectedTraining=language?Object.fromEntries(Object.entries(training).map(([label,locales])=>[label,{[language]:locales[language]}])):training;
 let artifact,predict;
 if(artifactPath){
  if(statSync(artifactPath).size>2_000_000||statSync(pinPath).size>4096)throw Error('ARTIFACT_TOO_LARGE');
  artifact=JSON.parse(readFileSync(artifactPath,'utf8'));const pin=JSON.parse(readFileSync(pinPath,'utf8'));
  const featureSource=readFileSync(new URL('../lib/holistic-support/native-intent-features.mjs',import.meta.url),'utf8');
  const trainingSource=readFileSync(new URL('./train-native-ru-en-offline.mjs',import.meta.url),'utf8')+
   readFileSync(new URL('../lib/holistic-support/native-intent-training.mjs',import.meta.url),'utf8');
  if(JSON.stringify(artifact.languages)!==JSON.stringify(language?[language]:['ru','en']))throw Error('ARTIFACT_LANGUAGE');
  validateResearchProvenance({artifact,training:selectedTraining,balancePower,featureSource,trainingSource});
  predict=loadNativeIntentArtifact(artifact,pin);
 }else{
  artifact=trainRuEnArtifact(language,version,{balancePower});
  const model={labels:artifact.labelMap,weights:artifact.weights,bias:artifact.bias};
  predict=message=>predictNativeIntent(model,message);
 }
 const gate=(message,locale,intent)=>nativeSecretaryAllowsUtterance(message)&&nativeSecretaryAllowsIntent(message,locale,intent);
 const committed=productionCommit?await loadCommittedSecretary(productionCommit):null;
 const baseline=committed?(message,locale)=>{const result=committed({message,locale,history:[]});return {intent:result?.intent??null,accepted:Boolean(result)};}:
  classifyNativeSecretaryIntent;
 const candidate=(message,locale)=>{const prediction=predict(message);
  return committed?{...prediction,accepted:prediction.accepted&&gate(message,locale,prediction.intent)}:prediction;};
 const metrics=evaluatePublishedRuEn({gold,training,baseline,candidate,guard:committed?null:gate,languages:language?[language]:['ru','en']});
 console.log(JSON.stringify({schema:'hh-native-ru-en-published-diagnostic-v1',datasetSha256:sha256,
  datasetVersion:artifact.modelVersion,trainingDatasetHash:artifact.datasetHash,artifactIntegrity:artifact.integrity,productionCommit,
  limitation:'Previously exposed diagnostic; guarded means secretary eligibility only, not full route. Exact normalized overlap excluded, semantic similarity not ruled out. Not blind or LIVE.',metrics},null,2));
}
