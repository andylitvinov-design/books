/**
 * An editorial guard for natural, low-context My Coach dialogue.
 * Pure and ephemeral: no new inference, persistence, speech processing or model calls.
 * Method/stage selection, consent and safety remain server-owned elsewhere.
 */
import {coachDialogueBankGuidance} from './coach-dialogue-selector.mjs'
const excludedActs=new Set(['greeting','gratitude','affirmation','negation',
  'uncertainty','hesitation','option_reference','correction','topic_shift',
  'clarification_request','question_to_coach'])
const genericOpening=/^(?:(?:вы|ты)\s+(?:упомянули|сказали|назвали|говорите|говорили)|you\s+(?:mentioned|said|brought\s+up)|mencionaste|has\s+mencionado)(?=[\s«"'.:,—!?-]|$)/iu
const genericIntake=/(?:что\s+бы\s+(?:вам|тебе)\s+хотелось|что\s+(?:вы|ты)\s+хотели\s+бы|какую\s+(?:цель|задачу)\s+(?:вы|ты)|what\s+would\s+you\s+like|what\s+do\s+you\s+want\s+to\s+(?:achieve|discuss|change)|qu[eé]\s+(?:te|le)\s+gustar[ií]a)/iu
const earlierRepair=/^(?:можно чуть подробнее\?|кажется, я пока не улавливаю|could you tell me a little more\?|i'm still not quite following|¿me cuentas un poco más\?|creo que aún no te sigo)/iu


const unquoteCoachRequest=value=>String(value||'').trim()
 .replace(/^[«“„"']+\s*/u,'')
 .replace(/\s*[»“"']+(?=[.!?…]*$)/u,'').trim()
const aboutCoach=/^(?:(?:привет|здравствуйте|hi|hello|hola)[!.,\s]+)?(?:расскажи(?:те)?(?:\s+(?:мне|немного|пожалуйста))?\s+о\s+себе|кто\s+(?:ты|вы)|tell\s+me\s+(?:a\s+bit\s+)?about\s+yourself|who\s+are\s+you|cu[eé]ntame\s+(?:algo\s+)?sobre\s+ti|qui[eé]n\s+eres)[!?.\s]*$/iu
const moreCoach=/^(?:(?:а|ну)\s+)?(?:подробнее|расскажи(?:те)?\s+подробнее|можно\s+подробнее|tell\s+me\s+more|more\s+details|go\s+on|cu[eé]ntame\s+m[aá]s|m[aá]s\s+detalles)[.!?…\s]*$/iu
const lastCoach=input=>(Array.isArray(input?.turns)?input.turns:[])
 .filter(t=>t?.role==='assistant'&&typeof t.content==='string').at(-1)?.content||''
export function isCoachAboutRequest(input={}){return aboutCoach.test(unquoteCoachRequest(input.message))}
export function isCoachMoreRequest(input={}){return moreCoach.test(unquoteCoachRequest(input.message))&&Boolean(lastCoach(input))}

export function isShortCoachFragment(input={},act='substantive_reply'){
  const value=typeof input.message==='string'?input.message.trim():''
  const words=value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]
  return act==='substantive_reply'&&!excludedActs.has(act)&&
    !isCoachMoreRequest(input)&&
    value.length>=2&&value.length<=64&&words.length>0&&words.length<=4&&
    /\p{L}/u.test(value)&&!/[?？]/u.test(value)
}
export function isMechanicalCoachIntake(value){
  const text=typeof value==='string'?value.trim():''
  return genericOpening.test(text)&&genericIntake.test(text)&&/[?？]\s*$/u.test(text)
}
export function coachNaturalDialogueGuidance(input={},dialogue={},directive=null){
  const recent=(Array.isArray(input.turns)?input.turns:[])
    .filter(x=>x?.role==='assistant'&&typeof x.content==='string').slice(-2)
  const short=isShortCoachFragment(input,dialogue.conversationAct)
  const about=isCoachAboutRequest(input)
  const more=isCoachMoreRequest(input)
  return [
    directive?.courseScenarioFirst?'SPOKEN-CONVERSATION QUALITY: The agreed course scenario supplies the checkpoints and advisory timing. The personal method remains a secondary delivery toolbox; never use its stages as a competing questionnaire.':'SPOKEN-CONVERSATION QUALITY: The server-selected method stays fixed, but a method step is NOT a questionnaire template.',
    'Avoid the canned pattern "You mentioned X. What would you like to achieve/discuss/change about it?" and its RU/ES equivalents. Do not begin with "Вы упомянули" or "You mentioned".',
    'Match the client register. Use a fresh, everyday conversational sentence; specific listening is more important than formal empathy. Some turns naturally end without a question.',
    'VOICE BREVITY: A friendly live chat, not a brochure. Normally ONE short sentence; at most TWO when needed, about 15–35 spoken words in total. Longer only if the client truly requests an in-depth explanation or safety requires it. No automatic recap, repetitive empathy or compulsory question at the end.',
    about?'ABOUT THE COACH: Answer the client directly in a brief personal introduction. Say the first name and accurately describe one distinctive coaching approach. Acknowledge being an AI coach once, not a human. Do not recite a company presentation or repeat a doctor/not-human/legal disclaimer. Do not turn this into goal intake.':'',
    more?'MORE MEANS CONTINUE: Refer to the last coach reply and add ONE genuinely new, specific detail. Never restart your introduction, restate your name, brand or AI/legal disclaimer, repeat the same question or redirect to an unrelated coaching intake. Make this a natural 1–2 sentence continuation.':'',
    short?'LOW-CONTEXT SPOKEN FRAGMENT: This is only a few words, possibly imperfect dictation. It is not a verified topic, goal or commitment. Do NOT ask for outcomes, success metrics or what they wish to achieve. First clarify what they mean or gently invite one more detail, in a short relaxed line. This is the authorized clarification move, not a new coaching stage.':'',
    recent.some(x=>isMechanicalCoachIntake(x.content)||earlierRepair.test(x.content.trim()))
      ?'The coach already used a formulaic intake or clarification. Do not repeat its wording or ask an equivalent goal-intake question. Give room or clarify differently.':'',
    directive&&!about&&!more?coachDialogueBankGuidance(input,directive,dialogue,{shortFragment:short}):'',
  ].filter(Boolean).join(' ')
}
const repairs=Object.freeze({
  ru:Object.freeze({
    first:'Можно чуть подробнее? Хочу понять вас правильно.',
    again:'Кажется, я пока не улавливаю. Можете сказать иначе?',
    noQuestion:'Я слушаю. Не буду додумывать за вас.',
  }),
  en:Object.freeze({
    first:'Could you tell me a little more? I want to understand.',
    again:"I'm still not quite following. Could you put that another way?",
    noQuestion:"I'm listening. I won't guess what you mean.",
  }),
  es:Object.freeze({
    first:'¿Me cuentas un poco más? Quiero entenderte bien.',
    again:'Creo que aún no te sigo del todo. ¿Me lo dices de otra manera?',
    noQuestion:'Te escucho. No voy a adivinar lo que quieres decir.',
  }),
})
/**
 * Very narrow repair for short fragments that a model turns into boilerplate.
 * Do NOT rewrite substantive, corrected or direct-question responses.
 * A corrected wording never carries semantic evidence or a proposed plan.
 */
function polishMechanicalLowContextReply(message,input={},dialogue={}){
  if(!isShortCoachFragment(input,dialogue.conversationAct)||
    !isMechanicalCoachIntake(message))return null
  const locale=['ru','en','es'].includes(input.locale)?input.locale:'en'
  const phrases=repairs[locale]
  if(dialogue.allowQuestion===false)return phrases.noQuestion
  const recent=(Array.isArray(input.turns)?input.turns:[])
    .filter(x=>x?.role==='assistant'&&typeof x.content==='string').slice(-2)
  const alreadyAsked=recent.some(x=>isMechanicalCoachIntake(x.content)||earlierRepair.test(x.content.trim()))
  return alreadyAsked?phrases.again:phrases.first
}


const bioTag=/(?:holistic house|(?:ai|ии)[-\s]?(?:коуч|coach)|(?:я\s*[—-]\s*мира|i(?:'m| am)\s+mira|soy\s+mira))/iu
const wordSet=s=>new Set(String(s||'').toLocaleLowerCase().replace(/ё/gu,'е')
 .replace(/[^\p{L}\p{N}]+/gu,' ').split(' ').filter(w=>w.length>2))
function repeatedBio(a,b){
 if(!bioTag.test(a)||!bioTag.test(b))return false
 const x=wordSet(a),y=wordSet(b)
 return x.size>=7&&y.size>=7&&[...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size)>=.55
}
const newBioDetail={
 ru:'Мне важно, чтобы вы могли не спешить. Сначала проясняем главное, а затем ищем свой небольшой шаг.',
 en:'There is no rush. We can first untangle what matters, then find a small step that feels right to you.',
 es:'Sin prisa. Primero aclaramos lo importante y luego buscamos un paso pequeño que encaje contigo.'
}

const distinctBioDetail={
 mira:{
  ru:'Со мной можно не торопиться. Сначала проясняем главное, а затем ищем посильный шаг.',
  en:'We can take our time. First we clarify what matters, then look for a manageable next step.',
  es:'Podemos ir con calma. Primero aclaramos lo importante y luego buscamos un paso posible.'},
 max:{
  ru:'Люблю превращать сложный вопрос в понятный выбор. Можем сравнить пару реальных вариантов.',
  en:'I like turning complicated questions into clear choices. We can compare a couple of realistic options.',
  es:'Me gusta convertir preguntas complicadas en decisiones claras. Podemos comparar opciones reales.'},
 sofia:{
  ru:'Сначала отделяем факты от переживаний. Так легче услышать себя и обозначить границы.',
  en:'We separate facts from feelings first. It helps you see your needs and boundaries more clearly.',
  es:'Primero distinguimos hechos y emociones. Así es más fácil ver tus necesidades y límites.'},
 alex:{
  ru:'Смотрим на факты и ограничения без лишних терминов. Потом сравниваем реальные варианты.',
  en:'We start with facts and constraints, without jargon. Then compare the real options.',
  es:'Empezamos por hechos y límites, sin jerga. Luego comparamos opciones reales.'},
 merlin:{
  ru:'Мне близки вопросы смысла и перемен. Иногда другой образ помогает увидеть новый ракурс.',
  en:'I focus on meaning and life transitions. Sometimes an image helps us see a different angle.',
  es:'Me centro en el sentido y las transiciones. A veces una imagen ayuda a ver otra perspectiva.'}
}
function additionalCoachBioDetail(last,locale){
 const names={
  mira:['мира','mira'],max:['макс','max'],sofia:['софия','sofia','sofía'],
  alex:['алекс','alex'],merlin:['мерлин','merlin']}
 const source=String(last||'').toLocaleLowerCase()
 for(const [key,aliases] of Object.entries(names)){
  if(aliases.some(word=>new RegExp('(^|[^\\p{L}])'+word+'(?=$|[^\\p{L}])','iu').test(source)))
   return distinctBioDetail[key][locale]
 }
 return newBioDetail[locale]
}

const legalBoilerplate=/^(?:я\s+не\s+(?:человек|врач)|(?:я\s+)?не\s+заменяю|i(?:'m| am)\s+not\s+(?:a\s+)?(?:human|doctor)|i\s+do\s+not\s+replace|no\s+soy\s+(?:una?\s+)?(?:persona|m[eé]dico))/iu
function conciseText(message,about=false){
 let cleaned=String(message||'').trim()
 if(about)cleaned=cleaned
  .replace(/^привет!\s+я\s*[—-]\s*([\p{L}]+),\s*ваш\s+(?:ai|ии)[-\s]?коуч(?:\s+из\s+holistic house)?\./iu,'Привет, я $1 — ИИ-коуч.')
  .replace(/,\s*но\s+я\s+не\s+(?:человек|врач)[^.!?？。]*(?=[.!?？。]|$)/iu,'')
  .replace(/,\s*but\s+i\s+(?:am|['’]m)\s+not\s+(?:a\s+)?(?:human|doctor)[^.!?？。]*(?=[.!?？。]|$)/iu,'')
  .replace(/,\s*pero\s+no\s+soy\s+(?:una?\s+)?(?:persona|m[eé]dico)[^.!?？。]*(?=[.!?？。]|$)/iu,'')
 const sentences=cleaned.split(/(?<=[.!?？。])\s+(?=[\p{L}\p{N}«¿“"'])/u)
  .map(x=>x.trim()).filter(Boolean)
 const eligible=about?sentences.filter(s=>!legalBoilerplate.test(s)&&
  !(/[?？]\s*$/u.test(s)&&/^(?:что бы вам|что вам|о ч[её]м бы|what would|¿?qu[eé] te)/iu.test(s))):sentences
 const max=about?210:235, count=about?3:2
 // Prefer the actual answer and its final useful question to lengthy preambles.
 if(!about&&eligible.length>2){
  const statement=eligible.find(s=>!/[?？]$/u.test(s))
  const question=eligible.findLast(s=>/[?？]$/u.test(s))
  if(statement&&question&&(statement+' '+question).length<=max)
   return statement+' '+question===message?null:statement+' '+question
 }
 let kept=[]
 for(const s of eligible){
  if(kept.length>=count||[...kept,s].join(' ').length>max)break
  kept.push(s)
 }
 const value=kept.join(' ').trim()
 return value&&value!==message?value:null
}
/**
 * One-pass, provider-free editorial cleanup. Callers discard model-suggested
 * evidence and plans whenever this repairs text. Never touch crisis replies.
 */
export function polishMechanicalCoachReply(message,input={},dialogue={}){
 const old=polishMechanicalLowContextReply(message,input,dialogue)
 if(old)return old
 const locale=['ru','en','es'].includes(input.locale)?input.locale:'en'
 const about=isCoachAboutRequest(input),more=isCoachMoreRequest(input)
 if(more&&repeatedBio(message,lastCoach(input)))return additionalCoachBioDetail(lastCoach(input),locale)
 if(about||more)return conciseText(message,about)
 const simple=typeof input.message==='string'&&input.message.trim().length<=90
 const ordinary=['substantive_reply','question_to_coach','emotion_shared'].includes(dialogue.conversationAct)
 const crisis=/(?:suicid|self.harm|kill myself|emergency|crisis|суицид|самоубий|покончить с собой|убить себя|кризис|suicidio)/iu.test(input.message||'')
 if(simple&&ordinary&&!crisis&&String(message||'').length>255)return conciseText(message)
 return null
}
