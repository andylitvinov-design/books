// Shared Wave public-knowledge adapter. Never send raw messages, history,
 // identifiers, personal facts, private prompts or CRM data to Gemini Free.
import {geminiCoachTextConfig,verifiedGeminiCoachingReply} from '../coaching/gemini-coach-text.mjs';
import {assessRoleReply} from './role-output-guard.mjs';

const topics=Object.freeze({
 coaching:{ru:['что такое коучинг','что значит коучинг'],en:['what is coaching','what does coaching mean'],es:['que es el coaching','que significa coaching'],fact:'Coaching is a structured nonclinical conversation supporting reflection, goal clarification and action; it is not diagnosis or treatment.'},
 goal:{ru:['что такое smart цель','что такое смарт цель','что такое smart цели'],en:['what is a smart goal','what are smart goals'],es:['que es una meta smart','que son las metas smart'],fact:'SMART is a common framework: specific, measurable, achievable, relevant and time-bound.'},
 grow:{ru:['что такое модель grow','что такое grow'],en:['what is the grow model','what is grow coaching'],es:['que es el modelo grow','que es grow'],fact:'GROW is a coaching framework: Goal, Reality, Options, Will or Way Forward.'},
 reiki:{ru:['что такое рейки','что означает рейки'],en:['what is reiki','what does reiki mean'],es:['que es reiki','que significa reiki'],fact:'Reiki is a Japanese complementary wellness practice; evidence does not establish it as a treatment for disease. Do not describe medical benefits or offer medical advice.'},
 clarity:{"ru":["как найти цель","как выбрать цель","как определить цель","с чего начать поиск цели"],"en":["how to find a goal","how to choose a goal","how to identify a goal","how to find purpose"],"es":["como elegir una meta","como encontrar una meta","como definir una meta"],"fact":"Goal clarification starts with identifying what matters, the current situation and a desired change. Compare possible directions and choose a realistic next step."},
 motivation:{"ru":["что такое мотивация","как работает мотивация","как повысить мотивацию"],"en":["what is motivation","how does motivation work","how to improve motivation"],"es":["que es la motivacion","como funciona la motivacion","como aumentar la motivacion"],"fact":"Motivation describes reasons and processes that support action. A meaningful goal, manageable steps and feedback can support sustained effort."},
 resources:{"ru":["что такое личные ресурсы","как найти свои ресурсы","как развивать сильные стороны"],"en":["what are personal resources","how to identify strengths","how to find personal resources"],"es":["que son los recursos personales","como identificar fortalezas","como encontrar recursos personales"],"fact":"Personal resources include skills, knowledge, available time, supportive relationships and practical tools. A resource inventory can help identify available options."},
 planning:{"ru":["как составить план действий","что такое план действий","как разбить цель на шаги"],"en":["how to make an action plan","what is an action plan","how to break a goal into steps"],"es":["como hacer un plan de accion","que es un plan de accion","como dividir una meta en pasos"],"fact":"An action plan connects a specific outcome to manageable tasks, priorities, time frames and a way to review progress. Start small and adapt when new information appears."},
 obstacles:{"ru":["как преодолевать препятствия","как работать с препятствиями","как выявить препятствия"],"en":["how to overcome obstacles","how to identify obstacles","how to work with obstacles"],"es":["como superar obstaculos","como identificar obstaculos","como afrontar obstaculos"],"fact":"A general coaching approach to obstacles is to distinguish what can and cannot be influenced, explore options, and test a small reversible step without self-blame."},
 options:{"ru":["как найти новые возможности","что такое мозговой штурм","как найти альтернативы"],"en":["how to find new opportunities","what is brainstorming","how to find alternatives"],"es":["como encontrar nuevas oportunidades","que es la lluvia de ideas","como encontrar alternativas"],"fact":"Brainstorming separates generating alternatives from evaluating them. Compare options by feasibility, alignment with the goal and potential trade-offs."},
 progress:{"ru":["как отслеживать прогресс","как измерять прогресс","как сохранять движение к цели"],"en":["how to track progress","how to measure progress","how to maintain momentum"],"es":["como medir el progreso","como seguir el progreso","como mantener el impulso"],"fact":"Progress tracking can use a simple indicator, regular review and a record of completed actions. Adjust the plan based on observed results, not assumed success."},
 habits:{"ru":["как формируются привычки","что такое привычка","как сформировать привычку"],"en":["how are habits formed","what is a habit","how to build a habit"],"es":["como se forman los habitos","que es un habito","como crear un habito"],"fact":"Habits are repeated behaviors often associated with a cue or context. Small repeatable actions and a stable cue can make practice easier."},
 values:{"ru":["что такое личные ценности","как определить ценности","как понять свои ценности"],"en":["what are personal values","how to identify personal values","how to clarify values"],"es":["que son los valores personales","como identificar valores personales","como aclarar valores"],"fact":"Values describe enduring priorities that can guide decisions. Clarifying values can help compare goals and choices without prescribing what someone should value."},
 boundaries:{"ru":["что такое личные границы","что такое границы в общении"],"en":["what are personal boundaries","what are boundaries in communication"],"es":["que son los limites personales","que son los limites en la comunicacion"],"fact":"Personal boundaries communicate what a person is willing or not willing to accept. Respectful communication recognizes that each person may decline or change their mind."},
 communication:{"ru":["что такое активное слушание","как работает активное слушание"],"en":["what is active listening","how does active listening work"],"es":["que es la escucha activa","como funciona la escucha activa"],"fact":"Active listening involves attending to what someone says, reflecting their meaning and checking understanding rather than immediately offering advice."},
 meditation:{"ru":["что такое медитация","что означает медитация"],"en":["what is meditation","what does meditation mean"],"es":["que es la meditacion","que significa meditacion"],"fact":"Meditation is an umbrella term for practices involving attention or awareness. It is not a medical treatment or a required part of coaching."},
 mindfulness:{"ru":["что такое осознанность","что такое майндфулнес"],"en":["what is mindfulness","what does mindfulness mean"],"es":["que es la atencion plena","que es mindfulness"],"fact":"Mindfulness is commonly described as attending to present experience with openness and without immediate judgment. It can be discussed as a general nonclinical practice."},
 journaling:{"ru":["что такое дневник целей","зачем вести дневник целей","что такое рефлексия"],"en":["what is a goal journal","why keep a goal journal","what is reflection"],"es":["que es un diario de metas","para que sirve un diario de metas","que es la reflexion"],"fact":"A goal journal can record intentions, actions, observations and adjustments. Reflection means examining experience and learning from it without assuming a diagnosis."},
 business:{"ru":["что такое бизнес цель","как сформулировать бизнес цель","что такое бизнес план"],"en":["what is a business goal","how to define a business goal","what is a business plan"],"es":["que es una meta empresarial","como definir una meta empresarial","que es un plan de negocio"],"fact":"A business goal describes a desired organizational outcome. A plan outlines priorities, resources, assumptions and ways to review results; this is general information, not financial advice."},
 feedback:{"ru":["что такое обратная связь","как использовать обратную связь"],"en":["what is feedback","how to use feedback"],"es":["que es la retroalimentacion","como usar la retroalimentacion"],"fact":"Useful feedback describes observable behavior and its effects, separates observation from interpretation, and can guide a practical adjustment."},
 priorities:{"ru":["что такое приоритеты","объясни приоритеты"],"en":["what is priorities","explain priorities"],"es":["que es prioridades","explica prioridades"],"fact":"Prioritization compares importance, urgency and effort. Choose the next task that best supports the desired outcome."},
 decision:{"ru":["что такое принятие решений","объясни принятие решений"],"en":["what is decision making","explain decision making"],"es":["que es toma de decisiones","explica toma de decisiones"],"fact":"Decision-making can compare alternatives, criteria, uncertainty and reversible next steps. A decision is not a guarantee of success."},
 time:{"ru":["что такое управление временем","объясни управление временем"],"en":["what is time management","explain time management"],"es":["que es gestion del tiempo","explica gestion del tiempo"],"fact":"Time management involves planning available time, grouping tasks and leaving room for breaks and unexpected work."},
 focus:{"ru":["что такое концентрация внимания","объясни концентрация внимания"],"en":["what is focus","explain focus"],"es":["que es concentracion","explica concentracion"],"fact":"Focus means directing attention toward a chosen task. Reducing distractions and choosing one manageable task can support concentration."},
 learning:{"ru":["что такое обучение","объясни обучение"],"en":["what is learning","explain learning"],"es":["que es aprendizaje","explica aprendizaje"],"fact":"Learning can be supported by practice, retrieval, feedback and reviewing material at spaced intervals."},
 creativity:{"ru":["что такое креативность","объясни креативность"],"en":["what is creativity","explain creativity"],"es":["que es creatividad","explica creatividad"],"fact":"Creativity involves generating and developing useful or original possibilities. Exploration and evaluation can be separated."},
 confidence:{"ru":["что такое уверенность в себе","объясни уверенность в себе"],"en":["what is self confidence","explain self confidence"],"es":["que es confianza en uno mismo","explica confianza en uno mismo"],"fact":"Confidence in a task can develop through practice, feedback and noticing evidence of progress. Confidence does not require certainty."},
 assertiveness:{"ru":["что такое ассертивность","объясни ассертивность"],"en":["what is assertiveness","explain assertiveness"],"es":["que es asertividad","explica asertividad"],"fact":"Assertiveness means expressing needs and preferences clearly while respecting the choices and rights of others."},
 empathy:{"ru":["что такое эмпатия","объясни эмпатия"],"en":["what is empathy","explain empathy"],"es":["que es empatia","explica empatia"],"fact":"Empathy involves trying to understand another person's perspective without assuming that their experiences or feelings are known."},
 conflict:{"ru":["что такое конструктивный диалог","объясни конструктивный диалог"],"en":["what is constructive dialogue","explain constructive dialogue"],"es":["que es dialogo constructivo","explica dialogo constructivo"],"fact":"Constructive dialogue can separate observations, needs and requests, listen to different perspectives and seek mutually acceptable next steps."},
 teamwork:{"ru":["что такое командная работа","объясни командная работа"],"en":["what is teamwork","explain teamwork"],"es":["que es trabajo en equipo","explica trabajo en equipo"],"fact":"Teamwork benefits from a shared purpose, clear responsibilities, communication and regular review of results."},
 delegation:{"ru":["что такое делегирование","объясни делегирование"],"en":["what is delegation","explain delegation"],"es":["que es delegacion","explica delegacion"],"fact":"Delegation means assigning a task with agreed expectations, resources, authority and a way to review the outcome."},
 leadership:{"ru":["что такое лидерство","объясни лидерство"],"en":["what is leadership","explain leadership"],"es":["que es liderazgo","explica liderazgo"],"fact":"Leadership can involve communicating a direction, coordinating people, listening to feedback and taking responsibility for decisions."},
 goal_review:{"ru":["что такое ретроспектива","объясни ретроспектива"],"en":["what is retrospective","explain retrospective"],"es":["que es retrospectiva","explica retrospectiva"],"fact":"A retrospective reviews what happened, what worked, what did not, and what to change next. It focuses on learning from evidence."},
 experimentation:{"ru":["что такое маленькие эксперименты","объясни маленькие эксперименты"],"en":["what is small experiments","explain small experiments"],"es":["que es pequenos experimentos","explica pequenos experimentos"],"fact":"A small experiment tests an assumption with limited effort and a clear observation criterion before committing to a larger change."},
 rest:{"ru":["что такое баланс работы и отдыха","объясни баланс работы и отдыха"],"en":["what is work life balance","explain work life balance"],"es":["que es equilibrio entre trabajo y vida","explica equilibrio entre trabajo y vida"],"fact":"Work-life balance concerns arranging commitments and rest in a way that is sustainable and consistent with priorities."},
 self_reflection:{"ru":["что такое саморефлексия","объясни саморефлексия"],"en":["what is self reflection","explain self reflection"],"es":["que es autorreflexion","explica autorreflexion"],"fact":"Self-reflection involves examining one's experiences, choices and assumptions and considering what can be learned from them."},
 visualization:{"ru":["что такое визуализация цели","объясни визуализация цели"],"en":["what is goal visualization","explain goal visualization"],"es":["que es visualizacion de metas","explica visualizacion de metas"],"fact":"Goal visualization is imagining a desired outcome or steps toward it. It can complement practical planning, but imagining an outcome does not ensure it will happen."},
 accountability:{"ru":["что такое ответственность за цель","объясни ответственность за цель"],"en":["what is goal accountability","explain goal accountability"],"es":["que es responsabilidad por una meta","explica responsabilidad por una meta"],"fact":"Goal accountability involves keeping track of commitments and reviewing progress honestly, with a supportive partner if desired."},
 brainstorm:{"ru":["что такое карта идей","объясни карта идей"],"en":["what is mind mapping","explain mind mapping"],"es":["que es mapas mentales","explica mapas mentales"],"fact":"Mind mapping organizes related ideas visually around a central topic. It can help group possibilities and identify connections."},
});
const languages=Object.freeze({ru:'Russian',en:'English',es:'Spanish'});
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/ё/gu,'е').replace(/[áéíóúü]/gu,c=>({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u'}[c])).replace(/[‐‑–—-]/gu,' ').replace(/^[¿¡]+|[?!.]+$/gu,'').replace(/\s+/gu,' ').trim();
const courtesy=Object.freeze({
 ru:{prefix:/^(?:пожалуйста[, ]+|подскажи[, ]+|скажи[, ]+|расскажи[, ]+|можешь сказать[, ]+)/u,suffix:/[, ]+пожалуйста$/u},
 en:{prefix:/^(?:please[, ]+|can you tell me[, ]+|could you tell me[, ]+)/u,suffix:/[, ]+please$/u},
 es:{prefix:/^(?:por favor[, ]+|puedes decirme[, ]+|podrias decirme[, ]+)/u,suffix:/[, ]+por favor$/u},
});
const publicPhrase=(s,locale)=>normalize(s).replace(courtesy[locale].prefix,'').replace(courtesy[locale].suffix,'').trim();
// Only an exact reviewed public question is eligible. No fuzzy matching or PII redaction.
export function waveGeminiPublicTopic(message,locale){
 if(typeof message!=='string'||message.length>120||!Object.hasOwn(languages,locale)||/[\r\n]/u.test(message))return null;
 const text=publicPhrase(message,locale);
 return Object.entries(topics).find(([,topic])=>topic[locale].some(q=>publicPhrase(q,locale)===text))?.[0]??null;
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
  {role:'system',content:'Return only JSON {"reply":"..."} in '+languages[locale]+'. Answer the general educational question represented by the supplied public concept in 1–3 useful sentences. Explain the idea and a general example or practical method when supported by the supplied facts. Do not assume facts about a client. No medical or financial advice, service recommendations, prices, URLs, questions, personal claims or actions.'},
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
