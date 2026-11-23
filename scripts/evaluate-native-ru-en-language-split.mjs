/** Compare language-specific training with combined training on identical internal folds.
 * Research only: these synthetic folds are not a blind acceptance test. */
import {makeRuEnFolds,scoreRuEnPredictions} from './evaluate-native-ru-en-internal.mjs';
import {fitNativeIntent} from '../lib/holistic-support/native-intent-training.mjs';
import {predictNativeIntent} from '../lib/holistic-support/native-intent-predict.mjs';
import {nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';

const folds=makeRuEnFolds('v4',{extendedNegatives:true});
const result={method:'same internal synthetic three-fold splits; guarded; not blind',languages:{}};
for(const locale of ['ru','en']){
 const results={};
 for(const mode of ['combined','languageSpecific']){
  const rows=[];let labels=[];
  for(const {training,validation} of folds){
   labels=Object.keys(training);
   const input=mode==='combined'?training:Object.fromEntries(Object.entries(training).map(([label,locales])=>[label,{[locale]:locales[locale]}]));
   const model=fitNativeIntent(input,{balancePower:.5});
   for(const row of validation.filter(item=>item.locale===locale)){
    const prediction=predictNativeIntent(model,row.message);
    rows.push({...row,intent:prediction.intent,accepted:prediction.accepted&&nativeSecretaryAllowsUtterance(row.message)&&nativeSecretaryAllowsIntent(row.message,locale,prediction.intent)});
   }
  }
  results[mode]=scoreRuEnPredictions(rows,labels);
 }
 result.languages[locale]=results;
}
console.log(JSON.stringify(result,null,2));
