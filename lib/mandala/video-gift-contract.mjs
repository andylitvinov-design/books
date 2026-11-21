/** Client-safe, deterministic Personal Video Gift composition contract.
 * No network, providers, accounts, images or credentials in this module.
 */
export const VIDEO_GIFT_DURATION=25;
export const VIDEO_GIFT_BEATS=Object.freeze([
  Object.freeze({id:"intro",from:0,to:3}),
  Object.freeze({id:"portrait",from:3,to:8}),
  Object.freeze({id:"message",from:8,to:19}),
  Object.freeze({id:"outro",from:19,to:25}),
]);
export const VIDEO_GIFT_OCCASIONS=Object.freeze([
  "birthday","love","thanks","support","anniversary","custom"
]);
export const VIDEO_GIFT_FREE_MOTIONS=Object.freeze(["zoom","pan","float"]);
export const VIDEO_GIFT_AI_MOTIONS=Object.freeze(["smile","blink","turn","wave"]);
export const VIDEO_GIFT_PALETTES=Object.freeze(["sunrise","rose","ocean","forest"]);
export const VIDEO_GIFT_SOUNDTRACKS=Object.freeze(["none","forest","breeze","crystal","voice"]);
const localeSet=new Set(["ru","en","es"]);
const occasionSet=new Set(VIDEO_GIFT_OCCASIONS);
const motionSet=new Set([...VIDEO_GIFT_FREE_MOTIONS,...VIDEO_GIFT_AI_MOTIONS]);
const paletteSet=new Set(VIDEO_GIFT_PALETTES);
const soundtrackSet=new Set(VIDEO_GIFT_SOUNDTRACKS);
const maxChars=(value,max)=>{
  if(typeof value!=="string")throw new TypeError("invalid_gift_text");
  const normalized=value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f]/g," ").trim();
  if(!normalized||Array.from(normalized).length>max)throw new TypeError("invalid_gift_text");
  return normalized;
};
const occasionCopy={
  ru:{
    birthday:["С днём рождения","Пусть каждый день приносит тебе радость, тепло и новые открытия.","Счастья и вдохновения!"],
    love:["С любовью","Ты делаешь этот мир теплее. Спасибо, что ты рядом.","Обнимаю сердцем!"],
    thanks:["Спасибо тебе","Я очень ценю твою доброту, заботу и всё, что ты делаешь.","С благодарностью и теплом!"],
    support:["Ты не один","Даже маленький шаг имеет значение. Я верю в тебя и всегда готов поддержать.","Всё получится!"],
    anniversary:["С годовщиной","С любовью вспоминаю прекрасные моменты и радуюсь тому, что впереди.","За новые счастливые главы!"],
    custom:["Для тебя","Пусть это тёплое послание напомнит, как много ты значишь.","С самыми добрыми пожеланиями!"],
  },
  en:{
    birthday:["Happy birthday","Wishing you warmth, joy and wonderful discoveries in the year ahead.","With all my best wishes!"],
    love:["With love","You make the world brighter. Thank you for being in my life.","Sending all my love!"],
    thanks:["Thank you","Your kindness and care mean more to me than words can say.","With gratitude and warmth!"],
    support:["I'm here for you","Every small step matters. I believe in you and am always here for you.","You've got this!"],
    anniversary:["Happy anniversary","Grateful for our wonderful memories and excited for the chapters ahead.","To many more beautiful moments!"],
    custom:["Just for you","I hope this little message reminds you how much you mean to me.","Wishing you the very best!"],
  },
  es:{
    birthday:["Feliz cumpleaños","Que este año te traiga alegría, cariño y nuevos descubrimientos.","¡Mis mejores deseos!"],
    love:["Con amor","Haces que el mundo sea más luminoso. Gracias por estar en mi vida.","¡Todo mi cariño!"],
    thanks:["Gracias","Tu bondad y tu apoyo significan muchísimo para mí.","¡Con gratitud y cariño!"],
    support:["Estoy contigo","Cada pequeño paso importa. Creo en ti y aquí estoy para acompañarte.","¡Tú puedes!"],
    anniversary:["Feliz aniversario","Agradezco los recuerdos hermosos y espero con ilusión los que vienen.","¡Por muchos momentos felices!"],
    custom:["Para ti","Espero que este mensaje te recuerde cuánto significas para mí.","¡Mis mejores deseos!"],
  }
};
export function suggestVideoGiftText(locale,occasion){
  if(!localeSet.has(locale)||!occasionSet.has(occasion))throw new TypeError("invalid_gift_template");
  const [intro,message,finalWish]=occasionCopy[locale][occasion];
  return {intro,message,finalWish};
}
export function videoGiftStage(second){
  if(!Number.isFinite(second))throw new TypeError("invalid_gift_time");
  const bounded=Math.min(VIDEO_GIFT_DURATION-0.0001,Math.max(0,second));
  return VIDEO_GIFT_BEATS.find(beat=>bounded>=beat.from&&bounded<beat.to).id;
}
/** Must be checked again by the paid backend, never interpreted as provider authorization. */
export function validateVideoGiftDraft(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("invalid_gift_draft");
  const {locale,occasion,recipient,sourceOwner,rightsConfirmed,subjectConsent,
    guardianConsent,motion,palette,aspect,requestMusic,message,finalWish}=input;
  if(!localeSet.has(locale)||!occasionSet.has(occasion)||!motionSet.has(motion)||
    !paletteSet.has(palette)||!["portrait","landscape"].includes(aspect)||
    !soundtrackSet.has(requestMusic))throw new TypeError("invalid_gift_choice");
  if(!["self","other","minor"].includes(sourceOwner)||rightsConfirmed!==true||
    (sourceOwner!=="self"&&subjectConsent!==true)||
    (sourceOwner==="minor"&&guardianConsent!==true))
    throw new TypeError("gift_consent_required");
  const title=maxChars(recipient,64);
  const words=maxChars(message,500);
  const ending=maxChars(finalWish,140);
  return Object.freeze({
    locale,occasion,recipient:title,sourceOwner,
    motion,palette,aspect,requestMusic,message:words,finalWish:ending,
    durationSeconds:VIDEO_GIFT_DURATION,
    requiresPaidAnimation:VIDEO_GIFT_AI_MOTIONS.includes(motion)
  });
}
