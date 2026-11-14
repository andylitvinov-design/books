// Goal-first, private-by-default Sessions intake for the existing Messenger.
// Pure editorial routing: no diagnosis, provider calls, personal data storage or charges.
const choices = {
  en: [
    {id:"personal",label:"Understand my situation",description:"Make sense of a personal difficulty or choice"},
    {id:"relationships",label:"Relationships & family",description:"Explore communication and recurring patterns"},
    {id:"wellbeing",label:"Stress & inner state",description:"Work with feelings, tension or self-support"},
    {id:"business",label:"Work & business",description:"Clarify a decision, conflict or team challenge"},
  ],
  ru: [
    {id:"personal",label:"Разобраться в ситуации",description:"Понять личную трудность или сложный выбор"},
    {id:"relationships",label:"Отношения и семья",description:"Разобрать общение и повторяющиеся ситуации"},
    {id:"wellbeing",label:"Стресс и внутреннее состояние",description:"Поработать с переживаниями и напряжением"},
    {id:"business",label:"Работа и бизнес",description:"Прояснить решение, конфликт или вопрос команды"},
  ],
  es: [
    {id:"personal",label:"Comprender mi situación",description:"Aclarar una dificultad o decisión personal"},
    {id:"relationships",label:"Relaciones y familia",description:"Explorar la comunicación y los patrones repetidos"},
    {id:"wellbeing",label:"Estrés y bienestar",description:"Trabajar con emociones y tensión"},
    {id:"business",label:"Trabajo y negocios",description:"Aclarar una decisión, un conflicto o un reto de equipo"},
  ],
};
const copy = {
  en:{
    detail:"What would you like to understand or change as a result? You can describe it in your own words; you don't need to choose a therapy.",
    offersLabel:"Options matched to your goal",
    results:{
      personal:"For your personal question, these may be useful starting points. You can decide whether to book anything.",
      relationships:"For a relationship or family goal, these approaches may be relevant. The choice is yours.",
      wellbeing:"For support with your inner state, here are some possible starting points—not a diagnosis or a promise of treatment.",
      business:"For your work or business goal, these options may help clarify the next steps.",
    },
  },
  ru:{
    detail:"Что именно вы хотите понять или изменить в результате? Можно ответить своими словами — выбирать метод терапии пока не нужно.",
    offersLabel:"Варианты под вашу цель",
    results:{
      personal:"Для вашего личного запроса могут подойти следующие первые шаги. Запись необязательна.",
      relationships:"Для запроса об отношениях или семье можно рассмотреть эти подходы. Выбор остаётся за вами.",
      wellbeing:"Для работы с внутренним состоянием можно рассмотреть такие варианты. Это не диагноз и не обещание лечения.",
      business:"Для вопроса о работе или бизнесе могут подойти эти способы прояснить дальнейшие действия.",
    },
  },
  es:{
    detail:"¿Qué te gustaría comprender o cambiar como resultado? Puedes explicarlo libremente; aún no necesitas elegir una terapia.",
    offersLabel:"Opciones según tu objetivo",
    results:{
      personal:"Para tu situación personal, estos pueden ser primeros pasos útiles. Reservar es opcional.",
      relationships:"Para un objetivo familiar o de relaciones, estas opciones pueden ser pertinentes. Tú decides.",
      wellbeing:"Para explorar tu estado emocional, estas son algunas posibilidades, no un diagnóstico ni una promesa de tratamiento.",
      business:"Para tu objetivo laboral o empresarial, estas opciones pueden ayudar a aclarar los próximos pasos.",
    },
  },
};
const offerDescriptions = {
  en:{
    "free-review":"A free written first look to clarify what kind of support you want.",
    imagery:"A guided session exploring inner experiences and responses.",
    constellations:"For reflecting on repeated patterns in family and relationships.",
    business:"For decisions, team dynamics and business priorities.",
  },
  ru:{
    "free-review":"Бесплатный письменный разбор, чтобы уточнить запрос до записи.",
    imagery:"Направленная работа с внутренними образами и переживаниями.",
    constellations:"Чтобы исследовать повторяющиеся сценарии в семье и отношениях.",
    business:"Для решений, командных отношений и приоритетов в бизнесе.",
  },
  es:{
    "free-review":"Una revisión escrita gratuita para aclarar el objetivo antes de reservar.",
    imagery:"Una sesión guiada para explorar experiencias y respuestas internas.",
    constellations:"Para explorar patrones repetidos en la familia y las relaciones.",
    business:"Para decisiones, equipos y prioridades empresariales.",
  },
};
export function sessionGoalChoices(locale){return choices[locale]||choices.en;}
export function sessionCopy(locale){return copy[locale]||copy.en;}
export function sessionOfferDescription(locale,id){return (offerDescriptions[locale]||offerDescriptions.en)[id]||"";}
export function sessionGoalForText(value){
  if(typeof value!=="string"||!value.trim())return null;
  const text=value.normalize("NFKC").toLocaleLowerCase();
  if(/relationship|family|partner|marriage|couple|divorc|parent|mother|father|love|отношени|семь|партн|супруг|развод|родител|мам|пап|любов|relaci[oó]n|familia|pareja|matrimonio|divorcio|madre|padre|amor/iu.test(text))return "relationships";
  if(/stress|anxiet|overwhelm|burnout|fear|worr|tension|fatigue|sadness|эмоци|тревог|стресс|страх|напряж|выгоран|устал|паник|agotamiento|ansiedad|estr[eé]s|miedo|tensi[oó]n|emocion|cansancio/iu.test(text))return "wellbeing";
  if(/business|workplace|at work|work-related|office|career|colleague|boss|manager|team|job|employment|company|бизнес|на работе|работа|работе|работы|рабоч|карьер|коллег|начальн|руковод|negoci|empresa|trabajo|laboral|equipo|jefe|empleo|oficina|carrera/iu.test(text))return "business";
  if(/situation|choice|decision|uncertain|myself|understand|goal|ситуац|выбор|решени|поня|разобрат|смысл|личн|problema|situaci[oó]n|decisi[oó]n|comprender|objetivo/iu.test(text))return "personal";
  return null;
}
export function sessionOfferIds(goal){
  switch(goal){
    case "business": return ["business","free-review"];
    case "relationships": return ["constellations","imagery","free-review"];
    case "wellbeing": return ["free-review","imagery"];
    default: return ["free-review","imagery"];
  }
}
