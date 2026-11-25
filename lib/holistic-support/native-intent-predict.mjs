import {nativeFeatures,NATIVE_FEATURE_DIMENSIONS} from './native-intent-features.mjs';

/** Shared first-party inference used by both the runtime and offline tests. */
export function predictNativeIntent(model,message){
 if(typeof message!=='string'||message.trim().length<2||message.length>600)
  return {intent:null,score:0,margin:0,accepted:false};
 const features=nativeFeatures(message,model.characterWeight??1,model.dimensions??NATIVE_FEATURE_DIMENSIONS);
 if(!features.length)return {intent:null,score:0,margin:0,accepted:false};
 const {labels,weights,bias}=model;
 const scores=labels.map((_,c)=>{
  let score=bias[c];for(const [i,v] of features)score+=weights[c][i]*v;return score;
 });
 const ranked=scores.map((score,index)=>({score,index})).sort((a,b)=>b.score-a.score);
 const max=ranked[0].score,p=1/scores.reduce((sum,s)=>sum+Math.exp(s-max),0),margin=max-ranked[1].score;
 // Score is not a probability that the entire interpretation is correct.
 return {intent:labels[ranked[0].index],score:+p.toFixed(3),margin:+margin.toFixed(3),accepted:p>=.47&&margin>=.42};
}
