/* Wave Secretary Psychologist Mind: local, first-party, non-clinical conversation. */
/* No model/provider/network/CRM calls. The signed Telegram caller owns consent and safety. */
export const WAVE_PSYCHOLOGIST_NATIVE_VERSION='wave-psychologist-native-v1';
const PHASES=["situation","goal","challenge","impact","attempts","support","ready"];
const QUESTIONS={"ru":{"situation":["С какой ситуации хочется начать?","Что сейчас важнее всего обсудить?","Что подтолкнуло вас обратиться?"],"goal":["Что хотелось бы изменить в этой ситуации?","Как вы поймёте, что стало немного лучше?","Что вы хотите получить от встречи?"],"challenge":["Что сейчас больше всего мешает?","В какой момент становится сложнее?","Что особенно трудно изменить?"],"impact":["Как это отражается на вашем обычном дне?","Что из происходящего наиболее трудно переживается?","Когда это заметнее всего?"],"attempts":["Что вы уже пробовали?","Что хотя бы немного помогало?","Бывали моменты, когда становилось легче?"],"support":["О чём особенно важно рассказать специалисту?","Какая поддержка вам сейчас нужна?","Что вы хотели бы обсудить на встрече в первую очередь?"]},"en":{"situation":["What would you like to start with?","What feels most important to talk about today?","What led you to reach out?"],"goal":["What would you like to change?","What would a small improvement look like?","What are you hoping for from a session?"],"challenge":["What is getting in the way?","When does it feel particularly difficult?","What has been hardest to change?"],"impact":["How does this affect your day?","What part has been most difficult for you?","When do you notice it the most?"],"attempts":["What have you tried so far?","Has anything helped, even a little?","Are there times when it feels easier?"],"support":["What would you most want a practitioner to understand?","What kind of support would feel useful now?","What would you want to discuss first in a session?"]},"es":{"situation":["¿Con qué situación te gustaría empezar?","¿Qué es lo más importante para hablar hoy?","¿Qué te animó a escribirnos?"],"goal":["¿Qué te gustaría cambiar?","¿Cómo notarías una pequeña mejoría?","¿Qué esperas de una consulta?"],"challenge":["¿Qué te lo está dificultando?","¿Cuándo se vuelve más difícil?","¿Qué ha sido lo más difícil de cambiar?"],"impact":["¿Cómo afecta a tu día?","¿Qué parte ha sido más difícil para ti?","¿Cuándo lo notas más?"],"attempts":["¿Qué has probado hasta ahora?","¿Hay algo que te haya ayudado un poco?","¿Hay momentos en que resulta más fácil?"],"support":["¿Qué quisieras que entendiera el profesional?","¿Qué tipo de apoyo necesitas ahora?","¿Qué te gustaría conversar primero en una sesión?"]}};
const LABELS={"ru":{"situation":"Ситуация","goal":"Цель","challenge":"Трудность","impact":"Как влияет","attempts":"Что пробовали","support":"Запрос к специалисту","notes":"Уточнение"},"en":{"situation":"Situation","goal":"Goal","challenge":"Difficulty","impact":"Impact","attempts":"Tried","support":"For the practitioner","notes":"Clarification"},"es":{"situation":"Situación","goal":"Objetivo","challenge":"Dificultad","impact":"Impacto","attempts":"Qué ha probado","support":"Para el profesional","notes":"Aclaración"}};
const COPY={"ru":{"thanks":"Спасибо, понял.","worry":"Вы говорите, что вам сейчас тревожно.","sad":"Похоже, вам сейчас грустно.","pause":"Конечно, не будем углубляться. Можете посмотреть краткое резюме.","unsure":"Ничего страшного, если пока сложно ответить.","repeat":"Можно начать с одной важной детали.","faq":"Для начала достаточно пары слов о ситуации. Подробности необязательны.","price":"Стоимость и время встречи согласовываются отдельно со специалистом.","privacy":"Вы сможете проверить резюме и отдельно решить, передавать ли его специалисту. Сама беседа ничего не отправляет.","ready":"Спасибо 🌿 Можно посмотреть и подтвердить краткое резюме.","more":"Учту это в резюме. Можете посмотреть его сейчас."},"en":{"thanks":"Thank you, I follow.","worry":"You mentioned feeling worried.","sad":"You mentioned feeling sad.","pause":"Of course. We don't have to go deeper. You can review a short summary.","unsure":"It's okay not to have an answer yet.","repeat":"We can begin with just one detail.","faq":"A few words about what matters are enough. Details are optional.","price":"The practitioner can confirm the session price and time.","privacy":"You can review your summary and decide separately whether to send it. The conversation itself does not send anything.","ready":"Thank you 🌿 You can review and approve a short summary.","more":"I can add that to the summary. You can review it now."},"es":{"thanks":"Gracias por contarlo.","worry":"Dices que te sientes preocupado/a.","sad":"Dices que te sientes triste.","pause":"Claro, no tenemos que profundizar. Puedes revisar un resumen breve.","unsure":"Está bien no tener una respuesta todavía.","repeat":"Podemos empezar con un solo detalle.","faq":"Bastan unas palabras sobre lo que importa. Los detalles son opcionales.","price":"El profesional confirmará el precio y horario de la consulta.","privacy":"Puedes revisar el resumen y decidir por separado si quieres enviarlo. La conversación en sí no envía nada.","ready":"Gracias 🌿 Puedes revisar y aprobar un resumen breve.","more":"Puedo añadirlo al resumen. Puedes revisarlo ahora."}};
const PATTERN={pause:/^(?:хватит|без вопросов|не хочу продолжать|не хочу углубляться|enough|no more questions|stop asking|no quiero profundizar|basta)[!.\s]*$/iu,
unsure:/^(?:не знаю|не уверен[а]?|сложно сказать|i don'?t know|not sure|hard to say|no s[eé]|no estoy segur[oa])[!.\s]*$/iu,
skip:/^(?:пропустить|пропущу|skip|pass|omitir|saltar)[!.\s]*$/iu,
greeting:/^(?:привет|здравствуйте|добрый день|hello|hi|hey|hola|buenas)[!.\s]*$/iu,
want:/^(?:я )?(?:хочу|хотел(?:а|ось) бы)|^(?:i (?:want|would like|hope) to)|^(?:quiero|me gustar[ií]a)/iu,
faq:/^(?:что нужно (?:рассказать|написать)|как проходит|кто вы|who are you|what do you need|how does it work|qu[eé] necesitas|c[oó]mo funciona)[?!.\s]*$/iu,
price:/(?:сколько стоит|какая цена|стоимость|how much|what(?:'s| is) the (?:cost|price)|cu[aá]nto cuesta|precio)/iu,
privacy:/(?:куда (?:пойд[её]т|отправите)|кто увидит|конфиденциал|who (?:will )?see|privacy|who reads|qui[eé]n (?:ver[aá]|leer[aá])|privacidad)/iu,
worry:/(?:мне тревожно|я тревожусь|мне страшно|я боюсь|i(?:'m| am) (?:worried|afraid|anxious)|i feel (?:worried|afraid|anxious)|me siento (?:preocupad[oa]|ansios[oa])|tengo miedo)/iu,
sad:/(?:мне грустно|я грущу|i(?:'m| am) sad|i feel sad|estoy triste|me siento triste)/iu,
danger:/(?:хочу умереть|убью себя|не могу дышать|боль в груди|suicid|kill myself|want to die|chest pain|cannot breathe|quiero morir|no puedo respirar|dolor en el pecho)/iu};
export function wavePsychologistQuestion(stage,locale="ru",history=[]){
 const l=QUESTIONS[locale]?locale:"en",qs=QUESTIONS[l][stage];
 if(!qs)return null;
 const seen=(Array.isArray(history)?history:[]).filter(t=>t?.role==="assistant").slice(-6).map(t=>String(t.text||"").toLowerCase());
 return qs.find(q=>!seen.some(text=>text.includes(q.toLowerCase())))||qs[0];
}
/** @param {{message?:string,locale?:string,stage?:string,slots?:Record<string,string>,turns?:Array<{role:string,text:string}>}} [input] */
export function wavePsychologistNativeTurn({message="",locale="ru",stage="situation",slots={},turns=[]}={}){
 const l=QUESTIONS[locale]?locale:"en",p=COPY[l],raw=String(message||"").trim().slice(0,1200);
 const state=PHASES.includes(stage)?stage:"situation";
 const data=Object.fromEntries(["situation","goal","challenge","impact","attempts","support","notes"].flatMap(k=>
    typeof slots?.[k]==="string"&&slots[k].trim()?[[k,slots[k].trim().slice(0,360)]]:[]));
 if(!raw||raw.startsWith("/")||PATTERN.danger.test(raw))return null;
 if(PATTERN.pause.test(raw))return {stage:"ready",slots:data,reply:p.pause,kind:"pause"};
 if(PATTERN.price.test(raw)&&raw.length<160)return {stage:state,slots:data,reply:p.price,kind:"faq"};
 if(PATTERN.privacy.test(raw)&&raw.length<160)return {stage:state,slots:data,reply:p.privacy,kind:"faq"};
 if(PATTERN.faq.test(raw))return {stage:state,slots:data,reply:p.faq,kind:"faq"};
 if(PATTERN.greeting.test(raw))return {stage:state,slots:data,reply:p.repeat+" "+(wavePsychologistQuestion(state,l,turns)||""),kind:"greeting"};
 const next=(from)=>PHASES.slice(Math.min(PHASES.indexOf(from)+1,PHASES.length-1)).find(k=>k==="ready"||!data[k])||"ready";
 if(PATTERN.unsure.test(raw)||PATTERN.skip.test(raw)){
  const priorUncertain=(Array.isArray(turns)?turns:[]).some(t=>t?.role==="user"&&PATTERN.unsure.test(String(t.text||"").trim()));
  const advance=PATTERN.skip.test(raw)||priorUncertain;
  const following=advance?next(state):state;
  const q=following==="ready"?p.ready:(advance?wavePsychologistQuestion(following,l,turns):QUESTIONS[l][state]?.[1]||wavePsychologistQuestion(state,l,turns));
  return {stage:following,slots:data,reply:(advance?"":p.unsure+" ")+q,kind:advance?"skip":"unsure"};
 }
 if(state==="ready"){data.notes=raw.slice(0,360);return {stage:"ready",slots:data,reply:p.more,kind:"additional"}}
 // Explicit goals are not relabeled as symptoms or inferred causes.
 let key=state;
 if(state==="situation"&&PATTERN.want.test(raw)){key="goal";}
 if(!data[key])data[key]=raw.slice(0,360);
 const following=key==="goal"&&state==="situation"?"challenge":next(state);
 const reflective=PATTERN.worry.test(raw)?p.worry:PATTERN.sad.test(raw)?p.sad:p.thanks;
 const question=following==="ready"?null:wavePsychologistQuestion(following,l,turns);
 return {stage:following,slots:data,
   reply:following==="ready"?p.ready:reflective+" "+question,
   kind:following==="ready"?"ready":"progress",evidence:"client_words_only"};
}
export function wavePsychologistNativeSummary({locale="ru",slots={}}={}){
 const l=LABELS[locale]?locale:"en";
 const keys=["situation","goal","challenge","impact","attempts","support","notes"];
 const lines=keys.filter(k=>typeof slots?.[k]==="string"&&slots[k].trim())
   .map(k=>LABELS[l][k]+": "+slots[k].trim().slice(0,300));
 if(!lines.length)return null;
 const title={ru:"Запрос к специалисту (со слов клиента)",en:"Request for a practitioner (client's words)",es:"Solicitud al profesional (palabras del cliente)"}[l];
 return [title,...lines].join("\n").slice(0,900);
}
