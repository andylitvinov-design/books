'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './course-daily-21.module.css'

const WORDS = {
  en: {
    eyebrow: 'MY COURSE · DAILY PRACTICE', title: '21 learning days, at your pace',
    intro: 'Build practical skills with prepared lessons based on the scales you choose from your completed tests.',
    scope: 'Self-guided education and self-observation. This is not diagnosis, treatment, psychotherapy or emergency monitoring.',
    pace: 'A missed calendar day brings no penalty, reset or extra work. Your next learning day waits for you.',
    prepared: 'Lessons are prepared material selected by simple rules. There is no live therapist or AI interpretation of your notes.',
    back: 'Back to my course', loading: 'Opening your daily course…', refresh: 'Refresh', retry: 'Try again', saving: 'Saving…',
    error: 'The course could not be loaded or saved. Your unsent choices and notes are still here. Try again.',
    conflict: 'The saved course or source results changed. We refreshed the available information and kept your unsent choices and notes. Review them before saving again.',
    conflictReload: 'The saved course changed, but the refresh did not finish. Your drafts are still here. Refresh before trying to save again.',
    signin: 'Sign in again to continue. Unsent notes have not been submitted.',
    unavailable: 'The 21-day course is not available yet. You can return to your current course.',
    noCourse: 'Complete the current course setup before reviewing a daily course.',
    sourceChanged: 'This daily course needs a completed test profile. Return to your course to review the current step.',
    invalid: 'Review the highlighted choices and try again. Choose only available scales and confirm the current consent.',
    profile: 'Your measured profile', profileHint: 'All prepared scales from the exact questionnaire forms you completed are shown below. Their meanings come from the available report.',
    priorities: 'Up to seven suggested focus areas', priorityHint: 'Ordered by position within each scale’s own range, accounting for its direction. This is not a comparison of clinical severity or a health percentage.',
    noPriorities: 'No scales currently have a reviewed direction suitable for this ordering.',
    originalMeaningUnavailable: 'The prepared interpretation for this original result is currently unavailable.',
    initialProfile: 'Initial profile', initialProfileHint: 'The results used to start this course. These original result dates and questionnaire languages remain visible; this is not a new assessment.',
    allScales: 'All measured scales', suggested: 'Suggested focus', range: 'Registered range', measured: 'Measured', instrumentLanguage: 'Questionnaire language', report: 'Open full report', source: 'Interpretation source',
    missingMeaning: 'The prepared interpretation for this exact result is unavailable. This scale cannot be chosen until its interpretation is available.',
    missingResults: 'Some selected questionnaire forms still need compatible completed results. Return to My Tests to complete them, then refresh this profile.',
    missingForms: 'Forms still needed', noInterpretations: 'Some prepared interpretations are not available. Starting is paused until all selected results have their reviewed meanings.',
    noMapping: 'These results do not currently have reviewed practice mappings. You can read the reports and return to your course choices.',
    noScales: 'No compatible scales are available in this profile yet.',
    noPractice: 'Information only: this scale has no reviewed practice mapping.', notRanked: 'Not used for priority ordering; no reviewed directional comparison applies.',
    moreSupport: 'A lower reported resource position can suggest a skill to practise; it is not a deficit or a clinical threshold.',
    lessDifficulty: 'A higher reported difficulty position can suggest a supportive skill; it is not a diagnosis or clinical threshold.',
    choose: 'Choose 3–5 scales to practise', fewer: 'Fewer than three practice scales are available. Choose the available scales, or return to your existing test choices.',
    selected: 'selected', min: 'Minimum', max: 'maximum', stale: 'A previously selected scale is no longer eligible. Your choice is preserved below; remove it or refresh the profile.',
    remove: 'Remove unavailable choice', reviewStart: 'Review and start 21 learning days',
    consentTitle: 'Start this 21-learning-day course?', consent: 'I choose these practice scales and agree to privately save my 21-learning-day course, optional check-ins and practice progress in my account.',
    consentDetail: 'Feedback is optional. Each lesson has a separate unchecked choice for using structured feedback to adjust prepared lessons, and another for privately saving written notes. Notes are not automatically interpreted or monitored.',
    consentTime: 'The next learning day opens on a later local date. Pauses are allowed; there is no calendar deadline or promised health outcome.',
    agree: 'Agree and start', cancel: 'Cancel', days: 'learning days', day: 'Day', of: 'of', week: 'Week',
    progress: 'Lesson completion', completed: 'completed', skipped: 'skipped', progressHint: 'This counts lesson activity, not psychological improvement.',
    pause: 'Pause course', resume: 'Resume course', paused: 'Your course is paused. Resume whenever you want.',
    tomorrow: 'Today’s step is saved. The next learning day opens on a later date in your course time zone.',
    finished: 'Your 21 learning days are resolved', finishHint: 'You can revisit completed lessons or try skipped lessons below. Repeating a lesson does not change your saved progress.',
    rest: 'You chose rest. You can change today’s check-in, skip this learning day, or pause the course.', timeZone: 'Course time zone',
    checkin: 'Before today’s lesson', optional: 'Optional', wellbeing: 'How are you feeling right now? (0–10)', wellbeingHint: '0 = very low wellbeing; 10 = very good wellbeing. This is a subjective check-in, not a formal assessment.',
    energy: 'Available energy', energyOptions: ['Prefer not to say', 'Low', 'Usual', 'Ample'],
    change: 'Compared with your previous check-in', changeOptions: ['Prefer not to say', 'Better', 'About the same', 'Worse'],
    time: 'Time for this practice', quick: 'Short practice', standard: 'Standard practice', restChoice: 'I would rather rest before a lesson today',
    saveCheckin: 'Save check-in and continue', skipCheckin: 'Skip check-in and continue', skipHint: 'Skipping sends no wellbeing, energy or feeling-change ratings.',
    editCheckin: 'Change today’s check-in', closeCheckin: 'Back to today’s lesson',
    preferences: 'Practice preferences', length: 'Preferred length', grounding: 'Use the prepared eyes-open grounding option', stopOffer: 'Ask me before offering another lesson', savePreferences: 'Save preferences',
    alternative: 'Choose a comfortable next step', alternativeHint: 'You can pause, rest, skip the day, or explicitly view a prepared eyes-open grounding alternative. There is no automatic increase in intensity.',
    viewGrounding: 'View a grounding alternative', material: 'The prepared material for this lesson is unavailable. You can retry, rest or skip; no substitute meaning or lesson has been invented.',
    weeklyGoal: 'This week’s goal', todayFocus: 'Linked to your chosen scales', outcome: 'A specific skill to try', recap: 'A brief reminder', thought: 'A thought for today', action: 'One everyday action', reflection: 'A reflection question',
    minutes: 'min, approximately', ownPace: 'Keep your eyes open if you prefer, breathe naturally and stop at any point. No timer or particular feeling is required.',
    feedback: 'Optional feedback', helpfulness: 'Was this useful?', helpOptions: ['Prefer not to say', 'Helpful', 'Neutral', 'Not helpful'],
    difficulty: 'How manageable was it?', difficultyOptions: ['Prefer not to say', 'Manageable', 'Too difficult'],
    comfort: 'How comfortable was it?', comfortOptions: ['Prefer not to say', 'Comfortable', 'Neutral', 'Uncomfortable'],
    reflectionAnswer: 'My reflection', comment: 'My note', saveText: 'Save this reflection and note privately in my account',
    textHint: 'Unchecked: written text stays only in this open page and is not sent. Leaving or reloading the page can lose unsaved text. Saved notes are private journal entries, not automatically interpreted or monitored for urgent help.',
    applyFeedback: 'Use my structured feedback to adjust prepared practice options', applyHint: 'Only the selected helpfulness, difficulty and comfort answers are used for this choice. Written notes are not analyzed. Changes can suggest a shorter or grounding option; intensity is not increased automatically.',
    finish: 'Save completed learning day', skipDay: 'Skip this learning day', skipConfirm: 'Record this learning day as skipped? You can revisit it later. No ratings or written notes will be sent with this action.',
    history: 'Your learning days', reviewDay: 'Revisit day', repeatNote: 'Optional review. Reading or repeating this lesson does not add a completed day or change progress.', closeReview: 'Close review',
    draftNotes: 'Unsent notes kept in this open page', draftHint: 'These notes were not sent with a skipped or completed day. They remain available here until this page is left or reloaded.',
    outline: 'The 21-day learning route', safe: 'If an exercise increases distress, stop. For severe or persistent distress, seek qualified support. If you are in immediate danger, contact local emergency or crisis support services; this course is not monitored.',
  },
  ru: {
    eyebrow: 'МОЙ КУРС · ЕЖЕДНЕВНАЯ ПРАКТИКА', title: '21 учебный день в своём темпе',
    intro: 'Развивайте практические навыки с подготовленными уроками по шкалам, которые вы выбрали из пройденных тестов.',
    scope: 'Самостоятельное обучение и самонаблюдение. Это не диагностика, лечение, психотерапия или экстренная помощь.',
    pace: 'За пропущенный календарный день нет штрафа, сброса прогресса или дополнительной работы. Следующий учебный день вас дождётся.',
    prepared: 'Материалы уроков подготовлены заранее и подбираются по простым правилам. Здесь нет наблюдения терапевта или ИИ-интерпретации заметок.',
    back: 'Назад к моему курсу', loading: 'Открываем ежедневный курс…', refresh: 'Обновить', retry: 'Повторить', saving: 'Сохраняем…',
    error: 'Не удалось загрузить или сохранить курс. Неотправленные заметки и выбор остались на странице. Попробуйте ещё раз.',
    conflict: 'Сохранённый курс или исходные результаты изменились. Мы обновили данные и сохранили ваш неотправленный выбор и заметки. Проверьте их перед повторным сохранением.',
    conflictReload: 'Сохранённый курс изменился, но обновить данные не удалось. Черновики остались на странице. Обновите данные перед повторным сохранением.',
    signin: 'Войдите в аккаунт снова, чтобы продолжить. Неотправленные заметки не переданы.',
    unavailable: 'Курс на 21 день пока недоступен. Можно вернуться к текущему курсу.',
    noCourse: 'Завершите настройку текущего курса, прежде чем переходить к ежедневным урокам.',
    sourceChanged: 'Для этого курса нужен профиль по пройденным тестам. Вернитесь в свой курс и проверьте текущий этап.',
    invalid: 'Проверьте выбор и попробуйте снова. Выбирайте только доступные шкалы и подтвердите актуальное согласие.',
    profile: 'Мой профиль по тестам', profileHint: 'Ниже показаны все подготовленные шкалы из пройденных вами точных версий опросников. Значения берутся из доступного отчёта.',
    priorities: 'До семи возможных направлений', priorityHint: 'Порядок учитывает положение внутри диапазона каждой шкалы и её направление. Это не сравнение клинической тяжести и не процент здоровья.',
    noPriorities: 'Пока нет шкал с проверенным направлением для такого порядка.',
    originalMeaningUnavailable: 'Подготовленная интерпретация этого исходного результата сейчас недоступна.',
    initialProfile: 'Исходный профиль', initialProfileHint: 'Результаты, на которых основан этот курс. Здесь сохранены даты исходных результатов и языки опросников; это не новый замер.',
    allScales: 'Все измеренные шкалы', suggested: 'Предложенное направление', range: 'Зарегистрированный диапазон', measured: 'Дата измерения', instrumentLanguage: 'Язык опросника', report: 'Открыть полный отчёт', source: 'Источник интерпретации',
    missingMeaning: 'Подготовленная интерпретация именно этого результата пока недоступна. Выбор этой шкалы станет возможен после появления интерпретации.',
    missingResults: 'Для части выбранных версий опросников ещё нужны совместимые завершённые результаты. Пройдите их в «Моих тестах», затем обновите профиль.',
    missingForms: 'Какие версии ещё нужны', noInterpretations: 'Часть подготовленных интерпретаций недоступна. Начало курса отложено до появления проверенных значений всех выбранных результатов.',
    noMapping: 'Для этих результатов пока нет проверенного соответствия практикам. Можно прочитать отчёты и вернуться к выбору курса.',
    noScales: 'В этом профиле пока нет совместимых шкал.',
    noPractice: 'Для информации: у этой шкалы нет проверенного соответствия практике.', notRanked: 'Не участвует в порядке приоритетов: проверенное направленное сравнение неприменимо.',
    moreSupport: 'Более низкое положение ресурса может подсказать навык для практики; это не недостаток и не клинический порог.',
    lessDifficulty: 'Более высокое положение трудности может подсказать поддерживающий навык; это не диагноз и не клинический порог.',
    choose: 'Выберите 3–5 шкал для практики', fewer: 'Доступно меньше трёх шкал для практики. Можно выбрать имеющиеся или вернуться к уже выбранным тестам.',
    selected: 'выбрано', min: 'Минимум', max: 'максимум', stale: 'Ранее выбранная шкала больше недоступна для практики. Ваш выбор сохранён ниже; удалите его или обновите профиль.',
    remove: 'Убрать недоступную шкалу', reviewStart: 'Проверить и начать 21 учебный день',
    consentTitle: 'Начать курс на 21 учебный день?', consent: 'Я выбираю эти шкалы для практики и согласен(на) на приватное сохранение курса на 21 учебный день, необязательных отметок самочувствия и прогресса в моём аккаунте.',
    consentDetail: 'Обратная связь необязательна. В каждом уроке есть отдельный неотмеченный пункт для настройки подготовленных практик по выбранным ответам и другой — для приватного сохранения письменных заметок. Заметки не интерпретируются и не отслеживаются автоматически.',
    consentTime: 'Следующий учебный день открывается в следующую местную дату. Можно делать паузы; календарного срока и обещанного результата для здоровья нет.',
    agree: 'Согласиться и начать', cancel: 'Отмена', days: 'учебный день', day: 'День', of: 'из', week: 'Неделя',
    progress: 'Выполнение уроков', completed: 'выполнено', skipped: 'пропущено', progressHint: 'Это число занятий, а не показатель психологических изменений.',
    pause: 'Поставить курс на паузу', resume: 'Возобновить курс', paused: 'Курс на паузе. Возвращайтесь, когда захотите.',
    tomorrow: 'Сегодняшний шаг сохранён. Следующий учебный день откроется в следующую дату в часовом поясе курса.',
    finished: 'Ваш путь из 21 учебного дня завершён', finishHint: 'Можно вернуться к выполненным урокам или попробовать пропущенные. Повторение не меняет сохранённый прогресс.',
    rest: 'Вы выбрали отдых. Можно изменить сегодняшнюю отметку, пропустить учебный день или поставить курс на паузу.', timeZone: 'Часовой пояс курса',
    checkin: 'Перед сегодняшним уроком', optional: 'По желанию', wellbeing: 'Как вы себя чувствуете сейчас? (0–10)', wellbeingHint: '0 — очень низкое самочувствие; 10 — очень хорошее. Это субъективная отметка, а не формальная оценка.',
    energy: 'Сколько сейчас сил?', energyOptions: ['Не хочу отвечать', 'Мало', 'Как обычно', 'Много'],
    change: 'По сравнению с предыдущей отметкой', changeOptions: ['Не хочу отвечать', 'Лучше', 'Примерно так же', 'Хуже'],
    time: 'Время для практики', quick: 'Короткая практика', standard: 'Обычная практика', restChoice: 'Сегодня перед уроком я предпочитаю отдохнуть',
    saveCheckin: 'Сохранить отметку и продолжить', skipCheckin: 'Пропустить отметку и продолжить', skipHint: 'При пропуске оценки самочувствия, сил и изменений не передаются.',
    editCheckin: 'Изменить сегодняшнюю отметку', closeCheckin: 'Назад к сегодняшнему уроку',
    preferences: 'Настройки практики', length: 'Предпочтительная длина', grounding: 'Использовать подготовленный вариант заземления с открытыми глазами', stopOffer: 'Спрашивать меня перед предложением следующего урока', savePreferences: 'Сохранить настройки',
    alternative: 'Выберите комфортный следующий шаг', alternativeHint: 'Можно остановиться, отдохнуть, пропустить день или явно выбрать подготовленный вариант заземления с открытыми глазами. Интенсивность не увеличивается автоматически.',
    viewGrounding: 'Посмотреть вариант заземления', material: 'Подготовленные материалы этого урока недоступны. Можно повторить загрузку, отдохнуть или пропустить день; содержание не заменяется придуманным текстом.',
    weeklyGoal: 'Цель этой недели', todayFocus: 'Связано с выбранными вами шкалами', outcome: 'Конкретный навык для пробы', recap: 'Короткое напоминание', thought: 'Мысль дня', action: 'Небольшое действие в жизни', reflection: 'Вопрос для размышления',
    minutes: 'мин, примерно', ownPace: 'Можно оставлять глаза открытыми, дышать естественно и останавливаться в любой момент. Таймер и определённое чувство не требуются.',
    feedback: 'Необязательная обратная связь', helpfulness: 'Это было полезно?', helpOptions: ['Не хочу отвечать', 'Полезно', 'Нейтрально', 'Не полезно'],
    difficulty: 'Насколько это было посильно?', difficultyOptions: ['Не хочу отвечать', 'Посильно', 'Слишком трудно'],
    comfort: 'Насколько было комфортно?', comfortOptions: ['Не хочу отвечать', 'Комфортно', 'Нейтрально', 'Некомфортно'],
    reflectionAnswer: 'Моё размышление', comment: 'Моя заметка', saveText: 'Приватно сохранить это размышление и заметку в моём аккаунте',
    textHint: 'Без отметки письменный текст остаётся только на открытой странице и не отправляется. Уход или перезагрузка могут удалить несохранённый текст. Сохранённые заметки — личный дневник; они не интерпретируются автоматически и не отслеживаются для экстренной помощи.',
    applyFeedback: 'Настроить подготовленные практики по моим выбранным ответам', applyHint: 'Используются только ответы о пользе, трудности и комфорте. Письменные заметки не анализируются. Можно предложить короткий вариант или заземление; интенсивность автоматически не увеличивается.',
    finish: 'Сохранить выполненный учебный день', skipDay: 'Пропустить этот учебный день', skipConfirm: 'Отметить этот учебный день как пропущенный? К нему можно вернуться позже. При этом действии оценки и письменные заметки не отправляются.',
    history: 'Мои учебные дни', reviewDay: 'Вернуться к дню', repeatNote: 'Необязательный повтор. Чтение или повторение урока не добавляет выполненный день и не меняет прогресс.', closeReview: 'Закрыть повтор',
    draftNotes: 'Неотправленные заметки на этой странице', draftHint: 'Эти заметки не отправлялись при завершении или пропуске дня. Они доступны здесь до ухода со страницы или перезагрузки.',
    outline: 'Маршрут на 21 учебный день', safe: 'Если упражнение усиливает дискомфорт, остановитесь. При тяжёлом или длительном неблагополучии обратитесь к специалисту. При непосредственной опасности — в местную экстренную или кризисную службу; курс не отслеживается в реальном времени.',
  },
}

const EMPTY_DRAFT = { wellbeing: '', energy: '', feelingChange: '', availableTime: 'standard', rest: false,
  helpfulness: '', difficulty: '', comfort: '', comment: '', reflectionAnswer: '', savePrivateText: false, applyFeedback: false }
const EDITABLE_DAYS = ['ready', 'rest-chosen', 'choose-comfortable-option', 'material-unavailable', 'alternative-unavailable']
const safeSource = url => typeof url === 'string' && /^https:\/\//i.test(url)
const scaleKey = row => row.r3ScaleKey || `${row.definitionKey}::${row.dimensionKey}`
function formatDate(value, locale) {
  try { return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value)) }
  catch { return '—' }
}
function Select({ label, value, onChange, options, labels, disabled }) {
  return <label className={styles.field}><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
    {options.map((option, index) => <option key={option} value={option}>{labels[index]}</option>)}
  </select></label>
}
function Lesson({ lesson, t, titleId }) {
  return <article className={styles.lesson} aria-labelledby={titleId}>
    <header><h3 id={titleId}>{lesson.title}</h3><p className={styles.small}>{Math.max(1, Math.round((lesson.durationSeconds || 0) / 60))} {t.minutes}</p></header>
    {lesson.curriculum && <dl className={styles.curriculum}>
      <div><dt>{t.weeklyGoal}</dt><dd>{lesson.curriculum.weekGoal}</dd></div>
      <div><dt>{t.outcome}</dt><dd>{lesson.curriculum.learningOutcome}</dd></div>
      <div><dt>{t.recap}</dt><dd>{lesson.curriculum.recap}</dd></div>
    </dl>}
    <p className={styles.notice}>{t.ownPace}</p>
    {lesson.sections?.map(section => <section key={section.kind} className={styles.lessonSection}><h4>{section.title}</h4><p>{section.text}</p></section>)}
    <section className={styles.thought}><h4>{t.thought}</h4><p>{lesson.aphorism}</p></section>
    {!lesson.sections?.some(section => section.kind === 'ritual' && section.text === lesson.ritual) && <section><h4>{t.action}</h4><p>{lesson.ritual}</p></section>}
    <section><h4>{t.reflection}</h4><p>{lesson.reflection}</p></section>
    {lesson.disclaimer && <p className={styles.small}>{lesson.disclaimer}</p>}
  </article>
}

function ScaleReading({ row, lang, t, explain = false }) {
  const sourceUrl = typeof row.source === 'string' ? row.source : row.source?.url
  const sourceTitle = typeof row.source?.title === 'string' && row.source.title.trim() ? row.source.title : t.source
  return <>
    {row.testTitle && <p className={styles.small}>{row.testTitle}{row.definitionVersion ? ' · ' + row.definitionVersion : ''}</p>}
    <p className={styles.score}>{new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(row.value)} <small>{lang === 'ru' ? ({ points: 'баллы', 'weighted-points': 'взвешенные баллы' }[row.unit] || row.unit) : row.unit}</small></p>
    <p className={styles.small}>{t.range}: {row.min}–{row.max}{(row.timeframeLabel || row.timeframe) ? ' · ' + (row.timeframeLabel || row.timeframe) : ''}</p>
    <p className={styles.small}>{t.measured}: <time dateTime={row.measurementAt}>{formatDate(row.measurementAt, lang)}</time> · {t.instrumentLanguage}: {String(row.instrumentLocale || '—').toUpperCase()}</p>
    {explain && Number.isFinite(row.rawPosition) && <meter className={styles.meter} min={row.min} max={row.max} value={row.value} aria-label={row.label + ': ' + row.value + ', ' + t.range + ' ' + row.min + '–' + row.max}/>}
    <p>{row.meaning || (explain ? t.missingMeaning : t.originalMeaningUnavailable)}</p>
    {explain && <p className={styles.small}>{row.supportPosition == null ? t.notRanked : row.reason === 'less-reported-difficulty' ? t.lessDifficulty : t.moreSupport}</p>}
    {explain && !row.canChoosePractice && row.meaning && <p className={styles.small}>{t.noPractice}</p>}
    <div className={styles.links}>{row.resultId && <Link href={'/' + lang + '/app/results/' + encodeURIComponent(row.resultId)}>{t.report}</Link>}{safeSource(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceTitle}</a>}</div>
  </>
}

export default function CourseDaily21({ locale = 'en', onUnavailable, onCancel, onActivated }) {
  const lang = locale === 'ru' ? 'ru' : 'en', t = WORDS[lang], uid = useId()
  const [view, setView] = useState(null), [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(null)
  const [selected, setSelected] = useState([]), [consent, setConsent] = useState(false), [consentOpen, setConsentOpen] = useState(false)
  const [drafts, setDrafts] = useState({}), [preferenceDraft, setPreferenceDraft] = useState(null)
  const [editCheckin, setEditCheckin] = useState(false), [skipConfirm, setSkipConfirm] = useState(false)
  const dialog = useRef(null), mounted = useRef(false), lock = useRef(false), sequence = useRef(0)
  const pending = useRef(null), current = useRef(null), unavailableNotified = useRef(false), alternative = useRef(false)
  const callbacks = useRef({ onUnavailable, onActivated })
  callbacks.current = { onUnavailable, onActivated }
  const endpoint = 'course-21?locale=' + lang

  function accept(next) {
    current.current = next
    setView(next)
    if (next.available === false && !unavailableNotified.current) {
      unavailableNotified.current = true
      callbacks.current.onUnavailable?.()
    }
  }
  async function readSnapshot() {
    const next = await appFetch(endpoint + (alternative.current ? '&alternative=true' : ''))
    const proposal = next.available && !next.course ? await appFetch('course-21/preview?locale=' + lang) : null
    return { next, proposal }
  }
  function acceptSnapshot({ next, proposal }) {
    accept(proposal?.available === false ? proposal : next)
    setPreview(proposal)
  }
  async function refresh() {
    if (lock.current) return
    lock.current = true
    setLoading(true)
    setError(null)
    const token = ++sequence.current
    try {
      const result = await readSnapshot()
      if (mounted.current && token === sequence.current) acceptSnapshot(result)
    } catch (caught) { if (mounted.current && token === sequence.current) setError(caught) }
    finally { lock.current = false; if (mounted.current && token === sequence.current) setLoading(false) }
  }
  useEffect(() => {
    mounted.current = true
    let cancelled = false
    const token = ++sequence.current
    setLoading(true)
    setError(null)
    readSnapshot().then(result => {
      if (!cancelled && token === sequence.current) acceptSnapshot(result)
    }).catch(caught => { if (!cancelled && token === sequence.current) setError(caught) })
      .finally(() => { if (!cancelled && token === sequence.current) setLoading(false) })
    return () => { cancelled = true; mounted.current = false }
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (consentOpen && !dialog.current?.open) dialog.current?.showModal()
    if (!consentOpen && dialog.current?.open) dialog.current.close()
  }, [consentOpen])

  async function command(action, values = {}, { showAlternative = false } = {}) {
    if (lock.current || loading || current.current?.available !== true) return false
    lock.current = true
    setBusy(true)
    setError(null)
    // A synchronous lock prevents duplicate clicks. An uncertain retry reuses the exact operation.
    const body = { action, ...(action === 'activate' ? {} : { expectedRevision: current.current?.course?.revision }), ...values }
    const signature = JSON.stringify({ locale: lang, body })
    if (pending.current?.signature !== signature) pending.current = { signature, operationId: crypto.randomUUID() }
    const operationId = pending.current.operationId
    const token = ++sequence.current
    try {
      const next = await appFetch(endpoint, { ...body, operationId })
      pending.current = null
      if (!mounted.current || token !== sequence.current) return true
      accept(next)
      if (action === 'activate') {
        setPreview(null)
        setConsentOpen(false)
        setConsent(false)
        callbacks.current.onActivated?.(next)
      }
      if (action === 'check-in') setEditCheckin(false)
      if (action === 'preferences') { setPreferenceDraft(null); alternative.current = false }
      if (action === 'finish-day') {
        setSkipConfirm(false)
        setEditCheckin(false)
        alternative.current = false
        // Retain unsent written drafts locally, separated by learning day. Never use browser storage.
        setDrafts(previous => ({ ...previous, [values.day]: { ...previous[values.day],
          ...(values.savePrivateText ? { comment: '', reflectionAnswer: '' } : {}), savePrivateText: false, applyFeedback: false } }))
      }
      if (showAlternative) {
        alternative.current = true
        const alternativeView = await appFetch(endpoint + '&alternative=true')
        if (mounted.current && token === sequence.current) accept(alternativeView)
      }
      return true
    } catch (caught) {
      if (mounted.current && token === sequence.current) {
        if (caught.status === 409) {
          pending.current = null
          try {
            const fresh = await readSnapshot()
            if (mounted.current && token === sequence.current) acceptSnapshot(fresh)
          }
          catch { caught.refreshFailed = true }
          // A changed activation proposal requires fresh consent, but not erased scale choices.
          if (action === 'activate') setConsent(false)
        }
        setError(caught)
      }
      return false
    } finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  async function reviewDay(day) {
    if (lock.current || loading) return
    lock.current = true
    setBusy(true)
    setError(null)
    const token = ++sequence.current
    try {
      const next = await appFetch(endpoint + '&reviewDay=' + encodeURIComponent(day) + (alternative.current ? '&alternative=true' : ''))
      if (mounted.current && token === sequence.current) accept(next)
    } catch (caught) { if (mounted.current) setError(caught) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }

  const course = view?.course, today = view?.today, profile = preview?.profile || view?.profile
  const rows = profile?.rows || [], priorityRows = (profile?.priorityScaleIds || []).map(id => rows.find(row => row.id === id)).filter(Boolean).slice(0, 7)
  const focusLabels = (today?.relatedScaleIds || []).map(id => rows.find(row => row.id === id)?.label).filter(Boolean)
  const selectedRows = selected.map(key => rows.find(row => scaleKey(row) === key))
  const staleSelections = selected.filter(key => !rows.some(row => scaleKey(row) === key && row.canChoosePractice))
  const minimum = profile?.minimumChoices ?? 3, maximum = Math.min(5, profile?.maximumChoices ?? 5)
  const selectionReady = profile?.status === 'ready-to-review' && selected.length >= minimum && selected.length <= maximum && selected.length > 0 && !staleSelections.length && Boolean(preview?.activationToken)
  const waiting = loading || busy, day = today?.day, draft = { ...EMPTY_DRAFT, ...drafts[day] }
  const preferences = preferenceDraft || view?.preferences || { length: 'standard', alternativeRequested: false, stopOffer: false }
  const showCheckin = today?.status === 'check-in-required' || editCheckin
  const errorCode = error?.code || error?.message || ''
  const errorText = error?.status === 409 ? (error.refreshFailed ? t.conflictReload : t.conflict)
    : ['SIGN_IN_REQUIRED', 'RECENT_SIGN_IN_REQUIRED'].includes(errorCode) ? t.signin
      : errorCode === 'COURSE_NOT_STARTED' ? t.noCourse
        : errorCode === 'NEW_R3_PROFILE_REQUIRED' ? t.sourceChanged
          : /INVALID|CHOOSE_|CONSENT_REQUIRED/.test(errorCode) ? t.invalid : t.error
  function updateDraft(key, value) { setDrafts(previous => ({ ...previous, [day]: { ...previous[day], [key]: value } })) }
  function updatePreference(key, value) { setPreferenceDraft({ ...preferences, [key]: value }) }
  function toggleScale(key) {
    setConsent(false)
    setSelected(previous => previous.includes(key) ? previous.filter(item => item !== key) : previous.length < maximum ? [...previous, key] : previous)
  }
  function checkIn(skip) {
    return command('check-in', { wellbeing: skip || draft.wellbeing === '' ? null : Number(draft.wellbeing),
      energy: skip ? null : draft.energy || null, feelingChange: skip ? null : draft.feelingChange || null,
      availableTime: draft.availableTime, skip, pauseRequested: skip ? false : draft.rest })
  }
  function finishDay() {
    if (!today?.lesson) return
    const feedback = { helpfulness: draft.helpfulness || null, difficulty: draft.difficulty || null, comfort: draft.comfort || null,
      ...(draft.savePrivateText ? { comment: draft.comment, reflectionAnswer: draft.reflectionAnswer } : {}) }
    return command('finish-day', { day: today.day, lessonId: today.lesson.id, status: 'completed', feedback,
      applyFeedback: draft.applyFeedback, savePrivateText: draft.savePrivateText, confirmAlternative: today.lesson.variant === 'grounding' })
  }
  function openConsent() {
    if (waiting || !selectionReady) return
    setConsent(false)
    setConsentOpen(true)
  }
  const historicalDrafts = Object.entries(drafts).filter(([draftDay, entry]) => Number(draftDay) !== day && (entry.comment || entry.reflectionAnswer))

  return (<section className={styles.root} data-course-daily-21 aria-busy={waiting}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>{t.eyebrow}</p><h2>{t.title}</h2><p>{t.intro}</p>
      <p className={styles.small}>{t.scope}</p><p className={styles.small}>{t.prepared}</p>
      {onCancel && <button type="button" className={styles.textButton} disabled={waiting} onClick={() => { setConsentOpen(false); onCancel() }}>{t.back}</button>}
    </header>
    {loading && !view && <p role="status">{t.loading}</p>}
    {error && !consentOpen && <div className={styles.error} role="alert"><p>{errorText}</p><button type="button" disabled={waiting} onClick={refresh}>{t.refresh}</button></div>}
    {view?.available === false && <div className={styles.card}><p>{t.unavailable}</p><button type="button" disabled={waiting} onClick={refresh}>{t.retry}</button></div>}

    {view?.available && !course && profile && <section className={styles.card} data-course-21-profile>
      <h3>{t.profile}</h3><p>{t.profileHint}</p>
      {profile.status !== 'ready-to-review' && <div className={styles.notice} role="status">
        <p>{profile.status === 'interpretations-unavailable' ? t.noInterpretations : profile.status === 'no-practice-mapping' ? t.noMapping : t.missingResults}</p>
        {!!profile.missingDefinitionIds?.length && <><strong>{t.missingForms}</strong><ul>{profile.missingDefinitionIds.map(id => {
          const form = preview?.source?.selectedForms?.find(item => item.definitionId === id)
          return <li key={id}>{form?.definitionKey || id}{form?.identity?.instrumentLocale ? ' · ' + form.identity.instrumentLocale.toUpperCase() : ''}</li>
        })}</ul></>}
        <button type="button" disabled={waiting} onClick={refresh}>{t.refresh}</button>
      </div>}
      <section className={styles.priority}><h4>{t.priorities}</h4><p className={styles.small}>{t.priorityHint}</p>
        {priorityRows.length ? <ol>{priorityRows.map(row => <li key={row.id}><a href={'#' + uid + '-scale-' + rows.indexOf(row)}>{row.label}</a></li>)}</ol> : <p>{t.noPriorities}</p>}
      </section>
      <h4>{t.choose}</h4>{minimum < 3 && <p>{t.fewer}</p>}
      <p className={styles.small} aria-live="polite">{selected.length} {t.selected} · {t.min}: {minimum}, {t.max}: {maximum}</p>
      {!!staleSelections.length && <div className={styles.error}><p>{t.stale}</p>{staleSelections.map(key => <button key={key} type="button" disabled={waiting} onClick={() => toggleScale(key)}>{t.remove}: {key}</button>)}</div>}
      <div className={styles.scaleGrid} aria-label={t.allScales}>
        {rows.map((row, index) => <article key={row.id} id={uid + '-scale-' + index} className={styles.scale} data-course-scale={row.dimensionKey} data-selected={selected.includes(scaleKey(row))}>
          <label className={styles.check}><input type="checkbox" checked={selected.includes(scaleKey(row))}
            disabled={waiting || !row.canChoosePractice || profile.status !== 'ready-to-review' || (!selected.includes(scaleKey(row)) && selected.length >= maximum)}
            onChange={() => toggleScale(scaleKey(row))}/><strong>{row.label}</strong></label>
          {priorityRows.includes(row) && <span className={styles.tag}>{t.suggested} {priorityRows.indexOf(row) + 1}</span>}
          <ScaleReading row={row} lang={lang} t={t} explain/>
        </article>)}
      </div>
      {!rows.length && <p>{t.noScales}</p>}
      <p className={styles.small}>{t.pace}</p>
      <button type="button" className={styles.primary} disabled={waiting || !selectionReady} onClick={openConsent}>{t.reviewStart}</button>
    </section>}

    <dialog ref={dialog} className={styles.dialog} aria-labelledby={uid + '-consent-title'} aria-describedby={uid + '-consent-detail'}
      onCancel={event => { if (busy) event.preventDefault(); else { setConsent(false); setConsentOpen(false) } }} onClose={() => { setConsentOpen(false); setConsent(false) }}>
      <h3 id={uid + '-consent-title'}>{t.consentTitle}</h3>
      <ul>{selectedRows.filter(Boolean).map(row => <li key={row.id}>{row.label}</li>)}</ul>
      {error && consentOpen && <p className={styles.error} role="alert">{errorText}</p>}
      <label className={styles.check}><input type="checkbox" checked={consent} disabled={waiting} onChange={event => setConsent(event.target.checked)}/><span>{t.consent}</span></label>
      <p id={uid + '-consent-detail'} className={styles.small}>{t.consentDetail}</p><p className={styles.small}>{t.consentTime}</p>
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={waiting || !consent || !selectionReady} onClick={() => command('activate', {
        expectedSourceRevision: preview.source.courseRevision, activationToken: preview.activationToken, selectedR3ScaleKeys: selected,
        consent: true, consentVersion: preview.consentVersion, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })}>{busy ? t.saving : t.agree}</button><button type="button" disabled={waiting} onClick={() => { setConsent(false); setConsentOpen(false) }}>{t.cancel}</button></div>
    </dialog>

    {course && today && <section className={styles.card} data-course-21-daily>
      <div className={styles.row}><h3>{day ? `${t.day} ${day} ${t.of} 21` : t.finished}</h3>{today.week && <span>{t.week} {today.week}/3</span>}</div>
      <progress className={styles.progress} max={21} value={today.completedDays || 0} aria-label={t.progress}/>
      <p>{today.completedDays || 0} {t.completed} · {today.skippedDays || 0} {t.skipped}</p>
      <p className={styles.small}>{t.progressHint} {t.pace}</p><p className={styles.small}>{t.timeZone}: {course.timeZone}</p>
      <details className={styles.details} data-course-21-initial-profile><summary>{t.initialProfile}</summary><p className={styles.small}>{t.initialProfileHint}</p>
        {rows.length ? <div className={styles.scaleGrid}>{rows.map(row => <article className={styles.scale} key={row.id}><h4>{row.label}</h4><ScaleReading row={row} lang={lang} t={t}/></article>)}</div> : <p>{t.noScales}</p>}
      </details>
      <div className={styles.actions}>{today.status !== 'finished' && <button type="button" disabled={waiting} onClick={() => command(today.status === 'paused' ? 'resume' : 'pause')}>{today.status === 'paused' ? t.resume : t.pause}</button>}
        <button type="button" disabled={waiting} onClick={refresh}>{t.refresh}</button></div>
      {['paused', 'finished', 'next-local-day', 'rest-chosen'].includes(today.status) && <p className={styles.notice} role="status">{today.status === 'paused' ? t.paused : today.status === 'finished' ? t.finishHint : today.status === 'next-local-day' ? t.tomorrow : t.rest}</p>}
      {EDITABLE_DAYS.includes(today.status) && !editCheckin && <button type="button" className={styles.textButton} disabled={waiting} onClick={() => setEditCheckin(true)}>{t.editCheckin}</button>}
      {showCheckin && <form className={styles.checkin} onSubmit={event => { event.preventDefault(); checkIn(false) }}>
        <h4>{t.checkin}</h4>
        <label className={styles.field}><span>{t.wellbeing} · {t.optional}</span><input type="number" inputMode="numeric" min={0} max={10} step={1} value={draft.wellbeing} disabled={waiting} onChange={event => updateDraft('wellbeing', event.target.value)} aria-describedby={uid + '-wellbeing'}/></label>
        <p className={styles.small} id={uid + '-wellbeing'}>{t.wellbeingHint}</p>
        <div className={styles.formGrid}>
          <Select label={t.energy} value={draft.energy} onChange={value => updateDraft('energy', value)} options={['', 'low', 'usual', 'ample']} labels={t.energyOptions} disabled={waiting}/>
          <Select label={t.change} value={draft.feelingChange} onChange={value => updateDraft('feelingChange', value)} options={['', 'better', 'same', 'worse']} labels={t.changeOptions} disabled={waiting}/>
          <Select label={t.time} value={draft.availableTime} onChange={value => updateDraft('availableTime', value)} options={['quick', 'standard']} labels={[t.quick, t.standard]} disabled={waiting}/>
        </div>
        <label className={styles.check}><input type="checkbox" checked={draft.rest} disabled={waiting} onChange={event => updateDraft('rest', event.target.checked)}/><span>{t.restChoice}</span></label>
        <div className={styles.actions}><button type="submit" className={styles.primary} disabled={waiting}>{t.saveCheckin}</button><button type="button" disabled={waiting} onClick={() => checkIn(true)}>{t.skipCheckin}</button>{editCheckin && <button type="button" disabled={waiting} onClick={() => setEditCheckin(false)}>{t.closeCheckin}</button>}</div>
        <p className={styles.small}>{t.skipHint}</p>
      </form>}
      {today.status !== 'finished' && <details className={styles.details}><summary>{t.preferences}</summary>
        <Select label={t.length} value={preferences.length} onChange={value => updatePreference('length', value)} options={['quick', 'standard']} labels={[t.quick, t.standard]} disabled={waiting}/>
        <label className={styles.check}><input type="checkbox" checked={preferences.alternativeRequested} disabled={waiting} onChange={event => updatePreference('alternativeRequested', event.target.checked)}/><span>{t.grounding}</span></label>
        <label className={styles.check}><input type="checkbox" checked={preferences.stopOffer} disabled={waiting} onChange={event => updatePreference('stopOffer', event.target.checked)}/><span>{t.stopOffer}</span></label>
        <button type="button" disabled={waiting || !preferenceDraft} onClick={() => command('preferences', preferences)}>{t.savePreferences}</button>
      </details>}
      {today.status === 'choose-comfortable-option' && <section className={styles.notice}><h4>{t.alternative}</h4><p>{t.alternativeHint}</p>
        <button type="button" disabled={waiting} onClick={() => command('preferences', { length: 'quick', alternativeRequested: true, stopOffer: true }, { showAlternative: true })}>{t.viewGrounding}</button></section>}
      {['material-unavailable', 'alternative-unavailable'].includes(today.status) && <p className={styles.notice} role="status">{t.material}</p>}
      {today.lesson && !showCheckin && <>
        {!!focusLabels.length && <p className={styles.small}>{t.todayFocus}: {focusLabels.join(', ')}</p>}
        <Lesson lesson={today.lesson} t={t} titleId={uid + '-lesson'}/>
        <fieldset className={styles.feedback} disabled={waiting}><legend>{t.feedback}</legend>
          <div className={styles.formGrid}>
            <Select label={t.helpfulness} value={draft.helpfulness} onChange={value => updateDraft('helpfulness', value)} options={['', 'helpful', 'neutral', 'not-helpful']} labels={t.helpOptions} disabled={waiting}/>
            <Select label={t.difficulty} value={draft.difficulty} onChange={value => updateDraft('difficulty', value)} options={['', 'manageable', 'too-hard']} labels={t.difficultyOptions} disabled={waiting}/>
            <Select label={t.comfort} value={draft.comfort} onChange={value => updateDraft('comfort', value)} options={['', 'comfortable', 'neutral', 'uncomfortable']} labels={t.comfortOptions} disabled={waiting}/>
          </div>
          <label className={styles.field}><span>{t.reflectionAnswer} · {t.optional}</span><textarea rows={3} maxLength={1000} value={draft.reflectionAnswer} onChange={event => updateDraft('reflectionAnswer', event.target.value)} aria-describedby={uid + '-text-privacy'}/></label>
          <label className={styles.field}><span>{t.comment} · {t.optional}</span><textarea rows={3} maxLength={1000} value={draft.comment} onChange={event => updateDraft('comment', event.target.value)} aria-describedby={uid + '-text-privacy'}/></label>
          <label className={styles.check}><input type="checkbox" checked={draft.savePrivateText} onChange={event => updateDraft('savePrivateText', event.target.checked)}/><span>{t.saveText}</span></label>
          <p id={uid + '-text-privacy'} className={styles.small}>{t.textHint}</p>
          <label className={styles.check}><input type="checkbox" checked={draft.applyFeedback} onChange={event => updateDraft('applyFeedback', event.target.checked)}/><span>{t.applyFeedback}</span></label><p className={styles.small}>{t.applyHint}</p>
        </fieldset>
        <button type="button" className={styles.primary} disabled={waiting} onClick={finishDay}>{busy ? t.saving : t.finish}</button>
      </>}
      {EDITABLE_DAYS.includes(today.status) && !showCheckin && <div className={styles.skip}>
        {!skipConfirm ? <button type="button" disabled={waiting} onClick={() => setSkipConfirm(true)}>{t.skipDay}</button> : <><p>{t.skipConfirm}</p><div className={styles.actions}><button type="button" disabled={waiting} onClick={() => command('finish-day', { day: today.day, lessonId: null, status: 'skipped', feedback: {}, applyFeedback: false, savePrivateText: false, confirmAlternative: false })}>{t.skipDay}</button><button type="button" disabled={waiting} onClick={() => setSkipConfirm(false)}>{t.cancel}</button></div></>}
      </div>}
      {!!view.history?.length && <section className={styles.history}><h4>{t.history}</h4><ol>{view.history.map(entry => <li key={entry.day}><span>{t.day} {entry.day} · {entry.status === 'completed' ? t.completed : t.skipped}</span><button type="button" disabled={waiting} onClick={() => reviewDay(entry.day)} aria-label={t.reviewDay + ' ' + entry.day}>{t.reviewDay} {entry.day}</button></li>)}</ol></section>}
      {view.reviewLesson && <section className={styles.review} data-course-21-review><div className={styles.row}><p className={styles.small}>{t.repeatNote}</p><button type="button" disabled={waiting} onClick={() => accept({ ...current.current, reviewLesson: null })}>{t.closeReview}</button></div>
        {view.reviewLesson.status === 'ready' && view.reviewLesson.lesson ? <Lesson lesson={view.reviewLesson.lesson} t={t} titleId={uid + '-review-lesson'}/> : <p role="status">{t.material}</p>}
      </section>}
      {!!historicalDrafts.length && <details className={styles.details}><summary>{t.draftNotes}</summary><p className={styles.small}>{t.draftHint}</p>{historicalDrafts.map(([draftDay, entry]) => <section key={draftDay}><h4>{t.day} {draftDay}</h4>{entry.reflectionAnswer && <p className={styles.preserveText}>{entry.reflectionAnswer}</p>}{entry.comment && <p className={styles.preserveText}>{entry.comment}</p>}</section>)}</details>}
    </section>}
    {!!view?.outline?.weeks?.length && <details className={styles.details}><summary>{t.outline}</summary>{view.outline.weeks.map(week => <section key={week.week}><h3>{t.week} {week.week}: {week.title}</h3><p>{week.goal}</p><ol start={(week.week - 1) * 7 + 1}>{week.days.map(entry => <li key={entry.day}>{entry.skill}</li>)}</ol></section>)}</details>}
    <p className={styles.safety}>{t.safe}</p>
  </section>
  )
}
