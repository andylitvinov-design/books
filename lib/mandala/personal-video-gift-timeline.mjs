/** Personal Video Gift: a local-only, 25-second composition plan. No likeness inference. */
export const VIDEO_GIFT_DURATION=25;
export const VIDEO_GIFT_SCENES=Object.freeze([
  Object.freeze({id:"intro",start:0,end:3}),
  Object.freeze({id:"photo",start:3,end:8}),
  Object.freeze({id:"message",start:8,end:19}),
  Object.freeze({id:"outro",start:19,end:25}),
]);
export const VIDEO_GIFT_OCCASIONS=Object.freeze(["birthday","love","thanks","support","anniversary","custom"]);
export const VIDEO_GIFT_MOTIONS=Object.freeze(["gentle-zoom","soft-pan","still"]);
const TEMPLATES=Object.freeze({
  ru:{
    birthday:"С днём рождения, {name}! Пусть в твоей жизни будет больше света, радости и любви.",
    love:"{name}, ты очень дорогой мне человек. Спасибо, что ты есть в моей жизни.",
    thanks:"Спасибо тебе, {name}, за доброту, поддержку и моменты, которые мы разделяем.",
    support:"{name}, я рядом. Пусть у тебя найдутся силы, спокойствие и надежда.",
    anniversary:"С нашей годовщиной, {name}! Пусть впереди ждёт ещё много тёплых мгновений.",
    custom:"{name}, желаю тебе тепла, вдохновения и прекрасных моментов.",
    ending:"С теплом и любовью",
  },
  en:{
    birthday:"Happy birthday, {name}! May your days be filled with light, joy and love.",
    love:"{name}, you mean so much to me. Thank you for being in my life.",
    thanks:"Thank you, {name}, for your kindness, support and the moments we share.",
    support:"{name}, you are not alone. Wishing you strength, peace and hope.",
    anniversary:"Happy anniversary, {name}! Here's to many more beautiful moments together.",
    custom:"{name}, wishing you warmth, inspiration and wonderful moments.",
    ending:"With warmth and love",
  },
  es:{
    birthday:"¡Feliz cumpleaños, {name}! Que tu vida esté llena de luz, alegría y amor.",
    love:"{name}, eres muy importante para mí. Gracias por formar parte de mi vida.",
    thanks:"Gracias, {name}, por tu cariño, apoyo y los momentos compartidos.",
    support:"{name}, estoy a tu lado. Te deseo fuerza, calma y esperanza.",
    anniversary:"¡Feliz aniversario, {name}! Que nos esperen muchos momentos hermosos.",
    custom:"{name}, te deseo cariño, inspiración y momentos maravillosos.",
    ending:"Con cariño y amor",
  },
});
export function giftSceneAt(seconds){
  if(!Number.isFinite(seconds))throw new TypeError("invalid_gift_time");
  return VIDEO_GIFT_SCENES.find(beat=>seconds>=beat.start&&seconds<beat.end)||
    VIDEO_GIFT_SCENES[seconds>=VIDEO_GIFT_DURATION?3:0];
}
export function giftSuggestedText(locale,occasion,name=""){
  const language=Object.hasOwn(TEMPLATES,locale)?locale:"en";
  const selected=VIDEO_GIFT_OCCASIONS.includes(occasion)?occasion:"custom";
  const person=String(name).trim().slice(0,50)||
    (language==="ru"?"друг":language==="es"?"amigo":"friend");
  return TEMPLATES[language][selected].replaceAll("{name}",person);
}
export function giftEnding(locale){return (TEMPLATES[locale]||TEMPLATES.en).ending;}
export function giftCameraAt(seconds,motion){
  const fraction=Math.max(0,Math.min(1,(seconds-3)/22));
  if(motion==="soft-pan")return {scale:1.08,dx:(fraction-.5)*.055,dy:0};
  if(motion==="gentle-zoom")return {scale:1.0+.075*fraction,dx:0,dy:0};
  return {scale:1,dx:0,dy:0};
}
export function giftCanUsePhoto({hasPhoto=false,rights=false,subject="self",subjectPermission=false,guardianPermission=false}={}){
  return Boolean(hasPhoto&&rights&&(
    subject==="self"||(subject==="adult"&&subjectPermission)||
    (subject==="minor"&&subjectPermission&&guardianPermission)
  ));
}
