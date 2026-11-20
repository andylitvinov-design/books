/**
 * Deterministic, model-free three-fact intake for Telegram Business reviews.
 * The signed Telegram webhook owns identity; its encrypted session owns
 * consent/facts. Never infer a diagnosis or create a service order here.
 */
export const ALI_BUSINESS_REVIEW_VERSION='ali-business-review-triad-v1';
export const ALI_BUSINESS_REVIEW_STAGES=Object.freeze({
 review_understanding:'goal',review_outcome:'challenge',review_action:'situation',
});
const FIELDS=Object.freeze(['goal','challenge','situation']);
const LOCALES=new Set(['ru','en','es']);
const YES=/^(?:да|давайте|согласен(?:а)?|согласна|yes|yes please|sure|sí|si|de acuerdo|claro|confirm|подтвердить|confirmar)[.!\s]*$/iu;
const NO=/^(?:нет|не сейчас|не хочу|нет спасибо|no|no thanks|not now|ahora no|no quiero)[.!\s]*$/iu;
const FAQ=/^(?:а?\s*(?:цена|сколько стоит|как проходит|это бесплатно|как долго)|(?:is this free|how much|what does it cost|how long|how does it work)|(?:cu[aá]nto cuesta|es gratis|c[oó]mo funciona))[?!\.\s]*$/iu;
const META=/^(?:привет|здравствуйте|спасибо|да|ага|ок|хорошо|не знаю|help|hello|hi|thanks|thank you|yes|no|okay|ok|sure|hola|gracias|sí|si|vale|continue|продолжи|send request|отправить запрос|enviar solicitud|подтвердить|confirm|confirmar)[!?.\s]*$/iu;
const CLAIM=/(?:я (?:отправил|прислал|прикрепил|загрузил)|i (?:sent|uploaded|attached)|envi[eé] (?:una|mi)|my photo|мой рисунок|анкета|questionnaire)/iu;
const truncate=x=>String(x||'').trim().slice(0,180);
export function aliBusinessReviewValidated(value){
 if(!value||value.version!==1||value.consented!==true||!value.answers||
   typeof value.answers!=='object'||Array.isArray(value.answers))return null;
 const answers={};
 for(const field of FIELDS){
   const x=value.answers[field];
   if(x!==undefined){
     if(typeof x!=='string'||x.length<3||x.length>180)return null;
     answers[field]=x;
   }
 }
 return {version:1,consented:true,answers};
}
export function aliBusinessReviewConsent(message){
 const text=String(message||'').trim();
 if(YES.test(text))return 'yes';
 if(NO.test(text))return 'no';
 return null;
}
export function aliBusinessReviewAnswer({message='',stage='review_understanding'}={}){
 const field=ALI_BUSINESS_REVIEW_STAGES[stage];
 if(!field)return null;
 const text=truncate(message);
 if(!text||text.length<8||META.test(text)||FAQ.test(text)||CLAIM.test(text)||
   /[?？¿]/u.test(text)||/^\//u.test(text))return null;
 return {field,text,next:stage==='review_understanding'?'review_outcome':
   stage==='review_outcome'?'review_action':'confirm'};
}
export function aliBusinessReviewSummary(locale='en',answers={}){
 const l=LOCALES.has(locale)?locale:'en';
 if(FIELDS.some(x=>typeof answers[x]!=='string'||answers[x].trim().length<3))return null;
 const labels={
  ru:['Цель','Трудность','Сейчас'],
  en:['Goal','Difficulty','Current situation'],
  es:['Objetivo','Dificultad','Situación actual'],
 };
 return FIELDS.map((key,i)=>labels[l][i]+': '+truncate(answers[key])).join('\n').slice(0,480);
}
