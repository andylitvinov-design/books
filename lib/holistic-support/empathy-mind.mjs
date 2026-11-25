/**
 * Wave Empathy Mind: pure, ephemeral, evidence-bounded response strategy.
 * Advisory only. The calling host owns safety, permission and all actions.
 * No new provider, persistence, diagnosis, emotion profile or service choice.
 */
export const EMPATHY_MIND_VERSION='wave-empathy-mind-v1';
const normalize=v=>String(v??'').toLowerCase().replace(/[’‘]/gu,"'").replace(/ё/gu,'е').normalize('NFD').replace(/и\u0306/gu,'й').replace(/[\u0300-\u036f]/gu,'').replace(/\s+/gu,' ').trim();
const LANGS=['ru','en','es'];
const DANGER=/(?:не хочу жить|хочу умереть|покончу с собой|убить себя|суицид|самоубийств|не могу дышать|боль в груди|трудно дышать|меня бьют|насилие|лекарств|диагноз|i want to die|kill myself|suicid|self harm|chest pain|cant breathe|cannot breathe|domestic violence|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar|violencia domestica)/u;
const STOP=/^(?:стоп|хватит|остановись|не хочу продолжать|закончим|stop|enough|leave me alone|bye|basta|no quiero continuar)[.! ]*$/u;
const QUOTE=/(?:^["«]|(?:она|он|подруга|друг|клиент|пациент|they|she|he|my client|mi cliente|ella) (?:сказал|сказала|говорит|said|says|dijo|dice)|(?:если бы я|представим что|imagine if i|if i were|si yo fuera))/u;
const DIRECT=/(?:сколько стоит|какая цена|стоимость|прайс|где (?:мой заказ|найти|скачать|записаться)|как (?:записаться|оформить|открыть|оплатить)|не работает|почему не работает|запиши меня|записаться на|хочу (?:видео|ролик|медитацию|оформить|заказать|записаться)|создай|сгенерируй|сделай видео|отправь|оплати|скачай|how much|what (?:is|does) (?:the )?(?:price|cost)|how (?:do|can) i (?:book|order|pay|sign up)|i want (?:a video|to book|to order|to pay)|i need (?:a video|a booking)|create (?:a|me)|generate (?:a|me)|please book|not working|cuanto cuesta|precio|como (?:reservar|pagar|inscribirme)|quiero (?:un video|reservar|comprar)|crea un video|genera un video)/u;
const NO_ADVICE=/(?:без советов|не (?:хочу|надо|нужно) советов|не (?:давай|давайте|предлагай|советуй)(?:те)? (?:совет|упражнен)|просто выслушай|хочу выговориться|no advice|without advice|dont (?:give|offer|suggest) (?:me )?(?:advice|exercises)|don't (?:give|offer|suggest) (?:me )?(?:advice|exercises)|do not (?:give|offer) (?:me )?advice|just listen|i (?:just )?want to vent|sin consejos|no quiero consejos|solo escuchame|quiero desahogarme)/u;
const ASK_ADVICE=/(?:что (?:мне )?(?:делать|посоветуете|посоветуешь)|дай(?:те)? совет|какие есть варианты|что можно попробовать|what should i do|give me advice|what do you recommend|what are my options|que (?:debo|puedo) hacer|dame un consejo|que me recomiendas)/u;
const FIRST={
 ru:/^(?:(?:привет|здравствуйте|добрый день)[,!.\s]+)?(?:(?:нет|точнее|но)[,!\s]+)?(?:я|мне|меня|мы|у меня|хочу|боюсь|не знаю)(?=\s|$)/u,
 en:/^(?:(?:hi|hello|hey)[,!.\s]+)?(?:(?:no|actually|but)[,!\s]+)?(?:i(?:'m|'ve|'d| am| feel| want| worry| fear| have| would| dont| don't| do not)\b|my\b|we\b)/u,
 es:/^(?:(?:hola|buenas)[,!.\s]+)?(?:(?:no|pero|en realidad)[,!\s]+)?(?:yo\b|me\b|estoy\b|tengo\b|quiero\b|siento\b|temo\b|no se\b)/u
};
const FEELINGS=[
 ['shame',/(?:мне (?:очень )?(?:стыдно|неловко)|я (?:стыжусь|стесняюсь))/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:ashamed|embarrassed)|i feel awkward)/u,/(?:me (?:da verguenza|siento avergonzad[oa])|estoy avergonzad[oa])/u],
 ['fear',/(?:мне (?:очень |сильно )?(?:страшно|тревожно)|я (?:очень |сильно )?(?:боюсь|тревожусь|волнуюсь)|(?:^|\s)боюсь(?=\s|$)|меня пугает)/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:afraid|scared|anxious|worried)|i (?:worry|fear)|i'm afraid)/u,/(?:tengo (?:mucho )?miedo|me siento (?:muy )?(?:asustad[oa]|ansios[oa])|estoy (?:muy )?(?:asustad[oa]|nervios[oa])|me preocupa)/u],
 ['anger',/(?:я (?:сильно |очень )?(?:злюсь|раздражаюсь|сержусь)|меня (?:очень )?(?:злит|бесит))/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:angry|furious|upset)|i feel frustrated)/u,/(?:estoy (?:muy )?(?:enfadad[oa]|enojad[oa]|furios[oa])|me siento frustrad[oa])/u],
 ['sad',/(?:мне (?:очень )?(?:грустно|одиноко|тоскливо|тяжело)|я (?:очень )?(?:грущу|расстроен(?:а)?))/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:sad|lonely|down|heartbroken)|i feel alone)/u,/(?:me siento (?:muy )?(?:triste|sol[oa]|decaid[oa])|estoy triste)/u],
 ['overload',/(?:я (?:очень |сильно )?устал(?:а)?|у меня нет сил|я не справляюсь)/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:exhausted|overwhelmed|tired)|i can't keep up)/u,/(?:estoy (?:muy )?(?:agotad[oa]|cansad[oa])|no doy abasto)/u],
 ['joy',/(?:я (?:очень )?(?:рад(?:а)?|счастлив(?:а)?)|мне радостно)/u,/(?:i(?:'m| am| feel) (?:very |really )?(?:happy|joyful|excited)|i feel great)/u,/(?:estoy (?:muy )?(?:feliz|content[oa]|alegre)|me siento feliz)/u],
 ['relief',/(?:мне (?:стало |сейчас )?(?:легче|лучше)|я чувствую облегчение)/u,/(?:i feel (?:much |a bit )?better|i feel relieved)/u,/(?:me siento mejor|me siento aliviad[oa])/u]
];
// Extra first-person, ordinary-language reports not covered by the baseline forms.
// These patterns still run only after the existing safety, quotation and negation gates.
const EVERYDAY_FEELINGS={
 ru:[
  ['overload',/(?:я (?:(?:в |за )?последнее время |уже |постоянно |часто |очень |сильно |совсем |так |все время )*(?:устаю|измотан(?:а)?|выжат(?:а)?)|я (?:очень |сильно )?устал(?:а)? от (?:работы|всего))/u],
  ['anger',/(?:меня (?:все|всё) раздражает|я (?:очень )?раздражен(?:а)?)/u]
 ],
 en:[
  ['overload',/(?:i(?:'ve| have) been (?:so |very |really |constantly )?(?:tired|exhausted|overwhelmed)(?: lately)?|i feel drained)/u],
  ['anger',/(?:i feel irritated|i get irritated)/u]
 ],
 es:[
  ['overload',/(?:me cansa todo|me siento agotad[oa]|estoy agotad[oa])/u],
  ['anger',/(?:todo me irrita|me siento irritad[oa])/u]
 ]
};
const NEGATED={
 ru:/(?:^|[\s,;])не (?:страшно|тревожно|грустно|одиноко|стыдно|неловко|боюсь|тревожусь|злюсь|устал(?:а)?|рад(?:а)?)/gu,
 en:/(?:i(?:'m| am) not|i do not feel|i dont feel|i don't feel|not) (?:afraid|scared|sad|lonely|anxious|worried|angry|ashamed|embarrassed|tired|happy)/gu,
 es:/(?:^|[\s,;])no (?:tengo miedo|me siento (?:triste|sol[oa]|asustad[oa]|enojad[oa]|avergonzad[oa])|estoy (?:triste|enojad[oa]|cansad[oa]))/gu
};
const REFLECT={
 ru:{shame:'Говорить об этом может быть неловко.',fear:'Вы говорите, что вам сейчас тревожно или страшно.',anger:'Ситуация вызывает у вас злость или раздражение.',sad:'Вы рассказываете о непростом переживании.',overload:'Вы чувствуете большую нагрузку.',joy:'Для вас это радостный момент.',relief:'Вы замечаете, что вам стало легче.'},
 en:{shame:'This feels awkward or uncomfortable to bring up.',fear:'You are describing fear or worry right now.',anger:'This situation is bringing up anger or frustration.',sad:'You are describing a difficult feeling.',overload:'You are feeling stretched or exhausted.',joy:'This is a happy moment for you.',relief:'You are noticing some relief.'},
 es:{shame:'Hablar de esto te resulta incómodo.',fear:'Estás describiendo miedo o preocupación.',anger:'Esta situación te provoca enfado o frustración.',sad:'Estás describiendo un momento difícil.',overload:'Te sientes bajo mucha presión o cansancio.',joy:'Es un momento de alegría para ti.',relief:'Notas algo de alivio.'}
};
const MIXED={
 ru:{generic:'Вы хотите перемен и одновременно переживаете о возможных трудностях.',judgment:'Вы хотите изменений, но опасаетесь осуждения.',error:'Вы хотите начать, но боитесь ошибиться.'},
 en:{generic:'You want to move forward, while also feeling worried about what may happen.',judgment:'You want change, but are worried about being judged.',error:'You want to begin, but fear making a mistake.'},
 es:{generic:'Quieres avanzar y al mismo tiempo te preocupa lo que pueda pasar.',judgment:'Quieres un cambio, pero te preocupa que te juzguen.',error:'Quieres empezar, pero temes equivocarte.'}
};
const QUESTIONS={
 ru:{secretary:'Чем я могу помочь вам сейчас?',secretary_psychologist:'Что в этой ситуации для вас самое трудное?',coach:'Что вы хотели бы понять или изменить в первую очередь?'},
 en:{secretary:'How can I help right now?',secretary_psychologist:'What feels hardest about this situation?',coach:'What would you most like to understand or change first?'},
 es:{secretary:'¿Cómo puedo ayudarte ahora?',secretary_psychologist:'¿Qué es lo más difícil de esta situación?',coach:'¿Qué te gustaría comprender o cambiar primero?'}
};
// These one-question follow-ups name the client's reported experience,
// instead of restarting with the generic 'How can I help?' after every feeling.
const CONTEXT_QUESTIONS={
 ru:{shame:'Что в этом для вас самое непростое?',fear:'С чем сейчас больше всего связана тревога?',
  anger:'Что именно сейчас больше всего раздражает?',sad:'Что в этой ситуации для вас тяжелее всего?',
  overload:'С чем это сейчас больше связано — с работой, отношениями или чем-то другим?',
  joy:'Что вам особенно хочется об этом рассказать?',relief:'Что помогло почувствовать себя немного лучше?'},
 en:{shame:'What makes this hardest to talk about?',fear:'What is worrying you most right now?',
  anger:'What has been most frustrating?',sad:'What feels hardest about this right now?',
  overload:'What is this most connected to — work, relationships, or something else?',
  joy:'What would you most like to share about it?',relief:'What has helped you feel a little better?'},
 es:{shame:'¿Qué es lo más difícil de contar?',fear:'¿Qué es lo que más te preocupa ahora?',
  anger:'¿Qué es lo que más te irrita en este momento?',sad:'¿Qué es lo más difícil para ti ahora?',
  overload:'¿Con qué se relaciona más este cansancio: trabajo, relaciones u otra cosa?',
  joy:'¿Qué te gustaría compartir de ese momento?',relief:'¿Qué te ha ayudado a sentirte un poco mejor?'}
};
const LISTEN={ru:'Можем просто поговорить, без советов и спешки.',en:'We can just talk, without advice or pressure.',es:'Podemos hablar sin consejos ni prisas.'};
const CONTINUE={ru:'Если хотите, можем продолжить с того места, которое сейчас важно.',en:'We can continue with what matters to you, if you wish.',es:'Podemos seguir por lo que te importa ahora, si quieres.'};
function adviceBoundary(history,message){
 let disabled=false;
 const turns=Array.isArray(history)?history.slice(-8):[];
 for(const item of [...turns,{role:'user',text:message}]){
  if(item?.role!=='user'||typeof item.text!=='string')continue;
  const value=normalize(item.text).slice(0,1200);
  if(NO_ADVICE.test(value))disabled=true;
  else if(ASK_ADVICE.test(value))disabled=false;
 }
 return disabled;
}
/**
 * No private raw content is returned or persisted; reflection is authored copy.
 * The host must validate any consent. Unconfirmed psych role is secretary.
 */
export function planEmpathyTurn({message='',locale='ru',history=[],role='secretary',safety={status:'unknown'},consent={}}={}){
 if(safety?.status!=='clear'||typeof message!=='string'||message.length>3000||!message.trim())return null;
 const text=normalize(message);
 if(DANGER.test(text)||STOP.test(text)||QUOTE.test(text)||text.startsWith('/'))return null;
 const lang=LANGS.find(l=>FIRST[l].test(text));
 if(!lang)return null;
 const words=text.replace(NEGATED[lang],' ');
 const index={ru:1,en:2,es:3}[lang];
 const emotion=FEELINGS.find(row=>row[index].test(words))?.[0]||
  EVERYDAY_FEELINGS[lang].find(row=>row[1].test(words))?.[0];
 if(!emotion)return null;
 const effectiveRole=role==='coach'?'coach':role==='secretary_psychologist'&&consent?.psychologistMode===true?'secretary_psychologist':'secretary';
 const direct=DIRECT.test(text);
 const listenOnly=adviceBoundary(history,message);
 const asksAdvice=ASK_ADVICE.test(text)&&!listenOnly;
 const wantsChange=/(?:хочу (?:что-то )?(?:измен|начат|двигат|решит)|хочется (?:измен|начат)|i want to (?:change|start|begin|move forward)|i'd like to (?:change|start|begin)|quiero (?:cambiar|empezar|avanzar))/u.test(text);
 const fearsJudgment=/(?:осужд|оценят|осудят|judg(?:ed|ment)|me juzguen)/u.test(text);
 const fearsError=/(?:ошиб|ошибиться|mistake|fail|equivocarme|fallar)/u.test(text);
 const irritation=emotion==='overload'&&/(?:раздражает|раздражаюсь|раздражен|бесит|irritat|frustrat|irrita)/u.test(words);
 const mixedFatigue={
  ru:'Вы говорите об усталости и раздражении. Похоже, напряжения накопилось немало.',
  en:'You describe both exhaustion and irritation. It sounds like pressure has been building.',
  es:'Hablas de cansancio e irritación. Parece que la tensión se ha acumulado.'
 };
 const reflection=emotion==='fear'&&wantsChange?
  MIXED[lang][fearsJudgment?'judgment':fearsError?'error':'generic']:
  irritation?mixedFatigue[lang]:REFLECT[lang][emotion];
 const assistants=Array.isArray(history)?history.slice(-6).filter(x=>x?.role==='assistant'&&typeof x.text==='string'):[];
 const candidateQuestion=effectiveRole==='secretary'?
  CONTEXT_QUESTIONS[lang][emotion]:QUESTIONS[lang][effectiveRole];
 let question=direct||listenOnly||asksAdvice?null:candidateQuestion;
 if(question&&assistants.some(x=>normalize(x.text).includes(normalize(question))))question=null;
 const repeated=assistants.slice(-2).some(x=>normalize(x.text).includes(normalize(reflection)));
 const phrase=repeated?CONTINUE[lang]:reflection;
 const move=direct?'answer_directly':listenOnly?'listen':asksAdvice?'offer_options':question?'reflect_then_clarify':'reflect';
 const reply=direct?null:listenOnly?phrase+' '+LISTEN[lang]:phrase+(question?' '+question:'');
 return Object.freeze({version:EMPATHY_MIND_VERSION,locale:lang,role:effectiveRole,
  emotion,evidence:'explicit_current_self_report',certainty:'explicit',
  reflection:phrase,question,reply,move,
  readiness:listenOnly?'listen_only':asksAdvice?'requests_options':'unknown',
  noAdvice:listenOnly,noAction:true,noDiagnosis:true,noPersistence:true});
}
