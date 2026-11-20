/**
 * Ali Free Diagnostic — reviewed editorial playbook, no provider, credentials,
 * external calls or personal-data collection. Each stage offers varied,
 * non-clinical questions. The caller owns safety, consent and CRM.
 */
export const FREE_DIAGNOSTIC_MODE='free_diagnostic';
export const FREE_DIAGNOSTIC_PHASES=Object.freeze([
  'goal','challenge','situation','impact','attempts','support','ready'
]);
export const FREE_DIAGNOSTIC_FIELDS=Object.freeze([
  'goal','challenge','situation','impact','attempts','support','source','notes'
]);
const RU={
  questions:{
    goal:["Что вам хотелось бы изменить?","Что сейчас для вас главное?","Если станет лучше, что изменится первым?"],
    challenge:["Что сейчас мешает?","Что труднее всего в этой ситуации?","Где возникает главный тупик?"],
    situation:["Что происходит сейчас?","Когда это стало заметно?","Что изменилось недавно?"],
    impact:["Как это влияет на ваш день?","Где ощущается сильнее?","Что больше всего страдает?"],
    attempts:["Что уже пробовали?","Помогало ли что-нибудь?","Что ещё рассматривали?"],
    support:["Что могло бы помочь сейчас?","На что можете опереться?","Какая поддержка вам нужна?"],
  },
  intro:"Здравствуйте! Я Ali из Holistic House. Вы выбрали бесплатную диагностику. Могу задать несколько личных вопросов для подготовки разбора. Вы согласны?",
  first:"Что вам сейчас хотелось бы изменить?",
  acknowledge:"Понял вас.",
  difficult:"Похоже, это непросто.",
  firstTime:"Можно просто своими словами.",
  unsure:"Ничего страшного.",
  short:"Можно совсем коротко.",
  skip:"Хорошо, пойдём дальше.",
  referral:"Рад, что вы с нами 🌿",
  reset:"Хорошо, начнём заново.",
  hold:"Конечно. Можем сразу посмотреть резюме.",
  ready:"Спасибо, теперь чуть яснее 🌿 Посмотрим краткое резюме для Андрея? При желании можно обсудить личную встречу.",
  more:"Добавлю это к резюме. Посмотрим его?",
  correction:"Что нужно поправить?",
  photo:"По фото я не оцениваю состояние. Лучше расскажите своими словами.",
  identity:"Я Ali, цифровой помощник Holistic House. Лично с вами может поговорить Андрей.",
  need:"Расскажите о цели и главной трудности. Этого хватит для начала.",
  time:"Всего несколько вопросов. Можно закончить раньше.",
  free:"Да, предварительный разбор бесплатный. Личная встреча — отдельно.",
  privacy:"Ваши ответы остаются здесь. Андрею передам только подтверждённое вами резюме.",
  human:"Можем передать запрос Андрею или обсудить личную встречу.",
  booking:"Личная встреча с Андреем — 30 минут, €50. Выбрать формат и оставить заявку:",
  noAdvice:"Конечно. Сначала просто разберёмся.",
  empty:"Расскажите пару слов о ситуации.",
  summary:'Предварительный разбор — со слов клиента',
  labels:{goal:'Желаемый результат',challenge:'Основная трудность',situation:'Текущая ситуация',impact:'Как влияет',attempts:'Что пробовали',support:'Что помогает',source:'Откуда узнали',notes:'Дополнение'}
};
const EN={
  questions:{
    goal:["What would you like to change?","What matters most right now?","If things improved, what would change first?"],
    challenge:["What's getting in the way?","What's the hardest part?","Where do you feel stuck?"],
    situation:["What's happening now?","When did this begin?","What changed recently?"],
    impact:["How does this affect your day?","Where do you notice it most?","What is hardest because of it?"],
    attempts:["What have you tried?","Has anything helped?","What else have you considered?"],
    support:["What might help right now?","What can you lean on?","What support would feel useful?"],
  },
  intro:"Hello, I'm Ali from Holistic House. For your free review, may I ask a few personal questions? Only your approved summary goes to Andrey.",
  first:"What would you most like to change?",
  acknowledge:"I hear you.",
  difficult:"That sounds difficult.",
  firstTime:"Your own words are perfect.",
  unsure:"That's okay.",
  short:"A few words are fine.",
  skip:"Sure, let's move on.",
  referral:"Glad you found us 🌿",
  reset:"Okay, let's begin again.",
  hold:"Of course. We can review what you've shared.",
  ready:"Thanks, I have a clearer picture 🌿 Shall we review a short note for Andrey? You can also explore a personal session.",
  more:"I'll add that. Want to see the summary?",
  correction:"What would you like to change?",
  photo:"I can't assess your situation from a photo. Your words are more helpful.",
  identity:"I'm Ali, Holistic House's digital assistant. Andrey can talk with you personally.",
  need:"Just your goal and the main difficulty. That's enough to begin.",
  time:"Just a few questions. You can finish early.",
  free:"Yes, this review is free. A personal session is separate.",
  privacy:"Your answers stay here. Only the summary you approve is sent to Andrey.",
  human:"I can help you share your request with Andrey or explore a session.",
  booking:"A personal session with Andrey is 30 minutes, €50. Choose a format and request it:",
  noAdvice:"Of course. We can start by understanding.",
  empty:"Tell me a little about what's going on.",
  summary:"Preliminary review — in the client's own words",
  labels:{goal:'Desired outcome',challenge:'Main difficulty',situation:'Current situation',impact:'What it affects',attempts:'What has been tried',support:'What helps',source:'How they found us',notes:'Additional detail'}
};
const ES={
  questions:{
    goal:["¿Qué te gustaría cambiar?","¿Qué es lo más importante ahora?","Si mejorara, ¿qué cambiaría primero?"],
    challenge:["¿Qué te lo impide?","¿Qué es lo más difícil?","¿Dónde te sientes bloqueado?"],
    situation:["¿Qué ocurre ahora?","¿Cuándo empezó?","¿Qué ha cambiado últimamente?"],
    impact:["¿Cómo afecta a tu día?","¿Dónde lo notas más?","¿Qué parte se hace más difícil?"],
    attempts:["¿Qué has probado?","¿Algo te ha ayudado?","¿Qué otras opciones has visto?"],
    support:["¿Qué podría ayudarte ahora?","¿En qué puedes apoyarte?","¿Qué apoyo te vendría bien?"],
  },
  intro:"Hola, soy Ali de Holistic House. Para la revisión gratuita, ¿puedo hacerte unas preguntas personales? Solo comparto el resumen aprobado.",
  first:"¿Qué te gustaría cambiar ahora?",
  acknowledge:"Te escucho.",
  difficult:"Parece difícil.",
  firstTime:"Cuéntalo con tus palabras.",
  unsure:"No pasa nada.",
  short:"Con unas palabras basta.",
  skip:"Claro, seguimos.",
  referral:"Me alegra que estés aquí 🌿",
  reset:"Bien, empezamos de nuevo.",
  hold:"Claro. Podemos revisar lo que has contado.",
  ready:"Gracias, ahora lo veo más claro 🌿 ¿Revisamos una nota para Andrey? También puedes consultar una sesión personal.",
  more:"Lo añadiré. ¿Vemos el resumen?",
  correction:"¿Qué quieres cambiar?",
  photo:"No evalúo tu situación por una foto. Tus palabras ayudan más.",
  identity:"Soy Ali, asistente digital de Holistic House. Andrey puede hablar contigo personalmente.",
  need:"Basta con tu objetivo y la dificultad principal.",
  time:"Solo unas preguntas. Puedes terminar antes.",
  free:"Sí, esta revisión es gratuita. La sesión personal es aparte.",
  privacy:"Tus respuestas quedan aquí. Solo enviaré a Andrey el resumen que apruebes.",
  human:"Puedo ayudarte a contactar con Andrey o conocer sus sesiones.",
  booking:"Una sesión personal con Andrey dura 30 minutos y cuesta €50. Elige formato y solicita una cita:",
  noAdvice:"Claro. Empecemos por comprender.",
  empty:"Cuéntame un poco de tu situación.",
  summary:'Revisión preliminar — según las palabras del cliente',
  labels:{goal:'Resultado deseado',challenge:'Dificultad principal',situation:'Situación actual',impact:'Cómo afecta',attempts:'Qué ha intentado',support:'Qué ayuda',source:'Cómo nos conoció',notes:'Detalle adicional'}
};
export const FREE_DIAGNOSTIC_LIBRARY=Object.freeze({ru:Object.freeze(RU),en:Object.freeze(EN),es:Object.freeze(ES)});
export const freeDiagnosticCopy=locale=>FREE_DIAGNOSTIC_LIBRARY[locale]||FREE_DIAGNOSTIC_LIBRARY.en;
