/** P0 editorial templates. Media, claims and offer access must be validated by
 * their respective systems before a proposal can be rendered or published. */
const rows = [
  ['A01', 'introduce', ['Видеовизитка', 'Video introduction', 'Presentación en vídeo'], ['Представьте свою практику', 'Introduce your practice', 'Presenta tu práctica']],
  ['A03', 'first_meeting', ['Первая встреча', 'The first meeting', 'La primera sesión'], ['Расскажите, как проходит встреча', 'Explain what happens at a first meeting', 'Explica cómo transcurre la primera sesión']],
  ['A04', 'approach', ['Мой подход', 'My approach', 'Mi enfoque'], ['Опишите свой подход без обещаний', 'Describe your approach without promises', 'Describe tu enfoque sin promesas']],
  ['B01', 'question', ['Частый вопрос', 'A common question', 'Una pregunta frecuente'], ['Ответьте на один частый вопрос', 'Answer one common question', 'Responde a una pregunta frecuente']],
  ['B02', 'principles', ['Три принципа', 'Three principles', 'Tres principios'], ['Поделитесь тремя принципами', 'Share three principles', 'Comparte tres principios']],
  ['B03', 'myth_fact', ['Миф и факт', 'Myth and fact', 'Mito y realidad'], ['Разберите миф и проверенный факт', 'Discuss a myth and a verified fact', 'Explica un mito y un hecho verificado']],
  ['C01', 'consultation', ['Приглашение на консультацию', 'Consultation invitation', 'Invitación a una consulta'], ['Представьте опубликованную услугу', 'Introduce a published service', 'Presenta un servicio publicado']],
  ['C02', 'program', ['Что входит в программу', 'Inside the program', 'Qué incluye el programa'], ['Объясните содержание программы', 'Explain what the program includes', 'Explica qué incluye el programa']],
  ['C03', 'workshop', ['Анонс мастер-класса', 'Workshop announcement', 'Anuncio de taller'], ['Представьте опубликованный мастер-класс', 'Introduce a published workshop', 'Presenta un taller publicado']],
  ['D01', 'exercise', ['Простое упражнение', 'A simple exercise', 'Un ejercicio sencillo'], ['Покажите простое упражнение', 'Demonstrate a simple exercise', 'Muestra un ejercicio sencillo']],
  ['D03', 'explain_method', ['Объяснение метода', 'Explain your method', 'Explica tu método'], ['Расскажите о своём методе', 'Explain your method', 'Explica tu método']],
  ['E01', 'story', ['Моя история', 'My story', 'Mi historia'], ['Поделитесь своей профессиональной историей', 'Share your professional story', 'Comparte tu historia profesional']],
];

const localized = ([ru, en, es]) => Object.freeze({ru, en, es});
const beatInstructions = Object.freeze({
  ru: ['Начните с вопроса по теме без обещаний результата.', 'Представьте опубликованную услугу и специалиста только по подтверждённым данным.', 'Добавьте проверенное объяснение или условия услуги.', 'Завершите мягким призывом перейти к опубликованной услуге.'],
  en: ['Open with a relevant question without promising an outcome.', 'Introduce the published service and practitioner using verified information only.', 'Add a verified explanation or service details.', 'Close with a gentle invitation to visit the published service.'],
  es: ['Empieza con una pregunta relevante sin prometer resultados.', 'Presenta el servicio publicado y al profesional solo con datos verificados.', 'Añade una explicación verificada o las condiciones del servicio.', 'Termina con una invitación amable a visitar el servicio publicado.'],
});
const timings = Object.freeze([[0, 3], [3, 11], [11, 24], [24, 30]].map(Object.freeze));
export const PROFESSIONAL_TEMPLATES = Object.freeze(rows.map(([id, goal, title, description]) => Object.freeze({
  id, goal, title: localized(title), description: localized(description),
  version: 1, durationSec: 30, aspect: '9:16',
  beats: Object.freeze(['hook', 'context', 'substance', 'cta']),
})));

/** Selects editorial metadata only. It does not validate ownership or rights. */
export function proposeProfessionalTemplate({goal, locale} = {}) {
  if (!['ru', 'en', 'es'].includes(locale)) throw Error('unsupported_locale');
  const template = PROFESSIONAL_TEMPLATES.find(item => item.goal === goal);
  if (!template) throw Error('unsupported_goal');
  return {
    version: 1, templateId: template.id, goal, locale,
    title: template.title[locale], description: template.description[locale],
    beats: [...template.beats], durationSec: template.durationSec, aspect: template.aspect,
    shotPlan: template.beats.map((role, index) => ({role, startSec: timings[index][0],
      endSec: timings[index][1], instruction: beatInstructions[locale][index]})),
    sceneIds: [], requiresReview: true,
    mediaAvailability: 'not_checked', status: 'template_selected',
  };
}
