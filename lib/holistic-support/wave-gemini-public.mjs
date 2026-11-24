// Shared Wave public-knowledge adapter. Never send raw messages, history,
 // identifiers, personal facts, private prompts or CRM data to Gemini Free.
import {geminiCoachTextConfig,verifiedGeminiCoachingReply} from '../coaching/gemini-coach-text.mjs';
import {assessRoleReply} from './role-output-guard.mjs';

const topics=Object.freeze({
 coaching:{ru:['что такое коучинг','что значит коучинг'],en:['what is coaching','what does coaching mean'],es:['que es el coaching','que significa coaching'],fact:'Coaching is a structured nonclinical conversation supporting reflection, goal clarification and action; it is not diagnosis or treatment.'},
 goal:{ru:['что такое smart цель','что такое смарт цель','что такое smart цели'],en:['what is a smart goal','what are smart goals'],es:['que es una meta smart','que son las metas smart'],fact:'SMART is a common framework: specific, measurable, achievable, relevant and time-bound.'},
 grow:{ru:['что такое модель grow','что такое grow'],en:['what is the grow model','what is grow coaching'],es:['que es el modelo grow','que es grow'],fact:'GROW is a coaching framework: Goal, Reality, Options, Will or Way Forward.'},
 reiki:{ru:['что такое рейки','что означает рейки'],en:['what is reiki','what does reiki mean'],es:['que es reiki','que significa reiki'],fact:'Reiki is a Japanese complementary wellness practice; evidence does not establish it as a treatment for disease. Do not describe medical benefits or offer medical advice.'},
});
const languages=Object.freeze({ru:'Russian',en:'English',es:'Spanish'});
const normalize=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/^[¿¡]+|[?!.]+$/gu,'').replace(/\s+/gu,' ').trim();
// Only an exact reviewed public question is eligible. No fuzzy matching or PII redaction.
export function waveGeminiPublicTopic(message,locale){
 if(typeof message!=='string'||message.length>120||!Object.hasOwn(languages,locale)||/[\r\n]/u.test(message))return null;
 const text=normalize(message);
 return Object.entries(topics).find(([,topic])=>topic[locale].some(q=>normalize(q)===text))?.[0]??null;
}
export function waveGeminiPublicEligibility(metadata){
 // This is server-controlled app_metadata from auth.getUser, never user_metadata
 // or untrusted request fields. Absent/expired consent or unknown region => no calls.
 return metadata?.version===1&&metadata?.adultVerified===true&&
  metadata?.eligibleRegionVerified===true&&metadata?.publicGeminiConsent===true&&
  Number.isSafeInteger(metadata?.expiresAtMs)&&metadata.expiresAtMs>Date.now();
}
export function waveGeminiPublicQuota(actorId){
 return [
  {bucket:{op:'my-coach-gemini_free-global-day'},limit:30,seconds:86400},
  {bucket:{op:'my-coach-gemini_free-actor-day',actor:actorId},limit:16,seconds:86400},
  {bucket:{op:'wave-gemini-free-public-actor-minute',actor:actorId},limit:4,seconds:60},
 ];
}
export async function waveGeminiPublicReply({message,locale,eligible=false,env=process.env,reserve,signal,fetcher}={}){
 if(!eligible||env.HH_WAVE_GEMINI_PUBLIC_ENABLED!=='true'||
  env.HH_WAVE_GEMINI_FREE_BILLING_DISABLED_CONFIRMED!=='true'||
  typeof reserve!=='function')return null;
 const topic=waveGeminiPublicTopic(message,locale);
 if(!topic)return null;
 const config=geminiCoachTextConfig(env,'gemini_free');
 if(!config)return null;
 // Only constants leave the server; no request-derived strings other than
 // finite language/topic selection. Director retains actions and state.
 const messages=[
  {role:'system',content:'Return only JSON {"reply":"..."} in '+languages[locale]+'. Explain the supplied public concept in 1–3 concise sentences. Use only supplied facts. No medical advice, services, recommendations, prices, URLs, questions, personal claims or actions.'},
  {role:'user',content:topics[topic].fact},
 ];
 try{
  await reserve();
  const result=await verifiedGeminiCoachingReply(config,{messages},fetcher,signal);
  const obj=JSON.parse(result.text);
  if(!obj||Object.keys(obj).length!==1||typeof obj.reply!=='string')return null;
  const reply=obj.reply.trim();
  if(reply.length<10||reply.length>600||/[?？<>]/u.test(reply)||/https?:|www\.|\d|\p{Sc}/iu.test(reply)||
    !assessRoleReply({text:reply,locale,role:'secretary'}).ok)return null;
  return {reply,source:'gemini-free-public',modelUsed:true};
 }catch{return null;}
}
