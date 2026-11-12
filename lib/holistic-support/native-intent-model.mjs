/** First-party multilingual statistical intent model. No pretrained weights or external inference. */
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../../data/holistic-support/native-secretary-examples.mjs';
import {nativeFeatures,NATIVE_FEATURE_DIMENSIONS,NATIVE_INTENT_VERSION} from './native-intent-features.mjs';
export const NATIVE_SECRETARY_MODEL_VERSION=NATIVE_INTENT_VERSION;
const labels=Object.keys(NATIVE_SECRETARY_EXAMPLES_V1);
const samples=[];
for(const [intent,byLocale] of Object.entries(NATIVE_SECRETARY_EXAMPLES_V1))
  for(const phrases of Object.values(byLocale))for(const phrase of phrases)
    samples.push({index:labels.indexOf(intent),features:nativeFeatures(phrase)});
// Fitted multinomial logistic regression; author-created samples only, training runs
// once per server process. No client text is ever used to update these weights.
const weights=labels.map(()=>new Float64Array(NATIVE_FEATURE_DIMENSIONS));
const bias=new Float64Array(labels.length);
const tmp=new Float64Array(labels.length);
for(let epoch=0;epoch<78;epoch++){
  const lr=.19/(1+epoch/24);
  for(let n=0;n<samples.length;n++){
    const sample=samples[(n*137+epoch*41)%samples.length];
    let max=-Infinity;
    for(let c=0;c<labels.length;c++){
      let score=bias[c];for(const [i,x] of sample.features)score+=weights[c][i]*x;
      tmp[c]=score;if(score>max)max=score;
    }
    let total=0;for(let c=0;c<labels.length;c++){tmp[c]=Math.exp(tmp[c]-max);total+=tmp[c];}
    for(let c=0;c<labels.length;c++){
      const delta=lr*((c===sample.index?1:0)-tmp[c]/total);
      bias[c]+=delta;
      for(const [i,x] of sample.features)weights[c][i]+=delta*x;
    }
  }
}
export function classifyNativeSecretaryIntent(message){
  if(typeof message!=='string'||message.trim().length<2||message.length>600)
    return {intent:null,score:0,margin:0,accepted:false};
  const features=nativeFeatures(message);
  if(!features.length)return {intent:null,score:0,margin:0,accepted:false};
  const scores=labels.map((_,c)=>{
    let score=bias[c];for(const [i,v] of features)score+=weights[c][i]*v;return score;
  });
  const ranked=scores.map((s,i)=>({score:s,index:i})).sort((a,b)=>b.score-a.score);
  const max=ranked[0].score;
  const p=1/scores.reduce((sum,s)=>sum+Math.exp(s-max),0);
  const margin=max-ranked[1].score;
  // Model score is not a probability that the entire interpretation is correct.
  return {intent:labels[ranked[0].index],score:+p.toFixed(3),margin:+margin.toFixed(3),
    accepted:p>=.47 && margin>=.42};
}
