/**
 * Holistic House · obligatory My Coach opening, before any GROW/WOOP/etc.
 * Every completion is derived from the visitor's own utterances, never model
 * prose, time, topic inference or an AI claim of consent.
 * Questions are editorial content; client answers are private and ephemeral
 * until separately reviewed and saved through the existing encrypted archive.
 */
export const COACH_OPENING_VERSION='hh-coach-opening-v1-20261122'
export const COACH_OPENING_IDS=Object.freeze(['invitation','name','continuity','focus','feelings','confirmation'])
export const COACH_OPENING_PUBLIC_IDS=Object.freeze(['mira','max','sofia','alex','merlin','harry','genie'])
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
  'Are we working on a challenge, a goal, or self-exploration today?',
  'Is your focus a current difficulty, a desired result, or understanding yourself better?',
  'Would you like support with a challenge, planning a goal, or exploring your profile and tests?',
  'Which starting point fits: challenge, goal, or self-exploration?'
 ],[
  'Сегодня работаем с трудностью, целью или самопознанием?',
  'Что ближе: текущая проблема, желаемый результат или лучшее понимание себя?',
  'Хотите разобрать вызов, двигаться к цели или исследовать профиль и тесты?',
  'Что выберем: challenge, goal или self-exploration?'
 ],[
  '¿Trabajamos hoy un reto, una meta o la exploración personal?',
  '¿Tu foco es una dificultad, un resultado deseado o conocerte mejor?',
  '¿Quieres abordar un reto, avanzar hacia una meta o explorar tu perfil y pruebas?',
  '¿Qué encaja mejor: reto, meta o autoconocimiento?'
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
 mira:C(['Gently: ','At your pace: ','With room to pause: ','Without any rush: '],
         ['Бережно спрошу: ','Без спешки: ','С правом на паузу: ','Мягко уточню: '],
         ['Con delicadeza: ','A tu ritmo: ','Con permiso de pausar: ','Sin ninguna prisa: ']),
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
   ['en','ru','es'].map(lang=>[lang,Object.freeze(base[stage][lang].map((question,index)=>tone[lang][index]+question))])
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
 genie:C("I am Samir the Genie. My three-wishes metaphor turns imagination into choices, never miracles.","Я Джинн Самир. Метафора трёх желаний помогает превратить фантазию в выбор, а не в чудеса.","Soy Samir el Genio. La metáfora de los tres deseos convierte la imaginación en elecciones reales, no en milagros."),
 lea:C("I'm Lea. I help explore the meaning and values of your choices.","Я Лея. Исследую смысл и ценности вашего выбора.","Soy Lea. Exploro el sentido y los valores de tus decisiones."),
 noah:C("I'm Noah. I work with kind, repeatable habits.","Я Ной. Помогаю строить бережные устойчивые привычки.","Soy Noah. Trabajo con hábitos sostenibles y amables."),
 iris:C("I'm Iris. I help you notice strengths and what already helps.","Я Ирис. Помогаю замечать сильные стороны и ресурсы.","Soy Iris. Te ayudo a reconocer fortalezas y recursos."),
 ray:C("I'm Ray. We can explore fresh ideas and creative experiments.","Я Рэй. Мы исследуем свежие идеи и творческие пробы.","Soy Ray. Exploraremos nuevas ideas y experimentos creativos.")
})
export function coachOpeningIntro(personaId,locale='en'){
 return (intros[personaId]||intros.mira)[language(locale)]+' '+coachOpeningQuestion(personaId,'invitation',locale)
}
const yes=/^(?:(?:yes|sure|okay|ok|of course|let'?s (?:try|start|do it|begin)|i (?:agree|am ready|would like)|sounds good|we can try|go ahead)|(?:да|ага|конечно|хорошо|ладно|окей|давайте|давай|соглас(?:ен|на)|начинаем|попробуем|готов(?:а)?|можно|хочу попробовать)|(?:sí|si|claro|vale|de acuerdo|vamos|probemos|empecemos|quiero probar))(?:$|[\s,.!?;:])/iu
const negative=/^(?:no(?: thanks| thank you|,? not now)?\b|not (?:today|now|interested|ready)\b|i (?:do not|don't) want\b|нет(?=$|[^\p{L}])|не хочу\b|не сейчас\b|не готов\b|отказываюсь\b|no quiero\b|hoy no\b|ahora no\b)/iu
const uncertainty=/(?:maybe|perhaps|not sure|don't know|unsure|later|possibly|не знаю|сомневаюсь|может быть|возможно|не уверен|позже|quizá|tal vez|no sé|dudo)/iu
const stop=/(?:stop (?:the |this )?(?:session|conversation)|end (?:this |the )?session|прекрати|заверши|останови (?:разговор|сессию)|пока не хочу сессию|terminar la sesión|para la sesión)/iu
const skip=/^(?:skip|pass|rather not say|prefer not|не скажу|пропустим|без имени|без настроения|не хочу (?:называть|говорить|обсуждать)|prefiero no decir|omitir|paso)/iu
const same=/(?:same|correct|still|yes,? (?:that'?s|it is)|да,? (?:так|верно|правильно)|всё так|то же имя|так и (?:зови|называй)|sí,? (?:así|correcto)|mismo nombre)/iu
const oldTopic=/(?:continue|pick up|last time|previous|old topic|продолж|старую|старое|прошл(?:ую|ое|ой)|как раньше|retomar|seguimos|anterior|continuar)/iu
const newTopic=/(?:new|fresh|different|another|нов(?:ую|ая|ое|ой)|друг(?:ую|ая|ую)|с нуля|otro tema|nuevo|distinto|empezar de cero)/iu
const challenge=/(?:challenge|problem|difficulty|struggle|issue|trouble|вызов|проблем|трудност|сложност|беспокоит|reto|problema|dificultad)/iu
const goal=/(?:goal|objective|result|achieve|want to reach|цель|цели|достичь|результат|meta|objetivo|lograr)/iu
const exploration=/(?:self.explor|explor.*myself|self.know|profile|tests?|assessment|самопознан|познани[ея] себя|исследовани[ея] себя|профил|тест|autoconocim|perfil|pruebas|explorarme)/iu
const forbiddenName=/^(?:yes|no|okay|ok|sure|maybe|hello|hi|good|bad|fine|goal|challenge|test|yes please|не знаю|да|нет|ладно|ага|окей|привет|хорошо|отлично|пока|цель|проблема|самопознание|sí|si|vale|hola|bien)$/iu
const namePattern=/^(?:my name is|call me|you can call me|i'm called|me llamo|llámame|mi nombre es|soy|меня зовут|зовите меня|можно (?:называть|звать)|зови меня|называйте меня|мо[её] имя)\s+(.+)/iu
function getName(text){
 const cleaned=clip(text,110).replace(/[.!?]+$/u,'').trim()
 const explicit=namePattern.exec(cleaned)
 const potential=(explicit?.[1]||cleaned).trim().replace(/^["«']|["»']$/g,'')
 if(!/^[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*)?$/u.test(potential)||forbiddenName.test(potential))return ''
 if(!explicit&&potential.includes(' ')&&!/^[\p{Lu}]/u.test(potential))return ''
 return clip(potential,60)
}
function answer(kind,quote,value='',extra={}){
 return Object.freeze({kind,quote:clip(quote,300),value:clip(value,100),...extra})
}
function currentText(v){return typeof v==='string'?v:typeof v?.content==='string'?v.content:''}
function userLines(turns){return (Array.isArray(turns)?turns:[]).filter(x=>typeof x==='string'||x?.role==='user').map(currentText).filter(Boolean).slice(0,80)}
function selectedFocus(text){
 const hits=[challenge.test(text)?'challenge':'',goal.test(text)?'goal':'',exploration.test(text)?'self_exploration':''].filter(Boolean)
 return hits.length===1?hits[0]:''
}
export function coachOpeningProgress({turns=[],locale='en',personaId='mira',priorSession=null,allowPrior=false}={}){
 const lang=language(locale),client=userLines(turns)
 const saved=allowPrior===true&&priorSession&&typeof priorSession==='object'?
  {name:clip(priorSession.name,60),topic:clip(priorSession.topic,140)}:null
 let step=0,tries=0,declined=false
 const answers={},counters=Object.fromEntries(COACH_OPENING_IDS.map(id=>[id,0]))
 for(const raw of client){
  if(step>=6||declined)break
  const text=clip(raw,1200),value=text.toLowerCase().trim()
  const id=COACH_OPENING_IDS[step]
  counters[id]++
  if(id==='invitation'){
   if(stop.test(value)||negative.test(value)){declined=true;break}
   if(uncertainty.test(value)&&!yes.test(value)){tries++;continue}
   if(yes.test(value)){answers.invitation=answer('accepted',text,'yes');step++;tries=0}
   else tries++
  }else if(id==='name'){
   const named=getName(text)
   if(named){answers.name=answer('named',text,named);step++;tries=0}
   else if(skip.test(value)){answers.name=answer('skipped',text,'');step++;tries=0}
   else if(saved?.name&&(same.test(value)||yes.test(value))){
    answers.name=answer('confirmed_previous',text,saved.name);step++;tries=0
   }else tries++
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
   else if(text.trim()&&text.trim().length>1&&!/^\?+$/.test(value)){
    answers.feelings=answer('shared',text,'shared');step++;tries=0
   }else tries++
  }else if(id==='confirmation'){
   if(stop.test(value)||negative.test(value)){declined=true;break}
   if(yes.test(value)){answers.confirmation=answer('accepted',text,'yes');step++;tries=0}
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
  lamps:Object.freeze({invitation:done.invitation,identity:done.name&&done.continuity,
   focus:done.focus,confirmation:done.confirmation}),
  attempts:tries,counters:Object.freeze(counters),
  prior: saved?Object.freeze(saved):null
 })
}
const notedName=p=>p.answers?.name?.value||p.prior?.name||''
function firstName(n){return n?String(n).split(/\s+/)[0]:''}
export function coachOpeningNextReply(progress){
 const p=progress||coachOpeningProgress(),lang=p.locale||'en'
 if(p.declined)return {en:'Of course. No session unless you choose it. You can come back whenever you wish.',ru:'Конечно. Без вашего согласия сессию не начинаем. Можно вернуться в любой момент.',es:'Por supuesto. Sin tu consentimiento no iniciamos la sesión. Puedes volver cuando quieras.'}[lang]
 if(p.completed)return {en:'Thank you. Let us begin with what matters to you.',ru:'Спасибо. Тогда давайте начнём с того, что вам важно.',es:'Gracias. Empecemos por lo que es importante para ti.'}[lang]
 const id=p.current,variant=Math.min(3,p.attempts)
 const q=coachOpeningQuestion(p.personaId,id,lang,variant)
 if(id==='invitation'&&p.attempts>0){
  const cap={en:'You do not have to decide now. We can simply talk about how a session works, or leave it for another day.',
   ru:'Необязательно решать сейчас. Можем коротко обсудить, как проходит сессия, или отложить её.',
   es:'No tienes que decidir ahora. Podemos explicar cómo funciona o dejarlo para otro día.'}[lang]
  return p.attempts>=3?cap:cap+' '+q
 }
 if(id==='name'&&p.prior?.name){
  return {en:'Last time you said I could call you '+p.prior.name+'. Is that still right, or would you prefer another name? ',
   ru:'В прошлой сохранённой сессии вы указали имя '+p.prior.name+'. Продолжать так обращаться или предпочитаете другое имя? ',
   es:'En la sesión guardada anterior usaste el nombre '+p.prior.name+'. ¿Lo mantenemos o prefieres otro? '}[lang]
 }
 if(id==='continuity'&&p.prior?.topic){
  const n=firstName(notedName(p))
  const prefix=n? n+', ':''
  return prefix+q
 }
 if(id==='feelings')return q
 if(id==='confirmation')return (coachOpeningReflection(p)||'')+' '+q
 return q
}
export function coachOpeningReflection(progress){
 const p=progress||{},a=p.answers?.feelings
 if(a?.kind!=='shared')return ''
 return {en:'Thank you for sharing how you feel. We can take that into account without forcing anything.',
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
  'Introduce yourself briefly in your character style, then ask exactly: '+coachOpeningIntro(personaId,locale),
  '1 Invitation. Wait for a clear client yes, agreement, or explicit willingness to try. Maybe, silence or a question is NOT yes. Explain without pressure. Respect NO; stop invitation.',
  '2 Name. Ask how the visitor prefers to be addressed; a nickname or declining to provide a name is fine. Do NOT assume the name.',
  '3 Continuity. For a NEW user automatically mark a new topic. For a returning user with explicitly authorized saved-session context, confirm previous name and ask continue previous topic vs a new topic. Do not pretend to remember absent context.',
  '4 Focus. Ask the client to choose Challenge, Goal, or Self-exploration (profile and tests).',
  '5 Feelings. Ask how they feel TODAY, reflect only expressed feelings without diagnosis. They may decline; no praise, no pressure.',
  '6 Confirmation. Ask whether they are ready to start the selected topic. Wait for their affirmative before starting method coaching.',
  'One question per spoken turn. Do not combine several gates, assume consent or mark a gate completed based on your own speech.',
  'Answer client questions, pauses, hesitation, refusal, correction or requests to end before trying the current gate again.',
  'Never read out internal checkboxes, lamps, protocol fields, JSON, or system metadata. Keep spoken answers concise.'
 ].join('\n')
}
