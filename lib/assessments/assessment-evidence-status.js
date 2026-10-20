// A score's technical provenance is not evidence of independent psychometric
// validity. Distinguish source-backed screening from authored, descriptive
// self-reflection without scoring an invented "confidence percentage".
const COPY = Object.freeze({
  ru: {
    unverified: ['Результат не подтверждён', 'Происхождение, версия или диапазон баллов не совпали с зарегистрированной методикой. Персональные выводы по этому результату недоступны.'],
    original: ['Авторский опросник', 'Баллы относятся к оригинальной самооценке Holistic House, а не к валидированной клинической норме. Смысл результата зависит от ситуации и вопросов.'],
    screening: ['Опубликованный скрининг', 'Границы относятся к подтверждённой версии данного опросника. Показатель может помочь выбрать дальнейшую оценку, но не устанавливает диагноз.'],
    reference: ['Опубликованные справочные диапазоны', 'Границы помогают описать ответы именно на эту шкалу; они не являются индивидуальным прогнозом или медицинским диагнозом.'],
    descriptive: ['Описательная оценка', 'Показано положение на шкале ответов. Надёжные пороги, популяционные процентили и личностная «норма» этим расчётом не устанавливаются.'],
    limitations: 'Проверка версии и алгоритма не равна исследованию надёжности и валидности. Без подтверждённой ошибки измерения нельзя оценить, является ли разница между двумя прохождениями статистически надёжной или клинически значимой.',
    translation: 'Язык пояснения отличается от языка вопросов; перевод отчёта не подтверждает валидность перевода самого опросника.',
  },
  en: {
    unverified: ['Unverified stored result', 'The source version, score range or provenance could not be matched. No personal interpretation is available for this result.'],
    original: ['Original self-reflection tool', 'This is an original Holistic House self-report, not an independently validated clinical norm. Interpretation depends on the questionnaire items and context.'],
    screening: ['Published screening ranges', 'These boundaries apply to the identified version of this measure. Screening may guide follow-up, but does not diagnose a condition.'],
    reference: ['Published reference intervals', 'These bands describe responses on this scale, not an individual prognosis or medical diagnosis.'],
    descriptive: ['Descriptive score', 'This shows arithmetic position among possible answers. It does not establish validated cutoffs, population percentiles or a personal “normal” range.'],
    limitations: 'Verifying a scoring version is not an independent study of reliability or validity. Without a supported measurement-error estimate, a difference between two administrations cannot be called statistically reliable or clinically important.',
    translation: 'The report language differs from the questionnaire language. Translating the explanation does not validate a translation of the items.',
  },
})
export function assessmentEvidenceStatus({ result, section, report, locale = 'en' } = {}) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const copy = COPY[language]
  const unverified = report?.verified === false || !section ||
    !section.bandBasis || section.bandBasis === 'unavailable'
  const kind = unverified ? 'unverified'
    : typeof result?.definitionKey === 'string' && result.definitionKey.startsWith('hh-') ? 'original'
      : section.bandBasis === 'screening' ? 'screening'
        : section.bandBasis === 'published-reference' ? 'reference' : 'descriptive'
  const [label, summary] = copy[kind]
  const instrumentLanguage = result?.instrumentLocale
  const translated = (locale === 'ru' || locale === 'en') &&
    (instrumentLanguage === 'ru' || instrumentLanguage === 'en') &&
    instrumentLanguage !== locale
  return Object.freeze({
    kind, label, summary,
    limitations: unverified ? null : copy.limitations,
    languageNote: !unverified && translated ? copy.translation : null,
  })
}
