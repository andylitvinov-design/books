/** First-party, dependency-free text features; deterministic across Node versions. */
export const NATIVE_FEATURE_DIMENSIONS = 1024;
export const NATIVE_INTENT_VERSION = 'hh-native-intent-v1';
export function normalizeNativeText(text) {
  return String(text ?? '').toLocaleLowerCase('en').replace(/ё/g,'е')
    .normalize('NFD').replace(/[\u0300-\u036f]/gu,'').replace(/[’']/gu,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/gu,' ').trim();
}
function indexOf(text) {
  let hash = 2166136261;
  for (let i=0;i<text.length;i++) hash=Math.imul(hash^text.charCodeAt(i),16777619);
  return (hash>>>0)%NATIVE_FEATURE_DIMENSIONS;
}
export function nativeFeatures(value) {
  const text=normalizeNativeText(value).slice(0,280);
  if (!text) return [];
  const terms=text.split(' ').filter(Boolean);
  const counts=new Map();
  const add=(str,weight)=>{const key=indexOf(str);counts.set(key,(counts.get(key)||0)+weight);};
  for (const word of terms){
    add('w:'+word,2.5);
    const chars='^'+word+'$';
    for (const n of [3,4]) for(let i=0;i+n<=chars.length;i++) add('c:'+chars.slice(i,i+n),1);
  }
  for(let i=0;i+1<terms.length;i++) add('b:'+terms[i]+' '+terms[i+1],1.75);
  const vector=[...counts];
  const norm=Math.hypot(...vector.map(x=>x[1]))||1;
  return vector.map(([idx,w])=>[idx,w/norm]);
}
