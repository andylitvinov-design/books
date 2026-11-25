import {nativeFeatures,NATIVE_FEATURE_DIMENSIONS} from './native-intent-features.mjs';

/** Deterministic first-party fit used by the existing classifier and offline research. */
export function fitNativeIntent(examples,{balancePower=0,characterWeight=1,dimensions=NATIVE_FEATURE_DIMENSIONS}={}){
 if(![0,.5,1].includes(balancePower))throw Error('INVALID_BALANCE');
 if(![1,2].includes(characterWeight)||![NATIVE_FEATURE_DIMENSIONS,8192].includes(dimensions))throw Error('INVALID_FEATURE_PROFILE');
 const labels=Object.keys(examples),samples=[];
 for(const [label,byLocale] of Object.entries(examples))for(const phrases of Object.values(byLocale))
  for(const phrase of phrases)samples.push({index:labels.indexOf(label),features:nativeFeatures(phrase,characterWeight,dimensions)});
 if(samples.length===0)throw Error('INVALID_TRAINING_EXAMPLES');
 const counts=labels.map((_,i)=>samples.filter(sample=>sample.index===i).length);
 if(counts.some(count=>count===0))throw Error('INVALID_TRAINING_EXAMPLES');
 const average=samples.length/labels.length;
 const classWeights=counts.map(count=>Math.pow(average/count,balancePower));
 const weights=labels.map(()=>new Float64Array(dimensions));
 const bias=new Float64Array(labels.length),tmp=new Float64Array(labels.length);
 const gcd=(a,b)=>b?gcd(b,a%b):a;let stride=137;while(gcd(stride,samples.length)!==1)stride++;
 for(let epoch=0;epoch<78;epoch++){
  const lr=.19/(1+epoch/24);
  for(let n=0;n<samples.length;n++){
   const sample=samples[(n*stride+epoch*41)%samples.length];let max=-Infinity;
   for(let c=0;c<labels.length;c++){
    let score=bias[c];for(const [i,x] of sample.features)score+=weights[c][i]*x;
    tmp[c]=score;if(score>max)max=score;
   }
   let total=0;for(let c=0;c<labels.length;c++){tmp[c]=Math.exp(tmp[c]-max);total+=tmp[c];}
   for(let c=0;c<labels.length;c++){
    const delta=lr*classWeights[sample.index]*((c===sample.index?1:0)-tmp[c]/total);bias[c]+=delta;
    for(const [i,x] of sample.features)weights[c][i]+=delta*x;
   }
  }
 }
 return {labels,weights,bias,sampleCount:samples.length,...(characterWeight===1?{}:{characterWeight}),...(dimensions===NATIVE_FEATURE_DIMENSIONS?{}:{dimensions})};
}
