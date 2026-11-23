/** First-party multilingual statistical intent model. No pretrained weights or external inference. */
import {NATIVE_SECRETARY_EXAMPLES_V1} from '../../data/holistic-support/native-secretary-examples.mjs';
import {NATIVE_INTENT_VERSION} from './native-intent-features.mjs';
import {fitNativeIntent} from './native-intent-training.mjs';
import {predictNativeIntent} from './native-intent-predict.mjs';
import {createNativeArtifactSelector} from './native-intent-artifact.mjs';
import ruArtifact from '../../data/holistic-support/native-intent-ru-v7-8192.json' with {type:'json'};
import enArtifact from '../../data/holistic-support/native-intent-en-v8-8192.json' with {type:'json'};
export const NATIVE_SECRETARY_MODEL_VERSION=NATIVE_INTENT_VERSION;
// Fitted multinomial logistic regression; author-created samples only, training runs
// once per server process. No client text is ever used to update these weights.
const model=fitNativeIntent(NATIVE_SECRETARY_EXAMPLES_V1);
export function classifyNativeSecretaryIntent(message){
  return predictNativeIntent(model,message);
}
const codePin={featureCodeSha:'5d11b7eed603ff99b82ac6eb34dd6c2683aeefc1cd4c0a7b462366344f65836c',predictorCodeSha:'7a83cca4f5de1aee4011af646aa95d2e5e7030c57fc76617660bfb2b701b34f8'};
const selectors={
 ru:createNativeArtifactSelector({enabled:true,artifact:ruArtifact,fallback:classifyNativeSecretaryIntent,pin:{...codePin,integrity:'15d79898ae3bd85bd80e067c45717233d5028bba698377539587c2dff1bf67ed',modelVersion:'hh-native-intent-ru-research-v7-balanced-sqrt-char2-8192-v1'}}),
 en:createNativeArtifactSelector({enabled:true,artifact:enArtifact,fallback:classifyNativeSecretaryIntent,pin:{...codePin,integrity:'7b5816dd6f795fa6ab73e1d8df9b829b24e1a21aa95b268ad6c6c226e9c69dc8',modelVersion:'hh-native-intent-en-research-v8-balanced-sqrt-char2-8192-v1'}}),
};
export function classifyNativeSecretaryIntentForLocale(message,locale){
 if(process.env.HH_NATIVE_RU_EN_MODEL_ENABLED!=='false'&&Object.hasOwn(selectors,locale))return selectors[locale].classify(message,locale);
 return {prediction:classifyNativeSecretaryIntent(message),modelVersion:NATIVE_INTENT_VERSION};
}
