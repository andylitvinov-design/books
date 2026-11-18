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
    goal:['Что вам хотелось бы понять или изменить?','Если станет немного лучше, что изменится первым?','Какого результата вы хотели бы достичь?'],
    challenge:['Что сейчас мешает больше всего?','В чём основная трудность?','Что останавливает вас на пути к желаемому?'],
    situation:['Что происходит сейчас и с чего всё началось?','Что изменилось в последнее время?','Когда ситуация стала важной для вас?'],
    impact:['На чём это сказывается сильнее всего?','Как это отражается на обычном дне?','Какую часть вашей жизни это затрагивает?'],
    attempts:['Что вы уже пробовали?','Что хотя бы немного помогало?','Какие варианты решения вы уже рассматривали?'],
    support:['На кого или на что сейчас можете опереться?','Что помогает вам чувствовать больше устойчивости?','Какой поддержки вам сейчас не хватает?']
  },
  intro:'Привет! 🌿 Я Ali. Помогу коротко разобраться в ситуации бесплатно. Ответы остаются в беседе, а специалист увидит только одобренную вами заявку. Начнём? Остановить: /stop.',
  first:'Давайте начнём с главного. Что вы хотели бы понять или изменить?',
  acknowledge:'Спасибо, что рассказали.',
  difficult:'Похоже, сейчас непростой период. Спасибо, что поделились.',
  firstTime:'Не нужно извиняться. Можно говорить своими словами.',
  unsure:'Необязательно сразу знать ответ.',
  short:'Можно ответить совсем коротко.',
  skip:'Этот вопрос пропустим.',
  referral:'Рад, что вы нашли нас.',
  reset:'Хорошо, начнём с начала.',
  hold:'Хорошо, не будем углубляться. Можно проверить краткое резюме уже сказанного.',
  ready:'Спасибо, для предварительного разбора достаточно. Можно проверить и исправить резюме. Нажмите «Завершить интервью» — ничего не отправится мастеру без вашего отдельного согласия.',
  more:'Это дополнение можно учесть в резюме. Нажмите «Завершить интервью», когда захотите его проверить.',
  correction:'Что именно вы хотели бы исправить в своём описании?',
  photo:'По фотографии невозможно достоверно определить здоровье, «энергию» или причину жизненных событий. Фото не нужно. Если захотите, рисунок «Я — цель — препятствие» можно передать позднее через согласованный со специалистом защищённый канал.',
  identity:'Я Ali, цифровой помощник Holistic House, а не врач, психотерапевт или экстрасенс.',
  need:'Достаточно рассказать о желаемом результате, трудности и текущей ситуации. Остальное необязательно.',
  time:'Это несколько коротких вопросов, но можно завершить беседу раньше.',
  free:'Предварительный разбор ситуации бесплатный. Он не означает запись на платную консультацию.',
  privacy:'Ответы хранятся в защищённой беседе. Мастеру передаётся только подтверждённое вами резюме. Не присылайте сюда чувствительные документы.',
  human:'Если хотите сразу к специалисту, можно закончить вопросы и проверить краткую заявку.',
  noAdvice:'Не буду давать советы без запроса. Можем просто прояснить ситуацию.',
  empty:'Пока не хватает ваших слов для содержательного резюме. Расскажите хотя бы немного о запросе.',
  summary:'Предварительный разбор — со слов клиента',
  labels:{goal:'Желаемый результат',challenge:'Основная трудность',situation:'Текущая ситуация',impact:'Как влияет',attempts:'Что пробовали',support:'Что помогает',source:'Откуда узнали',notes:'Дополнение'}
};
const EN={
  questions:{
    goal:['What would you most like to understand or change?','If things improved a little, what would you want to change first?','What outcome would matter most to you?'],
    challenge:['What is making this difficult right now?','What feels like the main obstacle?','What stops you when you try to move forward?'],
    situation:['What is happening now, and how did it begin?','What has changed recently?','When did this become important to you?'],
    impact:['Which part of life is affected the most?','How does this affect your usual day?','Where do you notice it most?'],
    attempts:['What have you tried so far?','Has anything helped, even briefly?','What options have you considered?'],
    support:['Who or what can you lean on now?','What helps you feel more steady?','What support is missing right now?']
  },
  intro:"Hi! 🌿 I'm Ali. We can explore your situation in a short, free conversation. Nothing goes to the practitioner until you approve the request. Shall we begin? Stop: /stop.",
  first:"Let's start with what matters most. What would you like to understand or change?",
  acknowledge:'Thank you for sharing that.',
  difficult:'That sounds like a difficult time. Thank you for telling me.',
  firstTime:"There's no need to apologize. You can speak in your own words.",
  unsure:"It's okay not to know yet.",
  short:'A few words are fine.',
  skip:'We can skip that question.',
  referral:'Thanks for finding us.',
  reset:"Okay, let's start over.",
  hold:"Of course. We don't have to go deeper. You can review a short summary of what you've shared.",
  ready:'Thank you. That is enough for a preliminary review. You can check and correct the summary. Choose “Finish interview”; nothing is sent without your separate approval.',
  more:'I can include this as an additional detail. Choose “Finish interview” to check the summary.',
  correction:'Which part of your description would you like to correct?',
  photo:"A photo cannot reliably reveal health, 'energy' or the causes of life events. A photo isn't needed. If you wish, you can later share a “Me — Goal — Obstacle” drawing through a secure method agreed with the practitioner.",
  identity:"I'm Ali, the Holistic House digital assistant, not a doctor, therapist or psychic.",
  need:"Just describe what you want, what is difficult and what's happening now. The rest is optional.",
  time:'There are a few short questions. You can finish early.',
  free:'The preliminary situation review is free. This is not a booking for a paid session.',
  privacy:"Your answers stay in a protected conversation. Only a summary you've approved is sent to the practitioner. Please don't send sensitive documents here.",
  human:"If you'd prefer a person, you can finish the questions and check a short request.",
  noAdvice:"I won't give advice unless you ask. We can simply clarify the situation.",
  empty:"I don't yet have enough in your own words to create a useful summary. Please share a little about your question.",
  summary:"Preliminary review — in the client's own words",
  labels:{goal:'Desired outcome',challenge:'Main difficulty',situation:'Current situation',impact:'What it affects',attempts:'What has been tried',support:'What helps',source:'How they found us',notes:'Additional detail'}
};
const ES={
  questions:{
    goal:['¿Qué te gustaría comprender o cambiar?','Si la situación mejorara, ¿qué querrías cambiar primero?','¿Qué resultado te importaría más?'],
    challenge:['¿Qué te lo dificulta ahora?','¿Cuál es el mayor obstáculo?','¿Qué te impide avanzar?'],
    situation:['¿Qué pasa ahora y cómo empezó?','¿Qué ha cambiado últimamente?','¿Cuándo empezó a importarte esta situación?'],
    impact:['¿Qué parte de tu vida se ve más afectada?','¿Cómo afecta a tu día a día?','¿Dónde lo notas más?'],
    attempts:['¿Qué has intentado hasta ahora?','¿Te ha ayudado algo, aunque sea un poco?','¿Qué opciones has considerado?'],
    support:['¿En quién o en qué puedes apoyarte?','¿Qué te da un poco de estabilidad?','¿Qué apoyo te hace falta?']
  },
  intro:'¡Hola! 🌿 Soy Ali. Podemos aclarar tu situación con una conversación breve y gratuita. Solo enviaré la solicitud que apruebes. ¿Empezamos? Parar: /stop.',
  first:'Empecemos por lo principal. ¿Qué te gustaría comprender o cambiar?',
  acknowledge:'Gracias por contarlo.',
  difficult:'Parece un momento difícil. Gracias por compartirlo.',
  firstTime:'No tienes que disculparte. Puedes usar tus propias palabras.',
  unsure:'No pasa nada si aún no lo sabes.',
  short:'Bastan unas pocas palabras.',
  skip:'Podemos omitir esa pregunta.',
  referral:'Gracias por encontrarnos.',
  reset:'De acuerdo, empecemos de nuevo.',
  hold:'Por supuesto, no hace falta profundizar. Podemos revisar un resumen de lo contado.',
  ready:'Gracias. Es suficiente para una revisión preliminar. Puedes comprobar y corregir el resumen. Pulsa «Terminar entrevista»; no se enviará nada sin tu aprobación.',
  more:'Puedo añadir ese detalle. Pulsa «Terminar entrevista» para revisar el resumen.',
  correction:'¿Qué parte de tu descripción quisieras corregir?',
  photo:'Una foto no permite evaluar de forma fiable la salud, la «energía» ni las causas de los acontecimientos. No hace falta. Puedes compartir un dibujo «Yo — Meta — Obstáculo» más adelante mediante un canal seguro acordado con el profesional.',
  identity:'Soy Ali, el asistente digital de Holistic House, no médico, psicoterapeuta ni vidente.',
  need:'Basta describir la meta, la dificultad y lo que ocurre ahora. Lo demás es opcional.',
  time:'Solo son unas pocas preguntas. Puedes terminar antes.',
  free:'La revisión preliminar es gratuita. No es una reserva de una consulta de pago.',
  privacy:'Las respuestas quedan en una conversación protegida. Solo se envía al profesional el resumen aprobado. No envíes documentos sensibles aquí.',
  human:'Si prefieres hablar con una persona, puedes terminar y revisar una solicitud breve.',
  noAdvice:'No daré consejos sin que lo pidas. Podemos aclarar la situación.',
  empty:'Aún necesito algo de tu situación en tus propias palabras para preparar un resumen útil.',
  summary:'Revisión preliminar — según las palabras del cliente',
  labels:{goal:'Resultado deseado',challenge:'Dificultad principal',situation:'Situación actual',impact:'Cómo afecta',attempts:'Qué ha intentado',support:'Qué ayuda',source:'Cómo nos conoció',notes:'Detalle adicional'}
};
export const FREE_DIAGNOSTIC_LIBRARY=Object.freeze({ru:Object.freeze(RU),en:Object.freeze(EN),es:Object.freeze(ES)});
export const freeDiagnosticCopy=locale=>FREE_DIAGNOSTIC_LIBRARY[locale]||FREE_DIAGNOSTIC_LIBRARY.en;
