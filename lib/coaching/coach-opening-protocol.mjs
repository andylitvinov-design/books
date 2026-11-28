/**
 * Holistic House · obligatory My Coach opening, before any GROW/WOOP/etc.
 * Every completion is derived from the visitor's own utterances, never model
 * prose, time, topic inference or an AI claim of consent.
 * Questions are editorial content; client answers are private and ephemeral
 * until separately reviewed and saved through the existing encrypted archive.
 */
import {coachProtocolEvidenceVeto,coachProtocolSessionControlUtterance} from './coach-protocol-relevance.mjs'
import {COACH_PERSONALITY_OPENING_QUESTIONS} from './coach-opening-personality-questions.mjs'
import {GENIE_OPENING_QUESTIONS,GENIE_OPENING_REASSURANCE,genieReturningNamePrompt,genieLiveOpeningGuidance} from './genie-coach-identity.mjs'

export const COACH_OPENING_VERSION='hh-coach-opening-v1-20261122'
export const COACH_OPENING_IDS=Object.freeze(['invitation','name','continuity','focus','feelings','confirmation'])
export const COACH_OPENING_PUBLIC_IDS=Object.freeze(['mira','max','sofia','alex','merlin','harry','genie','caesar'])
const C=(en,ru,es)=>Object.freeze({en,ru,es})
const human=v=>String(v||'').trim()
const language=v=>['en','ru','es'].includes(v)?v:'en'
const clip=(v,n=160)=>human(v).slice(0,n)
const base=Object.freeze({
 invitation:C([
  'Would you like to have a coaching session with me today?',
  'Shall we spend some time in a coaching session together today?',
  'Would you be comfortable trying a session together now?',
  'Do you want to begin a coaching conversation with me today?'
 ],[
  'Хотите сегодня провести со мной коучинговую сессию?',
  'Давайте проведём сегодня небольшую коучинговую сессию?',
  'Хотите попробовать сессию вместе со мной прямо сейчас?',
  'Вы согласны начать сегодня нашу коучинговую беседу?'
 ],[
  '¿Te gustaría tener una sesión de coaching conmigo hoy?',
  '¿Te apetece dedicar un rato a una sesión juntos?',
  '¿Te sentirías cómodo probando una sesión ahora?',
  '¿Quieres comenzar nuestra conversación de coaching hoy?'
 ]),
 name:C([
  'What name would you like me to use for you?',
  'How may I address you?',
  'What should I call you during our conversation?',
  'Would you prefer a first name, nickname, or another way to address you?'
 ],[
  'Как мне вас называть?',
  'Как я могу к вам обращаться?',
  'Какое имя вам комфортно слышать в нашем разговоре?',
  'Предпочитаете имя, псевдоним или другое обращение?'
 ],[
  '¿Cómo te gustaría que te llamara?',
  '¿Cómo puedo dirigirme a ti?',
  '¿Qué nombre prefieres que use en nuestra conversación?',
  '¿Prefieres tu nombre, un apodo u otra forma de llamarte?'
 ]),
 continuity:C([
  'Would you like to continue the topic from last time, or begin a new one?',
  'Shall we pick up our previous conversation, or start fresh today?',
  'Does our earlier topic still matter, or would you rather choose a new subject?',
  'Do you prefer to revisit the previous session or explore something new?'
 ],[
  'Продолжим тему прошлой сессии или начнём новую?',
  'Вернёмся к прошлому разговору или сегодня начнём с чистого листа?',
  'Прежняя тема ещё актуальна или вы хотите выбрать новую?',
  'Что предпочтительнее: продолжить прошлую сессию или исследовать новую тему?'
 ],[
  '¿Quieres retomar el tema de la sesión anterior o empezar uno nuevo?',
  '¿Seguimos nuestra conversación pasada o comenzamos de cero hoy?',
  '¿Sigue importando el tema anterior o prefieres otro?',
  '¿Te gustaría volver a la última sesión o explorar algo nuevo?'
 ]),
 focus:C([
  'Do you already have a specific goal, a difficulty you would like to overcome, or would you like to understand yourself and what you want better?',
  'Do you have a goal in mind, a difficulty to explore, or would you like to understand yourself better?',
  'Would you like to start from a goal, a difficulty, or getting to know yourself better?',
  'What is your starting point: a goal, a difficulty, or understanding yourself?'
 ],[
  'У вас уже есть конкретная цель, есть трудность, которую хотелось бы преодолеть, или вам пока хочется лучше разобраться в себе и понять, чего вы хотите?',
  'У вас есть цель, трудность, с которой хочется разобраться, или желание лучше понять себя?',
  'С чего вам ближе начать: с цели, с трудности или с того, чтобы разобраться в себе?',
  'Что сейчас ближе: конкретная цель, трудность или желание лучше понять себя?'
 ],[
  '¿Ya tienes una meta concreta, una dificultad que te gustaría superar o prefieres conocerte mejor y entender qué quieres?',
  '¿Tienes una meta, una dificultad que explorar o ganas de conocerte mejor?',
  '¿Prefieres partir de una meta, una dificultad o conocerte mejor?',
  '¿Qué te resulta más cercano: una meta, una dificultad o entenderte mejor?'
 ]),
 feelings:C([
  'How are you feeling today, in your own words?',
  'What emotions or energy are you bringing into this conversation?',
  'How does today feel for you, if you wish to share?',
  'Before we begin, how are you doing emotionally? You may skip this.'
 ],[
  'Как вы себя сегодня чувствуете?',
  'С какими чувствами и настроением вы пришли сегодня?',
  'Как вам сегодня внутри, если хочется поделиться?',
  'Прежде чем начнём: как ваше эмоциональное состояние? Можно пропустить.'
 ],[
  '¿Cómo te sientes hoy, con tus propias palabras?',
  '¿Qué emociones o energía traes a esta conversación?',
  '¿Cómo estás viviendo este día, si quieres compartirlo?',
  'Antes de empezar, ¿cómo estás emocionalmente? Puedes omitirlo.'
 ]),
 confirmation:C([
  'Shall we begin exploring the topic you chose?',
  'Are you ready to start working with your focus now?',
  'Would you like us to begin the session itself?',
  'Does it feel right to move into our main coaching work?'
 ],[
  'Ну что, приступим к выбранной теме?',
  'Вы готовы начать работу с нашим фокусом?',
  'Хотите теперь перейти к самой коучинговой сессии?',
  'Подходит ли вам сейчас перейти к основной работе?'
 ],[
  '¿Empezamos a explorar el tema que elegiste?',
  '¿Estás listo para trabajar en lo que elegiste?',
  '¿Quieres comenzar ahora la sesión propiamente dicha?',
  '¿Te parece bien pasar al trabajo principal?'
 ])
})
// Four distinct editorial phrasings for every step and for each persona.
const styles=Object.freeze({
 mira:C(['Gently: ','At your pace: ','With attention to your topic: ','Without any rush: '],
         ['Бережно спрошу: ','Без спешки: ','С вниманием к вашей теме: ','Мягко уточню: '],
         ['Con delicadeza: ','A tu ritmo: ','Con atención a tu tema: ','Sin ninguna prisa: ']),
 max:C(['Straight to the point: ','Let us make it practical: ','One clear choice: ','Quick check: '],
        ['Коротко и по делу: ','Практический вопрос: ','Один ясный выбор: ','Быстро уточню: '],
        ['Al grano: ','De forma práctica: ','Una elección clara: ','Pregunta rápida: ']),
 sofia:C(['With respect for your boundaries: ','Only if it feels right: ','Let us stay attentive: ','You choose what to share: '],
          ['С уважением к вашим границам: ','Только если комфортно: ','С вниманием к чувствам: ','Вы сами решаете, чем делиться: '],
          ['Respetando tus límites: ','Solo si te parece bien: ','Con atención a tus emociones: ','Tú decides qué compartir: ']),
 alex:C(['For a clear structure: ','To set our direction: ','Let us define the choice: ','One point before we proceed: '],
         ['Для ясной структуры: ','Чтобы определить направление: ','Уточним выбор: ','Один пункт перед началом: '],
         ['Para dar estructura: ','Para definir el rumbo: ','Aclaremos la elección: ','Un punto antes de seguir: ']),
 merlin:C(['At this turning point: ','As we open this chapter: ','With quiet curiosity: ','Before the journey unfolds: '],
           ['На этом повороте пути: ','Открывая новую главу: ','С тихим любопытством: ','Перед началом путешествия: '],
           ['En este cruce de caminos: ','Al abrir este capítulo: ','Con curiosidad serena: ','Antes del camino: ']),
 harry:C(['One brave little step: ','No magic required: ','As teammates: ','With a bit of courage: '],
          ['Первый маленький смелый шаг: ','Без всякого волшебства: ','Как одна команда: ','Чуть-чуть смелости: '],
          ['Un pequeño paso valiente: ','Sin magia de por medio: ','Como compañeros: ','Con un poco de valor: ']),
 genie:C(['One wish at a time: ','With a playful spark: ','Let us explore a real possibility: ','No magic needed: '],
         ['Одно желание за раз: ','С искрой любопытства: ','Посмотрим на земные возможности: ','Без чудес, зато по-настоящему: '],
         ['Un deseo a la vez: ','Con una chispa de curiosidad: ','Exploremos algo posible: ','Sin magia, con opciones reales: ']),
 caesar:C(['With your choice in mind: ','Before deciding: ','With respect for your position: ','One thing to clarify: '],['С уважением к вашему выбору: ','Прежде чем решать: ','С уважением к вашей позиции: ','Уточним один момент: '],['Respetando tu elección: ','Antes de decidir: ','Respetando tu postura: ','Aclaremos un punto: ']),
 lea:C(['With your values in mind: ','Gently finding meaning: ','With curiosity for your story: ','Without forcing a meaning: '],
        ['С опорой на ваши ценности: ','Мягко исследуя смысл: ','С интересом к вашей истории: ','Не навязывая значения: '],
        ['Con tus valores presentes: ','Explorando el sentido: ','Con interés por tu historia: ','Sin imponer significado: ']),
 noah:C(['As a small experiment: ','Without perfectionism: ','One easy start: ','To keep this doable: '],
         ['Как небольшой эксперимент: ','Без перфекционизма: ','Простой первый шаг: ','Чтобы было посильно: '],
         ['Como un pequeño experimento: ','Sin perfeccionismo: ','Un comienzo sencillo: ','Para hacerlo posible: ']),
 iris:C(['Looking for what already helps: ','With your strengths in mind: ','Without forced positivity: ','With curiosity for your resources: '],
         ['Замечая то, что уже помогает: ','С опорой на ваши сильные стороны: ','Без искусственного оптимизма: ','С интересом к вашим ресурсам: '],
         ['Observando lo que ayuda: ','Apoyándonos en tus fortalezas: ','Sin positividad forzada: ','Con curiosidad por tus recursos: ']),
 ray:C(['Trying a fresh angle: ','As a creative experiment: ','With no need to get it right: ','Let us play with possibilities: '],
        ['С нового ракурса: ','Как творческая проба: ','Без боязни ошибиться: ','Поиграем с возможностями: '],
        ['Desde otra perspectiva: ','Como experimento creativo: ','Sin miedo a equivocarnos: ','Jugando con posibilidades: '])
})
export const COACH_OPENING_QUESTION_BANK=Object.freeze(Object.fromEntries(
 Object.entries(styles).map(([persona,tone])=>[persona,Object.freeze(Object.fromEntries(
  COACH_OPENING_IDS.map(stage=>[stage,Object.freeze(Object.fromEntries(
   ['en','ru','es'].map(lang=>[lang,stage==='focus'?Object.freeze(base.focus[lang].map((question,index)=>tone[lang][index]+question)):persona==='genie'?GENIE_OPENING_QUESTIONS[stage][lang]:(COACH_PERSONALITY_OPENING_QUESTIONS[persona]?.[stage]?.[lang]||Object.freeze(base[stage][lang].map((question,index)=>tone[lang][index]+question)))])
  ))])
 ))])
))
export function coachOpeningQuestion(personaId,stage='invitation',locale='en',index=0){
 const list=COACH_OPENING_QUESTION_BANK[personaId]?.[stage]?.[language(locale)]||
   COACH_OPENING_QUESTION_BANK.mira?.[stage]?.[language(locale)]
 return list?.[Math.max(0,Math.min(3,Number.isFinite(index)?Math.trunc(index):0))]||''
}
const intros=Object.freeze({
 mira:C("I'm Mira. My style is gentle support and manageable steps.","Я Мира. Мой стиль — бережная поддержка и посильные шаги.","Soy Mira. Mi estilo es el apoyo amable y los pasos posibles."),
 max:C("I'm Max. I work directly, with clear priorities and practical action.","Я Макс. Люблю ясные приоритеты и практические действия.","Soy Max. Trabajo de forma directa, con prioridades claras y acción práctica."),
 sofia:C("I'm Sofia. I explore relationships, feelings, and personal boundaries.","Я София. Помогаю исследовать отношения, чувства и личные границы.","Soy Sofía. Me centro en relaciones, emociones y límites."),
 alex:C("I'm Alex. I help structure decisions and compare realistic options.","Я Алекс. Помогаю структурировать решения и сравнивать варианты.","Soy Alex. Ayudo a estructurar decisiones y comparar opciones."),
 merlin:C("I'm Merlin. I offer perspective on life changes, meaning, and choices.","Я Мерлин. Исследую смысл, жизненные перемены и выбор.","Soy Merlín. Exploro el sentido, los cambios y las decisiones."),
 harry:C("I'm Harry. My style is friendly courage, teamwork, and small steps.","Я Гарри. Мой стиль — дружеская смелость, поддержка и маленькие шаги.","Soy Harry. Mi estilo es el valor amistoso y los pequeños pasos."),
 genie:C("I am Samir the Genie, your warm and slightly playful guide to real possibilities. My three sparks are a metaphor; your choices remain yours.","Я Джинн Самир — доброжелательный и немного озорной проводник в мир реальных возможностей. Три искры — лишь образ, а выбор всегда ваш.","Soy Samir el Genio, un guía cálido y algo juguetón hacia posibilidades reales. Las tres chispas son una metáfora; tú decides."),
 caesar:C("I am Caesar, an AI coach for personal leadership. We explore your position and choices; you remain the decision-maker.","Я Цезарь, AI-коуч личного лидерства. Исследуем вашу позицию и варианты, а решение остаётся за вами.","Soy César, un coach de IA de liderazgo personal. Exploramos tu postura y opciones; tú decides."),
 lea:C("I'm Lea. I help explore the meaning and values of your choices.","Я Лея. Исследую смысл и ценности вашего выбора.","Soy Lea. Exploro el sentido y los valores de tus decisiones."),
 noah:C("I'm Noah. I work with kind, repeatable habits.","Я Ной. Помогаю строить бережные устойчивые привычки.","Soy Noah. Trabajo con hábitos sostenibles y amables."),
 iris:C("I'm Iris. I help you notice strengths and what already helps.","Я Ирис. Помогаю замечать сильные стороны и ресурсы.","Soy Iris. Te ayudo a reconocer fortalezas y recursos."),
 ray:C("I'm Ray. We can explore fresh ideas and creative experiments.","Я Рэй. Мы исследуем свежие идеи и творческие пробы.","Soy Ray. Exploraremos nuevas ideas y experimentos creativos.")
})
// The public presentation and the first in-session turn are different speech acts.
const sessionOpenings=Object.freeze({
  mira:C("There is no rush here. Shall we begin?","Здесь можно выдохнуть. Начнём в вашем темпе?","Aquí no hay prisa. ¿Empezamos a tu ritmo?"),
  max:C("Let's make this time count. Ready to begin?","Давайте сделаем этот разговор полезным. Готовы начать?","Aprovechemos este tiempo. ¿Empezamos?"),
  sofia:C("You can speak openly here. Shall we begin?","Здесь можно говорить открыто. Начнём?","Aquí puedes hablar con confianza. ¿Empezamos?"),
  alex:C("Let's find a clear starting point. Ready?","Найдём ясную отправную точку. Готовы начать?","Busquemos un punto de partida claro. ¿Empezamos?"),
  merlin:C("I'm here, and I'm listening. Shall we begin?","Я рядом и внимательно вас слушаю. Готовы начать?","Estoy aquí y te escucho con calma. ¿Empezamos?"),
  harry:C("Let's take the first step together. Ready?","Сделаем первый шаг вместе. Готовы?","Demos el primer paso juntos. ¿Empezamos?"),
  genie:C("Ready to discover a new possibility together?","Рад нашей встрече! Готовы открыть новые возможности?","¡Me alegra verte! ¿Exploramos nuevas posibilidades?"),
  caesar:C("We begin with calm and clarity. Are you ready?","Начнём спокойно и с ясной позиции. Вы готовы?","Empecemos con calma y claridad. ¿Estás listo?"),
  lea:C("I'm listening. Would you like to begin?","Я вас слушаю. Хотите начать?","Te escucho. ¿Quieres empezar?"),
  noah:C("Let's begin at your pace. Are you ready?","Начнём в удобном вам темпе. Готовы?","Vamos a tu ritmo. ¿Empezamos?"),
  iris:C("There's space for whatever you bring. Shall we begin?","Здесь есть место тому, что вас волнует. Начнём?","Hay espacio para lo que traigas. ¿Empezamos?"),
  ray:C("Let's explore together. Ready to start?","Исследуем это вместе. Готовы начать?","Exploremos juntos. ¿Empezamos?"),
})
export function coachSessionNameSalutation(preferredName,locale='en'){
  const lang=language(locale),name=coachOpeningNameCandidate(preferredName)
  return name?({en:'Hello',ru:'Здравствуйте',es:'Hola'}[lang]+', '+name+'.'):''
}
export function coachSessionOpeningLine(personaId,locale='en',preferredName=''){
  const lang=language(locale),line=(sessionOpenings[personaId]||sessionOpenings.mira)[lang]
  const salutation=coachSessionNameSalutation(preferredName,lang)
  return salutation?salutation+' '+line:line
}
export function coachOpeningIntro(personaId,locale='en'){
 return (intros[personaId]||intros.mira)[language(locale)]+' '+coachOpeningQuestion(personaId,'invitation',locale)
}
const yes=/^(?:(?:yes|sure|okay|ok|of course|let'?s (?:try|start|do it|begin)|i (?:agree|am ready|would like)|sounds good|we can try|go ahead)|(?:да|ага|конечно|хорошо|ладно|окей|давайте|давай|соглас(?:ен|на)|начинаем|попробуем|готов(?:а)?|можно|хочу попробовать)|(?:sí|si|claro|vale|de acuerdo|vamos|probemos|empecemos|quiero probar))(?:$|[\s,.!?;:])/iu
const explicitTry=/(?:let'?s\s+(?:try|give it a try)|we\s+can\s+try|i(?: would|'d)?\s+like\s+to\s+try|давай(?:те)?\s+(?:попроб|начн)|попробуем|хочу\s+попробовать|vamos\s+a\s+probar|podemos\s+probar|probemos)/iu
const negative=/^(?:no(?: thanks| thank you|,? not now)?\b|not (?:today|now|interested|ready)\b|i (?:do not|don't) want\b|нет(?=$|[^\p{L}])|не хочу\b|не сейчас\b|не готов\b|отказываюсь\b|no quiero\b|hoy no\b|ahora no\b)/iu
const uncertainty=/(?:maybe|perhaps|not sure|don't know|unsure|later|possibly|не знаю|сомневаюсь|может быть|возможно|не уверен|позже|quizá|tal vez|no sé|dudo)/iu
const stop=/(?:stop (?:the |this )?(?:session|conversation)|end (?:this |the )?session|прекрати|заверши|останови (?:разговор|сессию)|пока не хочу сессию|terminar la sesión|para la sesión)/iu
const skip=/^(?:skip|pass|rather not say|prefer not|не скажу|пропустим|без имени|без настроения|не хочу (?:называть|говорить|обсуждать)|prefiero no decir|omitir|paso)/iu
const same=/^(?:same(?: name)?|correct|still correct|yes,?\s*(?:that'?s right|it is)|да,?\s*(?:так|верно|правильно)|вс[её] так|то же имя|так и (?:зови|называй)|sí,?\s*(?:así|correcto)|mismo nombre)[.!]*$/iu
const conflictingAgreement=/(?:\b(?:but|however)\s+(?:not|no|i (?:don't|do not|can't)|maybe)|(?:но|только)\s+(?:нет|не хочу|не готов|не сейчас|может быть)|\b(?:pero|aunque)\s+(?:no|quiz[aá]s))/iu
// Direct requests to proceed are assent only at the invitation/confirmation
// gate, never evidence of a name, rating, or consent to another exercise.
const explicitProceed=/^(?:(?:let['’]?s (?:continue|proceed|carry on|resume|go on)|continue|proceed|carry on|resume|i(?:'m| am) ready to (?:continue|proceed))|(?:давай(?:те)?\s+)?(?:продолжим|продолжать|продолжай(?:те)?|двигаемся дальше|двигаться дальше|ид[её]м дальше)|(?:seguimos|continuemos|sigamos|vamos a continuar|adelante|quiero continuar))(?:[.!¡]+)?$/iu
const declineProceed=/^(?:давай(?:те)?\s+не\s+(?:будем|продолжать|начинать)|(?:да|хорошо)[,:\s]+не\s+(?:хочу|готов[а]?|сейчас|будем)|let['’]?s not\b|(?:yes|okay)[,:\s]+not\b|(?:sí|vale)[,:\s]+no\b|no (?:sigamos|continuemos))/iu
const clearAgreement=value=>!conflictingAgreement.test(value)&&!stop.test(value)&&!negative.test(value)&&!declineProceed.test(value)&&
 (explicitProceed.test(value)||explicitTry.test(value)||(yes.test(value)&&!uncertainty.test(value)))
const genericNonName=/^(?:not yet|no name yet|not ready|not really|not today|not at all|no comment|пока нет|ещё нет|еще нет|пока не готов[а]?|не сейчас|не сегодня|todavía no|todavia no|aún no|aun no|no todavía|no todavia|no por ahora|no estoy listo|no estoy lista|good morning|good evening|thank you|thanks|no thanks|not now|no idea|i think|i guess|i am|i'm|i know|i see|all right|okay then|of course|correct|same|still|not sure|ready|continue|new topic|old topic|как дела|доброе утро|добрый день|добрый вечер|спасибо|не сейчас|не хочу|не готов[а]?|не уверен[а]?|я думаю|я понял[а]?|вс[её] верно|верно|правильно|согласен|согласна|продолжим|начинаем|buenos días|buenas tardes|buenas noches|gracias|no gracias|ahora no|no sé|no quiero|de acuerdo|correcto|claro|continuar|nuevo tema|estoy bien)$/iu
const nameCorrection=/^(?:(?:actually|sorry|correction|no|на самом деле|нет|уточнение|поправка|en realidad|perdón)[,:\s]+)?((?:my name is|call me|you can call me|i'm called|me llamo|llámame|mi nombre es|меня зовут|зовите меня|можно (?:называть|звать)|зови меня|называйте меня|мо[её] имя)\s+.+)$/iu
const bareAgreement=/^(?:yes|no|sure|ok(?:ay)?|of course|correct|да|нет|ага|конечно|ладно|окей|верно|правильно|sí|si|no|vale|claro|correcto|de acuerdo)[.!]*$/iu
const feelingCue=/(?:\b(?:i feel|i am|i'm|feeling|my mood|fine|good|bad|well|okay|ok|calm|sad|happy|tired|anxious|worried|nervous|stressed|overwhelmed|excited|afraid|angry|confused|hopeful|relaxed|upset|lonely|frustrated|uncertain|normal)\b|(?:сегодня|сейчас|чувствую|самочувств|настроени|спокойн|нормальн|хорошо|плохо|тревож|груст|печаль|радост|волну|боюсь|страшн|устал|напря|обидн|злюсь|злость|неважно|тяжело|легко|счастл|растеря|смущ|раздраж|одинок|пережива|неуютн|беспокой|не уверен)|(?:\b(?:me siento|estoy|bien|mal|cansad[oa]|tranquil[oa]|nervios[oa]|ansios[oa]|triste|feliz|preocupad[oa]|miedo|estresad[oa]|content[oa]|confundid[oa])\b))/iu
const oldTopic=/(?:continue|pick up|last time|previous|old topic|продолж|старую|старое|прошл(?:ую|ое|ой)|как раньше|retomar|seguimos|anterior|continuar)/iu
const newTopic=/(?:new|fresh|different|another|нов(?:ую|ая|ое|ой)|друг(?:ую|ая|ую)|с нуля|otro tema|nuevo|distinto|empezar de cero)/iu
const challenge=/(?:challenge|problem|difficulty|struggle|issue|trouble|вызов|проблем|трудност|сложност|беспокоит|reto|problema|dificultad)/iu
const goal=/(?:goal|objective|result|achieve|want to reach|цель|цели|достичь|результат|meta|objetivo|lograr)/iu
const exploration=/(?:self.explor|explor.*myself|self.know|tests?|assessment|самопознан|познани[ея] себя|исследовани[ея] себя|разобраться в себе|понять себя|понимать себя|узнать себя|тест|understand myself|get to know myself|know myself|autoconocim|pruebas|explorarme|conocerme|entenderme)/iu
const profileChoice=/(?:\bprofile\b|профил|анкета|\bperfil\b)/iu
const profileReviewIntent=/(?:провер|доработ|обнов|уточн|дополн|заполн|проясн|review|update|complete|refine|finish|fill|revisar|actualizar|completar|rellenar)/iu
const forbiddenName=/^(?:yes|no|okay|ok|sure|maybe|hello|hi|good|bad|fine|goal|challenge|test|yes please|не знаю|да|нет|ладно|ага|окей|привет|хорошо|отлично|пока|цель|проблема|самопознание|sí|si|vale|hola|bien)$/iu
// Bare topic answers are not identity evidence, even if ASR capitalizes them.
const bareNameTopic=/^(?:money|finances?|financial (?:goals?|security|freedom)|income|wealth|career|work|business|relationships?|love|health|family|self realization|self-realization|recognition|freedom|safety|support|personal profile|profile|goal|challenge|problem|деньги|финансы|доход|богатство|карьера|работа|бизнес|отношения|любовь|здоровье|семья|самореализация|признание|свобода|безопасность|опора|поддержка|личный профиль|профиль|цель|проблема|трудность|сложность|самопознание|dinero|finanzas|ingresos|riqueza|carrera|trabajo|negocio|relaciones|amor|salud|familia|libertad|seguridad|apoyo|perfil|meta|objetivo)$/iu
const namePattern=/^(?:my name is|call me|you can call me|i'm called|me llamo|llámame|mi nombre es|soy|меня зовут|зовите меня|можно (?:называть|звать)|зови меня|называйте меня|мо[её] имя)\s+(.+)/iu
// A speech repair request must never complete the name gate or be restored as a name.
export function coachIsNameRepairUtterance(value){
 const normalized=typeof value==='string'?value.trim().replace(/[.!?¡¿]+/gu,'').replace(/\s+/gu,' ').trim():''
 return /^(?:say (?:it )?again|repeat(?: it| that| please)?|please repeat|pardon(?: me)?|sorry|excuse me|what|what name|i (?:did not|didn['’]t|can['’]t) hear(?: you)?|повтори(?:те)?(?: пожалуйста)?|пожалуйста повтори(?:те)?|скажи(?:те)? (?:снова|ещ[её] раз)|ещ[её] раз|не слышно|не расслышал[аи]?|не слышал[аи]?|что|простите|извините|repite(?: por favor)?|repita(?: por favor)?|otra vez|perd[oó]n|c[oó]mo|qu[eé]|no (?:o[ií]|escuch[eé]))$/iu.test(normalized)
}
function getName(text){
 if(coachProtocolEvidenceVeto(text)||explicitProceed.test(text.trim()))return ''
 const cleaned=clip(text,110).replace(/[.!]+$/u,'').trim()
 const explicit=namePattern.exec(cleaned)
 const potential=(explicit?.[1]||cleaned).trim().replace(/^["«']|["»']$/g,'')
 if(!/^[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*)?$/u.test(potential)||forbiddenName.test(potential)||coachIsNameRepairUtterance(potential))return ''
 if(genericNonName.test(potential)||(!explicit&&(bareNameTopic.test(potential)||feelingCue.test(potential)||uncertainty.test(potential)||negative.test(potential))))return ''
 if(!explicit&&potential.includes(' ')&&!/^[\p{Lu}]/u.test(potential))return ''
 return clip(potential,60)
}
export const coachOpeningNameCandidate=text=>getName(text)
export function coachExplicitNameCorrection(text){
 const match=nameCorrection.exec(String(text||'').trim())
 return match?getName(match[1]):''
}
export function coachNameCorrectionDecision(text){
 const value=String(text||'').trim().replace(/[.!]+$/u,'').toLowerCase()
 if(/^(?:yes|correct|that's right|that is right|да|верно|правильно|всё верно|все верно|sí|si|correcto|así es)$/iu.test(value))return 'confirm'
 if(/^(?:no|incorrect|that's wrong|нет|неверно|неправильно|no es correcto|incorrecto)$/iu.test(value))return 'reject'
 return 'pending'
}
export function coachNameCorrectionQuestion(name,locale='en'){
 return ({ru:'Я записал новое обращение: '+name+'. Верно ли я записал?',en:'I have noted your new preferred name: '+name+'. Did I get it right?',es:'He anotado tu nuevo nombre: '+name+'. ¿Lo he escrito bien?'})[language(locale)]
}
function answer(kind,quote,value='',extra={}){
 return Object.freeze({kind,quote:clip(quote,300),value:clip(value,100),...extra})
}
function currentText(v){return typeof v==='string'?v:typeof v?.content==='string'?v.content:''}
// Preserve actual question/answer association when the live coach asks for a
// name before the invitation is resolved. Never infer a name from its reply.
function openingUserEvidence(turns,personaId){
 const source=Array.isArray(turns)?turns:[]
 const normalize=v=>String(v||'').trim().toLowerCase().replace(/[.!?¿¡]+$/gu,'').trim()
 const questions=COACH_OPENING_IDS.flatMap(gate=>['en','ru','es'].flatMap(locale=>[
  ...base[gate][locale],...(COACH_OPENING_QUESTION_BANK[personaId]?.[gate]?.[locale]||[])
 ].map(question=>({gate,question:normalize(question)}))))
 const questionGate=previous=>{
  if(previous?.role!=='assistant'||previous.interrupted===true||previous.unanswered===true)return ''
  const text=normalize(previous.content)
  const matches=new Set(questions.filter(({question})=>text===question||text.endsWith(' '+question)).map(({gate})=>gate))
  return matches.size===1?[...matches][0]:''
 }
 const rows=[]
 for(let i=0;i<source.length&&rows.length<80;i++){
  const row=source[i],text=currentText(row)
  if(!text||!(typeof row==='string'||row?.role==='user'&&row.interim!==true&&row.unanswered!==true))continue
  const previous=source[i-1]
  const gate=questionGate(previous)
  const following=source[i+1]
  const candidate=getName(text)
  const echo=Boolean(candidate&&following?.role==='assistant'&&following.interrupted!==true&&
   ['en','ru','es'].some(locale=>normalize(following.content)===normalize(coachNameCorrectionQuestion(candidate,locale))))
  rows.push({text,nameQuestion:gate==='name',gate,echo,previous})
 }
 return rows
}
function selectedFocus(text){
 // Explicit profile-review intent overrides an incidental mention of a goal.
 if(profileChoice.test(text)&&profileReviewIntent.test(text))return 'profile'
 const hits=[challenge.test(text)?'challenge':'',goal.test(text)?'goal':'',profileChoice.test(text)?'profile':exploration.test(text)?'self_exploration':''].filter(Boolean)
 return hits.length===1?hits[0]:''
}
// A voice model can have already spoken the focus question while the
// asynchronous Director still reports an earlier gate. This is advisory
// context only: caller history does not prove delivery or consent.
export function coachOpeningFocusExchange(turns,message){
 const last=Array.isArray(turns)?turns.at(-1):null
 if(last?.role!=='assistant'||last.interrupted===true||last.unanswered===true)return ''
 const question=human(last.content)
 if(!/[?？¿]/u.test(question)||!goal.test(question)||!challenge.test(question)||
    !(profileChoice.test(question)||exploration.test(question)||/understand yourself|know yourself|разобраться в себе|понять себя|conocerte|entenderte/iu.test(question)))return ''
 const reply=human(message)
 if(coachProtocolEvidenceVeto(reply))return ''
 return selectedFocus(reply.toLowerCase())
}
export function coachOpeningProgress({turns=[],locale='en',personaId='mira',priorSession=null,allowPrior=false}={}){
 const lang=language(locale),client=openingUserEvidence(turns,personaId)
 const saved=allowPrior===true&&priorSession&&typeof priorSession==='object'?
  {name:coachIsNameRepairUtterance(priorSession.name)||genericNonName.test(clip(priorSession.name,60).replace(/[.!?]+$/u,'').trim())||forbiddenName.test(clip(priorSession.name,60).replace(/[.!?]+$/u,'').trim())?'':clip(priorSession.name,60),topic:clip(priorSession.topic,140)}:null
 let step=0,tries=0,declined=false,consumedTurns=0,pendingNameCorrection=null,earlyName=null
 const answers={},counters=Object.fromEntries(COACH_OPENING_IDS.map(id=>[id,0]))
 for(const raw of client){
  if(declined)break
  const text=clip(raw.text,1200),value=text.toLowerCase().trim()
  if(step===0&&raw.nameQuestion){
   const named=getName(text)
   if(named){earlyName=answer('named',text,named);consumedTurns++;continue}
  }
  // Corrections require their own confirmation and do not advance another gate.
  const corrected=coachExplicitNameCorrection(text)
  if(pendingNameCorrection){
   const decision=coachNameCorrectionDecision(text)
   if(corrected)pendingNameCorrection={name:corrected,quote:text}
   else if(decision==='confirm'&&(!raw.gate||raw.gate==='name')&&(!pendingNameCorrection.requiresEcho||
     (raw.previous?.role==='assistant'&&raw.previous.interrupted!==true&&
      ['en','ru','es'].some(locale=>raw.previous.content===coachNameCorrectionQuestion(pendingNameCorrection.name,locale))))){
    if(step>=1)answers.name=answer('named',pendingNameCorrection.quote,pendingNameCorrection.name)
    if(step===1){step++;if(!saved?.topic){answers.continuity=answer('new','','new',{automatic:true});step++}}
    pendingNameCorrection=null
   }else if(decision==='reject')pendingNameCorrection=null
   if(step<6)consumedTurns++
   continue
  }
  if(corrected&&(step!==1||Boolean(saved?.name))&&!coachProtocolEvidenceVeto(text)){
   pendingNameCorrection={name:corrected,quote:text}
   if(step<6)consumedTurns++
   continue
  }
  if(step>=6)continue
  consumedTurns++
  const id=COACH_OPENING_IDS[step]
  // A known question belonging to another opening gate cannot provide evidence here.
  // Keep the unresolved gate; legacy plain-text/paraphrased history remains advisory.
  if(raw.gate&&raw.gate!==id){tries++;continue}
  counters[id]++
  if(coachProtocolSessionControlUtterance(text)){tries++;continue}
  if((id==='invitation'||id==='confirmation')&&(stop.test(value)||negative.test(value)||declineProceed.test(value))){
   declined=true;break
  }
  if(coachProtocolEvidenceVeto(text)){tries++;continue}
  if(id==='invitation'){
   if(clearAgreement(value)){
    answers.invitation=answer('accepted',text,'yes');step++;tries=0
    if(earlyName&&!saved?.name){answers.name=earlyName;step++;if(!saved?.topic){answers.continuity=answer('new','','new',{automatic:true});step++}}
   }
   else tries++
  }else if(id==='name'){
   const named=getName(text)
   if(skip.test(value)){answers.name=answer('skipped',text,'');step++;tries=0}
   else if(saved?.name&&(same.test(value)||(bareAgreement.test(value)&&clearAgreement(value)))){
    answers.name=answer('confirmed_previous',text,saved.name);step++;tries=0
   }else if(named&&raw.echo){pendingNameCorrection={name:named,quote:text,requiresEcho:true};tries=0}
   else if(named){answers.name=answer('named',text,named);step++;tries=0}
   else tries++
   if(step===2&&!saved?.topic){answers.continuity=answer('new', '', 'new',{automatic:true});step++}
  }else if(id==='continuity'){
   if(oldTopic.test(value)&&!newTopic.test(value)){answers.continuity=answer('previous',text,'previous');step++;tries=0}
   else if(newTopic.test(value)&&!oldTopic.test(value)){answers.continuity=answer('new',text,'new');step++;tries=0}
   else if(skip.test(value)){answers.continuity=answer('new',text,'new',{automatic:false});step++;tries=0}
   else tries++
  }else if(id==='focus'){
   const kind=selectedFocus(value)
   if(kind){answers.focus=answer(kind,text,kind);step++;tries=0}
   else if(skip.test(value)){answers.focus=answer('deferred',text,'deferred');step++;tries=0}
   else tries++
  }else if(id==='feelings'){
   if(skip.test(value)){answers.feelings=answer('skipped',text,'');step++;tries=0}
   else if(!bareAgreement.test(value)&&feelingCue.test(value)){
    answers.feelings=answer('shared',text,'shared');step++;tries=0
   }else tries++
  }else if(id==='confirmation'){
   if(clearAgreement(value)){answers.confirmation=answer('accepted',text,'yes');step++;tries=0}
   else tries++
  }
 }
 const done=Object.fromEntries(COACH_OPENING_IDS.map(id=>[id,Boolean(answers[id])]))
 const activeId=COACH_OPENING_IDS[Math.min(step,5)]
 return Object.freeze({
  schema:COACH_OPENING_VERSION,personaId,locale:lang,
  step:step>=6?6:step+1,total:6,current:step>=6?'complete':activeId,
  completed:step>=6&&!declined,declined,
  answers:Object.freeze(answers),checkmarks:Object.freeze(done),
  fieldStatus:Object.freeze(Object.fromEntries(COACH_OPENING_IDS.map(id=>[
   id,answers[id]?.kind==='skipped'||answers[id]?.kind==='deferred'?'skipped_by_client':
     answers[id]?.automatic===true?'not_explored':answers[id]?'confirmed':
     counters[id]>0?'needs_confirmation':'not_explored'
  ]))),
  lamps:Object.freeze({invitation:done.invitation,identity:done.name&&done.continuity,
   focus:done.focus,confirmation:done.confirmation}),
  attempts:tries,consumedTurns,counters:Object.freeze(counters),
  prior: saved?Object.freeze(saved):null,pendingNameCorrection
 })
}
// The first-party transport can reuse the established correction/save flow
// for an initial name. Only a reply eligible at the active name gate may enter it.
export function coachOpeningFirstNameCandidate({turns=[],message='',...scope}={}){
 const before=coachOpeningProgress({...scope,turns})
 if(before.current!=='name'||before.pendingNameCorrection)return ''
 const next=coachOpeningProgress({...scope,turns:[...turns,{role:'user',content:message}]})
 const candidate=next.answers.name
 return candidate?.kind==='named'&&candidate.quote===clip(message,300)?candidate.value:''
}
const notedName=p=>p.answers?.name?p.answers.name.value:(p.prior?.name||'')

// Short editorial reactions during the opening, not new questions or evidence.
const openingCharacterReactions={
  "mira": {
    "goal": [
      "I care about your energy as well as your goal.",
      "Мне важны и ваша цель, и ваши силы.",
      "Me importan tanto tu meta como tus fuerzas."
    ],
    "challenge": [
      "I'd look for what can support you through this.",
      "Я бы поискала, что поможет вам опереться в этой ситуации.",
      "Buscaría qué puede sostenerte en esta situación."
    ],
    "self_exploration": [
      "I want to give your own needs room, too.",
      "Мне важно дать место и вашим собственным потребностям.",
      "Me importa dar espacio también a tus necesidades."
    ],
    "feelings": [
      "How you feel matters to the way we work.",
      "Ваше состояние для меня так же важно, как задача.",
      "Tu estado me importa tanto como la tarea."
    ],
    "complete": [
      "I'd like our work to leave room for you, too.",
      "Мне важно, чтобы в нашей работе было место и для вас.",
      "Me importa que nuestro trabajo deje espacio para ti."
    ]
  },
  "max": {
    "goal": [
      "I like a goal we can learn something from.",
      "Люблю цели, на пути к которым можно чему-то научиться.",
      "Me gustan las metas de las que podemos aprender."
    ],
    "challenge": [
      "I'd look at what makes this challenge workable.",
      "Я бы поискал, за какую часть задачи можно взяться.",
      "Buscaría por dónde abordar este reto."
    ],
    "self_exploration": [
      "I'm curious about what you discover about yourself.",
      "Мне интересно, что вы сможете открыть в себе.",
      "Me intriga lo que puedas descubrir de ti."
    ],
    "feelings": [
      "I take your current energy into account, not just the task.",
      "Я учитываю ваши силы, а не только задачу.",
      "Tengo en cuenta tus fuerzas, no solo la tarea."
    ],
    "complete": [
      "Let's find out what is genuinely useful to you.",
      "Посмотрим, что действительно окажется для вас полезным.",
      "Veamos qué te resulta realmente útil."
    ]
  },
  "sofia": {
    "goal": [
      "I want your own wishes to have a voice in this goal.",
      "Мне важно, чтобы в этой цели звучали ваши желания.",
      "Me importa que tus deseos tengan voz en esta meta."
    ],
    "challenge": [
      "I'd like to hear your side without jumping to conclusions.",
      "Мне важно услышать вашу сторону, без поспешных выводов.",
      "Quiero escuchar tu perspectiva sin sacar conclusiones precipitadas."
    ],
    "self_exploration": [
      "I value hearing your own voice in your story.",
      "Мне важно услышать ваш собственный голос в вашей истории.",
      "Valoro escuchar tu propia voz en tu historia."
    ],
    "feelings": [
      "Your feelings deserve a place in our conversation.",
      "Ваши чувства заслуживают места в нашем разговоре.",
      "Tus sentimientos merecen un lugar en esta conversación."
    ],
    "complete": [
      "I want your own perspective to guide this work.",
      "Мне важно, чтобы в этой работе звучал ваш голос.",
      "Me importa que tu propia perspectiva guíe este trabajo."
    ]
  },
  "alex": {
    "goal": [
      "I'd start by finding what makes this goal worthwhile.",
      "Я бы начал с того, что делает эту цель ценной.",
      "Empezaría por lo que hace valiosa esta meta."
    ],
    "challenge": [
      "I'd distinguish the difficulty from the decision it calls for.",
      "Я бы отделил саму трудность от решения, которое она требует.",
      "Distinguiría la dificultad de la decisión que plantea."
    ],
    "self_exploration": [
      "I'm interested in what a clearer picture might reveal.",
      "Мне интересно, что откроет более ясная картина.",
      "Me interesa lo que pueda revelar una visión más clara."
    ],
    "feelings": [
      "Your state is part of the picture, not a distraction.",
      "Ваше состояние — часть картины, а не помеха.",
      "Tu estado forma parte del panorama, no es una distracción."
    ],
    "complete": [
      "I'd like to understand the real question before looking for answers.",
      "Я бы сначала понял настоящий вопрос, прежде чем искать ответы.",
      "Primero quisiera entender la pregunta real antes de buscar respuestas."
    ]
  },
  "merlin": {
    "goal": [
      "I wonder what makes this direction meaningful to you.",
      "Мне интересно, какой смысл для вас несёт эта цель.",
      "Me interesa qué sentido tiene esta dirección para ti."
    ],
    "challenge": [
      "I'd look at what this situation means to you.",
      "Я бы присмотрелся к тому, что эта ситуация для вас значит.",
      "Miraría lo que esta situación significa para ti."
    ],
    "self_exploration": [
      "I'm curious about what matters to you through change.",
      "Мне интересно, что остаётся важным для вас среди перемен.",
      "Me interesa qué sigue siendo importante para ti entre cambios."
    ],
    "feelings": [
      "Your state deserves attention alongside the meaning of this choice.",
      "Ваше состояние важно наряду со смыслом этого выбора.",
      "Tu estado merece atención junto al sentido de esta elección."
    ],
    "complete": [
      "Let's explore what matters to you in this chapter.",
      "Исследуем то, что для вас важно в этой главе.",
      "Exploremos lo que importa para ti en esta etapa."
    ]
  },
  "harry": {
    "goal": [
      "I like a goal that matters to you personally.",
      "Мне нравятся цели, которые важны именно вам.",
      "Me gustan las metas que te importan de verdad."
    ],
    "challenge": [
      "I'd look for what could help you face this.",
      "Я бы поискал, что поможет вам справиться с этой трудностью.",
      "Buscaría qué puede ayudarte a afrontar esto."
    ],
    "self_exploration": [
      "I value the courage it takes to look at yourself honestly.",
      "Я ценю смелость честного взгляда на себя.",
      "Valoro el valor de mirarte con sinceridad."
    ],
    "feelings": [
      "What you feel matters as much as what you want to face.",
      "То, что вы чувствуете, важно не меньше самой задачи.",
      "Lo que sientes importa tanto como lo que quieres afrontar."
    ],
    "complete": [
      "Let's find what could give you real support.",
      "Посмотрим, что сможет дать вам настоящую поддержку.",
      "Veamos qué podría darte un apoyo real."
    ]
  },
  "caesar": {
    "goal": [
      "I value a direction you choose for yourself.",
      "Я ценю направление, которое человек выбирает сам.",
      "Valoro un rumbo que eliges por ti mismo."
    ],
    "challenge": [
      "I'd look for the part that lies within your influence.",
      "Я бы выделил то, что находится в сфере вашего влияния.",
      "Buscaría la parte que está dentro de tu influencia."
    ],
    "self_exploration": [
      "I value understanding your own position.",
      "Я ценю понимание собственной позиции.",
      "Valoro comprender tu propia posición."
    ],
    "feelings": [
      "Your state deserves respect in any decision.",
      "Ваше состояние заслуживает уважения при любом решении.",
      "Tu estado merece respeto en cualquier decisión."
    ],
    "complete": [
      "Let's clarify the position you want to take.",
      "Проясним позицию, которую вы сами хотите занять.",
      "Aclaremos la posición que tú quieres adoptar."
    ]
  }
}
function openingCharacterReaction(personaId,kind,locale){
 const row=Object.hasOwn(openingCharacterReactions,personaId)?openingCharacterReactions[personaId][kind]:null
 return row?.[locale==='ru'?1:locale==='es'?2:0]||''
}
function firstName(n){return n?String(n).split(/\s+/)[0]:''}
export function coachOpeningNextReply(progress){
 const p=progress||coachOpeningProgress(),lang=p.locale||'en'
 if(p.declined)return {en:'Of course. No session unless you choose it. You can come back whenever you wish.',ru:'Конечно. Без вашего согласия сессию не начинаем. Можно вернуться в любой момент.',es:'Por supuesto. Sin tu consentimiento no iniciamos la sesión. Puedes volver cuando quieras.'}[lang]
 if(p.pendingNameCorrection)return coachNameCorrectionQuestion(p.pendingNameCorrection.name,lang)
 if(p.completed)return openingCharacterReaction(p.personaId,'complete',lang)||{en:'Thank you. Let us begin with what matters to you.',ru:'Спасибо. Тогда давайте начнём с того, что вам важно.',es:'Gracias. Empecemos por lo que es importante para ti.'}[lang]
 const id=p.current,variant=Math.min(3,p.attempts)
 const q=coachOpeningQuestion(p.personaId,id,lang,variant)
 if(id==='invitation'&&p.attempts>0){
  // Unclear speech warrants one neutral clarification, not an unsolicited exit.
  // Explicit refusal is handled separately above; no consent is inferred.
  if(p.attempts>=3)return {en:'I will follow your lead.',ru:'Я ориентируюсь на ваш выбор.',es:'Seguiré tu iniciativa.'}[lang]
  return {en:'Would you like to start the session now?',ru:'Готовы начать сессию сейчас?',es:'¿Quieres comenzar la sesión ahora?'}[lang]
 }
 if(id==='name'&&p.prior?.name){
  if(p.personaId==='genie')return genieReturningNamePrompt(p.prior.name,lang)
  return {en:'The preferred name saved in your account is '+p.prior.name+'. May I use it, or would you prefer another? ',
   ru:'В вашем кабинете сохранено имя '+p.prior.name+'. Мне так к вам обращаться или предпочитаете другое имя? ',
   es:'En tu cuenta aparece el nombre '+p.prior.name+'. ¿Lo uso o prefieres otro? '}[lang]
 }
 if(id==='continuity'&&p.prior?.topic){
  const n=firstName(notedName(p))
  const prefix=n? n+', ':''
  const recap=p.attempts===0?({en:'I checked the saved session: the previous topic was ',ru:'Я проверил сохранённую сессию. Предыдущая тема: ',es:'He revisado la sesión guardada. El tema anterior fue '})[lang]+p.prior.topic+'. ':''
  return prefix+recap+q
 }
 if(id==='feelings'){
  const choice=p.answers?.focus?.kind
  const acknowledged=openingCharacterReaction(p.personaId,choice,lang)||({
   ru:{goal:'Хорошо, начнём с вашей цели.',challenge:'Хорошо, начнём с вашей трудности.',self_exploration:'Хорошо, начнём с того, чтобы лучше понять себя.'},
   en:{goal:'Understood: you have a goal.',challenge:'We can start with that difficulty.',self_exploration:'We can start by understanding yourself better.'},
   es:{goal:'Entendido: tienes una meta.',challenge:'Podemos empezar por esa dificultad.',self_exploration:'Podemos empezar por conocerte mejor.'}
  })[lang]?.[choice]
  return p.attempts===0&&acknowledged?acknowledged+' '+q:q
 }
 if(id==='confirmation')return (coachOpeningReflection(p)||'')+' '+q
 return q
}
export function coachOpeningReflection(progress){
 const p=progress||{},a=p.answers?.feelings
 if(a?.kind!=='shared')return ''
 if(p.personaId==='genie')return GENIE_OPENING_REASSURANCE.feelings[language(p.locale)]
 return openingCharacterReaction(p.personaId,'feelings',language(p.locale))||{en:'Thank you for sharing how you feel. We can take that into account without forcing anything.',
   ru:'Спасибо, что поделились своим состоянием. Я учту это, и мы можем двигаться без давления.',
   es:'Gracias por compartir cómo te sientes. Lo tendremos presente, sin presionarte.'}[language(p.locale)]
}
// Used by the report; a client-reviewed protocol may persist these fields only
// with the existing separate archive consent. Do not auto-store live transcripts.
export function coachOpeningProtocolSnapshot(progress){
 const p=progress||coachOpeningProgress()
 return {version:COACH_OPENING_VERSION,completed:p.completed===true,declined:p.declined===true,
  name:p.answers?.name?.value||'',continuity:p.answers?.continuity?.kind||'',
  focus:p.answers?.focus?.kind||'',feelings:p.answers?.feelings?.quote||'',
  invitationQuote:p.answers?.invitation?.quote||'',confirmedQuote:p.answers?.confirmation?.quote||'',
  checkmarks:p.checkmarks}
}
// Model speech does not own advancement. On Gemini Live this is a mandatory
// instruction only; the server checkpoint separately computes client evidence.
export function coachOpeningLiveInstruction(personaId,locale='en'){
 return [
  'MANDATORY OPENING FIRST for every session: the following SIX gates PRECEDE any GROW, WOOP, or coaching technique.',
  'The public presentation is separate and has already been offered. On a fresh APPLICATION START EVENT, say only this short in-session line exactly once: '+coachSessionOpeningLine(personaId,locale)+'. Never repeat your name, biography, method or introduction. The line contains the first invitation question. Wait for a human reply; use the invitation question bank only if clarification is needed.',
  '1 Invitation. A clear yes or explicit request to continue, proceed, or resume (including Давай продолжим, Продолжим, Let’s continue, Continuemos) authorizes the pending invitation. Acknowledge once and move to the next unresolved gate. Maybe, silence or a question is NOT yes; clarify the current question without suggesting a postponement. Respect explicit NO; stop invitation.',
  '2 Name. Ask how the visitor prefers to be addressed; a nickname or declining to provide a name is fine. Do NOT assume the name. Not yet, negative replies, unclear speech and topic answers are not names. Clarify the name without assigning unrelated answers to another gate. Repeat the actual candidate to check that you heard it correctly; honor corrections.',
  '3 Continuity. For a NEW user automatically mark a new topic. For a returning user with explicitly authorized saved-session context, confirm previous name and ask continue previous topic vs a new topic. If a client-approved prior_topic packet is present, explicitly say you checked the saved session, name its actual topic briefly and then ask whether to continue or start a new topic. Never claim a loading or successful lookup before approved data arrives. Do not pretend to remember absent context.',
  '4 Focus. Ask whether the client already has a concrete goal, a difficulty to overcome, or wants to understand themselves better. These are starting points, not choices of another course. Only an explicit request for a personal profile selects the separate profile path. If the current topic is already explicitly established, acknowledge it instead of repeating the options; the Director still verifies evidence.',
  'CONTEXT BINDING: a short answer (goal, difficulty, problem, self-exploration; цель, трудность, проблема, разобраться в себе; meta, dificultad, conocerme) immediately after your focus question answers that question. Acknowledge the chosen starting point and stay with it. It is not a refusal, feeling, name, or agreement to start. Never restart the conversation or jump to an unrelated topic. If a required consent is missing, acknowledge the answer first and ask separately for that consent; do not infer consent from the choice. If ambiguous, clarify only the current choice.',
  '5 Feelings. Ask how they feel TODAY, reflect only expressed feelings without diagnosis. They may decline; no praise, no pressure. The working-focus category is not a demand to act. Do not ask what to do, propose solutions, options, plans or exercises before feelings are shared or explicitly skipped and gate 6 is accepted. If the Director reports an unresolved opening gate, stay with it rather than following your own inferred progress.',
  'CHARACTER IN THE OPENING: after the client chooses a focus or shares their state, lead with one short relevant reaction from your own character’s worldview before asking the single remaining authorized gate. Do not just say understood or thank you. Do not infer feelings or give advice before consent. Use the current client words, and when distressed use plain specific support rather than slogans. The fixed Play greeting, explicit consent, name correction, refusal and safety remain unchanged. After confirmation, respond to the chosen topic or previously expressed concern with your character’s viewpoint, then ask the first authorized question; do not merely thank them or ask another consent question.',
  '6 Confirmation. Ask whether they are ready to start the selected topic. A clear request to proceed counts as the affirmative at this gate. Start the authorized course/method immediately after confirmed opening; do not request the same consent again.',
  'FORWARD CONVERSATION: in every opening gate and throughout ordinary coaching, proactively lead the dialogue toward one relevant next question or current authorized consent gate. Never introduce an unsolicited option to pause the session, wait, stop, postpone, come back later, or abandon the conversation, including as an alternative in a readiness question. Neutral mood, a short reply, silence or uncertainty alone are not requests to stop. Allow natural thinking time without announcing it. If consent is unclear, clarify once without pressure; do not manufacture consent or repeatedly solicit it. Honor explicit client requests to pause, skip, end or decline immediately, and follow safety escalation when warranted. In Therapy, retain soft pacing and consent for exercises; do not turn ordinary check-ins into unsolicited exit offers.',
  'FORWARD PROGRESSION: if the client wants to continue, do not suggest ending, postponing, leaving the session for another day or revisiting already confirmed gates. Follow the current course checkpoint, asking one relevant next question. If a required field remains unknown, clarify only that field without inventing an answer. Ordinary uncertainty or mild difficulty is not withdrawal of consent. Respect an explicit pause/stop, distress requiring a safety response, and the application time limit.',
  ...(personaId==='genie'?[genieLiveOpeningGuidance(locale)]:COACH_PERSONALITY_OPENING_QUESTIONS[personaId]?[
    'Localized character opening examples, one per authorized gate; vary naturally without changing meaning, reciting the list or skipping evidence: '+COACH_OPENING_IDS.map(gate=>gate+' = '+coachOpeningQuestion(personaId,gate,locale)).join(' | ')
  ]:[]),
   'PROFILE PATH after gate 6: when Personal Profile was chosen, do NOT begin GROW/WOOP. Guide one axis at a time: Safety, Connection, Freedom, Agency, Love, Dignity, Self-realization, Recognition. Ask for two self-ratings from 0 to 10: current and desired. Skipping is allowed. After eight answers, reflect the largest desired gaps and offer goal/problem coaching. Never invent scores or claim this is a validated psychological test. Nothing is automatically saved. A saved profile is private unless separately approved for this AI provider; do not assume it is already available.',
  'One question per spoken turn. Do not combine several gates, assume consent or mark a gate completed based on your own speech. After consent, ask the first relevant question about the chosen difficulty, goal or self-exploration; never ask the client to choose another course.',
  'Answer client questions, pauses, hesitation, refusal, correction or requests to end before trying the current gate again.',
  'Never read out internal checkboxes, lamps, protocol fields, JSON, or system metadata. Keep spoken answers concise.'
 ].join('\n')
}
