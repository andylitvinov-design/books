/** Research-only deterministic training. No client data, provider calls or Spanish examples. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../data/holistic-support/native-secretary-examples.mjs';
import {normalizeNativeText,NATIVE_INTENT_VERSION} from '../lib/holistic-support/native-intent-features.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';

const extra=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v1.json',import.meta.url),'utf8'));
const extraV2=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v2.json',import.meta.url),'utf8'));
const extraV3=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v3.json',import.meta.url),'utf8'));
const extraV4=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v4.json',import.meta.url),'utf8'));
const extraV5=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v5.json',import.meta.url),'utf8'));
const extraV6=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v6.json',import.meta.url),'utf8'));
const extraV8=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v8.json',import.meta.url),'utf8'));
const extraV9=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v9.json',import.meta.url),'utf8'));
const exclusionsV7=JSON.parse(readFileSync(new URL('../data/holistic-support/native-secretary-ru-en-research-v7-exclusions.json',import.meta.url),'utf8'));
const publishedGoldRaw=readFileSync(new URL('../tests/fixtures/native-ai-secretary-gold-v1.json',import.meta.url),'utf8');
const publishedGold=JSON.parse(publishedGoldRaw);
const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
/** Reject exact normalized overlap before fitting, including dialogue turns. */
export function assertTrainingDisjointFromPublished(training,gold=publishedGold){
 if(!gold||!['P','N','D'].every(key=>Array.isArray(gold[key])))throw Error('PUBLISHED_HOLDOUT_INVALID');
 const held=[],coverage=Object.fromEntries(['P','N','D'].map(key=>[key,new Set()]));
 for(const key of ['P','N'])for(const row of gold[key]){
  if(!Array.isArray(row)||typeof row[0]!=='string')throw Error('PUBLISHED_HOLDOUT_INVALID');
  if(!['ru','en'].includes(row[0]))continue;
  if(typeof row[2]!=='string'||!normalizeNativeText(row[2]))throw Error('PUBLISHED_HOLDOUT_INVALID');
  coverage[key].add(row[0]);
  held.push(row[2]);
 }
 for(const row of gold.D){
  if(!Array.isArray(row)||typeof row[0]!=='string')throw Error('PUBLISHED_HOLDOUT_INVALID');
  if(!['ru','en'].includes(row[0]))continue;
  if(!Array.isArray(row[3])||row[3].length===0)throw Error('PUBLISHED_HOLDOUT_INVALID');
  coverage.D.add(row[0]);
  for(const turn of row[3]){
   if(!Array.isArray(turn)||typeof turn[0]!=='string'||!normalizeNativeText(turn[0]))throw Error('PUBLISHED_HOLDOUT_INVALID');
   held.push(turn[0]);
  }
 }
 if(!['P','N','D'].every(key=>['ru','en'].every(locale=>coverage[key].has(locale))))throw Error('PUBLISHED_HOLDOUT_INVALID');
 const phrases=Object.values(training).flatMap(locales=>[...(locales.ru||[]),...(locales.en||[])]);
 const existing=new Set(phrases.map(normalizeNativeText));
 if(held.some(phrase=>existing.has(normalizeNativeText(phrase))))throw Error('PUBLISHED_TEST_TRAIN_OVERLAP');
 return true;
}
export function nativeLexicalTrigrams(value){
 const text=' '+normalizeNativeText(value)+' ',grams=new Set();
 for(let i=0;i+3<=text.length;i++)grams.add(text.slice(i,i+3));
 return grams;
}
export function nativeLexicalSimilarity(a,b){
 let intersection=0;for(const gram of a)if(b.has(gram))intersection++;
 const union=a.size+b.size-intersection;return union?intersection/union:0;
}
/** Lexical guard on added data only; original corpus is preserved and audited separately. */
export function assertAddedTrainingDistantFromPublished(training,gold=publishedGold,originals=NATIVE_SECRETARY_EXAMPLES_V1){
 assertTrainingDisjointFromPublished(training,gold);
 for(const locale of ['ru','en']){
  const held=[...gold.P,...gold.N].filter(row=>row[0]===locale).map(row=>row[2]);
  for(const row of gold.D)if(row[0]===locale)for(const turn of row[3])held.push(turn[0]);
  const heldGrams=held.map(nativeLexicalTrigrams);
  const baseline=new Set(Object.values(originals).flatMap(row=>row[locale]||[]).map(normalizeNativeText));
  for(const row of Object.values(training))for(const phrase of row[locale]||[]){
   if(baseline.has(normalizeNativeText(phrase)))continue;
   const grams=nativeLexicalTrigrams(phrase);
   if(heldGrams.some(other=>nativeLexicalSimilarity(grams,other)>=.7))throw Error('PUBLISHED_TEST_TRAIN_NEAR_DUPLICATE');
  }
 }
 return true;
}
export function buildTrainingSet(version='v1'){
 if(!['v1','v2','v3','v4','v5','v6','v7','v8','v9'].includes(version))throw Error('INVALID_DATASET_VERSION');
 const level=Number(version.slice(1));
 const labels=Object.keys(NATIVE_SECRETARY_EXAMPLES_V1);
 if([extra,...(version!=='v1'?[extraV2]:[])].some(dataset=>Object.keys(dataset).length!==labels.length||labels.some(label=>!Object.hasOwn(dataset,label)))||
   (level>=3&&Object.keys(extraV3).some(label=>!labels.includes(label)))||
   (level>=4&&Object.keys(extraV4).some(label=>!labels.includes(label)))||
   (level>=5&&Object.keys(extraV5).some(label=>!labels.includes(label)))||
   (level>=6&&Object.keys(extraV6).some(label=>!labels.includes(label)))||
   (level>=8&&Object.keys(extraV8).some(label=>!labels.includes(label)))||
   (level>=9&&Object.keys(extraV9).some(label=>!labels.includes(label))))throw Error('INVALID_TRAINING_LABELS');
 const result=Object.fromEntries(labels.map(label=>[label,Object.fromEntries(['ru','en'].map(locale=>{
  const addition=extra[label][locale];
  if(!Array.isArray(addition)||Object.keys(extra[label]).some(x=>!['ru','en'].includes(x)))throw Error('INVALID_TRAINING_LOCALE');
  const expanded=version!=='v1'?extraV2[label][locale]:[];
  const focused=level>=3&&Object.hasOwn(extraV3,label)?extraV3[label][locale]:[];
  const conversational=level>=4&&Object.hasOwn(extraV4,label)?extraV4[label][locale]:[];
  const ruFocused=level>=5&&Object.hasOwn(extraV5,label)?extraV5[label][locale]:[];
  const enFocused=level>=6&&Object.hasOwn(extraV6,label)?extraV6[label][locale]:[];
  const enConversational=level>=8&&Object.hasOwn(extraV8,label)?extraV8[label][locale]:[];
  const ruConversational=level>=9&&Object.hasOwn(extraV9,label)?extraV9[label][locale]:[];
  if(!Array.isArray(expanded)||(version!=='v1'&&Object.keys(extraV2[label]).some(x=>!['ru','en'].includes(x)))||
    !Array.isArray(focused)||(level>=3&&Object.hasOwn(extraV3,label)&&Object.keys(extraV3[label]).some(x=>!['ru','en'].includes(x)))||
    !Array.isArray(conversational)||(level>=4&&Object.hasOwn(extraV4,label)&&Object.keys(extraV4[label]).some(x=>!['ru','en'].includes(x)))||
    !Array.isArray(ruFocused)||(level>=5&&Object.hasOwn(extraV5,label)&&(Object.keys(extraV5[label]).some(x=>!['ru','en'].includes(x))||!Array.isArray(extraV5[label].en)||extraV5[label].en.length!==0))||
    !Array.isArray(enFocused)||(level>=6&&Object.hasOwn(extraV6,label)&&(Object.keys(extraV6[label]).some(x=>!['ru','en'].includes(x))||!Array.isArray(extraV6[label].ru)||extraV6[label].ru.length!==0))||
    !Array.isArray(enConversational)||(level>=8&&Object.hasOwn(extraV8,label)&&(Object.keys(extraV8[label]).some(x=>!['ru','en'].includes(x))||!Array.isArray(extraV8[label].ru)||extraV8[label].ru.length!==0))||
    !Array.isArray(ruConversational)||(level>=9&&Object.hasOwn(extraV9,label)&&(Object.keys(extraV9[label]).some(x=>!['ru','en'].includes(x))||!Array.isArray(extraV9[label].en)||extraV9[label].en.length!==0)))throw Error('INVALID_TRAINING_LOCALE');
  return [locale,[...NATIVE_SECRETARY_EXAMPLES_V1[label][locale],...addition,...expanded,...focused,...conversational,...ruFocused,...enFocused,...enConversational,...ruConversational]];
 }))]));
 if(level>=7){
  if(Object.keys(exclusionsV7).join(',')!=='en'||!Array.isArray(exclusionsV7.en)||exclusionsV7.en.length!==2)throw Error('INVALID_EXCLUSIONS');
  const excluded=new Set(exclusionsV7.en.map(normalizeNativeText));
  const originals=new Set(Object.values(NATIVE_SECRETARY_EXAMPLES_V1).flatMap(locales=>locales.en).map(normalizeNativeText));
  if(excluded.size!==2||[...excluded].some(x=>!x||originals.has(x)))throw Error('INVALID_EXCLUSIONS');
  let removed=0;for(const locales of Object.values(result))locales.en=locales.en.filter(phrase=>{
   if(!excluded.has(normalizeNativeText(phrase)))return true;removed++;return false;
  });
  if(removed!==2)throw Error('INVALID_EXCLUSIONS');
 }
 const phrases=Object.values(result).flatMap(v=>[...v.ru,...v.en]);
 if(phrases.length!==({v1:361,v2:479,v3:563,v4:611,v5:628,v6:636,v7:634,v8:682,v9:711})[version]||phrases.some(s=>typeof s!=='string'||!s.trim()||s.length>600)||
    new Set(phrases.map(normalizeNativeText)).size!==phrases.length)throw Error('INVALID_TRAINING_EXAMPLES');
 if(level>=7)assertAddedTrainingDistantFromPublished(result);
 else assertTrainingDisjointFromPublished(result);
 return result;
}
export function trainRuEnArtifact(language=null,version='v1',{balancePower=0,characterWeight=1,dimensions=1024}={}){
 if(language!==null&&!['ru','en'].includes(language))throw Error('INVALID_LANGUAGE');
 if(![0,.5,1].includes(balancePower))throw Error('INVALID_BALANCE');
 if(![1024,8192].includes(dimensions)||![1,2].includes(characterWeight)||
   (dimensions===8192&&(!['ru','en'].includes(language)||characterWeight!==2))||
   (dimensions===1024&&characterWeight===2&&language!=='ru'))throw Error('INVALID_FEATURE_PROFILE');
 if(version==='v5'&&(language!=='ru'||characterWeight!==2))throw Error('INVALID_FEATURE_PROFILE');
 if(['v6','v7','v8','v9'].includes(version)&&!((language==='ru'&&characterWeight===2)||(language==='en'&&(dimensions===8192?characterWeight===2:characterWeight===1))))throw Error('INVALID_FEATURE_PROFILE');
 const allExamples=buildTrainingSet(version);
 const languages=language?[language]:['ru','en'];
 const examples=Object.fromEntries(Object.entries(allExamples).map(([label,byLocale])=>
  [label,Object.fromEntries(languages.map(locale=>[locale,byLocale[locale]]))]));
 const {labels:labelMap,weights,bias,sampleCount}=fitNativeIntent(examples,{balancePower,characterWeight,dimensions});
 const baseVersion=language?`hh-native-intent-${language}-research-${version}`:
  version==='v4'?'hh-native-intent-ru-en-research-611-v4':version==='v3'?'hh-native-intent-ru-en-research-563-v3':
  version==='v2'?'hh-native-intent-ru-en-research-479-v2':'hh-native-intent-ru-en-research-361-v1';
 const modelVersion=baseVersion+(balancePower===.5?'-balanced-sqrt':balancePower===1?'-balanced-full':'')+(dimensions===8192?'-char2-8192-v1':characterWeight===2?'-ru-char2-v1':'');
 const payload={schemaVersion:dimensions===8192?5:4,modelVersion,featureVersion:NATIVE_INTENT_VERSION,featureProfile:dimensions===8192?'char2-8192-v1':characterWeight===2?'ru-char2-v1':'base-v1',
  ...(dimensions===8192?{featureDimensions:dimensions}:{}),
  ...(balancePower?{balancePower}:{}),
  languages,sampleCount,datasetHash:digest(examples),holdoutHash:digest(publishedGoldRaw),
  trainingCodeSha:digest(readFileSync(new URL(import.meta.url),'utf8')+readFileSync(new URL('../lib/holistic-support/native-intent-training.mjs',import.meta.url),'utf8')),
  featureCodeSha:digest(readFileSync(new URL('../lib/holistic-support/native-intent-features.mjs',import.meta.url),'utf8')),
  predictorCodeSha:digest(readFileSync(new URL('../lib/holistic-support/native-intent-predict.mjs',import.meta.url),'utf8')),
  evaluationHash:null,labelMap,weights:weights.map(w=>Array.from(w)),bias:Array.from(bias)};
 return {...payload,integrity:digest(payload)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),options={};
 if(args.length%2)throw Error('INVALID_ARGUMENTS');
 for(let i=0;i<args.length;i+=2){if(!['--output','--language','--dataset','--balance','--feature-profile'].includes(args[i])||options[args[i]])throw Error('INVALID_ARGUMENTS');options[args[i]]=args[i+1];}
 if(!options['--output'])throw Error('OUTPUT_REQUIRED');
 const balances={none:0,sqrt:.5,full:1},balance=options['--balance']||'none';
 if(!Object.hasOwn(balances,balance))throw Error('INVALID_BALANCE');
 const profiles={'base-v1':{weight:1,dimensions:1024},'ru-char2-v1':{weight:2,dimensions:1024},'char2-8192-v1':{weight:2,dimensions:8192}},profile=options['--feature-profile']||'base-v1';
 if(!Object.hasOwn(profiles,profile))throw Error('INVALID_FEATURE_PROFILE');
 const artifact=trainRuEnArtifact(options['--language']||null,options['--dataset']||'v1',{balancePower:balances[balance],characterWeight:profiles[profile].weight,dimensions:profiles[profile].dimensions});writeFileSync(options['--output'],JSON.stringify(artifact),{flag:'wx'});
 console.log(JSON.stringify({modelVersion:artifact.modelVersion,languages:artifact.languages,sampleCount:artifact.sampleCount,
  datasetHash:artifact.datasetHash,integrity:artifact.integrity,evaluationHash:artifact.evaluationHash}));
}
