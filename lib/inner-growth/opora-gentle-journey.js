// Additional non-persisted OPORA learning moments. One gentle thought per screen.
// No behavioral outcome is inferred from viewing these editorial scenes.
export const OPORA_GENTLE_INTRO=Object.freeze(['why','story','options','settle'])
export const OPORA_GENTLE_RECAP=Object.freeze(['recap','recapPractice','recapNext','recapFeedback'])

const COPY=Object.freeze({
  en:{
    whyKicker:'A SMALL INSIGHT',whyTitle:'Why this might help',
    storyKicker:'EVERYDAY LIFE',storyTitle:'Imagine this moment',
    storyNote:'A fictional example, not a description of you.',
    optionsKicker:'AT YOUR PACE',optionsTitle:'There is a gentler option',
    optionsLead:'You can try the step, use a lighter version, or just read.',
    settleKicker:'BEFORE THE PRACTICE',settleTitle:'A quiet starting point',
    settleLead:'Rest your eyes on one ordinary detail near you.',
    settleNote:'Take your time. You do not need to change how you feel.',
    recapPracticeKicker:'TODAY’S PRACTICE',recapPracticeTitle:'How we practised it',
    recapNextKicker:'FOR EVERYDAY LIFE',recapNextTitle:'One possible next step',
    noPlan:'Nothing to plan today. You can return to this later.',
    recapFeedbackKicker:'YOUR EXPERIENCE',recapFeedbackTitle:'How was this for you?',
  },
  ru:{
    whyKicker:'НЕБОЛЬШОЕ ОТКРЫТИЕ',whyTitle:'Зачем этот навык',
    storyKicker:'ЖИЗНЕННЫЙ МОМЕНТ',storyTitle:'Представьте ситуацию',
    storyNote:'Это вымышленный пример, не история о вас.',
    optionsKicker:'В ВАШЕМ ТЕМПЕ',optionsTitle:'Можно ещё мягче',
    optionsLead:'Можно попробовать упражнение, упростить его или просто прочитать.',
    settleKicker:'ПЕРЕД ПРАКТИКОЙ',settleTitle:'Спокойное начало',
    settleLead:'Задержите взгляд на одной обычной детали рядом.',
    settleNote:'Не торопитесь. Менять своё состояние не требуется.',
    recapPracticeKicker:'ПРАКТИКА ДНЯ',recapPracticeTitle:'Как мы это тренировали',
    recapNextKicker:'В ОБЫЧНОЙ ЖИЗНИ',recapNextTitle:'Возможный следующий шаг',
    noPlan:'Сегодня можно ничего не планировать и вернуться к этому позже.',
    recapFeedbackKicker:'ВАШ ОПЫТ',recapFeedbackTitle:'Как вам было?',
  },
  es:{
    whyKicker:'UNA IDEA SENCILLA',whyTitle:'Para qué sirve este paso',
    storyKicker:'UN MOMENTO COTIDIANO',storyTitle:'Imagina este momento',
    storyNote:'Es un ejemplo ficticio, no una descripción de ti.',
    optionsKicker:'A TU RITMO',optionsTitle:'También hay una opción suave',
    optionsLead:'Puedes probar el paso, hacerlo más sencillo o solo leer.',
    settleKicker:'ANTES DE PRACTICAR',settleTitle:'Un comienzo tranquilo',
    settleLead:'Deja la mirada en un detalle corriente cercano.',
    settleNote:'Ve a tu ritmo. No necesitas cambiar cómo te sientes.',
    recapPracticeKicker:'PRÁCTICA DE HOY',recapPracticeTitle:'Cómo lo practicamos',
    recapNextKicker:'EN LA VIDA COTIDIANA',recapNextTitle:'Un posible paso siguiente',
    noPlan:'No necesitas planear nada hoy. Puedes volver después.',
    recapFeedbackKicker:'TU EXPERIENCIA',recapFeedbackTitle:'¿Cómo fue para ti?',
  },
})
export function oporaGentleCopy(locale='en'){
  return COPY[locale==='ru'||locale==='es'?locale:'en']
}
