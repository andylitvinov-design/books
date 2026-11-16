// Optional on-device Ready reflection. Not a validated clinical assessment.
// This module never transmits or persists answers.
export const READY_CHECKIN_MEDIA=Object.freeze([
  {id:"energy",src:"/videos/holistic-house/film-collection-v2/meadow-morning.jpg"},
  {id:"calm",src:"/videos/holistic-house/film-collection-v2/calm-sea.jpg"},
  {id:"focus",src:"/videos/holistic-house/film-collection-v2/mountain-air.jpg"},
  {id:"rest",src:"/videos/holistic-house/film-collection-v2/mossy-stream.jpg"},
  {id:"relationships",src:"/videos/holistic-house/film-collection-v2/wildflower-dance.jpg"},
  {id:"security",src:"/videos/holistic-house/film-collection-v2/golden-harvest.jpg"},
  {id:"meaning",src:"/videos/holistic-house/film-collection-v2/sunbeam-flow.jpg"},
]);
export const READY_CHECKIN_COPY=Object.freeze({
  en:{
    title:"A moment for yourself",question:"Question",guidance:"Choose how true this feels right now",
    low:"Not at all",high:"Very much",back:"Previous",score:"out of 10",
    complete:"Your personal check-in",completeLead:"Seven reflections on how things feel today.",
    privacy:"These ratings stay on this screen only. They are not saved to your account or shared.",
    again:"Start again",done:"Back to your video",more:"More self-tests",
    labels:["Energy","Calm","Focus","Rest","Relationships","Money","Direction"],
    questions:[
      "How much energy do you feel right now?",
      "How calm do you feel at this moment?",
      "How easy is it to focus on what matters to you?",
      "How well rested and restored do you feel?",
      "How supported do you feel in your relationships?",
      "How secure do you feel about everyday finances?",
      "How clear do your next steps and goals feel?"
    ]
  },
  ru:{
    title:"Несколько минут для себя",question:"Вопрос",guidance:"Оцените своё состояние прямо сейчас",
    low:"Совсем нет",high:"Максимально",back:"Предыдущий",score:"из 10",
    complete:"Ваш маленький итог",completeLead:"Семь оценок вашего состояния сегодня.",
    privacy:"Ответы видны только в этом окне. В кабинете они пока не сохраняются и никому не отправляются.",
    again:"Начать заново",done:"Вернуться к видео",more:"Другие тесты",
    labels:["Энергия","Спокойствие","Внимание","Отдых","Отношения","Деньги","Цели"],
    questions:[
      "Сколько энергии вы ощущаете сейчас?",
      "Насколько спокойно вы себя чувствуете?",
      "Насколько легко вам сосредоточиться на важном?",
      "Насколько вы чувствуете себя отдохнувшим?",
      "Насколько вы ощущаете поддержку в отношениях?",
      "Насколько уверенно вы чувствуете себя в финансовых вопросах?",
      "Насколько ясны вам ближайшие цели и шаги?"
    ]
  },
  es:{
    title:"Un momento para ti",question:"Pregunta",guidance:"Valora cómo te sientes ahora",
    low:"Nada",high:"Muchísimo",back:"Anterior",score:"de 10",
    complete:"Tu pequeña reflexión",completeLead:"Siete valoraciones de cómo te sientes hoy.",
    privacy:"Estas respuestas solo se muestran en esta pantalla. No se guardan en tu cuenta ni se comparten.",
    again:"Empezar de nuevo",done:"Volver al vídeo",more:"Más pruebas",
    labels:["Energía","Calma","Atención","Descanso","Relaciones","Dinero","Objetivos"],
    questions:[
      "¿Cuánta energía sientes en este momento?",
      "¿Qué tan tranquilo o tranquila te sientes ahora?",
      "¿Qué tan fácil te resulta centrarte en lo importante?",
      "¿Qué tan descansado o descansada te sientes?",
      "¿Cuánto apoyo sientes en tus relaciones?",
      "¿Qué tanta seguridad sientes sobre tus finanzas diarias?",
      "¿Qué tan claros ves tus próximos objetivos y pasos?"
    ]
  }
});
export function initialReadyCheckIn(){
  return {index:0,answers:Array(READY_CHECKIN_MEDIA.length).fill(null)};
}
export function scoreReadyCheckIn(state,score){
  if(!state||!Number.isInteger(state.index)||state.index<0||
     state.index>=READY_CHECKIN_MEDIA.length||!Array.isArray(state.answers)||
     state.answers.length!==READY_CHECKIN_MEDIA.length||
     !Number.isInteger(score)||score<0||score>10)return state;
  const answers=[...state.answers];
  answers[state.index]=score;
  return {index:state.index+1,answers};
}
