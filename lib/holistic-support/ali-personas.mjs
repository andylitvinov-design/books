// Four original, fictional AI Messenger presenters. One underlying assistant.
export const ALI_PERSONA_STORAGE_KEY='hh:ai-chat-persona-v1'
export const ALI_PERSONA_EVENT='hh:ai-chat-persona-changed'
const local=(en,ru,es)=>Object.freeze({en,ru,es})
export const ALI_PERSONAS=Object.freeze([
 Object.freeze({id:'alex',gender:'male',name:local('Ali','Ali','Ali'),
  role:local('Warm inner alchemist','Тёплый внутренний алхимик','Alquimista cercano'),
  image:'/images/holistic-house/my-coach-motion/alex-still.webp',
  voice:{rate:0.98,pitch:0.9,slot:0}}),
 Object.freeze({id:'max',gender:'male',name:local('Max','Макс','Max'),
  role:local('Clear and encouraging','Ясный и вдохновляющий','Claro y motivador'),
  image:'/images/holistic-house/my-coach-motion/max-still.webp',
  voice:{rate:1.08,pitch:1,slot:1}}),
 Object.freeze({id:'mira',gender:'female',name:local('Mira','Мира','Mira'),
  role:local('Gentle and attentive','Бережная и внимательная','Amable y atenta'),
  image:'/images/holistic-house/my-coach-motion/mira-still.webp',
  voice:{rate:0.93,pitch:1.08,slot:2}}),
 Object.freeze({id:'sofia',gender:'female',name:local('Sofia','София','Sofía'),
  role:local('Calm and thoughtful','Спокойная и вдумчивая','Serena y reflexiva'),
  image:'/images/holistic-house/my-coach-motion/sofia-still.webp',
  voice:{rate:0.96,pitch:1.15,slot:3}}),
])
export const ALI_DEFAULT_PERSONA_ID='alex'
export function getAliPersona(id){return ALI_PERSONAS.find(persona=>persona.id===id)||ALI_PERSONAS[0]}
export function isAliPersonaId(id){return typeof id==='string'&&ALI_PERSONAS.some(persona=>persona.id===id)}
export function aliPersonaGreeting(personaId,locale='en'){
 const persona=getAliPersona(personaId)
 const name=persona.name[locale]||persona.name.en
 if(locale==='ru')return `Привет! Я ${name}. Давайте разберёмся в вашей ситуации, найдём самое важное и вместе выберем подходящий следующий шаг.`
 if(locale==='es')return `¡Hola! Soy ${name}. Vamos a comprender tu situación, descubrir lo que más importa y elegir juntos el mejor próximo paso.`
 return `Hi! I'm ${name}. Let's understand your situation, find what matters most, and choose the best next step together.`
}
