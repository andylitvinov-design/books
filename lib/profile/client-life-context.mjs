/** Voluntary client narrative: not a medical record, psychometric measure or AI grant.
 * The answers live in the existing encrypted account-owned development_goals row.
 */
const L=(en,ru,es)=>Object.freeze({en,ru,es})
export const LIFE_CONTEXT_VERSION=1
export const LIFE_CONTEXT_SECTIONS=Object.freeze([
 {id:'today',title:L('My life today','Моя жизнь сегодня','Mi vida hoy'),questions:[
  {id:'lifeNow',prompt:L('How would you describe your life today?','Как бы вы описали свою жизнь сейчас?','¿Cómo describirías tu vida hoy?')},
  {id:'workingWell',prompt:L('What is already going well?','Что в вашей жизни сейчас складывается хорошо?','¿Qué va bien en tu vida?')},
  {id:'mainDifficulty',prompt:L('What feels most difficult or unsatisfying?','Что сейчас вызывает наибольшие трудности или неудовлетворённость?','¿Qué te resulta más difícil o insatisfactorio?')},
  {id:'lifeRoles',prompt:L('What roles and responsibilities take most of your attention?','Какие роли и обязанности сейчас занимают больше всего внимания?','¿Qué roles y responsabilidades ocupan más tu atención?')}
 ]},
 {id:'wishes',title:L('My values & wishes','Мои ценности и желания','Mis valores y deseos'),questions:[
  {id:'values',prompt:L('Which values help you make important choices?','Какие ценности помогают вам принимать важные решения?','¿Qué valores te ayudan a tomar decisiones importantes?')},
  {id:'wishes',prompt:L('What would you like more of in your life?','Чего вам хотелось бы больше в своей жизни?','¿Qué te gustaría tener más en tu vida?')},
  {id:'oneYearVision',prompt:L('How would you like your everyday life to look in one year?','Какой вы хотели бы видеть свою повседневную жизнь через год?','¿Cómo te gustaría que fuera tu vida cotidiana dentro de un año?')},
  {id:'preserve',prompt:L('What from your current life would you most like to keep?','Что из нынешней жизни вы особенно хотели бы сохранить?','¿Qué te gustaría conservar de tu vida actual?')}
 ]},
 {id:'resources',title:L('My resources','Мои ресурсы','Mis recursos'),questions:[
  {id:'strengths',prompt:L('Which personal strengths have helped you before?','Какие ваши сильные стороны уже помогали вам прежде?','¿Qué fortalezas personales te han ayudado antes?')},
  {id:'support',prompt:L('Who or what helps you feel supported?','Кто или что помогает вам чувствовать поддержку?','¿Quién o qué te ayuda a sentir apoyo?')},
  {id:'recovery',prompt:L('What restores your energy and inspiration?','Что помогает вам восстанавливать энергию и вдохновение?','¿Qué te ayuda a recuperar energía e inspiración?')},
  {id:'obstacles',prompt:L('What usually gets in the way of making changes?','Что обычно мешает вам осуществлять изменения?','¿Qué suele impedirte realizar cambios?')}
 ]},
 {id:'coaching',title:L('How I want to grow','Как я хочу развиваться','Cómo quiero crecer'),questions:[
  {id:'coachingFocus',prompt:L('What would you most like to explore with a coach?','Что вам больше всего хотелось бы исследовать вместе с коучем?','¿Qué te gustaría explorar con un coach?')},
  {id:'desiredOutcome',prompt:L('What would tell you that coaching has been useful?','По каким признакам вы поймёте, что коучинг оказался полезным?','¿Cómo sabrías que el coaching te ha ayudado?')},
  {id:'conversationStyle',prompt:L('What style of conversation feels most helpful to you?','Какой стиль разговора помогает вам больше всего?','¿Qué estilo de conversación te resulta más útil?')},
  {id:'boundaries',prompt:L('Are there topics or boundaries you would like us to respect?','Какие темы или границы вы хотели бы попросить уважать?','¿Hay temas o límites que quieras que respetemos?')}
 ]}
].map(section=>Object.freeze({...section,questions:Object.freeze(section.questions.map(x=>Object.freeze(x)))})))
export const LIFE_CONTEXT_FIELDS=Object.freeze(LIFE_CONTEXT_SECTIONS.flatMap(section=>section.questions))
const ids=new Set(LIFE_CONTEXT_FIELDS.map(field=>field.id))
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
export function emptyLifeContext(){return {version:LIFE_CONTEXT_VERSION,answers:{}}}
export function normalizeLifeContext(value){
 if(!plain(value)||value.version!==LIFE_CONTEXT_VERSION||!plain(value.answers))return null
 const raw=value.answers,fields=Object.keys(raw)
 if(fields.length>ids.size||fields.some(id=>!ids.has(id)))return null
 const answers={}
 for(const [id,original] of Object.entries(raw)){
  if(typeof original!=='string'||original.length>600||
     /[\u0000-\u0008\u000b-\u001f\u007f]/.test(original))return null
  const answer=original.trim()
  if(answer.length>500)return null
  if(answer)answers[id]=answer
 }
 return {version:LIFE_CONTEXT_VERSION,answers}
}
export function lifeContextProgress(context){
 const profile=normalizeLifeContext(context)
 return {answered:profile?Object.keys(profile.answers).length:0,total:LIFE_CONTEXT_FIELDS.length}
}
export function firstUnansweredLifeQuestion(context){
 const profile=normalizeLifeContext(context)
 return LIFE_CONTEXT_FIELDS.findIndex(field=>!profile?.answers[field.id])
}
