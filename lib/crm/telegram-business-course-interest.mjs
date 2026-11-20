// Only exact, first-party public Reiki Practitioner course enquiry drafts.
// Never interpret arbitrary text as a booking, consent, or a paid service.
import {telegramServiceOption} from '../assist/telegram-service-options.mjs'

const OFFER_ID='courses_practitioner'
const SHAMANICA_EN_TITLE='Reiki Practitioner · free course'
const TEMPLATES=Object.freeze({
  en:title=>'Hello! I am interested in «'+title+'». Could you help me make a request?',
  ru:title=>'Здравствуйте! Меня интересует «'+title+'». Подскажите, как оформить запрос.',
  es:title=>'¡Hola! Me interesa «'+title+'». ¿Cómo puedo solicitarlo?',
})
const COPY=Object.freeze({
  en:{
    text:'Hello! I’m Ali. You chose the free Reiki Practitioner course 🌿 Start the short lessons and practices using the link below. If you need help, write your question here — no personal details are required.',
    button:'Start free Reiki course',
  },
  ru:{
    text:'Здравствуйте! Я Ali. Вы выбрали бесплатный курс практикующего Рейки 🌿 Начать короткие уроки и практики можно по ссылке ниже. Если нужна помощь, напишите вопрос здесь — личные данные не нужны.',
    button:'Начать бесплатный курс',
  },
  es:{
    text:'¡Hola! Soy Ali. Elegiste el curso gratuito de Reiki 🌿 Puedes comenzar las lecciones y prácticas breves en el enlace. Si necesitas ayuda, escribe tu pregunta aquí, sin datos personales.',
    button:'Empezar curso gratis',
  },
})
export function matchTelegramPublishedCourseInterestDraft(input){
  if(typeof input!=='string'||input.length>350)return null
  const text=input.trim()
  for(const locale of ['en','ru','es']){
    const option=telegramServiceOption(OFFER_ID,locale)
    if(!option)continue
    const titles=locale==='en'?[SHAMANICA_EN_TITLE,option.title]:[option.title]
    if(titles.some(title=>text===TEMPLATES[locale](title)))
      return {kind:'course_interest',locale,offerId:OFFER_ID}
  }
  return null
}
export function telegramPublishedCourseInterestAcknowledgement(interest){
  const locale=interest?.locale
  if(interest?.kind!=='course_interest'||interest?.offerId!==OFFER_ID||
     !Object.hasOwn(COPY,locale)||!telegramServiceOption(OFFER_ID,locale))return null
  const copy=COPY[locale]
  return {handled:true,kind:'course_interest',text:copy.text,buttons:[{
    text:copy.button,url:'https://holistichouse.vercel.app/'+locale+'/academy/principles-of-energywork',
  }]}
}
