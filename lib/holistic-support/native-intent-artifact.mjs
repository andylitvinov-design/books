/** Validates pinned first-party intent artifacts before inference. */
import {createHash} from 'node:crypto';
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../../data/holistic-support/native-secretary-examples.mjs';
import {NATIVE_FEATURE_DIMENSIONS,NATIVE_INTENT_VERSION} from './native-intent-features.mjs';
import {predictNativeIntent} from './native-intent-predict.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
const finiteWeight=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000;
const labels=Object.keys(NATIVE_SECRETARY_EXAMPLES_V1);
const abstain=()=>({intent:null,score:0,margin:0,accepted:false});

/** `pin` must come from a separately reviewed immutable source, never the artifact itself. */
export function loadNativeIntentArtifact(artifact,pin){
 if(!pin||!hex(pin.integrity)||!hex(pin.featureCodeSha)||!hex(pin.predictorCodeSha)||typeof pin.modelVersion!=='string'||!pin.modelVersion)throw Error('ARTIFACT_PIN');
 if(!artifact||typeof artifact!=='object'||Array.isArray(artifact))throw Error('ARTIFACT_INVALID');
 const {integrity,...payload}=artifact;
 if(!hex(integrity)||integrity!==pin.integrity||digest(payload)!==integrity)throw Error('ARTIFACT_INTEGRITY');
 const schema4=payload.schemaVersion===4&&payload.featureDimensions===undefined&&
   (payload.featureProfile==='base-v1'&&[['ru','en'],['ru'],['en']].some(languages=>JSON.stringify(payload.languages)===JSON.stringify(languages))||
    payload.featureProfile==='ru-char2-v1'&&JSON.stringify(payload.languages)===JSON.stringify(['ru']));
 const schema5=payload.schemaVersion===5&&payload.featureDimensions===8192&&payload.featureProfile==='char2-8192-v1'&&
   [['ru'],['en']].some(languages=>JSON.stringify(payload.languages)===JSON.stringify(languages));
 const dimensions=schema5?8192:NATIVE_FEATURE_DIMENSIONS;
 if(!(schema4||schema5)||payload.modelVersion!==pin.modelVersion||payload.featureVersion!==NATIVE_INTENT_VERSION||
   !(payload.balancePower===undefined||payload.balancePower===.5||payload.balancePower===1)||
   !Number.isSafeInteger(payload.sampleCount)||payload.sampleCount<1||payload.sampleCount>100000||
   !hex(payload.datasetHash)||!hex(payload.holdoutHash)||!hex(payload.trainingCodeSha)||payload.featureCodeSha!==pin.featureCodeSha||payload.predictorCodeSha!==pin.predictorCodeSha||
   !(payload.evaluationHash===null||hex(payload.evaluationHash))||
   JSON.stringify(payload.labelMap)!==JSON.stringify(labels)||
   !Array.isArray(payload.weights)||payload.weights.length!==labels.length||
   payload.weights.some(row=>!Array.isArray(row)||row.length!==dimensions||!row.every(finiteWeight))||
   !Array.isArray(payload.bias)||payload.bias.length!==labels.length||!payload.bias.every(finiteWeight))throw Error('ARTIFACT_SCHEMA');
 const model={labels:[...payload.labelMap],weights:payload.weights.map(row=>Float64Array.from(row)),bias:Float64Array.from(payload.bias),
  characterWeight:payload.featureProfile==='ru-char2-v1'||schema5?2:1,dimensions};
 return message=>predictNativeIntent(model,message);
}

/** Invalid artifacts and unsupported locales fall back to the previous model. */
export function createNativeArtifactSelector({enabled=false,artifact=null,pin=null,fallback,fallbackVersion=NATIVE_INTENT_VERSION}={}){
 if(typeof fallback!=='function')throw Error('FALLBACK_REQUIRED');
 let candidate=null,allowedLocales=[],candidateVersion=null;
 if(enabled===true){try{candidate=loadNativeIntentArtifact(artifact,pin);allowedLocales=[...artifact.languages];candidateVersion=pin.modelVersion;}catch{/* Invalid artifacts are never used. */}}
 const base=message=>({prediction:fallback(message)||abstain(),modelVersion:fallbackVersion});
 return {available:Boolean(candidate),classify(message,locale){
  if(!candidate||!allowedLocales.includes(locale))return base(message);
  try{return {prediction:candidate(message),modelVersion:candidateVersion};}catch{return base(message);}
 }};
}
