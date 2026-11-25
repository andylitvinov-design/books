export type AvatarEmotion = 'neutral'|'warm'|'attentive'|'concerned'|'curious'|'encouraging'|'grounded';
export type EmotionDecision = {emotion:AvatarEmotion;confidence:number;intensity:0|1|2};
export function classifyAvatarEmotion(text:string,locale?:'ru'|'en'|'es'):EmotionDecision;
