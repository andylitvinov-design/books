'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './course-daily-21.module.css'
import { suggestCourseFeedbackAdjustment, confirmCourseFeedbackAdjustment, courseFeedbackAdjustmentAvailability } from '@/lib/inner-growth/course-feedback-phrases'
import CourseCompletion21 from './course-completion-21'
import {GoalObservationFields,CourseGoalWeeklyReports,SavedCourseGoalObservations} from './course-goal-observations'

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
    notePreferenceDirty: 'Save or discard your unsaved practice preferences before checking this note.', notePreferenceDiscard: 'Discard unsaved preference changes',
    noteAlreadyApplied: 'This preference is already active. Nothing changed.',
    noteSameAlternative: 'The current short practice already uses this eyes-open option. A distinct alternative is not available here. You can rest, stop, or choose practice preferences yourself.',
    noteAlreadyShort: 'Today’s practice is already shortened. This choice keeps a shorter preference for subsequent lessons.',
    noteExistingGrounding: 'The eyes-open option is the same one used in your current short practice; the new choice is the offer to rest first.',
    noteAdjustment: 'Suggest an adjustment from this note',
    noteAdjustmentHint: 'Optional simple phrase matching on this device, only when you press the button. It recognizes a few complete exercise preferences up to 240 characters, not the meaning of a journal entry. Nothing is sent by checking the note.',
    noteAdjustmentExample: 'For example: “This exercise takes too long.” You can always choose lesson preferences yourself.',
    noteAdjustmentNone: 'No complete supported practice preference matched. Nothing changed. You can use the lesson preferences yourself; this is not a judgment about your note or wellbeing.',
    noteAdjustmentScope: 'Only this confirmed setting will be sent, without your note. It applies to the current unfinished practice and subsequent lessons. Completed lessons stay unchanged. You can reverse it in Practice preferences.',
    noteAdjustmentConfirm: 'Confirm this practice adjustment', noteAdjustmentCancel: 'Keep my current preferences',
    reflectionAnswer: 'My reflection', comment: 'My note', saveText: 'Save this reflection and note privately in my account',
    textHint: 'Unchecked: written text stays only in this open page and is not sent. Leaving or reloading the page can lose unsaved text. Saved notes are private journal entries, not automatically interpreted or monitored for urgent help.',
    applyFeedback: 'Use my structured feedback to adjust prepared practice options', applyHint: 'Only the selected helpfulness, difficulty and comfort answers are used for this choice. This checkbox does not interpret written notes. Changes can suggest a shorter or grounding option; intensity is not increased automatically.',
    finish: 'Save completed learning day', skipDay: 'Skip this learning day', skipConfirm: 'Record this learning day as skipped? You can revisit it later. No ratings or written notes will be sent with this action.',
    history: 'Your learning days', reviewDay: 'Revisit day', repeatNote: 'Optional review. Reading or repeating this lesson does not add a completed day or change progress.', closeReview: 'Close review',
    draftNotes: 'Unsent notes kept in this open page', draftHint: 'These notes were not sent with a skipped or completed day. They remain available here until this page is left or reloaded.',
    savedObservations: 'Saved observations for this day', savedCheckin:'Recorded pre-lesson check-in', noSavedText: 'No written note or reflection was saved for this day.', savedReflection: 'Saved reflection', savedNote: 'Saved note', noAnswer: 'Not answered', feedbackWasApplied: 'These selected feedback answers were used to adjust prepared options.', feedbackWasNotApplied: 'These answers were saved without applying an adjustment.',
    outlineOverview: 'This is a general weekly overview. Your exact daily lessons will appear after you choose your scales and confirm the programme.',
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
    notePreferenceDirty: 'Сначала сохраните или отмените несохранённые настройки практики, затем проверьте заметку.', notePreferenceDiscard: 'Отменить несохранённые изменения настроек',
    noteAlreadyApplied: 'Эта настройка уже действует. Ничего не изменилось.',
    noteSameAlternative: 'Текущая короткая практика уже использует этот вариант с открытыми глазами. Другого отдельного варианта здесь пока нет. Можно отдохнуть, остановиться или выбрать настройки самостоятельно.',
    noteAlreadyShort: 'Сегодняшняя практика уже сокращена. Этот выбор сохраняет короткий вариант для следующих уроков.',
    noteExistingGrounding: 'Вариант с открытыми глазами совпадает с текущей короткой практикой; новое изменение — сначала предлагать отдых.',
    noteAdjustment: 'Предложить настройку по этой заметке',
    noteAdjustmentHint: 'Необязательное сравнение с несколькими фразами на этом устройстве, только после нажатия кнопки. Распознаются целые предпочтения об упражнении до 240 символов, а не смысл дневника. При проверке заметка не отправляется.',
    noteAdjustmentExample: 'Например: «Хочу более короткое упражнение». Настройки урока всегда можно выбрать самостоятельно.',
    noteAdjustmentNone: 'Целая поддерживаемая фраза о практике не найдена. Ничего не изменилось. Можно выбрать настройки урока самостоятельно; это не оценка заметки или самочувствия.',
    noteAdjustmentScope: 'Будет отправлена только подтверждённая настройка, без заметки. Она действует для текущей незавершённой практики и следующих уроков. Пройденные уроки не меняются. Вы сможете отменить её в разделе «Настройки практики».',
    noteAdjustmentConfirm: 'Подтвердить настройку практики', noteAdjustmentCancel: 'Оставить мои настройки',
    reflectionAnswer: 'Моё размышление', comment: 'Моя заметка', saveText: 'Приватно сохранить это размышление и заметку в моём аккаунте',
    textHint: 'Без отметки письменный текст остаётся только на открытой странице и не отправляется. Уход или перезагрузка могут удалить несохранённый текст. Сохранённые заметки — личный дневник; они не интерпретируются автоматически и не отслеживаются для экстренной помощи.',
    applyFeedback: 'Настроить подготовленные практики по моим выбранным ответам', applyHint: 'Используются только ответы о пользе, трудности и комфорте. Этот пункт не интерпретирует письменные заметки. Можно предложить короткий вариант или заземление; интенсивность автоматически не увеличивается.',
    finish: 'Сохранить выполненный учебный день', skipDay: 'Пропустить этот учебный день', skipConfirm: 'Отметить этот учебный день как пропущенный? К нему можно вернуться позже. При этом действии оценки и письменные заметки не отправляются.',
    history: 'Мои учебные дни', reviewDay: 'Вернуться к дню', repeatNote: 'Необязательный повтор. Чтение или повторение урока не добавляет выполненный день и не меняет прогресс.', closeReview: 'Закрыть повтор',
    draftNotes: 'Неотправленные заметки на этой странице', draftHint: 'Эти заметки не отправлялись при завершении или пропуске дня. Они доступны здесь до ухода со страницы или перезагрузки.',
    savedObservations: 'Сохранённые наблюдения за этот день', savedCheckin:'Сохранённая отметка перед уроком', noSavedText: 'За этот день письменная заметка и размышление не сохранялись.', savedReflection: 'Сохранённое размышление', savedNote: 'Сохранённая заметка', noAnswer: 'Без ответа', feedbackWasApplied: 'Эти выбранные ответы использовались для настройки подготовленных вариантов.', feedbackWasNotApplied: 'Эти ответы сохранены без применения настройки.',
    outlineOverview: 'Это общий обзор недель. Точные ежедневные уроки появятся после выбора шкал и подтверждения программы.',
    outline: 'Маршрут на 21 учебный день', safe: 'Если упражнение усиливает дискомфорт, остановитесь. При тяжёлом или длительном неблагополучии обратитесь к специалисту. При непосредственной опасности — в местную экстренную или кризисную службу; курс не отслеживается в реальном времени.',
  },
}

const PERSONAL_MODE = 'exact-reviewed-scale-objective-practice'
const PERSONAL_WORDS = {
  en: {
    priorityHint: 'Suggested by your confirmed focus, then coverage of distinct topics. Scores and scale ratios do not rank clinical severity or identify deficits.',
    noPriorities: 'No reviewed practice goals are available yet.',
    aggregateOnly: 'Profile information only: this overall score combines resources already represented by individual scales. It is not a separate practice goal.',
    missingMapping: 'This result remains visible, but an exact reviewed scale-to-objective practice mapping is not available.',
    missingPrepared: 'The exact reviewed practice or whole-goal review material is unavailable. This scale cannot currently be chosen.',
    screeningOnly: 'Screening information is not a self-treatment target. Read the report and its support guidance.',
    descriptiveOnly: 'This descriptive or mixed-direction scale is profile information, not an automatic practice goal.',
    mappingReason: 'Why this practice is linked', mappingLimits: 'Limits of this link', mappingSource: 'Practice mapping source',
    familyReuse: 'Shared practice family', familyContext: 'Original authoring context', limitedFacet: 'Limited facet practised',
    educationalLimits: 'These sources explain the educational approach. A reviewed mapping does not establish that an exercise treats a condition, improves a test score or has proven clinical effectiveness.',
    skill: 'Today’s skill', objective: 'Today’s learning objective', reviewGoals: 'All chosen goals in this review',
    contentLanguage: 'Lesson language', pinnedLanguage: 'Lesson text is pinned to the confirmed plan. Changing the page language does not translate it. A language change needs a confirmed plan revision for unresolved days.',
    sourceMaterial: 'Prepared practice source', frameSource: 'Lesson-frame source',
    planSettings: 'Personal course settings', loadMinutes: 'Total time per learning day', load2: '2 minutes', load5: '5 minutes',
    weeklyAccents: 'Weekly topic accents', accentHint: 'Every selected topic receives practice opportunities before extra accent slots. Several scales from one topic do not give that topic extra weight.',
    primaryTopic: 'Primary topic', secondaryTopic: 'Secondary topic', noSecondary: 'No secondary accent',
    planLanguage: 'Language of future lesson text', planSummary: 'Your confirmed plan', editPlan: 'Edit unresolved learning days',
    revisionHint: 'Changes start with the next unresolved learning day, including today if unfinished. Completed and skipped days, saved notes, original result dates and previous lesson text stay unchanged.',
    revisionConsent: 'I confirm these goals, weekly accents, time and language for unresolved learning days only.',
    saveRevision: 'Confirm future plan changes', cancelRevision: 'Close without saving changes',
    planRevision: 'Plan revision', selectedGoals: 'Chosen practice goals', planProfileLoading: 'Checking reviewed choices for this lesson language…',
    dayOptions: 'Today’s prepared options', dayOptionsHint: 'Viewing an option does not save progress or change the plan. Only prepared material for your chosen goals is offered.',
    keepChoice: 'View planned-length practice', shortChoice: 'View short practice', alternativeChoice: 'View prepared alternative', restChoicePreview: 'Rest without saving progress',
    dayTarget: 'Goal for this practice', plannedGoal: 'Use the planned goal', noAlternative: 'No distinct reviewed alternative is available for this goal and day.',
    personalApplyHint: 'Only your selected helpfulness, difficulty and comfort answers may suggest a shorter practice or an available prepared alternative. Written notes are not interpreted and intensity is not increased automatically.',
    personalPreferenceStandard: 'Use confirmed plan length', personalAlternative: 'Prefer a prepared alternative',
    personalPreferenceHint: 'These saved preferences can be changed here at any time. Short practice stays within your confirmed daily time. If the preferred alternative is unavailable on a later day, choose another prepared option or turn this preference off.',
    personalNoteUnavailable: 'A required prepared option is unavailable for this goal and day. Nothing changed. You can use another available option or adjust your saved preferences yourself.',
    personalNoteChanges: 'Preference changes to confirm', enabled: 'On', disabled: 'Off',
    personalNoteLabels: { 'shorter-practice':'Use the prepared short practice', 'simpler-focus':'Use the prepared short practice', 'external-attention':'Prefer the available prepared alternative', 'pause-or-external-attention':'Ask before another lesson and prefer the available prepared alternative' },
    personalAlternativeHint: 'You can view an available prepared option below, rest, skip the day or pause. Nothing increases intensity automatically.',
    topics: { energy_agency:'Energy and agency', inner_support:'Inner support', connection_boundaries:'Connection and boundaries', calm_regulation:'Calm and regulation', emotional_flexibility:'Emotional flexibility', attention_clarity:'Attention and clarity' },
  },
  ru: {
    priorityHint: 'Предложения учитывают подтверждённый фокус, затем охват разных тем. Баллы и отношения к диапазону шкалы не ранжируют клиническую тяжесть и не определяют дефициты.',
    noPriorities: 'Пока нет доступных проверенных целей для практики.',
    aggregateOnly: 'Только для профиля: общий показатель объединяет ресурсы, уже представленные отдельными шкалами. Это не отдельная цель практики.',
    missingMapping: 'Результат остаётся видимым, но для этой точной шкалы нет проверенной связи с учебной целью и практикой.',
    missingPrepared: 'Нет точного проверенного материала практики или обзора всех целей. Сейчас эту шкалу выбрать нельзя.',
    screeningOnly: 'Скрининговый результат не является целью самостоятельного лечения. Прочитайте отчёт и рекомендации о поддержке.',
    descriptiveOnly: 'Описательная шкала или шкала со смешанным направлением служит для профиля, а не становится автоматической целью практики.',
    mappingReason: 'Почему связана эта практика', mappingLimits: 'Ограничения связи', mappingSource: 'Источник связи с практикой',
    familyReuse: 'Общее семейство практик', familyContext: 'Исходный контекст разработки', limitedFacet: 'Ограниченный аспект практики',
    educationalLimits: 'Источники объясняют учебный подход. Проверенная связь не доказывает, что упражнение лечит состояние, улучшает балл теста или обладает подтверждённой клинической эффективностью.',
    skill: 'Навык дня', objective: 'Учебная цель дня', reviewGoals: 'Все выбранные цели в этом обзоре',
    contentLanguage: 'Язык урока', pinnedLanguage: 'Текст урока закреплён в подтверждённом плане. Смена языка страницы не переводит его. Для смены языка незавершённых дней нужно подтвердить изменение плана.',
    sourceMaterial: 'Источник подготовленной практики', frameSource: 'Источник структуры урока',
    planSettings: 'Настройки персонального курса', loadMinutes: 'Общее время на учебный день', load2: '2 минуты', load5: '5 минут',
    weeklyAccents: 'Акценты тем по неделям', accentHint: 'Каждая выбранная тема получает практику до распределения дополнительных акцентов. Несколько шкал одной темы не увеличивают её вес.',
    primaryTopic: 'Основная тема', secondaryTopic: 'Дополнительная тема', noSecondary: 'Без дополнительного акцента',
    planLanguage: 'Язык будущих уроков', planSummary: 'Ваш подтверждённый план', editPlan: 'Изменить незавершённые учебные дни',
    revisionHint: 'Изменения начинаются со следующего незавершённого учебного дня, включая сегодняшний, если он не завершён. Выполненные и пропущенные дни, заметки, исходные даты результатов и тексты прежних уроков не меняются.',
    revisionConsent: 'Подтверждаю эти цели, акценты недель, время и язык только для незавершённых учебных дней.',
    saveRevision: 'Подтвердить изменения будущих дней', cancelRevision: 'Закрыть без сохранения изменений',
    planRevision: 'Версия плана', selectedGoals: 'Выбранные цели практики', planProfileLoading: 'Проверяем доступность материалов на выбранном языке уроков…',
    dayOptions: 'Подготовленные варианты на сегодня', dayOptionsHint: 'Просмотр варианта не сохраняет прогресс и не меняет план. Предлагаются только подготовленные материалы для выбранных целей.',
    keepChoice: 'Посмотреть практику выбранной длины', shortChoice: 'Посмотреть короткую практику', alternativeChoice: 'Посмотреть подготовленную альтернативу', restChoicePreview: 'Отдохнуть без сохранения прогресса',
    dayTarget: 'Цель этой практики', plannedGoal: 'Использовать цель по плану', noAlternative: 'Для этой цели и дня нет отдельной проверенной альтернативы.',
    personalApplyHint: 'Только выбранные ответы о пользе, трудности и комфорте могут предложить короткую практику или доступную подготовленную альтернативу. Заметки не интерпретируются, интенсивность автоматически не увеличивается.',
    personalPreferenceStandard: 'Длина по подтверждённому плану', personalAlternative: 'Предпочитать подготовленную альтернативу',
    personalPreferenceHint: 'Эти сохранённые настройки можно изменить здесь в любой момент. Короткая практика остаётся в пределах подтверждённого времени. Если в другой день предпочтительная альтернатива недоступна, выберите другой подготовленный вариант или отключите эту настройку.',
    personalNoteUnavailable: 'Нужный подготовленный вариант недоступен для этой цели и дня. Ничего не изменилось. Можно выбрать другой доступный вариант или самостоятельно изменить сохранённые настройки.',
    personalNoteChanges: 'Изменения настроек для подтверждения', enabled: 'Включено', disabled: 'Выключено',
    personalNoteLabels: { 'shorter-practice':'Использовать подготовленную короткую практику', 'simpler-focus':'Использовать подготовленную короткую практику', 'external-attention':'Предпочитать доступную подготовленную альтернативу', 'pause-or-external-attention':'Спрашивать перед следующим уроком и предпочитать доступную подготовленную альтернативу' },
    personalAlternativeHint: 'Можно посмотреть доступный подготовленный вариант ниже, отдохнуть, пропустить день или поставить курс на паузу. Интенсивность автоматически не увеличивается.',
    topics: { energy_agency:'Энергия и действие', inner_support:'Внутренняя поддержка', connection_boundaries:'Контакт и границы', calm_regulation:'Спокойствие и регуляция', emotional_flexibility:'Эмоциональная гибкость', attention_clarity:'Внимание и ясность' },
  },
}
const localized = (value, lang) => typeof value === 'string' ? value : typeof value?.[lang] === 'string' ? value[lang] : ''
function SourceReference({ source, label }) {
  const title = typeof source === 'string' ? source : source?.title || source?.sourceType || ''
  const url = typeof source === 'string' ? source : source?.url
  if (!title && !safeSource(url)) return null
  return <p className={styles.small}>{label}: {safeSource(url) ? <a href={url} target="_blank" rel="noreferrer">{title || label}</a> : title}</p>
}
function MappingContext({ row, lang, t }) {
  const rationale = localized(row.mappingRationale, lang), limitations = localized(row.mappingLimitations, lang)
  const family = row.familyReuse, facet = localized(family?.limitedFacet, lang)
  return <div className={styles.mappingContext} data-course-mapping-context>
    {rationale && <p><strong>{t.mappingReason}: </strong>{rationale}</p>}
    {limitations && <p><strong>{t.mappingLimits}: </strong>{limitations}</p>}
    {family && <section><h5>{t.familyReuse}</h5>{facet && <p>{t.limitedFacet}: {facet}</p>}
      {family.sourcePilotIdentity && <p className={styles.small}>{t.familyContext}: {[family.sourcePilotIdentity.definitionKey, family.sourcePilotIdentity.definitionVersion, family.sourcePilotIdentity.dimensionKey].filter(Boolean).join(' · ')}</p>}
    </section>}
    <SourceReference source={row.mappingSourceMetadata || row.mappingSource} label={t.mappingSource}/>
  </div>
}
function practiceReason(row, t) {
  if (row.practiceReason === 'aggregate-profile-only-not-a-separate-goal') return t.aggregateOnly
  if (row.practiceReason === 'screening-not-self-treatment') return t.screeningOnly
  if (row.practiceReason === 'not-a-directional-practice-goal') return t.descriptiveOnly
  if (row.interpretationStatus !== 'available' || row.practiceReason === 'interpretation-unavailable') return t.missingMeaning
  if (['review-material-unavailable','reviewed-objective-practice-unavailable'].includes(row.practiceReason)) return t.missingPrepared
  return t.missingMapping
}
// Reuse only the bounded whole-draft matcher. V2 prepared alternatives are
// independent from short practices; never reuse the v1 grounding equivalence.
function personalNotePreferences(suggestion, preferences, today) {
  if (!suggestion || !['quick','standard'].includes(preferences?.length) || typeof preferences?.alternativeRequested !== 'boolean' || typeof preferences?.stopOffer !== 'boolean') return { availability: 'unavailable', patch: null, next: null }
  const short = today?.availableChoices?.includes('short'), alternative = today?.alternativeAvailable === true || today?.availableChoices?.includes('alternative')
  let patch
  switch (suggestion.id) {
    case 'shorter-practice': case 'simpler-focus':
      if (!short) return { availability: 'unavailable', patch: null, next: null }
      // Alternative preference takes precedence in the runtime, so explicitly
      // disclose clearing it when the user confirms a shorter prepared option.
      patch = { length: 'quick', alternativeRequested: false }; break
    case 'external-attention':
      if (!alternative) return { availability: 'unavailable', patch: null, next: null }
      patch = { alternativeRequested: true }; break
    case 'pause-or-external-attention':
      if (!alternative) return { availability: 'unavailable', patch: null, next: null }
      // An alternative need not be the short variant. Do not promise its length.
      patch = { alternativeRequested: true, stopOffer: true }; break
    default: return { availability: 'unavailable', patch: null, next: null }
  }
  const next = { length: preferences.length, alternativeRequested: preferences.alternativeRequested, stopOffer: preferences.stopOffer, ...patch }
  return { availability: Object.keys(patch).every(key => preferences[key] === patch[key]) ? 'already-applied' : 'available', patch, next }
}
function normalizedAccents(topicIds, accents = {}) {
  if (!topicIds.length) return {}
  return Object.fromEntries([1, 2, 3].map(week => {
    const requested = accents[week] || {}, primaryTopicId = topicIds.includes(requested.primaryTopicId) ? requested.primaryTopicId : topicIds[0]
    const secondaryTopicId = requested.secondaryTopicId === null ? null : topicIds.includes(requested.secondaryTopicId) && requested.secondaryTopicId !== primaryTopicId ? requested.secondaryTopicId : topicIds.find(id => id !== primaryTopicId) || null
    return [week, { primaryTopicId, secondaryTopicId }]
  }))
}
function PlanSettings({ rows, selected, value, onChange, t, disabled, language = false }) {
  const topics = [...new Set(selected.map(key => rows.find(row => scaleKey(row) === key)?.track).filter(Boolean))]
  const accents = normalizedAccents(topics, value.weeklyAccents)
  function accent(week, field, topic) {
    onChange('weeklyAccents', normalizedAccents(topics, { ...accents, [week]: { ...accents[week], [field]: topic || null } }))
  }
  return <fieldset className={styles.planSettings} disabled={disabled} data-personal-plan-settings><legend>{t.planSettings}</legend>
    <Select label={t.loadMinutes} value={value.loadMinutes} onChange={minutes => onChange('loadMinutes', Number(minutes))} options={[2,5]} labels={[t.load2,t.load5]} disabled={disabled}/>
    {language && <Select label={t.planLanguage} value={value.contentLocale} onChange={locale => onChange('contentLocale', locale)} options={['en','ru']} labels={['English','Русский']} disabled={disabled}/>}
    {!!topics.length && <><h5>{t.weeklyAccents}</h5><p className={styles.small}>{t.accentHint}</p>{[1,2,3].map(week => <fieldset className={styles.weekAccents} key={week}><legend>{t.week} {week}</legend>
      <Select label={t.primaryTopic + ' · ' + t.week + ' ' + week} value={accents[week].primaryTopicId} onChange={value => accent(week,'primaryTopicId',value)} options={topics} labels={topics.map(id => t.topics[id] || id)} disabled={disabled}/>
      <Select label={t.secondaryTopic + ' · ' + t.week + ' ' + week} value={accents[week].secondaryTopicId || ''} onChange={value => accent(week,'secondaryTopicId',value)} options={['',...topics.filter(id => id !== accents[week].primaryTopicId)]} labels={[t.noSecondary,...topics.filter(id => id !== accents[week].primaryTopicId).map(id => t.topics[id] || id)]} disabled={disabled}/>
    </fieldset>)}</>}
  </fieldset>
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
function SavedObservations({ entry, t, locale = 'en' }) {
  const feedback = entry.feedback || {}
  const reflection = typeof feedback.reflectionAnswer === 'string' ? feedback.reflectionAnswer : ''
  const note = typeof feedback.comment === 'string' ? feedback.comment : ''
  const values = [
    [t.helpfulness, feedback.helpfulness, ['', 'helpful', 'neutral', 'not-helpful'], t.helpOptions],
    [t.difficulty, feedback.difficulty, ['', 'manageable', 'too-hard'], t.difficultyOptions],
    [t.comfort, feedback.comfort, ['', 'comfortable', 'neutral', 'uncomfortable'], t.comfortOptions],
  ]
  return <details className={styles.details} data-course-saved-observations><summary>{t.savedObservations}</summary>
    {entry.localDate && <p className={styles.small}>{entry.localDate}</p>}
    {entry.goalObservations && <SavedCourseGoalObservations record={entry.goalObservations} locale={locale}/>}
    {entry.checkin && <section data-course-recorded-checkin><h5>{t.savedCheckin}</h5><p className={styles.small}>{t.wellbeingHint}</p>
      <dl className={styles.curriculum}><div><dt>{t.wellbeing}</dt><dd>{entry.checkin.skipped ? t.noAnswer : entry.checkin.wellbeing??t.noAnswer}</dd></div>
        <div><dt>{t.energy}</dt><dd>{!entry.checkin.skipped && ['low','usual','ample'].includes(entry.checkin.energy) ? t.energyOptions[['low','usual','ample'].indexOf(entry.checkin.energy)+1] : t.noAnswer}</dd></div>
        <div><dt>{t.change}</dt><dd>{!entry.checkin.skipped && ['better','same','worse'].includes(entry.checkin.feelingChange) ? t.changeOptions[['better','same','worse'].indexOf(entry.checkin.feelingChange)+1] : t.noAnswer}</dd></div></dl>
    </section>}
    <dl className={styles.curriculum}>{values.map(([label, value, keys, labels]) => <div key={label}><dt>{label}</dt><dd>{keys.indexOf(value) > 0 ? labels[keys.indexOf(value)] : t.noAnswer}</dd></div>)}</dl>
    <p className={styles.small}>{entry.feedbackApplied ? t.feedbackWasApplied : t.feedbackWasNotApplied}</p>
    {reflection && <section><h5>{t.savedReflection}</h5><p className={styles.preserveText}>{reflection}</p></section>}
    {note && <section><h5>{t.savedNote}</h5><p className={styles.preserveText}>{note}</p></section>}
    {!reflection && !note && <p className={styles.small}>{t.noSavedText}</p>}
  </details>
}
function Lesson({ lesson, t, titleId, rows = [], lang = 'en' }) {
  const personal = lesson.contentLocale && lesson.curriculum?.objectiveId
  const contentLang = lesson.contentLocale || lang
  const reviewIds = lesson.reviewScaleIds?.length ? lesson.reviewScaleIds : (lesson.reviewGoals || []).map(goal => goal.scaleId)
  return <article className={styles.lesson} aria-labelledby={titleId} lang={lang} data-content-language={lesson.contentLocale || undefined}>
    <header>{lesson.contentLocale && <p className={styles.tag}>{t.contentLanguage}: {lesson.contentLocale.toUpperCase()}</p>}<h3 id={titleId} lang={contentLang}>{lesson.title}</h3><p className={styles.small}>{Math.max(1, Math.round((lesson.durationSeconds || 0) / 60))} {t.minutes}</p></header>
    {lesson.curriculum && <dl className={styles.curriculum}>
      {lesson.curriculum.weekGoal && <div><dt>{t.weeklyGoal}</dt><dd lang={contentLang}>{lesson.curriculum.weekGoal}</dd></div>}
      {lesson.curriculum.skill && <div><dt>{t.skill}</dt><dd lang={contentLang}>{lesson.curriculum.skill}</dd></div>}
      {lesson.curriculum.objective && <div><dt>{t.objective}</dt><dd lang={contentLang}>{lesson.curriculum.objective}</dd></div>}
      {lesson.curriculum.learningOutcome && <div><dt>{t.outcome}</dt><dd lang={contentLang}>{lesson.curriculum.learningOutcome}</dd></div>}
      {lesson.curriculum.recap && <div><dt>{t.recap}</dt><dd lang={contentLang}>{lesson.curriculum.recap}</dd></div>}
    </dl>}
    {!!reviewIds.length && <section data-personal-review-goals><h4>{t.reviewGoals}</h4><ul>{reviewIds.map(id => {
      const goal = lesson.reviewGoals?.find(item => item.scaleId === id)
      return <li key={id}><strong>{rows.find(row => row.id === id)?.label || goal?.identity?.dimensionKey || id}</strong>{goal && <MappingContext row={goal} lang={lang} t={t}/>}</li>
    })}</ul></section>}
    {personal && !reviewIds.length && <MappingContext row={lesson} lang={lang} t={t}/>}
    <p className={styles.notice}>{t.ownPace}</p>
    {lesson.sections?.map(section => <section key={section.kind} className={styles.lessonSection} lang={contentLang}><h4>{section.title}</h4><p>{section.text}</p></section>)}
    <section className={styles.thought}><h4>{t.thought}</h4><p lang={contentLang}>{lesson.aphorism}</p></section>
    {!lesson.sections?.some(section => section.kind === 'ritual' && section.text === lesson.ritual) && <section><h4>{t.action}</h4><p lang={contentLang}>{lesson.ritual}</p></section>}
    <section><h4>{t.reflection}</h4><p lang={contentLang}>{lesson.reflection}</p></section>
    {personal && <section className={styles.mappingContext}><SourceReference source={lesson.source} label={t.sourceMaterial}/><SourceReference source={lesson.frameReviewSource} label={t.frameSource}/><p className={styles.small}>{t.educationalLimits}</p></section>}
    {lesson.disclaimer && <p className={styles.small}>{lesson.disclaimer}</p>}
  </article>
}

function ScaleReading({ row, lang, t, explain = false, personal = false }) {
  const sourceUrl = typeof row.source === 'string' ? row.source : row.source?.url
  const sourceTitle = typeof row.source?.title === 'string' && row.source.title.trim() ? row.source.title : t.source
  return <>
    {row.testTitle && <p className={styles.small}>{row.testTitle}{row.definitionVersion ? ' · ' + row.definitionVersion : ''}</p>}
    <p className={styles.score}>{Number.isFinite(row.value) ? new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(row.value) : '—'} <small>{lang === 'ru' ? ({ points: 'баллы', 'weighted-points': 'взвешенные баллы' }[row.unit] || row.unit) : row.unit}</small></p>
    <p className={styles.small}>{t.range}: {row.min}–{row.max}{(row.timeframeLabel || row.timeframe) ? ' · ' + (row.timeframeLabel || row.timeframe) : ''}</p>
    <p className={styles.small}>{t.measured}: <time dateTime={row.measurementAt}>{formatDate(row.measurementAt, lang)}</time> · {t.instrumentLanguage}: {String(row.instrumentLocale || '—').toUpperCase()}</p>
    {explain && !personal && Number.isFinite(row.rawPosition) && <meter className={styles.meter} min={row.min} max={row.max} value={row.value} aria-label={row.label + ': ' + row.value + ', ' + t.range + ' ' + row.min + '–' + row.max}/>}
    <p>{row.meaning || (explain ? t.missingMeaning : t.originalMeaningUnavailable)}</p>
    {explain && !personal && <p className={styles.small}>{row.supportPosition == null ? t.notRanked : row.reason === 'less-reported-difficulty' ? t.lessDifficulty : t.moreSupport}</p>}
    {explain && !personal && !row.canChoosePractice && row.meaning && <p className={styles.small}>{t.noPractice}</p>}
    {personal && !row.canChoosePractice && <p className={styles.notice}>{practiceReason(row, t)}</p>}
    {personal && <MappingContext row={row} lang={lang} t={t}/>}
    <div className={styles.links}>{row.resultId && <Link href={'/' + lang + '/app/results/' + encodeURIComponent(row.resultId)}>{t.report}</Link>}{safeSource(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noreferrer">{sourceTitle}</a>}</div>
  </>
}

export default function CourseDaily21({ locale = 'en', onUnavailable, onCancel, onActivated }) {
  const lang = locale === 'ru' ? 'ru' : 'en', t = { ...WORDS[lang], ...PERSONAL_WORDS[lang] }, uid = useId()
  const [view, setView] = useState(null), [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(null)
  const [selected, setSelected] = useState([]), [consent, setConsent] = useState(false), [consentOpen, setConsentOpen] = useState(false)
  const [drafts, setDrafts] = useState({}), [preferenceDraft, setPreferenceDraft] = useState(null)
  const [personalDraft, setPersonalDraft] = useState({ loadMinutes: 5, weeklyAccents: {} })
  const [planEdit, setPlanEdit] = useState(null), [planEditorOpen, setPlanEditorOpen] = useState(false)
  const dayChoice = useRef(null)
  const [noteProposal, setNoteProposal] = useState(null)
  const [editCheckin, setEditCheckin] = useState(false), [skipConfirm, setSkipConfirm] = useState(false)
  const dialog = useRef(null), mounted = useRef(false), lock = useRef(false), sequence = useRef(0)
  const pending = useRef(null), current = useRef(null), unavailableNotified = useRef(false), alternative = useRef(false)
  const repeatOperations = useRef(new Map())
  const callbacks = useRef({ onUnavailable, onActivated })
  callbacks.current = { onUnavailable, onActivated }
  const endpoint = 'course-21?locale=' + lang

  function accept(next) {
    if (current.current?.course && (current.current.course.revision !== next.course?.revision || current.current.personalPlan?.revision !== next.personalPlan?.revision)) {
      setPlanEdit(previous => previous ? { ...previous, consent: false, profile: previous.contentLocale === lang ? next.profile : null } : null)
    }
    if (dayChoice.current && (dayChoice.current.day !== next.today?.day || dayChoice.current.planRevision !== next.personalPlan?.revision)) dayChoice.current = null
    current.current = next
    setView(next)
    if (next.available === false && !unavailableNotified.current) {
      unavailableNotified.current = true
      callbacks.current.onUnavailable?.()
    }
  }
  function dayChoiceQuery() {
    const option = dayChoice.current
    if (!option) return alternative.current ? '&alternative=true' : ''
    return (option.choice ? '&choice=' + encodeURIComponent(option.choice) : '') + (option.targetScaleId ? '&targetScaleId=' + encodeURIComponent(option.targetScaleId) : '') + (option.choice && option.choice !== 'rest' ? '&alternative=true' : '')
  }
  async function readSnapshot() {
    let next
    try { next = await appFetch(endpoint + dayChoiceQuery()) }
    catch (caught) {
      // A previously previewed goal may have been removed by another saved plan.
      if (!dayChoice.current || !['TARGET_NOT_IN_CONFIRMED_SELECTION','INVALID_DAY_CHOICE'].includes(caught.code || caught.message)) throw caught
      dayChoice.current = null
      next = await appFetch(endpoint)
    }
    const proposal = next.available && !next.course ? await appFetch('course-21/preview?locale=' + lang) : null
    return { next, proposal }
  }
  function acceptSnapshot({ next, proposal }) {
    accept(proposal?.available === false ? proposal : next)
    if (proposal?.activationToken !== preview?.activationToken) setConsent(false)
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
    setNoteProposal(null)
    setConsent(false)
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
    const preferenceTarget = action === 'preferences' && current.current?.personalPlan ? current.current.today?.targetScaleId ?? dayChoice.current?.targetScaleId ?? null : null
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
      if (['check-in','pause','resume'].includes(action)) { setEditCheckin(false); dayChoice.current = null }
      if(action==='check-in')setDrafts(previous=>{
        const currentDay=next.today?.day,entry={...previous[currentDay]}
        for(const field of ['wellbeing','energy','feelingChange','availableTime','rest','checkinLocalDate'])delete entry[field]
        return {...previous,[currentDay]:entry}
      })
      if (action === 'revise-plan') { setPlanEditorOpen(false); setPlanEdit(null); dayChoice.current = null; setNoteProposal(null) }
      if (action === 'preferences') {
        dayChoice.current = null; setPreferenceDraft(null); setNoteProposal(null); alternative.current = false
        // Keep the explicitly previewed goal while allowing the saved preferences
        // to choose its variant. This GET does not waive the ask-first setting.
        if (preferenceTarget && next.personalPlan?.selectedScaleIds?.includes(preferenceTarget) && next.today?.day === current.current?.today?.day) {
          dayChoice.current = { day: next.today.day, planRevision: next.personalPlan.revision, choice: null, targetScaleId: preferenceTarget }
          const targetView = await appFetch(endpoint + dayChoiceQuery())
          if (mounted.current && token === sequence.current) accept(targetView)
        }
      }
      if (action === 'finish-day') {
        setSkipConfirm(false)
        setEditCheckin(false)
        alternative.current = false
        dayChoice.current = null
        // Retain unsent written drafts locally, separated by learning day. Never use browser storage.
        setDrafts(previous => ({ ...previous, [values.day]: { ...previous[values.day],
          ...(values.savePrivateText ? { comment: '', reflectionAnswer: '' } : {}), savePrivateText: false, applyFeedback: false, goalObservations: [] } }))
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
          setNoteProposal(null)
          dayChoice.current = null
          if (action === 'revise-plan') setPlanEdit(previous => previous ? { ...previous, consent: false } : null)
          try {
            const fresh = await readSnapshot()
            if (mounted.current && token === sequence.current) {
              acceptSnapshot(fresh)
              if (action === 'revise-plan') setPlanEdit(previous => previous ? { ...previous, consent: false, profile: previous.contentLocale === lang ? fresh.next.profile : null } : null)
            }
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
      const next = await appFetch(endpoint + '&reviewDay=' + encodeURIComponent(day) + dayChoiceQuery())
      if (mounted.current && token === sequence.current) accept(next)
    } catch (caught) { if (mounted.current) setError(caught) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  async function repeatAssessment(form) {
    const allowed=current.current?.completion && current.current?.reassessment?.forms?.find(item=>item.definitionId===form?.definitionId&&item.repeatAvailable)
    if(lock.current||loading||!allowed)return false
    lock.current=true;setBusy(true);setError(null)
    if(!repeatOperations.current.has(allowed.definitionId))repeatOperations.current.set(allowed.definitionId,crypto.randomUUID())
    try{
      const run=await appFetch('runs',{definitionKey:allowed.definitionKey,definitionVersion:allowed.definitionVersion,instrumentLocale:allowed.instrumentLocale,operationId:repeatOperations.current.get(allowed.definitionId)})
      if(!/^[a-f0-9-]{36}$/i.test(run?.id||''))throw new Error('INVALID_RUN')
      repeatOperations.current.delete(allowed.definitionId)
      window.location.assign('/'+lang+'/app/runs/'+encodeURIComponent(run.id)+'?mode=quick')
      return true
    }catch(caught){if(mounted.current)setError(caught);return false}
    finally{lock.current=false;if(mounted.current)setBusy(false)}
  }

  const course = view?.course, today = view?.today, profile = preview?.profile || view?.profile
  const personal = preview?.personalization === PERSONAL_MODE || course?.personalization === PERSONAL_MODE || profile?.version === 'hh-personal-course-profile-v2'
  const rows = profile?.rows || [], priorityRows = (profile?.priorityScaleIds || []).map(id => rows.find(row => row.id === id)).filter(Boolean).slice(0, 7)
  const focusLabels = (today?.relatedScaleIds || []).map(id => rows.find(row => row.id === id)?.label).filter(Boolean)
  const selectedRows = selected.map(key => rows.find(row => scaleKey(row) === key))
  const staleSelections = selected.filter(key => !rows.some(row => scaleKey(row) === key && row.canChoosePractice))
  const minimum = profile?.minimumChoices ?? 3, maximum = Math.min(5, profile?.maximumChoices ?? 5)
  const selectionReady = profile?.status === 'ready-to-review' && selected.length >= minimum && selected.length <= maximum && selected.length > 0 && !staleSelections.length && Boolean(preview?.activationToken)
  const waiting = loading || busy, day = today?.day, savedCheckin = today?.checkin
  // Only the server's current-local-date check-in is a baseline. Dirty fields remain local.
  const localDraft = { ...drafts[day] }
  if(localDraft.checkinLocalDate !== today?.localDate)for(const key of ['wellbeing','energy','feelingChange','availableTime','rest'])delete localDraft[key]
  const draft = { ...EMPTY_DRAFT, ...(savedCheckin ? {
    wellbeing:savedCheckin.wellbeing??'',energy:savedCheckin.energy??'',feelingChange:savedCheckin.feelingChange??'',
    availableTime:savedCheckin.availableTime??'standard',rest:savedCheckin.pauseRequested===true,
  }:{}), ...localDraft }
  const goalAnswers = (Array.isArray(draft.goalObservations) ? draft.goalObservations : []).filter(answer => today?.goalObservationSnapshot?.rows?.some(row => row.seriesId === answer.seriesId && row.statementKey === answer.statementKey))
  const preferences = preferenceDraft || view?.preferences || { length: 'standard', alternativeRequested: false, stopOffer: false }
  const showCheckin = course?.status === 'active' && (today?.status === 'check-in-required' || (editCheckin && EDITABLE_DAYS.includes(today?.status)))
  const errorCode = error?.code || error?.message || ''
  const errorText = error?.status === 409 ? (error.refreshFailed ? t.conflictReload : t.conflict)
    : ['SIGN_IN_REQUIRED', 'RECENT_SIGN_IN_REQUIRED'].includes(errorCode) ? t.signin
      : errorCode === 'COURSE_NOT_STARTED' ? t.noCourse
        : errorCode === 'NEW_R3_PROFILE_REQUIRED' ? t.sourceChanged
          : /INVALID|CHOOSE_|CONSENT_REQUIRED/.test(errorCode) ? t.invalid : t.error
  const activeNoteProposal = noteProposal?.day === day && noteProposal?.locale === lang && noteProposal?.revision === course?.revision && noteProposal?.text === draft.comment && (!personal || (noteProposal.lessonId === today?.lesson?.id && noteProposal.targetScaleId === (today?.targetScaleId ?? null))) ? noteProposal : null
  const personalNote = personal ? personalNotePreferences(activeNoteProposal?.suggestion, view?.preferences, today) : null
  const noteAvailability = personal ? personalNote.availability : courseFeedbackAdjustmentAvailability(activeNoteProposal?.suggestion, view?.preferences, today?.lesson?.variant)
  function inspectNotePreference() {
    if (preferenceDraft) return
    setNoteProposal({ day, locale: lang, revision: course?.revision, lessonId: today?.lesson?.id, targetScaleId: today?.targetScaleId ?? null, text: draft.comment, suggestion: suggestCourseFeedbackAdjustment(draft.comment, lang) })
  }
  async function applyNotePreference() {
    if (!activeNoteProposal?.suggestion || preferenceDraft) return
    let next
    if (personal) {
      const checked = suggestCourseFeedbackAdjustment(draft.comment, lang)
      if (checked?.id !== activeNoteProposal.suggestion.id) return
      const proposed = personalNotePreferences(checked, view.preferences, today)
      if (proposed.availability !== 'available') return
      next = proposed.next
    } else next = confirmCourseFeedbackAdjustment({ text: draft.comment, locale: lang, suggestionId: activeNoteProposal.suggestion.id, confirmed: true, preferences: view.preferences, lessonVariant: today?.lesson?.variant })
    if (next) await command('preferences', next)
  }
  function updateDraft(key, value) {
    if (key === 'comment') setNoteProposal(null)
    setDrafts(previous => {
      const entry={...previous[day]},checkinFields=['wellbeing','energy','feelingChange','availableTime','rest']
      if(checkinFields.includes(key)){
        if(entry.checkinLocalDate!==today?.localDate)for(const field of checkinFields)delete entry[field]
        entry.checkinLocalDate=today?.localDate
      }
      return {...previous,[day]:{...entry,[key]:value}}
    })
  }
  function updateGoalAnswer(answer) {
    const saved = Array.isArray(draft.goalObservations) ? draft.goalObservations : []
    updateDraft('goalObservations', [...saved.filter(item => item.seriesId !== answer.seriesId), answer])
  }
  function updatePreference(key, value) { setNoteProposal(null); setPreferenceDraft({ ...preferences, [key]: value }) }
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
      applyFeedback: draft.applyFeedback, savePrivateText: draft.savePrivateText, confirmAlternative: today.lesson.variant === 'grounding' || (personal && Boolean(dayChoice.current)),
      ...(personal ? { expectedPlanRevision: view.personalPlan?.revision, choice: today.selectedChoice, targetScaleId: today.targetScaleId ?? null, goalObservations: goalAnswers } : {}) })
  }
  function openConsent() {
    if (waiting || !selectionReady) return
    setConsent(false)
    setConsentOpen(true)
  }
  const editProfile = planEdit?.profile, editRows = editProfile?.rows || []
  const editSelected = planEdit?.selected || [], editMinimum = editProfile?.minimumChoices ?? 3
  const editReady = editProfile?.status === 'ready-to-review' && editSelected.length >= editMinimum && editSelected.length > 0 && editSelected.length <= 5 && editSelected.every(key => editRows.some(row => scaleKey(row) === key && row.canChoosePractice))
  const currentGoalRows = (view?.personalPlan?.selectedScaleIds || []).map(id => rows.find(row => row.id === id)).filter(Boolean)
  const targetId = today?.targetScaleId || dayChoice.current?.targetScaleId || ''
  const reviewToday = today?.lesson?.review || today?.slot?.kind === 'review' || (day && day % 7 === 0)
  const keepAvailable = today?.availableChoices?.includes('keep'), shortAvailable = today?.availableChoices?.includes('short')
  const alternativeAvailable = today?.alternativeAvailable === true || today?.availableChoices?.includes('alternative')
  async function readPlanProfile(contentLocale) {
    if (lock.current || loading) return
    lock.current = true; setBusy(true); setError(null)
    const token = ++sequence.current
    try {
      const next = await appFetch('course-21?locale=' + contentLocale)
      if (mounted.current && token === sequence.current) setPlanEdit(previous => previous?.contentLocale === contentLocale ? { ...previous, profile: next.profile, consent: false } : previous)
    } catch (caught) { if (mounted.current && token === sequence.current) setError(caught) }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  function openPlanEditor() {
    if (waiting || !view.personalPlan) return
    const next = planEdit || { selected: [...(course.selectedR3ScaleKeys || currentGoalRows.map(scaleKey))], loadMinutes: view.personalPlan.loadMinutes,
      weeklyAccents: view.personalPlan.weeklyAccents || {}, contentLocale: view.personalPlan.contentLocale,
      profile: view.personalPlan.contentLocale === lang ? profile : null }
    setPlanEdit({ ...next, consent: false })
    setPlanEditorOpen(true)
    if (!next.profile) readPlanProfile(next.contentLocale)
  }
  function updatePlan(key, value) {
    setPlanEdit(previous => ({ ...previous, [key]: value, consent: false, ...(key === 'contentLocale' ? { profile: null } : {}) }))
    if (key === 'contentLocale') readPlanProfile(value)
  }
  function togglePlanScale(key) {
    updatePlan('selected', editSelected.includes(key) ? editSelected.filter(value => value !== key) : editSelected.length < 5 ? [...editSelected,key] : editSelected)
  }
  function revisePlan() {
    if (!editReady || !planEdit.consent) return
    return command('revise-plan', { expectedPlanRevision: view.personalPlan.revision, selectedR3ScaleKeys: editSelected,
      loadMinutes: planEdit.loadMinutes, weeklyAccents: normalizedAccents([...new Set(editSelected.map(key => editRows.find(row => scaleKey(row) === key)?.track).filter(Boolean))], planEdit.weeklyAccents),
      contentLocale: planEdit.contentLocale, consent: true })
  }
  async function previewDayChoice(choice, selectedTarget = targetId) {
    if (lock.current || loading || !personal || !EDITABLE_DAYS.includes(today?.status)) return false
    if (!['keep','short','alternative','rest'].includes(choice) || (choice === 'alternative' && !alternativeAvailable)) return false
    const targetScaleId = reviewToday ? null : selectedTarget || null
    if (targetScaleId && !view.personalPlan?.selectedScaleIds?.includes(targetScaleId)) return false
    lock.current = true; setBusy(true); setError(null)
    const token = ++sequence.current
    const option = { day: today.day, planRevision: view.personalPlan.revision, choice, targetScaleId }
    const query = '&choice=' + choice + (targetScaleId ? '&targetScaleId=' + encodeURIComponent(targetScaleId) : '') + (choice !== 'rest' ? '&alternative=true' : '')
    try {
      // appFetch always uses cache:no-store. This GET only previews prepared material.
      const next = await appFetch(endpoint + query)
      if (mounted.current && token === sequence.current) {
        accept(next)
        dayChoice.current = next.today?.day === option.day && next.personalPlan?.revision === option.planRevision ? option : null
      }
      return true
    } catch (caught) { if (mounted.current && token === sequence.current) setError(caught); return false }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
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
      <section className={styles.priority}><h4>{t.priorities}</h4><p className={styles.small}>{personal ? t.priorityHint : WORDS[lang].priorityHint}</p>
        {priorityRows.length ? <ol>{priorityRows.map(row => <li key={row.id}><a href={'#' + uid + '-scale-' + rows.indexOf(row)}>{row.label}</a></li>)}</ol> : <p>{personal ? t.noPriorities : WORDS[lang].noPriorities}</p>}
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
          <ScaleReading row={row} lang={lang} t={t} explain personal={personal}/>
        </article>)}
      </div>
      {!rows.length && <p>{t.noScales}</p>}
      {personal && <><p className={styles.small}>{t.educationalLimits}</p><PlanSettings rows={rows} selected={selected} value={personalDraft} t={t} disabled={waiting} onChange={(key,value) => { setConsent(false); setPersonalDraft(previous => ({ ...previous, [key]:value })) }}/></>}
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
        ...(personal ? { loadMinutes: personalDraft.loadMinutes, weeklyAccents: normalizedAccents([...new Set(selectedRows.filter(Boolean).map(row => row.track).filter(Boolean))], personalDraft.weeklyAccents) } : {}),
        consent: true, consentVersion: preview.consentVersion, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })}>{busy ? t.saving : t.agree}</button><button type="button" disabled={waiting} onClick={() => { setConsent(false); setConsentOpen(false) }}>{t.cancel}</button></div>
    </dialog>

    {course && today && <section className={styles.card} data-course-21-daily>
      <div className={styles.row}><h3>{day ? `${t.day} ${day} ${t.of} 21` : t.finished}</h3>{today.week && <span>{t.week} {today.week}/3</span>}</div>
      <progress className={styles.progress} max={21} value={today.completedDays || 0} aria-label={t.progress}/>
      <p>{today.completedDays || 0} {t.completed} · {today.skippedDays || 0} {t.skipped}</p>
      <p className={styles.small}>{t.progressHint} {t.pace}</p><p className={styles.small}>{t.timeZone}: {course.timeZone}</p>
      <details className={styles.details} data-course-21-initial-profile><summary>{t.initialProfile}</summary><p className={styles.small}>{t.initialProfileHint}</p>
        {rows.length ? <div className={styles.scaleGrid}>{rows.map(row => <article className={styles.scale} key={row.id}><h4>{row.label}</h4><ScaleReading row={row} lang={lang} t={t} personal={personal}/></article>)}</div> : <p>{t.noScales}</p>}
      </details>
      {personal && view.personalPlan && <section className={styles.personalPlan} data-personal-plan>
        <h4>{t.planSummary}</h4><p className={styles.small}>{t.planRevision}: {view.personalPlan.revision} · {t.loadMinutes}: {view.personalPlan.loadMinutes} {t.minutes} · {t.contentLanguage}: {view.personalPlan.contentLocale.toUpperCase()}</p>
        <p>{t.selectedGoals}: {currentGoalRows.map(row => row.label).join(', ')}</p><p className={styles.small}>{t.pinnedLanguage}</p>
        {today.status !== 'finished' && !planEditorOpen && <button type="button" disabled={waiting} onClick={openPlanEditor}>{t.editPlan}</button>}
        {planEditorOpen && planEdit && <section className={styles.planEditor} data-personal-plan-editor aria-label={t.editPlan}>
          <h4>{t.editPlan}</h4><p className={styles.notice}>{t.revisionHint}</p>
          <PlanSettings rows={editRows} selected={editSelected} value={planEdit} onChange={updatePlan} t={t} disabled={waiting} language/>
          {!editProfile && <p role="status">{t.planProfileLoading}</p>}
          {!editProfile && !waiting && <button type="button" onClick={() => readPlanProfile(planEdit.contentLocale)}>{t.retry}</button>}
          {editProfile && <><h5>{t.choose}</h5>{editMinimum < 3 && <p>{t.fewer}</p>}<p className={styles.small} aria-live="polite">{editSelected.length} {t.selected} · {t.min}: {editMinimum}, {t.max}: 5</p>
            <div className={styles.scaleGrid}>{editRows.map(row => <article key={row.id} className={styles.scale} data-selected={editSelected.includes(scaleKey(row))}>
              <label className={styles.check}><input type="checkbox" checked={editSelected.includes(scaleKey(row))} disabled={waiting || !row.canChoosePractice || (!editSelected.includes(scaleKey(row)) && editSelected.length >= 5)} onChange={() => togglePlanScale(scaleKey(row))}/><strong>{row.label}</strong></label>
              <ScaleReading row={row} lang={lang} t={t} personal/>
            </article>)}</div>
            {editSelected.filter(key => !editRows.some(row => scaleKey(row) === key && row.canChoosePractice)).map(key => <button type="button" key={key} disabled={waiting} onClick={() => togglePlanScale(key)}>{t.remove}: {key}</button>)}
          </>}
          <label className={styles.check}><input type="checkbox" checked={planEdit.consent === true} disabled={waiting || !editReady} onChange={event => setPlanEdit(previous => ({ ...previous, consent: event.target.checked }))}/><span>{t.revisionConsent}</span></label>
          <div className={styles.actions}><button type="button" className={styles.primary} disabled={waiting || !editReady || !planEdit.consent} onClick={revisePlan}>{t.saveRevision}</button><button type="button" disabled={waiting} onClick={() => { setPlanEditorOpen(false); setPlanEdit(previous => ({ ...previous, consent: false })) }}>{t.cancelRevision}</button></div>
        </section>}
      </section>}
      <div className={styles.actions}>{today.status !== 'finished' && <button type="button" disabled={waiting} onClick={() => command(today.status === 'paused' ? 'resume' : 'pause')}>{today.status === 'paused' ? t.resume : t.pause}</button>}
        <button type="button" disabled={waiting} onClick={refresh}>{t.refresh}</button></div>
      {['paused', 'finished', 'next-local-day', 'rest-chosen'].includes(today.status) && <p className={styles.notice} role="status">{today.status === 'paused' ? t.paused : today.status === 'finished' ? t.finishHint : today.status === 'next-local-day' ? t.tomorrow : t.rest}</p>}
      {view.completion && <CourseCompletion21 locale={lang} completion={view.completion} reassessment={view.reassessment} busy={waiting}
        onSavePlan={values=>command('continuation',values)} onReviewDay={reviewDay} onRetest={repeatAssessment}/>}
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
        <Select label={t.length} value={preferences.length} onChange={value => updatePreference('length', value)} options={['quick', 'standard']} labels={[t.quick, personal ? t.personalPreferenceStandard : t.standard]} disabled={waiting}/>
        {personal && <p className={styles.small}>{t.personalPreferenceHint}</p>}
        <label className={styles.check}><input type="checkbox" checked={preferences.alternativeRequested} disabled={waiting || (personal && !preferences.alternativeRequested && !alternativeAvailable)} onChange={event => updatePreference('alternativeRequested', event.target.checked)}/><span>{personal ? t.personalAlternative : t.grounding}</span></label>
        <label className={styles.check}><input type="checkbox" checked={preferences.stopOffer} disabled={waiting} onChange={event => updatePreference('stopOffer', event.target.checked)}/><span>{t.stopOffer}</span></label>
        <button type="button" disabled={waiting || !preferenceDraft} onClick={() => command('preferences', preferences)}>{t.savePreferences}</button>{preferenceDraft && <button type="button" disabled={waiting} onClick={() => { setPreferenceDraft(null); setNoteProposal(null) }}>{t.notePreferenceDiscard}</button>}
      </details>}
      {!personal && today.status === 'choose-comfortable-option' && <section className={styles.notice}><h4>{t.alternative}</h4><p>{t.alternativeHint}</p>
        <button type="button" disabled={waiting} onClick={() => command('preferences', { length: 'quick', alternativeRequested: true, stopOffer: true }, { showAlternative: true })}>{t.viewGrounding}</button></section>}
      {personal && EDITABLE_DAYS.includes(today.status) && !showCheckin && <section className={styles.dayOptions} data-personal-day-options>
        <h4>{t.dayOptions}</h4><p className={styles.small}>{t.dayOptionsHint}</p>
        {today.status === 'choose-comfortable-option' && <p>{t.personalAlternativeHint}</p>}
        {!reviewToday && <Select label={t.dayTarget} value={targetId} onChange={id => previewDayChoice(today.selectedChoice === 'short' || today.selectedChoice === 'alternative' ? 'short' : dayChoice.current?.choice === 'rest' ? 'rest' : 'keep', id)} options={['',...currentGoalRows.map(row => row.id)]} labels={[t.plannedGoal,...currentGoalRows.map(row => row.label)]} disabled={waiting}/>}
        <div className={styles.actions}>{keepAvailable && <button type="button" disabled={waiting} onClick={() => previewDayChoice('keep')}>{t.keepChoice}</button>}{shortAvailable && <button type="button" disabled={waiting} onClick={() => previewDayChoice('short')}>{t.shortChoice}</button>}
          {alternativeAvailable && <button type="button" disabled={waiting} onClick={() => previewDayChoice('alternative')}>{t.alternativeChoice}</button>}
          <button type="button" disabled={waiting} onClick={() => previewDayChoice('rest')}>{t.restChoicePreview}</button>
        </div>{!alternativeAvailable && (today.alternativeAvailable === false || Array.isArray(today.availableChoices)) && <p className={styles.small}>{t.noAlternative}</p>}
      </section>}
      {['material-unavailable', 'alternative-unavailable'].includes(today.status) && <p className={styles.notice} role="status">{t.material}</p>}
      {today.lesson && !showCheckin && <>
        {!!focusLabels.length && <p className={styles.small}>{t.todayFocus}: {focusLabels.join(', ')}</p>}
        <Lesson lesson={today.lesson} t={t} titleId={uid + '-lesson'} rows={rows} lang={lang}/>
        {personal && today.goalObservationSnapshot && <GoalObservationFields snapshot={today.goalObservationSnapshot} answers={goalAnswers} onChange={updateGoalAnswer} disabled={waiting} locale={lang}/>}
        <fieldset className={styles.feedback} disabled={waiting}><legend>{t.feedback}</legend>
          <div className={styles.formGrid}>
            <Select label={t.helpfulness} value={draft.helpfulness} onChange={value => updateDraft('helpfulness', value)} options={['', 'helpful', 'neutral', 'not-helpful']} labels={t.helpOptions} disabled={waiting}/>
            <Select label={t.difficulty} value={draft.difficulty} onChange={value => updateDraft('difficulty', value)} options={['', 'manageable', 'too-hard']} labels={t.difficultyOptions} disabled={waiting}/>
            <Select label={t.comfort} value={draft.comfort} onChange={value => updateDraft('comfort', value)} options={['', 'comfortable', 'neutral', 'uncomfortable']} labels={t.comfortOptions} disabled={waiting}/>
          </div>
          <label className={styles.field}><span>{t.reflectionAnswer} · {t.optional}</span><textarea rows={3} maxLength={1000} value={draft.reflectionAnswer} onChange={event => updateDraft('reflectionAnswer', event.target.value)} aria-describedby={uid + '-text-privacy'}/></label>
          <label className={styles.field}><span>{t.comment} · {t.optional}</span><textarea rows={3} maxLength={1000} value={draft.comment} onChange={event => updateDraft('comment', event.target.value)} aria-describedby={uid + '-text-privacy'}/></label>
          <div className={styles.notice} data-course-note-adjustment>
            <p className={styles.small}>{t.noteAdjustmentHint}</p><p className={styles.small}>{t.noteAdjustmentExample}</p>
            <button type="button" disabled={waiting || Boolean(preferenceDraft) || !draft.comment.trim()} onClick={inspectNotePreference}>{t.noteAdjustment}</button>{preferenceDraft && <p className={styles.small}>{t.notePreferenceDirty}</p>}
            {activeNoteProposal && <div role="status">{activeNoteProposal.suggestion && noteAvailability !== 'available' ? <p>{personal && noteAvailability === 'unavailable' ? t.personalNoteUnavailable : noteAvailability === 'same-alternative' ? t.noteSameAlternative : t.noteAlreadyApplied}</p> : activeNoteProposal.suggestion ? <>
              <p><strong>{personal ? t.personalNoteLabels[activeNoteProposal.suggestion.id] : activeNoteProposal.suggestion.label}</strong></p><p className={styles.small}>{t.noteAdjustmentScope}</p>
              {personal && personalNote.patch && <section><h5>{t.personalNoteChanges}</h5><ul>{Object.entries(personalNote.patch).filter(([key,value]) => value !== view.preferences[key]).map(([key,value]) => <li key={key}>{key === 'length' ? t.length : key === 'alternativeRequested' ? t.personalAlternative : t.stopOffer}: {key === 'length' ? value === 'quick' ? t.quick : t.personalPreferenceStandard : value ? t.enabled : t.disabled}</li>)}</ul></section>}
              {!personal && today.lesson.variant !== 'standard' && <p className={styles.small}>{activeNoteProposal.suggestion.id === 'pause-or-external-attention' ? t.noteExistingGrounding : t.noteAlreadyShort}</p>}
              <div className={styles.actions}><button type="button" disabled={waiting} onClick={applyNotePreference}>{t.noteAdjustmentConfirm}</button><button type="button" disabled={waiting} onClick={() => setNoteProposal(null)}>{t.noteAdjustmentCancel}</button></div>
            </> : <p>{t.noteAdjustmentNone}</p>}</div>}
          </div>
          <label className={styles.check}><input type="checkbox" checked={draft.savePrivateText} onChange={event => updateDraft('savePrivateText', event.target.checked)}/><span>{t.saveText}</span></label>
          <p id={uid + '-text-privacy'} className={styles.small}>{t.textHint}</p>
          <label className={styles.check}><input type="checkbox" checked={draft.applyFeedback} onChange={event => updateDraft('applyFeedback', event.target.checked)}/><span>{t.applyFeedback}</span></label><p className={styles.small}>{personal ? t.personalApplyHint : t.applyHint}</p>
        </fieldset>
        <button type="button" className={styles.primary} disabled={waiting} onClick={finishDay}>{busy ? t.saving : t.finish}</button>
      </>}
      {EDITABLE_DAYS.includes(today.status) && !showCheckin && <div className={styles.skip}>
        {!skipConfirm ? <button type="button" disabled={waiting} onClick={() => setSkipConfirm(true)}>{t.skipDay}</button> : <><p>{t.skipConfirm}</p><div className={styles.actions}><button type="button" disabled={waiting} onClick={() => command('finish-day', { day: today.day, lessonId: null, status: 'skipped', ...(personal ? { expectedPlanRevision: view.personalPlan?.revision } : {}), feedback: {}, applyFeedback: false, savePrivateText: false, confirmAlternative: false })}>{t.skipDay}</button><button type="button" disabled={waiting} onClick={() => setSkipConfirm(false)}>{t.cancel}</button></div></>}
      </div>}
      {personal && <CourseGoalWeeklyReports reports={view.weeklyReports || []} locale={lang}/>}
      {!!view.history?.length && <section className={styles.history}><h4>{t.history}</h4><ol>{view.history.map(entry => <li key={entry.day}><span>{t.day} {entry.day} · {entry.status === 'completed' ? t.completed : t.skipped}</span><button type="button" disabled={waiting} onClick={() => reviewDay(entry.day)} aria-label={t.reviewDay + ' ' + entry.day}>{t.reviewDay} {entry.day}</button><SavedObservations entry={entry} t={t} locale={lang}/></li>)}</ol></section>}
      {view.reviewLesson && <section className={styles.review} data-course-21-review><div className={styles.row}><p className={styles.small}>{t.repeatNote}</p><button type="button" disabled={waiting} onClick={() => accept({ ...current.current, reviewLesson: null })}>{t.closeReview}</button></div>
        {view.reviewLesson.status === 'ready' && view.reviewLesson.lesson ? <Lesson lesson={view.reviewLesson.lesson} t={t} titleId={uid + '-review-lesson'} rows={rows} lang={lang}/> : <p role="status">{t.material}</p>}
      </section>}
      {!!historicalDrafts.length && <details className={styles.details}><summary>{t.draftNotes}</summary><p className={styles.small}>{t.draftHint}</p>{historicalDrafts.map(([draftDay, entry]) => <section key={draftDay}><h4>{t.day} {draftDay}</h4>{entry.reflectionAnswer && <p className={styles.preserveText}>{entry.reflectionAnswer}</p>}{entry.comment && <p className={styles.preserveText}>{entry.comment}</p>}</section>)}</details>}
    </section>}
    {!!view?.outline?.weeks?.length && <details className={styles.details}><summary>{t.outline}</summary>{!['personal','personal-exact'].includes(view.outline.mode) && <p className={styles.small}>{t.outlineOverview}</p>}{view.outline.weeks.map(week => <section key={week.week}><h3>{t.week} {week.week}: {week.title}</h3><p>{week.goal}</p>{['personal','personal-exact'].includes(view.outline.mode) && <ol start={(week.week - 1) * 7 + 1}>{week.days.map(entry => <li key={entry.day}><strong>{entry.skill}</strong>{entry.learningOutcome && <p className={styles.small}>{entry.learningOutcome}</p>}</li>)}</ol>}</section>)}</details>}
    <p className={styles.safety}>{t.safe}</p>
  </section>
  )
}
