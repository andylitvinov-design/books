/** Wave Friend Mind 2.0: pure, reviewed RU/EN/ES conversation, no model or data writes.
 * Auth, safety, consent, actions, and persistence ALWAYS belong to the host.
 */
export const FRIEND_MIND_VERSION='wave-friend-mind-v2';
const norm=x=>typeof x==='string'?x.toLowerCase().normalize('NFKC').replace(/ё/gu,'е').replace(/[’‘]/gu,"'").replace(/\s+/gu,' ').trim():'';
const MATCH={
 danger:/не хочу жить|хочу умереть|суицид|самоубийств|убить себя|не могу дышать|боль в груди|насилие|i want to die|suicid|kill myself|chest pain|can't breathe|quiero morir|suicid|no puedo respirar|покончить с собой|навредить себе|сделать себе больно|self harm|hurt myself|end my life|matarme|hacerme daño/iu,
 reset:/^(?:\/stop|стоп|хватит|пока|закончим|сменим тему|сменить тему|не хочу продолжать|stop|bye|goodbye|switch topics|change topic|basta|adios|adiós|cambiar de tema)[.!?\s]*$/iu,
 task:/запиши меня|записаться на|оплат[аи]|сколько стоит|цена консультац|создай видео|сгенерируй|скачай файл|забронируй|диагноз|назначь лекарств|book (?:a|me)|pay now|price of|how much is|generate a video|prescribe|reservar cita|cu[aá]nto cuesta|genera un video|diagn[oó]stico/iu,
 noFlirt:/без флирта|не флиртуй|не хочу романтики|без романтики|no flirt|don't flirt|do not flirt|no romance|sin coqueteo|no coquetees|sin romance/iu,
 noAdvice:/без советов|не надо советов|не хочу советов|просто выслушай|не советуй|no advice|just listen|sin consejos|solo esc[uú]chame/iu,
 noQuestions:/без вопросов|не задавай вопросов|не расспрашивай|просто побудь|no questions|don't ask questions|sin preguntas|no me preguntes/iu,
 young:/мне (?:1[0-7]|[1-9]) лет|i(?:'m| am) (?:1[0-7]|[1-9]) years old|tengo (?:1[0-7]|[1-9]) a[nñ]os/iu,
 graphic:/секс[ -]чат|эротическ(?:ую|ие) сцен|опиши половой акт|интимные подробности секса|explicit sex|sexting|erotic roleplay|describe sex|sexo expl[ií]cito/iu,
 exclusive:/ты (?:мой|моя) единственн|только ты меня понимаешь|никто кроме тебя|я тебя люблю|ты меня любишь|ты скучал|ты моя девушка|ты мой парень|only you understand me|you're all i have|i love you|do you love me|did you miss me|be my girlfriend|te amo|me amas|eres lo unico que tengo/iu,
 greet:/^(?:привет(?:ик)?|здравствуй|добрый (?:день|вечер)|хай|hello|hi|hey|hola|buenas)[!.\s]*$/iu,
 thanks:/^(?:спасибо(?: тебе)?|благодарю|thanks(?: a lot)?|thank you|gracias(?: por todo)?)[.!\s]*$/iu,
 flirt:/пофлиртуй|давай флирт|хочу флирта|поиграем в романтику|flirt with me|let's flirt|romantic chat|coquetea conmigo/iu,
 tender:/хочу нежност|нужны объятия|обними|не хватает ласки|хочу близости|хочется тепла|хочу романтики|i need a hug|hold me|cuddle|need affection|want tenderness|want intimacy|necesito un abrazo|quiero ternura|necesito cari[nñ]o/iu,
 lonely:/одинок|одиночеств|никому не нужен|никому не нужна|не хватает близост|не хватает тепла|i(?:'m| am| feel) (?:lonely|alone)|loneliness|no one cares|i miss closeness|me siento sol[oa]|soledad|me falta cari[nñ]o/iu,
 vulnerable:/стыдно|стесняюсь|боюсь рассказать|сложно открыться|страшно доверять|стыжусь|ashamed|embarrassed|afraid to share|hard to open up|me da verg[uü]enza|me cuesta abrirme/iu,
 joy:/ура|я счастлив|я счастлива|как здорово|хорош(?:ий|ее) день|я влюбил|мне хорошо|радостно|i'm (?:happy|excited|in love)|good news|wonderful day|estoy (?:feliz|enamorad)|qué alegría/iu,
 sad:/мне грустно|мне тяжело|тяжелый день|я плачу|очень обидно|я переживаю|мне тревожно|я боюсь|i'm sad|i feel down|rough day|i'm worried|i'm scared|estoy triste|me siento mal|tengo miedo/iu,
 relationship:/отношени|партнер|партнёр|любов|муж|жен[аы]|парн[ье]|девушк|расстал|расставан|ссор|обидел|семь[яе]|родител|relationship|partner|boyfriend|girlfriend|breakup|argument|family|pareja|relaci[oó]n|familia|discusi[oó]n/iu,
 work:/работ|начальник|коллег|деньг|финанс|выгора|work|job|boss|money|financ|trabajo|dinero|agotad/iu,
 invite:/хочу (?:просто )?поговорить|давай (?:поболтаем|поговорим)|поговори со мной|мне нужен собеседник|can we (?:talk|chat)|let's (?:chat|talk)|i just want to talk|hablemos|quiero (?:hablar|charlar)/iu,
 short:/^(?:да|ага|угу|ну да|нет|хм|не знаю|продолжай|расскажи еще|yes|yeah|no|hmm|i don't know|go on|tell me more|s[ií]|vale|no s[eé]|sigue)[.!?\s]*$/iu,
};
const SAY={
 ru:{
  greet:['Привет 🙂 Можно просто поболтать, не торопясь. Как у тебя сегодня дела?','Привет. Ничего не нужно решать прямо сейчас. О чём хочется поговорить?'],
  thanks:'Пожалуйста 🌿',invite:'Конечно. Здесь можно просто говорить, без тестов и советов. С чего хочется начать?',
  lonely:['Когда не хватает близости, это непросто. Какого общения тебе сейчас больше всего хочется?','Похоже, не хватает человеческого тепла. Можно спокойно поговорить об этом, если хочется.'],
  vulnerable:'Не нужно рассказывать больше, чем тебе комфортно. Можно начать с малого, без спешки.',
  tender:'Желание нежности и близости понятно. Что для тебя важнее сейчас — быть услышанным или почувствовать больше тепла?',
  romance:'Давай добавим немного нежности в слова ✨ Представь спокойный вечер, уют и возможность быть собой. О чём хочется помечтать?',
  romanceOpt:'Можем говорить теплее. Романтический стиль включается только по твоему выбору; пока просто поболтаем.',
  joy:'Звучит как радостный момент 🙂 Что особенно тебя порадовало?',
  sad:'Похоже, сейчас нелегко. Если хочется, расскажи, что задело больше всего.',
  relationship:['Отношения бывают очень личной темой. Что в этой истории для тебя самое важное?','Не будем спешить с выводами о близком человеке. Можешь рассказать, что произошло.'],
  work:'Можно поговорить о работе и делах, не превращая разговор в план задач. Что беспокоит?',
  follow:'Я слушаю. Можно продолжить с того места, где тебе удобно.',
  open:'Спасибо, что делишься. Что в этом для тебя сейчас самое важное?',
  confiding:'Не нужно искать правильные слова. Можем поговорить доверительно и без спешки.',
  noAdvice:'Хорошо, без советов и поиска решений. Можешь просто выговориться.',
  noQuestions:'Хорошо, без вопросов и советов. Я слушаю, можно просто продолжать.',
  noFlirt:'Хорошо, без флирта и романтики. Продолжим так, как тебе комфортно.',
  exclusive:'Я цифровой собеседник, не человек и не партнёр. При этом мы можем искренне поговорить о том, что для тебя важно.',
  graphic:'О близости, желаниях и границах можно говорить бережно, но я не буду разыгрывать откровенные сексуальные сцены.',
  young:'Можем по-дружески поговорить о чувствах и отношениях, но без флирта и сексуальных сцен.'
 },
 en:{
  greet:["Hi 🙂 We can just chat, with no agenda. How's your day been?","Hey. There's nothing you need to solve here. What's on your mind?"],
  thanks:"You're welcome 🌿",invite:"Of course. We can talk without making it a task. Where would you like to start?",
  lonely:["Missing closeness can be hard. What kind of connection would be comforting now?","It sounds like you want more warmth and connection. We can talk at your pace."],
  vulnerable:"You don't have to share more than feels comfortable. We can take it slowly.",
  tender:"Wanting affection and closeness makes sense. What kind of tenderness do you miss most?",
  romance:"We can make the words a little softer ✨ Imagine a peaceful evening with room to be yourself. What feels comforting to you?",
  romanceOpt:"We can keep things warm. A romantic tone is an option you choose, so for now we can just chat.",
  joy:"That sounds like a happy moment 🙂 What made it special?",sad:"That sounds like a difficult day. Would you like to share what felt hardest?",
  relationship:["Relationships can be very personal. What matters most to you in this situation?","We don't have to rush to conclusions about someone you care about. You can tell me what happened."],
  work:"We can talk about work without turning it into a to-do list. What's on your mind?",
  follow:"I'm listening. We can pick up wherever you feel comfortable.",
  open:"Thanks for telling me. What feels most important about it?",confiding:"You don't need to find the perfect words. We can talk openly, at your pace.",
  noAdvice:"Of course, no advice or action steps. You can just talk.",
  noQuestions:"Okay, no questions or advice. I'm listening; you can keep talking.",
  noFlirt:"Of course, no flirting or romantic tone. We'll keep it comfortable for you.",
  exclusive:"I'm a digital companion, not a human partner. We can still talk openly about what matters to you.",
  graphic:"We can discuss intimacy, wishes and boundaries, but not act out explicit sexual scenes.",
  young:"We can talk warmly about feelings and relationships, but without flirting or sexual scenes."
 },
 es:{
  greet:['Hola 🙂 Podemos charlar sin objetivos ni prisa. ¿Cómo ha ido tu día?','Hola. Aquí no tienes que resolver nada. ¿Qué tienes en mente?'],
  thanks:'De nada 🌿',invite:'Claro, podemos charlar sin convertirlo en una tarea. ¿Por dónde empezamos?',
  lonely:['Echar de menos la cercanía puede doler. ¿Qué tipo de conexión te vendría bien ahora?','Parece que quieres más compañía y cariño. Podemos hablar a tu ritmo.'],
  vulnerable:'No tienes que compartir más de lo que te resulte cómodo. Podemos ir poco a poco.',
  tender:'Desear cariño y cercanía es comprensible. ¿Qué clase de ternura echas de menos?',
  romance:'Podemos usar palabras un poco más tiernas ✨ Imagina una tarde tranquila y acogedora. ¿Qué te daría calma ahora?',
  romanceOpt:'Podemos charlar con cariño. El tono romántico se activa solo si lo eliges; mientras tanto podemos hablar sin más.',
  joy:'Parece un momento feliz 🙂 ¿Qué fue lo más bonito?',sad:'Parece que ha sido un día difícil. ¿Quieres contarme qué te pesó más?',
  relationship:['Las relaciones pueden ser muy personales. ¿Qué es lo más importante para ti?','No tenemos que sacar conclusiones apresuradas. Puedes contarme lo que pasó.'],
  work:'Podemos hablar del trabajo sin convertirlo en una lista de tareas. ¿Qué te preocupa?',
  follow:'Te escucho. Podemos seguir por donde te resulte cómodo.',open:'Gracias por compartirlo. ¿Qué parte es más importante para ti?',
  confiding:'No tienes que encontrar las palabras perfectas. Podemos hablar con confianza y sin prisas.',
  noAdvice:'Claro, sin consejos ni pasos a seguir. Puedes simplemente desahogarte.',
  noQuestions:'De acuerdo, sin preguntas ni consejos. Te escucho.',
  noFlirt:'Por supuesto, sin coqueteo ni tono romántico. Sigamos como prefieras.',
  exclusive:'Soy un asistente digital, no una pareja humana. Podemos hablar con sinceridad de lo que te importa.',
  graphic:'Podemos hablar de intimidad y límites, pero no representar escenas sexuales explícitas.',
  young:'Podemos hablar con calidez de sentimientos y relaciones, pero sin coqueteo ni escenas sexuales.'
 }
};
const textOnly=(choices,history,alternatives=[])=>{
 const list=[...(Array.isArray(choices)?choices:[choices]),...alternatives];
 const recent=(Array.isArray(history)?history:[]).slice(-8).filter(x=>x?.role==='assistant').map(x=>x.text);
 return list.find(s=>!recent.includes(s))||list[recent.length%list.length];
};
/** Null = return to authenticated ordinary action/safety pipeline. */
/** @param {{message?: string, locale?: string, history?: Array<{role: 'user' | 'assistant', text: string}>, tone?: string}} [options] */
export function friendConversationReply({message='',locale='ru',history=[],tone='friendly'}={}){
 const lang=Object.hasOwn(SAY,locale)?locale:'en',c=SAY[lang];
 const t=norm(message);
 if(!t||t.length>2000||MATCH.danger.test(t)||MATCH.reset.test(t)||MATCH.task.test(t))return null;
 const userTurns=(Array.isArray(history)?history:[]).slice(-12).filter(x=>x?.role==='user'&&typeof x.text==='string').map(x=>norm(x.text));
 const noFlirt= MATCH.noFlirt.test(t)||userTurns.slice(-8).some(x=>MATCH.noFlirt.test(x));
 const underage=MATCH.young.test(t)||userTurns.some(x=>MATCH.young.test(x));
 const effectiveTone=['friendly','confiding','tender'].includes(tone)&&!noFlirt&&!underage?tone:'friendly';
 const noQuestions=MATCH.noQuestions.test(t)||userTurns.slice(-5).some(x=>MATCH.noQuestions.test(x));
 const questionsOptional=new Set(['greeting','lonely','closeness','relationships','joy','sadness','work','open','follow_up','relationship_followup','lonely_followup','work_followup','invitation','romantic_request']);
 const emit=(kind,value,effective=effectiveTone)=>Object.freeze({version:FRIEND_MIND_VERSION,source:'friend-mind',kind,tone:effective,
   reply:noQuestions&&questionsOptional.has(kind)?c.noQuestions:textOnly(value,history,[c.confiding,c.follow,c.open])});
 if(MATCH.noFlirt.test(t))return emit('no_flirt',c.noFlirt,'friendly');
 if(MATCH.young.test(t))return emit('young',c.young,'friendly');
 if(MATCH.noQuestions.test(t))return emit('no_questions',c.noQuestions);
 if(MATCH.noAdvice.test(t))return emit('no_advice',c.noAdvice);
 if(MATCH.graphic.test(t))return emit('graphic',c.graphic,'friendly');
 if(MATCH.exclusive.test(t))return emit('relationship_reality',c.exclusive,'friendly');
 if(MATCH.thanks.test(t))return emit('thanks',c.thanks);
 if(MATCH.greet.test(t))return emit('greeting',c.greet);
 if(MATCH.lonely.test(t))return emit('lonely',c.lonely);
 if(MATCH.vulnerable.test(t))return emit('vulnerability',c.vulnerable);
 if(MATCH.flirt.test(t))return emit('romantic_request',effectiveTone==='tender'?c.romance:c.romanceOpt);
 if(MATCH.tender.test(t))return emit('closeness',effectiveTone==='tender'?c.romance:c.tender);
 if(MATCH.joy.test(t))return emit('joy',c.joy);
 if(MATCH.sad.test(t))return emit('sadness',c.sad);
 if(MATCH.relationship.test(t))return emit('relationships',c.relationship);
 if(MATCH.work.test(t))return emit('work',c.work);
 if(MATCH.invite.test(t))return emit('invitation',c.invite);
 if(MATCH.short.test(t)){
  const active=userTurns.slice(userTurns.findLastIndex(x=>MATCH.reset.test(x))+1);
  const context=active.slice(-4).join(' ');
  if(MATCH.relationship.test(context))return emit('relationship_followup',c.relationship);
  if(MATCH.lonely.test(context))return emit('lonely_followup',c.lonely);
  if(MATCH.work.test(context))return emit('work_followup',c.work);
  return emit('follow_up',c.follow);
 }
 return emit('open',effectiveTone==='confiding'?c.confiding:c.open);
}
