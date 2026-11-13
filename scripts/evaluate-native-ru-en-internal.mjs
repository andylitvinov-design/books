/** Internal synthetic three-fold diagnostics. Not a blind or LIVE evaluation. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {buildTrainingSet} from './train-native-ru-en-offline.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {normalizeNativeText} from '../lib/holistic-support/native-intent-features.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';
const negatives=JSON.parse(readFileSync(new URL('../tests/fixtures/native-ai-ru-en-internal-negatives-v1.json',import.meta.url),'utf8'));
const ood=JSON.parse(readFileSync(new URL('../tests/fixtures/native-ai-ru-en-ood-v1.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const ratio=(a,b)=>b?a/b:0;

export function makeRuEnFolds(version='v2',{extendedNegatives=false}={}){
 const data=buildTrainingSet(version);
 if(Object.keys(negatives).sort().join(',')!=='en,ru'||!['ru','en'].every(l=>Array.isArray(negatives[l])))throw Error('INVALID_NEGATIVES');
 const allNegatives=Object.fromEntries(['ru','en'].map(locale=>[locale,[...negatives[locale].map(message=>({message,category:'general'})),
  ...(extendedNegatives?Object.entries(ood[locale]).flatMap(([category,messages])=>messages.map(message=>({message,category}))):[])]]));
 const seen=new Set(Object.values(data).flatMap(v=>[...v.ru,...v.en]).map(normalizeNativeText));
 for(const {message:phrase} of [...allNegatives.ru,...allNegatives.en]){
  const key=normalizeNativeText(phrase);
  if(!key||seen.has(key))throw Error('NEGATIVE_DUPLICATE');seen.add(key);
 }
 return Array.from({length:3},(_,fold)=>{
  const training={},validation=[];
  for(const [label,locales] of Object.entries(data)){
   training[label]={};
   for(const locale of ['ru','en']){
    const sorted=[...locales[locale]].sort((a,b)=>hash(label+'|'+locale+'|'+normalizeNativeText(a)).localeCompare(hash(label+'|'+locale+'|'+normalizeNativeText(b))));
    training[label][locale]=sorted.filter((_,i)=>i%3!==fold);
    for(const message of sorted.filter((_,i)=>i%3===fold))validation.push({locale,message,expected:label});
   }
  }
  for(const locale of ['ru','en'])for(const {message,category} of allNegatives[locale].filter((_,i)=>i%3===fold))
   validation.push({locale,message,expected:null,category});
  return {training,validation};
 });
}
export function scoreRuEnPredictions(rows,labels){
 const positive=rows.filter(x=>x.expected!==null),negative=rows.filter(x=>x.expected===null);
 const correct=positive.filter(x=>x.accepted&&x.intent===x.expected).length;
 const wrongAccepted=positive.filter(x=>x.accepted&&x.intent!==x.expected).length;
 const falseAccepts=negative.filter(x=>x.accepted).length;
 const perClass=Object.fromEntries(labels.map(label=>{
  const tp=positive.filter(x=>x.accepted&&x.intent===label&&x.expected===label).length;
  const fp=rows.filter(x=>x.accepted&&x.intent===label&&x.expected!==label).length;
  const fn=positive.filter(x=>x.expected===label&&(!x.accepted||x.intent!==label)).length;
  const support=positive.filter(x=>x.expected===label).length;
  return [label,{support,truePositive:tp,falsePositive:fp,falseNegative:fn,
   recall:ratio(tp,support),precision:ratio(tp,tp+fp),f1:ratio(2*tp,2*tp+fp+fn)}];
 }));
 const confusions={};
 for(const row of positive.filter(x=>x.accepted&&x.intent!==x.expected)){
  const key=row.expected+'->'+row.intent;confusions[key]=(confusions[key]||0)+1;
 }
 return {positive:positive.length,negative:negative.length,correct,wrongAccepted,falseAccepts,
  abstainedPositive:positive.filter(x=>!x.accepted).length,perClass,confusions,
  accuracy:ratio(correct+negative.length-falseAccepts,rows.length),recall:ratio(correct,positive.length),
  precision:ratio(correct,correct+wrongAccepted+falseAccepts),macroF1:ratio(Object.values(perClass).reduce((a,b)=>a+b.f1,0),labels.length)};
}
export function evaluateRuEnInternal(version='v2',options={}){
 const rows=[],labels=Object.keys(buildTrainingSet(version));
 for(const {training,validation} of makeRuEnFolds(version,options)){
  const model=options.splitLanguage?null:fitNativeIntent(training,{balancePower:options.balancePower??0});
  const perLocale=options.splitLanguage?Object.fromEntries(['ru','en'].map(locale=>[locale,fitNativeIntent(
   Object.fromEntries(Object.entries(training).map(([label,locales])=>[label,{[locale]:locales[locale]}])),
   {balancePower:options.balancePower??0,characterWeight:locale==='ru'&&options.ruChar2?2:1})])):null;
  for(const row of validation){
   const start=performance.now(),prediction=predictNativeIntent(perLocale?perLocale[row.locale]:model,row.message),ms=performance.now()-start;
   rows.push({...row,intent:prediction.intent,accepted:prediction.accepted,
    secretaryEligible:prediction.accepted&&nativeSecretaryAllowsUtterance(row.message)&&nativeSecretaryAllowsIntent(row.message,row.locale,prediction.intent),ms});
  }
 }
 return Object.fromEntries(['ru','en'].map(locale=>{
  const subset=rows.filter(x=>x.locale===locale),times=subset.map(x=>x.ms).sort((a,b)=>a-b);
  const negative=subset.filter(row=>row.expected===null),negativeByCategory={};
  for(const row of negative){
   const item=negativeByCategory[row.category]??={total:0,falseAccepts:0,secretaryEligible:0};
   item.total++;if(row.accepted)item.falseAccepts++;if(row.secretaryEligible)item.secretaryEligible++;
  }
  return [locale,{...scoreRuEnPredictions(subset,labels),
   guarded:scoreRuEnPredictions(subset.map(row=>({...row,accepted:row.secretaryEligible})),labels),negativeByCategory,
   p50ms:times[Math.floor(times.length*.5)],p95ms:times[Math.floor(times.length*.95)]}];
 }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 const options={};
 for(let i=0;i<args.length;i+=2){
  if(!['--dataset','--ood','--balance','--split-language','--ru-feature-profile'].includes(args[i])||!args[i+1]||options[args[i]])throw Error('INVALID_ARGUMENTS');
  options[args[i]]=args[i+1];
 }
 if(options['--dataset']&&!['v1','v2','v3','v4','v5','v6','v7','v8','v9'].includes(options['--dataset'])||options['--ood']&&options['--ood']!=='extended')throw Error('INVALID_ARGUMENTS');
 const version=options['--dataset']||'v2',extendedNegatives=options['--ood']==='extended';
 const balances={none:0,sqrt:.5,full:1},balance=options['--balance']||'none';
 if(!Object.hasOwn(balances,balance))throw Error('INVALID_BALANCE');
 const splitLanguage=options['--split-language']==='yes',ruChar2=options['--ru-feature-profile']==='ru-char2-v1';
 if(options['--split-language']&&!splitLanguage||options['--ru-feature-profile']&&!ruChar2||ruChar2&&!splitLanguage||['v5','v6','v7','v8','v9'].includes(version)&&(!ruChar2||!splitLanguage))throw Error('INVALID_ARGUMENTS');
 console.log(JSON.stringify({dataset:'ru-en-'+version,extendedNegatives,balance,splitLanguage,ruFeatureProfile:ruChar2?'ru-char2-v1':'base-v1',method:'three-fold internal synthetic; not blind',metrics:evaluateRuEnInternal(version,{extendedNegatives,balancePower:balances[balance],splitLanguage,ruChar2})}));
}
