'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookmarkCheck, Check, CheckCircle2, ChevronDown,
  CircleHelp, Cloud, Clock3, Compass, Crown, Heart, Leaf, LockKeyhole, Moon, ShieldCheck,
  SkipForward, Sparkles, Star, Sun, Target, Trophy, Waves, X,
} from 'lucide-react'
import CourseGuidedTimer from './course-guided-timer'
import CoursePracticeVoice from './course-practice-voice'
import AntiStressMethodActivity from './anti-stress-method-activity'
import DayOneExercise, { DayOneChoices, DayOneFocusPicker } from './anti-stress-day-one'
import AntiStressPracticeLab from './anti-stress-practice-lab'
import OporaModuleActivity from './opora-module-activity'
import CourseLessonResult from './course-lesson-result'
import OporaStateJourney from './opora-state-journey'
import { DAY_ONE_SLIDES, dayOneAphorism, validateDayOneAnswers } from '@/lib/inner-growth/anti-stress-day-one'
import {validateOporaStateJourney} from '@/lib/inner-growth/opora-state-journey'
import { compareLessonMoments, changeAmount } from '@/lib/inner-growth/course-moment-trends'
import { practiceAdjustmentSuggestion } from '@/lib/inner-growth/course-adaptation'
import { withFinalFreeOffer, buildCourseSlides } from '@/lib/inner-growth/course-slide-sequence'
import { OPORA_SKILL_SLIDE_MODEL, oporaSkillCards } from '@/lib/inner-growth/anti-stress-skills-v5'
import { welcomeFeelingChoices, welcomeFeelingSupport } from '@/lib/inner-growth/course-welcome'
import {traumaPhaseCheckpoints} from '@/lib/inner-growth/trauma-phase-catalog'
import styles from './course-slide-player.module.css'

// Gentle hints are optional, never scored and never required to advance.
const GENTLE_TIPS={
  en:{
    recall:'If nothing comes to mind, simply notice one ordinary thing around you.',
    guided:'Keep your eyes open and choose a shorter version if that feels better.',
    ritual:'Try just one small part of the practice, or read it for now.',
    transfer:'Imagine one possible next step; you do not have to do it today.',
    symbol:'You can use one ordinary word instead of picturing an image.',
    reflection:'If words are difficult, notice one simple detail or continue.',
    fallback:'Look at one ordinary object nearby if the exercise feels difficult.',
  },
  ru:{
    recall:'Если ничего не вспоминается, посмотрите на один обычный предмет вокруг.',
    guided:'Можно оставить глаза открытыми и выбрать более короткий вариант.',
    ritual:'Попробуйте только небольшую часть практики или просто прочитайте её.',
    transfer:'Представьте один возможный шаг — делать его сегодня необязательно.',
    symbol:'Можно выбрать одно простое слово вместо мысленного образа.',
    reflection:'Если трудно подобрать слова, заметьте одну деталь или продолжите.',
    fallback:'Если упражнение трудно, посмотрите на обычный предмет рядом.',
  },
  es:{
    recall:'Si no recuerdas nada, mira un objeto normal a tu alrededor.',
    guided:'Puedes mantener los ojos abiertos y elegir una versión más corta.',
    ritual:'Prueba solo una parte pequeña o lee la práctica por ahora.',
    transfer:'Imagina un paso posible; no tienes que hacerlo hoy.',
    symbol:'Puedes usar una palabra sencilla en lugar de una imagen.',
    reflection:'Si no encuentras palabras, observa un detalle o continúa.',
    fallback:'Si es difícil, mira un objeto normal que tengas cerca.',
  },
}
const GENTLE_EXERCISE_SLIDES=new Set(['recall','guided','ritual','transfer','symbol','reflection'])

const WORDS = {
  en: {
    day: 'Day', step: 'Step', of: 'of', close: 'Return to my course',
    welcome: 'How are you feeling today?',
    welcomePrompt: 'What feels closest to your experience right now?',
    welcomeNote: 'A gentle momentary check-in, not a test. Your answer will not change your course or test results.',
    welcomeSkip: 'I would rather not answer',
    understand: 'One idea at a time', adjustPace: 'Change my practice style',
    baseline: 'Notice your state at the start', baselineQuestion: 'How strongly do you feel the quality or state at the heart of today’s lesson right now?',
    baselineResourceQuestion: 'How much inner resource and support do you feel right now?',
    baselineLow: '0 · Not at all', baselineHigh: '10 · Fully present',
    momentQuestion: 'And how difficult does the same focus feel right now, after the practice?',
    focusForToday: 'Focus of the day', pairTitle: 'Your before & after',
    easierResult: 'points less difficult after the practice', harderResult: 'points more difficult after the practice',
    sameResult: 'The feeling stayed the same for now', noPair: 'You can finish without ratings; there is no score to compare.',
    next: 'Continue', back: 'Back', skip: 'Skip this step', saveNext: 'Save & continue',
    save: 'Save today’s practice', saveError: 'Saving did not work. Nothing was marked complete. Please try again.',
    saved: 'Your observation was saved privately.', retry: 'Try again',
    checkin: 'Choose your practice pace', checkinDifficultyTitle: 'How strong was your concern?', checkinQuestion: 'Over the last 24 hours, how strongly did this concern bother you?',
    ratingHint: 'There is no correct number. This voluntary self-rating is not a clinical test.',
    low: '0 · No concern', high: '10 · Very strong concern', skipRating: 'Skip this check-in',
    idea: 'A thought to take with you', ideaLabel: 'Today’s thought',
    recall: 'Remember a familiar skill', recallHint: 'Try recalling it without pressure, or simply continue.',
    phrase: 'A more flexible thought', phraseHint: 'This is a possible phrase, not something you must believe.',
    guided: 'A moment of practice', gentle: 'Eyes can remain open; breathe naturally. Pause or skip anything uncomfortable.',
    arrivalTitle: 'A gentle minute of grounding',
    arrivalKicker: 'GUIDED EXERCISE · ABOUT 1 MINUTE',
    arrivalFocus: 'Today’s focus',
    arrivalSteps: [
      'Find a comfortable position. Eyes may stay open.',
      'Notice one colour, one sound and the support beneath you.',
      'Observe how you feel right now. Nothing needs to change.',
    ],
    arrivalAudioLead: 'Take a gentle pause. You can keep your eyes open and let your breathing happen naturally. Today’s focus is',
    arrivalAudioBody: 'Notice one colour around you. Notice one sound. If comfortable, feel the surface supporting you. Notice what is present for you now, without having to change anything. You can stop or continue in your own time.',
    fullInstructions: 'Read the full instructions',
    short: 'Short', standard: 'Standard', noImagery: 'No imagery', optionalTimer: 'Optional timer',
    ritual: 'One gentle support', transfer: 'If you feel ready', transferHint: 'Choose a safe, very small action. No challenge is required.',
    symbol: 'A resource image', words: 'Plain words', imagery: 'Optional image', symbolHint: 'A metaphor for reflection, never diagnosis or treatment.',
    reflection: 'One thought worth keeping', reflectionHint: 'One sentence is enough. You can leave this empty.',
    note: 'My private reflection', feedback: 'How was the practice for you?', feedbackHint: 'Any honest response is welcome.',
    helped: 'Helpful', neutral: 'Neutral', uncomfortable: 'Uncomfortable', preferNot: 'Prefer not to say',
    choiceTitle: 'Choose a suitable approach', cbtChoice: 'Check the thought', actChoice: 'Notice the thought', neutralChoice: 'Return to your surroundings',
    cbtText: 'What supports this thought? What else could be true? Find a believable alternative without forcing positivity.',
    actText: 'I notice I am having this thought. I do not have to argue with it or follow it now.',
    neutralText: 'Notice the colour or shape of a neutral object. You do not need to work with your thoughts.',
    discomfortTitle: 'You may stop the exercise',
    discomfortIntro: 'You do not need to push through discomfort. No specialist monitors this lesson or journal in real time.',
    discomfortNeutral: 'Choose a neutral practice', discomfortExit: 'Stop and return',
    discomfortHelp: 'Find a human helpline', discomfortEmergency: 'If there is immediate danger, contact your local emergency services.',
    neutralPractice: 'Keep your eyes open and notice two ordinary shapes or colours in the room. You can sense support beneath you if comfortable. Breathe naturally and stop at any time.',
    moment: 'Your practice observations', momentHint: 'The two ratings were offered directly around the guided practice. No answer is required.',
    momentNoPair: 'There is no completed practice pair to compare. That is okay.',
    practicePrePrompt: 'Just before this exercise: how difficult does today’s focus feel?',
    practicePostPrompt: 'Immediately after this exercise: how difficult does the same focus feel?',
    comfortTitle: 'How comfortable was this practice?', usefulTitle: 'Did you notice any subjective benefit?',
    flexibilityTitle: 'Could you choose a little more freely, even if your feeling stayed?',
    comfortableChoice: 'Comfortable', neutralComfort: 'Neutral or manageable',
    usefulChoice: 'Useful for me', unchangedChoice: 'No clear benefit', unsureChoice: 'Not sure',
    moreChoice: 'A little more freedom', sameChoice: 'About the same',
    transferStageTitle: 'What kind of experience did you choose?', transferPlan: 'Made only a plan',
    transferImagined: 'Imagined a safe situation', transferPhrase: 'Prepared a phrase',
    transferReal: 'Tried a safe real-world step', transferSkip: 'No action today',
    transferPlanLabel: 'My optional plan for day 10', lastPlanTitle: 'My saved day 6 experience',
    noSavedPlan: 'No day 6 plan was saved; you can continue without one.',
    adaptationTitle: 'Choose for future practices (optional)',
    adaptationHint: 'A possible adjustment, not a prescription:',
    adaptationKeep: 'Keep the approach', adaptationSimplify: 'Try a shorter practice',
    adaptationNeutral: 'Choose a neutral version',
    before: 'Just before the practice', after: 'Just after the practice', none: 'Not rated',
    finish: 'Finish and save', finished: 'Congratulations! You completed today’s lesson.',
    courseFinished: 'Congratulations! You completed your 14-day course!',
    finishAllSlides: 'Continue through every slide before completing today’s lesson.',
    completed: 'Practice saved', celebration: 'You took time to practise. That counts.',
    earned: '+20 XP', xpNote: 'XP represents saved participation, not symptoms or “right answers”.',
    seeMap: 'Back to my learning path', replay: 'Read the lesson again', private: 'Private to your account',
    safety: 'Self-guided learning, not a diagnosis or monitored clinical care.',
    pictureCredit: 'An invitation to slow down', todaySkill: 'My focus for today',
    needSave: 'Saved only when the server confirms your lesson.',
    noLesson: 'This part is optional. You can continue whenever you wish.',
    nextDayNotice: 'One new lesson per day. Tomorrow brings a new skill step.',
    retestInvitation: 'Day 14: repeat the same baseline tests when the rules allow it and compare wellbeing.',
    retestButton: 'Compare my starting tests',
    celebrationLabel: 'Lesson completed', rewardIntro: 'You showed up for yourself today.',
    rewardMeaning: 'XP rewards saved practice, not how you feel or your scores.',
    rewardTotal: 'Total XP', rewardStreak: 'Practice streak', rewardStreakUnit: 'days',
    rewardPath: 'My 14-lesson journey', rewardPathNote: 'Tomorrow, or whenever you return, your next lesson will be waiting.',
    promoBrand: 'ADVANCED MEMBERSHIP',
    promoTitle: 'Grow in five directions', promoText: 'With Advanced you can run up to five courses in parallel, without advertising.',
    promoPrice: 'First month €10 (−50%), then €20/month', promoCta: 'See membership options',
    promoSoon: 'Checkout is not active yet. Your free course stays available.',
    promoDisclaimer: 'Optional offer for new subscribers. Completing the course never requires payment.',
  },
  ru: {
    day: 'День', step: 'Шаг', of: 'из', close: 'Вернуться к моему курсу',
    welcome: 'Как вы себя чувствуете сегодня?',
    welcomePrompt: 'Какое описание сейчас вам ближе?',
    welcomeNote: 'Мягкий вопрос о состоянии сейчас, а не тест. Ответ не изменяет курс или результаты тестов.',
    welcomeSkip: 'Предпочитаю не отвечать',
    understand: 'Одна идея за раз', adjustPace: 'Изменить формат практики',
    baseline: 'Заметьте состояние перед практикой', baselineQuestion: 'Насколько вы сейчас ощущаете в себе качество или состояние, которому посвящён урок?',
    baselineResourceQuestion: 'Насколько вы сейчас ощущаете в себе ресурс и внутреннюю опору?',
    baselineLow: '0 · Совсем не ощущаю', baselineHigh: '10 · Ощущаю в полной мере',
    momentQuestion: 'Насколько трудно даётся эта же тема сейчас, сразу после практики?',
    focusForToday: 'Тема дня', pairTitle: 'Ваш результат: до и после',
    easierResult: 'меньше трудности после занятия', harderResult: 'больше трудности после занятия',
    sameResult: 'Ощущение пока не изменилось', noPair: 'Можно завершить без оценок — сравнение не рассчитывается.',
    next: 'Продолжить', back: 'Назад', skip: 'Пропустить шаг', saveNext: 'Сохранить и продолжить',
    save: 'Сохранить практику дня', saveError: 'Не получилось сохранить. Ничего не отмечено выполненным. Попробуйте ещё раз.',
    saved: 'Наблюдение сохранено приватно.', retry: 'Повторить',
    checkin: 'Выберите темп практики', checkinDifficultyTitle: 'Насколько сильным было беспокойство?', checkinQuestion: 'Оцените силу беспокойства за последние 24 часа.',
    ratingHint: 'Правильных чисел нет. Это добровольная самооценка, не клинический тест.',
    low: '0 · Не беспокоило', high: '10 · Очень сильно', skipRating: 'Пропустить замер',
    idea: 'Мысль, которую можно взять с собой', ideaLabel: 'Мысль дня',
    recall: 'Вспомните знакомый навык', recallHint: 'Попробуйте вспомнить без напряжения — или просто продолжайте.',
    phrase: 'Более гибкая мысль', phraseHint: 'Это возможная формулировка. Не обязательно верить в неё.',
    guided: 'Момент практики', gentle: 'Можно не закрывать глаза и не менять дыхание. Неудобный шаг пропускайте.',
    arrivalTitle: 'Минута мягкой опоры',
    arrivalKicker: 'ПРАКТИЧЕСКОЕ УПРАЖНЕНИЕ · ОКОЛО 1 МИНУТЫ',
    arrivalFocus: 'Тема сегодняшнего занятия',
    arrivalSteps: [
      'Устройтесь удобно. Глаза можно оставить открытыми.',
      'Заметьте один цвет, один звук и опору под собой.',
      'Понаблюдайте за состоянием. Менять ничего не требуется.',
    ],
    arrivalAudioLead: 'Сделайте небольшую паузу. Глаза можно оставить открытыми, а дыхание — естественным. Сегодня наша тема',
    arrivalAudioBody: 'Заметьте один цвет вокруг. Заметьте один звук. Если комфортно, почувствуйте поверхность, на которую опираетесь. Отметьте, как вы себя сейчас ощущаете. Ничего не нужно исправлять. Вы можете закончить или продолжить в своём ритме.',
    fullInstructions: 'Прочитать полную инструкцию',
    short: 'Короткая', standard: 'Обычная', noImagery: 'Без образов', optionalTimer: 'Таймер — по желанию',
    ritual: 'Небольшая опора', transfer: 'Если появится готовность',
    transferHint: 'Самочувствие и опора первичны. Действие необязательно, отдых тоже подходит.',
    symbol: 'Образ ресурса', words: 'Простыми словами', imagery: 'Через образ',
    symbolHint: 'Это метафора для размышления, а не диагностика или лечение.',
    reflection: 'Одна мысль на память', reflectionHint: 'Достаточно одного предложения. Можно оставить пустым.',
    note: 'Моя личная заметка', feedback: 'Как вам было во время практики?',
    feedbackHint: 'Любой честный ответ подходит.',
    helped: 'Помогло', neutral: 'Нейтрально', uncomfortable: 'Было некомфортно', preferNot: 'Не хочу отвечать',
    choiceTitle: 'Выберите подходящий способ', cbtChoice: 'Проверить мысль', actChoice: 'Заметить мысль', neutralChoice: 'Вернуться к окружающему',
    cbtText: 'Что подтверждает мысль? Что ещё может быть верно? Можно найти правдоподобный взгляд без принудительного оптимизма.',
    actText: 'Я замечаю, что появилась такая мысль. Не обязательно спорить с ней или следовать ей.',
    neutralText: 'Заметьте цвет или форму нейтрального предмета. Работать с мыслью не обязательно.',
    discomfortTitle: 'Вы можете остановить упражнение',
    discomfortIntro: 'Не нужно заставлять себя продолжать. Специалист не наблюдает за уроком или дневником в реальном времени.',
    discomfortNeutral: 'Нейтральная практика', discomfortExit: 'Остановить и вернуться',
    discomfortHelp: 'Найти помощь человека', discomfortEmergency: 'Если есть непосредственная опасность, обратитесь в местные экстренные службы.',
    neutralPractice: 'Оставляя глаза открытыми, заметьте два цвета или формы в комнате. Если комфортно, почувствуйте опору под собой. Дышите естественно. Можно остановиться.',
    moment: 'Наблюдение после практики', momentHint: 'Две необязательные оценки предлагались непосредственно до и после упражнения.',
    momentNoPair: 'Полной пары оценок нет. Это нормально.',
    practicePrePrompt: 'Прямо перед упражнением: насколько трудно ощущается сегодняшняя тема?',
    practicePostPrompt: 'Сразу после упражнения: насколько трудно ощущается та же тема?',
    comfortTitle: 'Насколько комфортной была практика?', usefulTitle: 'Заметили ли вы субъективную пользу?',
    flexibilityTitle: 'Стало ли выбирать немного свободнее, даже если чувство осталось?',
    comfortableChoice: 'Комфортно', neutralComfort: 'Нейтрально или терпимо',
    usefulChoice: 'Было полезно', unchangedChoice: 'Явной пользы не заметил(а)', unsureChoice: 'Не уверен(а)',
    moreChoice: 'Немного больше свободы', sameChoice: 'Примерно так же',
    transferStageTitle: 'Какой опыт вы выбрали?', transferPlan: 'Только составил(а) план',
    transferImagined: 'Мысленно представил(а) безопасную ситуацию', transferPhrase: 'Подготовил(а) фразу',
    transferReal: 'Попробовал(а) в безопасной жизни', transferSkip: 'Без действия сегодня',
    transferPlanLabel: 'Мой необязательный план для урока 10', lastPlanTitle: 'Сохранённый опыт из урока 6',
    noSavedPlan: 'В уроке 6 план не был сохранён. Можно продолжать и без него.',
    adaptationTitle: 'Выбор для следующих занятий (необязательно)',
    adaptationHint: 'Возможный вариант, а не назначение:',
    adaptationKeep: 'Оставить как есть', adaptationSimplify: 'Упростить практику',
    adaptationNeutral: 'Перейти на нейтральный вариант',
    before: 'Непосредственно перед практикой', after: 'Непосредственно после практики', none: 'Нет оценки',
    finish: 'Завершить и сохранить', finished: 'Поздравляем! Урок дня завершён.',
    courseFinished: 'Поздравляем! Вы завершили весь 14-дневный курс!',
    finishAllSlides: 'Чтобы завершить урок дня, пройдите все слайды до конца.',
    completed: 'Практика сохранена', celebration: 'Вы нашли время для себя. Это уже важный шаг.',
    earned: '+20 XP', xpNote: 'XP — за сохранённую практику, не за симптомы или «правильные» ответы.',
    seeMap: 'Вернуться к карте курса', replay: 'Перечитать занятие', private: 'Приватно в вашем кабинете',
    safety: 'Самостоятельное обучение, не диагноз и не медицинское наблюдение.',
    pictureCredit: 'Время для небольшой паузы', todaySkill: 'Мой навык сегодня',
    needSave: 'Практика отмечается завершённой только после подтверждения сервера.',
    noLesson: 'Этот шаг необязателен. Можно продолжать в своём темпе.',
    nextDayNotice: 'Не более одного нового урока в день. Завтра — следующий шаг.',
    retestInvitation: 'День 14: повторите те же стартовые тесты, когда это допускает методика, и сравните самочувствие.',
    retestButton: 'Сравнить мои стартовые тесты',
    celebrationLabel: 'Урок завершён', rewardIntro: 'Сегодня вы уделили время себе.',
    rewardMeaning: 'XP начисляются за сохранённую практику, не за самочувствие или оценки.',
    rewardTotal: 'Всего XP', rewardStreak: 'Серия практик', rewardStreakUnit: 'дн.',
    rewardPath: 'Мой путь из 14 уроков', rewardPathNote: 'Следующий урок будет ждать вас в другой день — без спешки.',
    promoBrand: 'ТАРИФ ADVANCED',
    promoTitle: 'Развивайтесь в пяти направлениях', promoText: 'С тарифом Advanced можно вести до пяти курсов одновременно, без рекламы.',
    promoPrice: 'Первый месяц 10 € (−50%), затем 20 € / месяц', promoCta: 'Посмотреть подписку',
    promoSoon: 'Оплата пока не подключена. Бесплатный курс остаётся доступным.',
    promoDisclaimer: 'Необязательное предложение для новых подписчиков. Завершение курса не требует оплаты.',
  },
}

const SCENE = {
  welcome: Heart,
  understand: Leaf,
  baseline: Target,
  checkin: Target,
  idea: Leaf,
  recall: Compass,
  phrase: Sparkles,
  guided: Waves,
  ritual: Leaf,
  transfer: ArrowRight,
  symbol: Star,
  reflection: BookmarkCheck,
  moment: Clock3,
  feedback: Heart,
}

const INTERACTIVE_STRESS = {
  ru: {
    aphorismTitle:'Как вам эта мысль?',agree:'Согласен',unsure:'Не знаю',disagree:'Не согласен',
    aphorismHints:{
      agree:'Можно взять эту мысль как приглашение к небольшой практике, но ничего доказывать не требуется.',
      unsure:'Необязательно решать сейчас. Можно попробовать нейтральный шаг или просто продолжить.',
      disagree:'Вы можете не соглашаться. Выберите собственную, более правдоподобную формулировку или нейтральную опору.',
    },
    phraseTitle:'Подходит ли вам эта формулировка?',fits:'Подходит',phraseUnsure:'Пока не знаю',phraseNo:'Не подходит',
    phraseHints:{fits:'При желании сохраните её для себя.',unsure:'Можно оставить вопрос открытым.',no:'Никакую фразу не нужно принимать через силу.'},
    recallTitle:'Как прошла попытка вспомнить?',recallYes:'Вспомнил(а)',recallHint:'Нужна подсказка',recallSkip:'Пропускаю',
    practiceTitle:'Что вы действительно попробовали?',tried:'Попробовал(а)',simplified:'Сократил(а) практику',
    neutral:'Выбрал(а) нейтральный вариант',practiceSkip:'Не сегодня',
    practiceNote:'Это запись учебной попытки, а не оценка вашего психического здоровья. Можно пропустить.',
    transferTitle:'Как вы хотите перенести этот опыт?',plan:'Только составить план',
    imagined:'Мысленно представить',phrase:'Подготовить фразу',real:'Пробовал(а) в обычной жизни',skip:'Не планирую сейчас',
  },
  en: {
    aphorismTitle:'How does this idea sound to you?',agree:'Agree',unsure:'Not sure',disagree:'Disagree',
    aphorismHints:{
      agree:'You can use it as an invitation to try one small exercise, not proof of anything.',
      unsure:'There is no need to decide now. You may choose a neutral step or continue.',
      disagree:'You are free to disagree. Choose your own credible wording or a neutral anchor.',
    },
    phraseTitle:'Does this phrase fit you?',fits:'It fits',phraseUnsure:'Not sure yet',phraseNo:'Not for me',
    phraseHints:{fits:'You may keep it for yourself.',unsure:'You may leave the question open.',no:'You do not have to believe or use this phrase.'},
    recallTitle:'How did recalling go?',recallYes:'Recalled it',recallHint:'Need a hint',recallSkip:'Skip',
    practiceTitle:'Which step did you actually try?',tried:'Tried the exercise',simplified:'Used a shorter version',
    neutral:'Chose a neutral alternative',practiceSkip:'Not today',
    practiceNote:'This is a learning attempt, not a mental-health score. You can skip.',
    transferTitle:'How would you carry this forward?',plan:'Make a plan only',
    imagined:'Imagine a safe step',phrase:'Prepare a phrase',real:'Tried in ordinary life',skip:'Not planning now',
  },
}
function buildSlides(lesson) {
  if(lesson?.antiStress?.slideModel===OPORA_SKILL_SLIDE_MODEL)return buildCourseSlides(lesson)
  const guided = (lesson.sections || []).filter(section => ['arrive', 'meditation', 'finish'].includes(section.kind))
  // Merge a learn section into the arrival exercise; retain legacy fallback otherwise.
  const hasArrival = guided.some(section => section.kind === 'arrive')
  return [
    { key: 'welcome', kind: 'welcome' },
    { key: 'baseline', kind: 'baseline' },
    { key: 'checkin', kind: 'checkin' },
    ...(lesson.practiceV3?.recall ? [{ key: 'recall', kind: 'recall' }] : []),
    { key: 'idea', kind: 'idea' },
    ...(!hasArrival && (lesson.sections||[]).some(section=>section.kind==='learn')?[{key:'understand',kind:'understand'}]:[]),
    ...(lesson.workbook?.workingPosition ? [{ key: 'phrase', kind: 'phrase' }] : []),
    ...guided.map((section, index) => ({ key: 'guided-' + index, kind: 'guided', section })),
    { key: 'ritual', kind: 'ritual' },
    ...(lesson.workbook?.microPractice ? [{ key: 'transfer', kind: 'transfer' }] : []),
    ...(lesson.practiceV4 ? [{ key: 'symbol', kind: 'symbol' }] : []),
    { key: 'reflection', kind: 'reflection' },
    { key: 'moment', kind: 'moment' },
    { key: 'feedback', kind: 'feedback' },
  ]
}

function SkillPracticeSteps({text,locale,disabled}) {
  const parts=useMemo(()=>String(text||'').split(/(?=\\b[1-9]\\.\\s)/)
    .map(s=>s.replace(/^\\s*[1-9]\\.\\s*/, '').trim()).filter(Boolean),[text])
  const [stepIndex,setStepIndex]=useState(0)
  if(parts.length===0)return null
  return <section className={styles.skillPracticeCard} data-course-skill-guided-steps>
    <span className={styles.skillStepCount}>{locale==='ru'?'Практика':locale==='es'?'Práctica':'Practice'} · {stepIndex+1}/{parts.length}</span>
    <p className={styles.skillStepText}>{parts[stepIndex]}</p>
    <div className={styles.skillStepActions}>
      {stepIndex>0&&<button type="button" onClick={()=>setStepIndex(i=>Math.max(0,i-1))} disabled={disabled}>
        <ArrowLeft size={15}/>{locale==='ru'?'Назад':'Back'}</button>}
      {stepIndex<parts.length-1&&<button type="button" onClick={()=>setStepIndex(i=>Math.min(parts.length-1,i+1))} disabled={disabled}>
        {locale==='ru'?'Следующий шаг':'Next step'}<ArrowRight size={15}/></button>}
      {stepIndex===parts.length-1&&<span className={styles.skillStepDone}><CheckCircle2 size={16}/>{locale==='ru'?'Все шаги показаны. Отметьте фактическую попытку дальше.':'All steps shown. Report your actual attempt next.'}</span>}
    </div>
  </section>
}

function MomentScale({ value, onChange, words, label, disabled, lowLabel = words.low, highLabel = words.high }) {
  return <div>
    <div className={styles.numberGrid} role="group" aria-label={label}>
      {Array.from({length:11}, (_, i) => <button key={i} type="button"
        disabled={disabled} aria-pressed={value === i} onClick={() => onChange(i)}>{i}</button>)}
    </div>
    <div className={styles.rangeCaption}><span>{lowLabel}</span><span>{highLabel}</span></div>
  </div>
}

function IllustratedMoment({ variant = 'calm', photo = false, kind = 'idea' }) {
  const SceneIcon = SCENE[kind] || Leaf
  if (variant === 'celebration') return <div className={styles.illustration}
    data-art="celebration" aria-hidden="true">
    <img src="/images/holistic-house/course-celebration.svg" alt=""
      width={280} height={200} loading="lazy"/>
  </div>
  return <div className={photo ? styles.photoMoment : styles.illustration}
    data-art="scenic" data-scene-kind={kind} aria-hidden="true">
    <img className={styles.scenicImage}
      src="/images/holistic-house/course-focus-mountain-boy.webp"
      alt="" width={705} height={411} loading="eager" decoding="async"/>
    <span className={styles.photoSparkle}><SceneIcon size={23} strokeWidth={1.8}/></span>
  </div>
}

function RouteMethodActivity({activity,...props}) {
  return activity ? <OporaModuleActivity {...props} part="method" routePlan={{methodActivity:activity}}/>
    : <AntiStressMethodActivity {...props}/>
}
function RoutePracticeLab({plan,...props}) {
  return plan ? <OporaModuleActivity {...props} routePlan={{practiceLab:plan}}/>
    : <AntiStressPracticeLab {...props}/>
}

export default function CourseSlidePlayer({
  locale = 'en', data, busy = false, promotion = {}, onOpenRetest, onClose, onFinish, onCheckin, onSession, onPreferences,
}) {
  const words = WORDS[locale] || WORDS.en
  const learning = INTERACTIVE_STRESS[locale] || INTERACTIVE_STRESS.en
  const cycle = data.cycle || {}
  const lesson = data.lesson || {}
  const today = data.currentCheckin
  const session = data.currentSession
  const focusLabel = cycle.activeScaleLabel || data.roadmap?.find(item => item.day === cycle.day)?.focusTitle || data.target?.label || words.todaySkill
  const resourceFocus = /(ресурс.*опор|опор.*ресурс|resource.*support|support.*resource)/i.test(String(focusLabel))
  const standardBaselinePrompt = resourceFocus ? words.baselineResourceQuestion : words.baselineQuestion
  const alreadyDone = Boolean(session)
  const routePlan=lesson.antiStress?.routePlan
  const MethodActivityComponent=routePlan?RouteMethodActivity:AntiStressMethodActivity
  const PracticeLabComponent=routePlan?RoutePracticeLab:AntiStressPracticeLab
  const isSkillV5=Boolean(lesson.antiStress?.slideModel===OPORA_SKILL_SLIDE_MODEL && data.programme?.id==='stress')
  const isDayOne=Boolean(!isSkillV5 && lesson.antiStress && !routePlan && cycle.day===1 && data.programme?.id === 'stress')
  // The pinned lesson body is immutable. This momentary prompt is only a
  // voluntary state-first UI observation, not an additional clinical scale.
  const baselinePrompt=isDayOne
    ? (locale==='ru'
      ? 'Насколько сейчас доступна небольшая пауза, чтобы заметить себя и выбрать действие?'
      : 'How available is a small pause to notice yourself and choose a response right now?')
    : standardBaselinePrompt
  const isExtendedStress=Boolean(!isSkillV5 && lesson.antiStress && (cycle.day>=2||routePlan) && cycle.day<=14 &&
    data.programme?.id === 'stress')
  const isOporaModule=Boolean(
    ['opora-nav-2.0-20261014','opora-trauma-1.3-20261015']
      .includes(lesson.oporaModule?.version) && data.programme?.id==='stress'
  )
  const isOporaStateJourney=Boolean(!isSkillV5 && !isDayOne && data.programme?.id==='stress' && (
    lesson.antiStress ||
    ['opora-nav-2.0-20261014','opora-trauma-1.3-20261015'].includes(lesson.oporaModule?.version)
  ))
  const phaseChecks=cycle.day===14&&cycle.moduleRouter==='opora-trauma-1.3-20261015'
    ?traumaPhaseCheckpoints(cycle.moduleId,locale):[]
  const [phaseCheckpoints,setPhaseCheckpoints]=useState(session?.signals?.phaseCheckpoints||{})
  const [earned, setEarned] = useState(false)
  const baseSlides=useMemo(()=>isDayOne ? DAY_ONE_SLIDES : buildSlides(lesson),[isDayOne,lesson])
  const slides=useMemo(()=>withFinalFreeOffer(baseSlides,{
    day:cycle.day,durationDays:cycle.durationDays,show:promotion.show,
    checking:promotion.checking,alreadyDone:alreadyDone||earned,
  }),[baseSlides,cycle.day,cycle.durationDays,promotion.show,promotion.checking,alreadyDone,earned])
  const visitedSlideKeys=useRef(new Set(baseSlides[0] ? [baseSlides[0].key] : []))
  const [index, setIndex] = useState(alreadyDone ? slides.length : 0)
  const [severity, setSeverity] = useState(today?.severity ?? null)
  const [reflection, setReflection] = useState(session?.reflection || '')
  function appendRouteReflection(addition){
    const clean=String(addition||'').trim()
    if(!clean)return false
    if(reflection.includes(clean))return true
    const next=[reflection.trim(),clean].filter(Boolean).join('\n')
    if(next.length>500)return false
    setReflection(next);return true
  }
  const [feedback, setFeedback] = useState(session?.feedback || 'skip')
  const [entryNow, setEntryNow] = useState(null)
  const [comfort, setComfort] = useState(session?.signals?.comfort || 'skip')
  const [usefulness, setUsefulness] = useState(session?.signals?.usefulness || 'skip')
  const [flexibility, setFlexibility] = useState(session?.signals?.flexibility || 'skip')
  const [transferStage, setTransferStage] = useState(session?.signals?.transferStage || 'skip')
  const [adaptationChoice, setAdaptationChoice] = useState(session?.signals?.adaptationChoice || 'skip')
  const [transferPlan, setTransferPlan] = useState(session?.transferPlan || '')
  const [beforeNow, setBeforeNow] = useState(session?.beforeNow ?? null)
  const [afterNow, setAfterNow] = useState(session?.afterNow ?? null)
  const [symbolMode, setSymbolMode] = useState('words')
  const [thoughtChoice, setThoughtChoice] = useState(session?.signals?.thoughtPath || 'neutral')
  const [welcomeFeeling, setWelcomeFeeling] = useState(session?.signals?.welcomeFeeling || '')
  const [stateJourney,setStateJourney] = useState(session?.signals?.stateJourney||{})
  const recordStateJourney=(field,value)=>setStateJourney(previous=>({...previous,[field]:value}))
  const [dayOneAnswers,setDayOneAnswers]=useState(session?.signals?.dayOne||{})
  const [associationWords,setAssociationWords]=useState('')
  const [practiceLab,setPracticeLab]=useState(session?.signals?.practiceLab||{})
  // Voluntary worksheet drafts survive slide/neutral navigation in memory only.
  const [routeDrafts,setRouteDrafts]=useState({main:{},reflect:{}})
  const updateRouteDraft=(part,update)=>setRouteDrafts(previous=>({...previous,[part]:typeof update==='function'?update(previous[part]||{}):update}))
  const updatePracticeLab=(key,value)=>setPracticeLab(previous=>({...previous,[key]:value}))
  const dayOneFocus=data.dayOneFocusOptions?.find(item=>item.id===dayOneAnswers.focusId)||null
  function recordDayOne(field,value){
    setDayOneAnswers(previous=>{
      const next={...previous,[field]:value}
      if(field==='anchor'&&value!=='colour')delete next.anchorTone
      if(field==='hintUsed'&&value==='yes'&&next.independent==='independent')delete next.independent
      if(field==='transferCue'&&['no_plan','skip'].includes(value))delete next.transferAction
      return next
    })
    if(field==='comfort')setComfort(value)
    if(field==='adaptation')setAdaptationChoice(value)
    if(field==='experience')setFlexibility(value==='more_choice'?'more_choice'
      :value==='unchanged'?'same':'skip')
  }
  const [skillProbeChoice, setSkillProbeChoice] = useState(session?.signals?.skillProbeChoice || '')
  const [aphorismResponse,setAphorismResponse] = useState(session?.signals?.aphorismResponse || '')
  const [practiceAttempt,setPracticeAttempt] = useState(session?.signals?.practiceAttempt || '')
  const [moduleActivityChoice,setModuleActivityChoice] = useState(session?.signals?.moduleActivityChoice||'')
  const [dailyMethodChoice,setDailyMethodChoice] = useState(session?.signals?.dailyMethodChoice || '')
  const [dailyMethodHintUsed,setDailyMethodHintUsed] = useState(Boolean(session?.signals?.dailyMethodHintUsed))
  const [phraseResponse,setPhraseResponse] = useState(session?.signals?.phraseResponse || '')
  function recordRouteHint(){
    setDailyMethodHintUsed(true)
    setPhaseCheckpoints(value=>Object.fromEntries(Object.entries(value).map(([id,evidence])=>[id,evidence.state==='independent'?{...evidence,state:'guided'}:evidence])))
    if(routePlan&&practiceLab.reflect?.endsWith('_independent'))updatePracticeLab('reflect','')
  }
  const [recallAttempt,setRecallAttempt] = useState('')
  const [skillProbeHintUsed, setSkillProbeHintUsed] = useState(Boolean(session?.signals?.skillProbeHintUsed))
  const [discomfortOpen, setDiscomfortOpen] = useState(false)
  const [neutralMode, setNeutralMode] = useState(false)
  const [rewardStep, setRewardStep] = useState(alreadyDone ? 2 : 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const checkinOp = useRef(null)
  const sessionOp = useRef(null)
  const submitting = useRef(false)
  const frame = useRef(null)
  const headingRef = useRef(null)
  const closeRef = useRef(onClose)
  const locked = busy || saving
  const slide = slides[Math.min(index, slides.length - 1)]
  const finished = index >= slides.length && (alreadyDone || earned)
  const adaptationProposal = practiceAdjustmentSuggestion({comfort,usefulness,flexibility})
  const finalRetestReady = cycle.day === 14 && data.finalRetest?.ready === true
  closeRef.current = () => { if (!submitting.current && !locked) onClose() }

  useEffect(() => {
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    frame.current?.querySelector('button')?.focus()
    const trap = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const nodes = [...(frame.current?.querySelectorAll('button:not([disabled]), a[href]:not([tabindex="-1"]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), summary') || [])]
        .filter(node => node.getClientRects().length)
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  // Eligibility may remove the offer while it is open. An index change alone
  // must never produce a completion receipt without a confirmed session.
  useEffect(() => {
    if (!alreadyDone && !earned && index >= slides.length) setIndex(slides.length - 1)
  }, [alreadyDone, earned, index, slides.length])

  useEffect(() => {
    if (!finished && !discomfortOpen && slide?.key) visitedSlideKeys.current.add(slide.key)
    frame.current?.querySelector('[data-slide-scroller]')?.scrollTo({top:0,behavior:'instant'})
    headingRef.current?.focus()
  }, [index, rewardStep, discomfortOpen, neutralMode, slide?.key, finished])

  function goNext() {
    setError('')
    setIndex(current => {
      const next=Math.min(current+1,slides.length-1)
      if(slides[next])visitedSlideKeys.current.add(slides[next].key)
      return next
    })
  }
  function goBack() { setError(''); setIndex(current => Math.max(0, current - 1)) }

  async function saveCheckin() {
    if (!Number.isInteger(severity) || (today && severity === today.severity)) { goNext(); return }
    if (submitting.current) return
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!checkinOp.current) checkinOp.current = crypto.randomUUID()
      const response = await onCheckin({
        severity, interference: today?.interference ?? null,
        resource: today?.resource ?? null,
        note: today?.note || '',
        operationId: checkinOp.current,
        ...(today ? {expectedRevision:today.revision} : {}),
      })
      if (response) { checkinOp.current = null; goNext() }
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  async function updatePreferences(change) {
    if (submitting.current) return
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!await onPreferences(change)) setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  async function finishLesson() {
    if (alreadyDone) { setIndex(slides.length); return }
    if (submitting.current) return
    // Every screen must be visited in order; this includes the final Free
    // course offer, but never requires payment or a completed rating.
    const missing=slides.findIndex(item=>!visitedSlideKeys.current.has(item.key))
    if(index!==slides.length-1||missing>=0){
      setError(words.finishAllSlides)
      if(missing>=0)setIndex(missing)
      return
    }
    submitting.current = true
    setSaving(true); setError('')
    try {
      if (!sessionOp.current) sessionOp.current = crypto.randomUUID()
      // Keep the legacy feedback field for old reports; independent v1.5
      // signals carry comfort, usefulness and flexibility without conflation.
      const legacyFeedback = feedback==='uncomfortable' || comfort==='uncomfortable'
        ? 'uncomfortable' : usefulness==='useful' ? 'helped'
        : usefulness==='unchanged' ? 'neutral' : 'skip'
      const response = await onSession({
        day:cycle.day,lessonId:lesson.id,operationId:sessionOp.current,
        feedback:legacyFeedback,beforeNow,afterNow,reflection,
        practiceWindow:'practice_v15',comfort,usefulness,flexibility,
        transferStage,thoughtPath:thoughtChoice,adaptationChoice,
        welcomeFeeling:welcomeFeeling||'skip',
        ...(isOporaStateJourney?{stateJourney:validateOporaStateJourney(stateJourney)}:{}),
        transferPlan:cycle.day===6&&!lesson.antiStress?transferPlan:'',
        ...((lesson.antiStress||routePlan) ? {
          aphorismResponse:aphorismResponse||null,
          practiceAttempt:practiceAttempt||null,
          phraseResponse:phraseResponse||null,
        } : {}),
        ...(isOporaModule&&!routePlan
          ? {moduleActivityChoice:moduleActivityChoice||null,practiceAttempt:practiceAttempt||null}
          : {}),
        ...(lesson.antiStress?.probe ? {skillProbeChoice:skillProbeChoice||null,skillProbeHintUsed} : {}),
        ...(isDayOne?{dayOneAnswers:validateDayOneAnswers(dayOneAnswers,
          data.dayOneFocusOptions?.map(item=>item.id)||[])}:{}),
        ...(!isSkillV5&&lesson.antiStress&&(cycle.day>1||routePlan)&&data.programme?.id==='stress'
          ? {dailyMethodChoice:dailyMethodChoice||null,dailyMethodHintUsed}
          : {}),
        ...(isExtendedStress ? {practiceLab} : {}),
        ...(phaseChecks.length?{phaseCheckpoints:Object.fromEntries(Object.entries(phaseCheckpoints).map(([id,evidence])=>[id,dailyMethodHintUsed&&evidence.state==='independent'?{...evidence,state:'guided'}:evidence]))}:{}),
        visitedSlideKeys:baseSlides.map(item=>item.key),
      })
      if (response) { sessionOp.current = null; setEarned(true); setIndex(slides.length) }
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  const dayOneTitles=locale==='ru'?{
    recall:'Мой личный фокус',idea:'Одна мысль для размышления',
    'day1-prepare':'Мой способ начать','day1-notice':'Моё состояние сейчас',
    'day1-practice':'Состояние и поддержка','day1-exit':'Завершаю в своём темпе',
    'day1-anchor':'Что мне сейчас нужно','day1-association':'Три слова о себе',
    'day1-independent':'Пробую сам(а)','day1-experience':'Что изменилось внутри?',
    'day1-adapt':'Учитываю свои границы','day1-transfer':'Моя карточка поддержки',
  }:{
    recall:'My personal focus',idea:'A thought to consider',
    'day1-prepare':'How I begin','day1-notice':'My state right now',
    'day1-practice':'State and support','day1-exit':'Finish at my pace',
    'day1-anchor':'What I need now','day1-association':'Three words for me',
    'day1-independent':'Try it myself','day1-experience':'My inner experience',
    'day1-adapt':'Respect my limits','day1-transfer':'My support card',
  }
  const title=finished?(cycle.day===14?words.courseFinished:words.finished)
    :slide?.kind==='course-offer'?words.promoTitle
    :isDayOne&&dayOneTitles[slide.kind]?dayOneTitles[slide.kind]
    :slide.kind==='guided'?(slide.section.kind==='arrive'?words.arrivalTitle:slide.section.title||words.guided)
    :slide.kind==='checkin' && !(lesson.antiStress||isOporaModule)?words.checkinDifficultyTitle
    :words[slide.kind]
  const Icon = finished ? Trophy : (SCENE[slide.kind] || Sparkles)
  const progress = finished ? 100 : Math.round((index / slides.length) * 100)
  const lessonsSaved = Number(data.progress?.practiceCount) || 0
  const practiceStreak = Number(data.progress?.practiceStreak) || 0
  const paired = compareLessonMoments(alreadyDone ? session?.beforeNow : beforeNow, alreadyDone ? session?.afterNow : afterNow)
  const lessonOutcomeProps={locale,lesson,phaseChecks,phaseCheckpoints:alreadyDone?session?.signals?.phaseCheckpoints||{}:phaseCheckpoints,day:cycle.day,beforeNow:alreadyDone?session?.beforeNow:beforeNow,
    afterNow:alreadyDone?session?.afterNow:afterNow,
    comfort:alreadyDone?session?.signals?.comfort:comfort,usefulness:alreadyDone?session?.signals?.usefulness:usefulness,
    flexibility:alreadyDone?session?.signals?.flexibility:flexibility,
    adaptationChoice:alreadyDone?session?.signals?.adaptationChoice:adaptationChoice,
    transferStage:alreadyDone?session?.signals?.transferStage:transferStage,
    practiceAttempt:alreadyDone
      ? (isExtendedStress?(session?.signals?.practiceLab?.attempt||session?.signals?.practiceAttempt):session?.signals?.practiceAttempt)||null
      : isExtendedStress?(practiceLab.attempt||practiceAttempt):practiceAttempt,
    practiceLab:isExtendedStress?(alreadyDone?session?.signals?.practiceLab||null:practiceLab):null,
    moduleActivityChoice:alreadyDone&&session?.signals?.interactionSchema==='opora-level-2'&&
      session?.signals?.moduleThemeId===lesson.oporaModule?.id+'-day-'+String(cycle.day)
      ?session?.signals?.moduleActivityChoice||null:null,
    dayOne:isDayOne?(alreadyDone?session?.signals?.dayOne||null:dayOneAnswers):null,
    welcomeFeeling:alreadyDone?session?.signals?.welcomeFeeling||null:welcomeFeeling,
    stateJourney:isOporaStateJourney?(alreadyDone?session?.signals?.stateJourney||null:stateJourney):null}
  const minutesEstimate=isSkillV5?'8–12':isDayOne?(cycle.preferences?.length==='quick'?'7–10':'10–16')
    :(cycle.preferences?.length==='quick'?'5–8':'9–13')
  const scenicBaseline = !isSkillV5 && !finished && !discomfortOpen &&
    (slide.kind === 'baseline' || (slide.kind === 'guided' && slide.section.kind === 'arrive'))

  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={words.day + ' ' + cycle.day + ': ' + title}
    data-course-slide-player data-course-skills-v5={isSkillV5?'true':undefined} data-opora-first-lesson={isDayOne?"as-1.9":undefined}
    data-opora-module={isOporaModule?lesson.oporaModule.id:undefined}
    data-opora-day={isOporaModule?cycle.day:undefined}
    data-opora-state-journey={isOporaStateJourney?"v1":undefined} data-course-one-screen="v1" ref={frame}>
    <div className={[styles.frame, scenicBaseline ? styles.sceneFrame : ''].filter(Boolean).join(' ')}>
      {scenicBaseline && <div className={styles.fullscreenScene} aria-hidden="true" data-course-baseline-background>
        <img className={styles.fullscreenScenePhoto}
          src="/images/holistic-house/course-focus-mountain-boy.webp"
          alt="" width={705} height={411} loading="eager" decoding="async"/>
      </div>}
      <header className={styles.header}>
        <button type="button" className={styles.close} onClick={onClose} disabled={locked}
          aria-label={words.close}><X size={23}/></button>
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={progress} aria-label={words.step}>
            <div className={styles.progressValue} style={{width:progress + '%'}} />
          </div>
          <small>{finished ? words.completed : words.step + ' ' + (index + 1) + ' ' + words.of + ' ' + slides.length} · ≈ {minutesEstimate} {locale==='ru'?'мин':'min'}</small>
        </div>
        <div className={styles.dayPill}>{cycle.day}/14</div>
      </header>
      <main className={styles.content} data-slide-scroller data-slide-kind={finished ? "completion" : slide.kind} data-slide-key={finished ? undefined : slide.key}>
        {!finished && discomfortOpen ? <section className={styles.discomfortPanel} data-course-discomfort-support aria-label={words.discomfortTitle}>
          <ShieldCheck size={36} aria-hidden="true"/>
          <h2 tabIndex={-1} ref={headingRef}>{words.discomfortTitle}</h2><p>{words.discomfortIntro}</p>
          <button type="button" onClick={() => { setNeutralMode(true); setSymbolMode('words'); setFeedback('uncomfortable'); setComfort('uncomfortable'); setDiscomfortOpen(false) }}>{words.discomfortNeutral}</button>
          <button type="button" onClick={onClose}>{words.discomfortExit}</button>
          <a href="https://findahelpline.com/en" target="_blank" rel="noopener noreferrer">{words.discomfortHelp}<ArrowRight size={16}/></a>
          <small>{words.discomfortEmergency}</small>
        </section> : !finished && isDayOne && neutralMode && index<5 ? <section
          className={styles.discomfortPanel} data-course-day-one-neutral-early>
          <ShieldCheck size={36} aria-hidden="true"/>
          <h2 tabIndex={-1} ref={headingRef}>{words.discomfortNeutral}</h2>
          <p>{words.neutralPractice}</p>
          <p>{words.discomfortIntro}</p>
        </section> : !finished && slide.kind==='course-offer' ? <div className={styles.promoSlide} data-course-post-lesson-promo>
          <div className={styles.promoIcon}><Crown size={42} aria-hidden="true"/></div>
          <p className={styles.promoBrand}>{words.promoBrand}</p>
          <h2 tabIndex={-1} ref={headingRef}>{words.promoTitle}</h2>
          <p className={styles.promoLead}>{words.promoText}</p>
          <div className={styles.promoBenefits}>
            <div><CheckCircle2 size={21}/><span>5 {locale==='ru'?'параллельных курсов':'parallel courses'}</span></div>
            <div><CheckCircle2 size={21}/><span>{locale==='ru'?'Без рекламы':'No advertising'}</span></div>
          </div>
          <strong className={styles.promoPrice}>{words.promoPrice}</strong>
          {promotion.checkoutReady ? <a className={styles.promoLink} href={'/'+locale+'/app/course?add=1'} target="_blank" rel="noopener noreferrer">{words.promoCta}<ArrowRight size={17}/></a>
            : <p className={styles.promoSoon}>{words.promoSoon}</p>}
          <p className={styles.promoLegal}>{words.promoDisclaimer}</p>
        </div> : finished && earned && rewardStep===0 ? <div className={styles.finished}
          data-course-slide-completion data-course-reward-stage="celebration" aria-live="polite">
          <IllustratedMoment variant="celebration"/>
          <p className={styles.rewardKicker}><CheckCircle2 size={17}/>{words.day} {cycle.day} · {words.celebrationLabel}</p>
          <h2 tabIndex={-1} ref={headingRef}>{cycle.day===14?words.courseFinished:words.finished}</h2>
          {paired ? <section className={styles.momentResult} data-course-moment-result aria-label={words.pairTitle}>
            <p className={styles.resultFocus}>{focusLabel}</p>
            <h3>{words.pairTitle}</h3>
            <div className={styles.resultPair}>
              <div><span>{words.before}</span><strong>{paired.before}<small>/10</small></strong></div>
              <ArrowRight size={24} aria-hidden="true"/>
              <div><span>{words.after}</span><strong>{paired.after}<small>/10</small></strong></div>
            </div>
            <p className={styles.resultMeaning}>{paired.change===0 ? words.sameResult :
              changeAmount(paired.change,locale)+' '+(paired.change<0 ? words.easierResult : words.harderResult)}</p>
          </section> : <p className={styles.helper}>{words.noPair}</p>}
          <p>{words.rewardIntro}</p>
          <CourseLessonResult {...lessonOutcomeProps}/>
        </div> : finished && earned && rewardStep===1 ? <div className={styles.rewardStage}
          data-course-slide-completion data-course-reward-stage="xp" aria-live="polite">
          <div className={styles.rewardMedal}><Star size={74} fill="currentColor" aria-hidden="true"/></div>
          <h2 tabIndex={-1} ref={headingRef}>{words.earned}</h2>
          <p>{words.rewardMeaning}</p>
          <div className={styles.rewardStats}>
            <div><Sparkles size={24} aria-hidden="true"/><strong>{20*lessonsSaved}</strong><span>{words.rewardTotal}</span></div>
            {practiceStreak>0 && <div><Waves size={24} aria-hidden="true"/><strong>{practiceStreak}</strong>
              <span>{words.rewardStreak} · {words.rewardStreakUnit}</span></div>}
          </div>
        </div> : finished ? <div className={styles.finished} data-course-slide-completion>
          {earned ? <div className={styles.journeyRewardIcon}><Trophy size={66} aria-hidden="true"/></div> :
            <IllustratedMoment variant="celebration"/>}
          <h2 tabIndex={-1} ref={headingRef}>{earned ? words.rewardPath : (cycle.day===14?words.courseFinished:words.completed)}</h2>
          {earned && <div className={styles.completionPath} data-course-completion-progress>
            <strong>{lessonsSaved} / {cycle.durationDays}</strong>
            <progress max={cycle.durationDays} value={lessonsSaved} aria-label={words.rewardPath}/>
          </div>}
          {!earned && (paired ? <section className={styles.momentResult} data-course-moment-result aria-label={words.pairTitle}>
            <p className={styles.resultFocus}>{focusLabel}</p>
            <h3>{words.pairTitle}</h3>
            <div className={styles.resultPair}>
              <div><span>{words.before}</span><strong>{paired.before}<small>/10</small></strong></div>
              <ArrowRight size={24} aria-hidden="true"/>
              <div><span>{words.after}</span><strong>{paired.after}<small>/10</small></strong></div>
            </div>
            <p className={styles.resultMeaning}>{paired.change === 0 ? words.sameResult :
              changeAmount(paired.change, locale) + ' ' + (paired.change < 0 ? words.easierResult : words.harderResult)}</p>
          </section> : <p className={styles.helper}>{words.noPair}</p>)}
          <p>{earned ? words.rewardPathNote : words.celebration}</p>
          {!earned&&<CourseLessonResult {...lessonOutcomeProps}/>}

          {finalRetestReady && <div className={styles.finalRetestCue}>
            <p>{words.retestInvitation}</p>
            <button type="button" onClick={onOpenRetest} disabled={locked||typeof onOpenRetest!=='function'}>
              {words.retestButton}<ArrowRight size={16}/>
            </button>
          </div>}
          {!finalRetestReady && <p className={styles.nextDayCue}>{words.nextDayNotice}</p>}
          {!earned && <div className={styles.xpReward}><CheckCircle2 size={21}/>{words.completed}</div>}
          {!earned && <div className={styles.finalTiles}>
            <span><CheckCircle2 size={22}/>{words.completed}</span>
            <span><Target size={22}/>{words.todaySkill}</span>
            <span><Sparkles size={22}/>{words.private}</span>
          </div>}
          {!earned && <small>{words.xpNote}</small>}
          <button type="button" className={styles.textAction} onClick={() => setIndex(1)}>{words.replay}</button>
        </div> : <>
          {slide.kind !== 'welcome' && <>
            <div className={styles.slideIdentity}>
              <span className={styles.identityTag}><Icon size={17} aria-hidden="true"/>{words.day} {cycle.day}</span>
              <span className={styles.identityLabel}>{lesson.title}</span>
            </div>
            <h2 className={styles.slideTitle} ref={headingRef} tabIndex={-1}>{title}</h2>
          </>}

          {slide.kind === 'welcome' && <section className={styles.welcomeScreen} data-course-welcome>
            <div className={styles.welcomeBackdrop} aria-hidden="true">
              <img className={styles.welcomeBackgroundImage}
                src="/images/holistic-house/course-focus-mountain-boy.webp"
                alt="" width={705} height={411} decoding="async" />
            </div>
            <div className={styles.welcomeContent}>
              <span className={styles.welcomeKicker}><Heart size={16} aria-hidden="true"/>{words.day} {cycle.day} · Holistic House</span>
              <h2 className={styles.slideTitle} ref={headingRef} tabIndex={-1}>{words.welcome}</h2>
              {isOporaModule&&<p className={styles.welcomeModule} data-opora-welcome-theme>{lesson.oporaModule.theme}</p>}
              {isSkillV5&&<div data-course-v5-skill-summary>
                <strong>{lesson.antiStress.skill}</strong>
                <p className={styles.helper}>{lesson.antiStress.learningOutcome}</p>
                {cycle.day===1&&<details className={styles.skillMapDisclosure}>
                  <summary>{locale==='ru'?'Семь навыков курса':'Seven course skills'}<ChevronDown size={15}/></summary>
                  <ol>{oporaSkillCards(locale).map(item=><li key={item.id}>{item.title}</li>)}</ol>
                </details>}
              </div>}
              <p className={styles.welcomePrompt}>{isDayOne
                ? (locale==='ru'?'С каким внутренним состоянием вы пришли сегодня? Ничего менять не нужно.':
                  'What inner state are you arriving with today? Nothing needs to change.')
                : words.welcomePrompt}</p>
              <div className={styles.welcomeChoices} role="group" aria-label={words.welcome}>
                {welcomeFeelingChoices(cycle.activeGoal || cycle.primaryGoal, locale).map((choice, choiceIndex) => {
                  const FeelingIcon = [Sun, Cloud, Moon, CircleHelp][choiceIndex]
                  return <button key={choice.id} type="button" disabled={locked}
                    aria-pressed={welcomeFeeling === choice.id} onClick={() => setWelcomeFeeling(choice.id)}>
                    <span className={styles.welcomeChoiceIcon}><FeelingIcon size={20} aria-hidden="true"/></span>
                    <span>{choice.label}</span>
                    {welcomeFeeling === choice.id ? <CheckCircle2 size={20} aria-hidden="true"/> : <ArrowRight size={17} aria-hidden="true"/>}
                  </button>
                })}
              </div>
              {welcomeFeeling && welcomeFeeling !== 'skip' &&
                <p className={styles.welcomeResponse} role="status">{welcomeFeelingSupport(welcomeFeeling, locale)}</p>}
              <p className={styles.welcomeNote}>{isDayOne
                ? (locale==='ru'?'Сегодня вы потренируетесь замечать состояние и выбирать небольшую поддержку. Можно пропускать любые наблюдения.':
                  'Today you can notice your state and choose a small support. Any observation may be skipped.')
                : words.welcomeNote}</p>
              {!isSkillV5&&<button type="button" className={styles.welcomeSkip} disabled={locked}
                onClick={() => { setWelcomeFeeling('skip'); goNext() }}>{words.welcomeSkip}</button>}
            </div>
          </section>}

          {slide.kind === 'baseline' && <>
            <p className={styles.focusName}>{words.focusForToday}: <strong>{focusLabel}</strong></p>
            <p className={styles.prompt} data-course-baseline-presence>{baselinePrompt}</p>
            <MomentScale value={entryNow} onChange={setEntryNow} words={words}
              label={baselinePrompt + ': ' + focusLabel} lowLabel={words.baselineLow}
              highLabel={words.baselineHigh} disabled={locked}/>
            <p className={styles.helper}>{isDayOne
              ? (locale==='ru'?'Необязательная моментная оценка — не диагностический тест и не требование улучшить показатель.':
                  'Optional momentary rating, not a diagnostic test or a score you must improve.')
              : words.ratingHint}</p>
          </>}

          {slide.kind === 'checkin' && (lesson.antiStress||isOporaModule ? <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment variant="calm" kind={slide.kind}/>}
            <p className={styles.prompt}>{lesson.antiStress?.skill||lesson.oporaModule?.theme}</p>
            <p className={styles.instruction}>{lesson.antiStress?.learningOutcome||lesson.oporaModule?.practice}</p>
            <div className={styles.preferenceRow} role="group" aria-label={words.adjustPace}>
              <button type="button" disabled={locked} aria-pressed={cycle.preferences?.length==='quick'} onClick={()=>void updatePreferences({length:'quick'})}>{words.short}</button>
              <button type="button" disabled={locked} aria-pressed={cycle.preferences?.length!=='quick'} onClick={()=>void updatePreferences({length:'standard'})}>{words.standard}</button>
              <button type="button" disabled={locked} aria-pressed={cycle.preferences?.imagery==='no_imagery'} onClick={()=>void updatePreferences({imagery:'no_imagery'})}>{words.noImagery}</button>
            </div>
            <details className={styles.supportDetails} data-course-optional-explanation>
              <summary><CircleHelp size={15} aria-hidden="true"/>{locale==='ru'?'О практике и безопасном выборе':'About this practice'}</summary>
              <p>{locale==='ru'?'Это занятие — практика, а не очередной тест. Выберите удобный формат или продолжайте.':'This is a practice, not another questionnaire. Choose a comfortable format, or continue.'}</p>
              <p>{lesson.antiStress?.neutralText||lesson.disclaimer}</p>
            </details>
          </> : <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.prompt}>{data.target?.label || words.todaySkill}</p>
            <p className={styles.instruction}>{words.checkinQuestion}</p>
            <div className={styles.numberGrid} role="group" aria-label={words.checkinQuestion}>
              {Array.from({length:11}, (_, i) => <button key={i} type="button" disabled={locked}
                aria-pressed={severity === i} onClick={() => setSeverity(i)}>{i}</button>)}
            </div>
            <div className={styles.rangeCaption}><span>{words.low}</span><span>{words.high}</span></div>
            <p className={styles.helper}>{words.ratingHint}</p>
            {today && <p className={styles.confirmed}><CheckCircle2 size={16}/>{words.saved}</p>}
          </>)}

          {slide.kind === 'idea' && <>
            <IllustratedMoment photo kind={slide.kind}/>
            <blockquote className={styles.quote}>“{isDayOne ? dayOneAphorism(locale,dayOneFocus?.goal,lesson.aphorism) : lesson.aphorism}”</blockquote>
            {isDayOne && <DayOneChoices label={locale==='ru'?'Как вам эта мысль?':'How does this idea fit for you?'}
              value={dayOneAnswers.quote} disabled={locked} onSelect={value=>recordDayOne('quote',value)}
              options={[
                {value:'agree',label:locale==='ru'?'Согласен(на)':'I agree'},
                {value:'unsure',label:locale==='ru'?'Не знаю':'I am not sure'},
                {value:'disagree',label:locale==='ru'?'Не согласен(на)':'I disagree'},
                {value:'skip',label:locale==='ru'?'Пропустить':'Skip'},
              ]}/>}
            {isDayOne && dayOneAnswers.quote==='disagree'&&<p className={styles.helper}>
              {locale==='ru'?'Необязательно соглашаться. Выберите то, что подходит именно вам.':'You may disagree. Choose what feels right for you.'}
            </p>}
            {!isDayOne&&lesson.antiStress&&<section data-course-aphorism-dialogue>
              <p className={styles.prompt}>{learning.aphorismTitle}</p>
              <div className={styles.feedbackOptions} role="group" aria-label={learning.aphorismTitle}>
                {[['agree',learning.agree],['unsure',learning.unsure],['disagree',learning.disagree]].map(([key,label])=>
                  <button type="button" key={key} disabled={locked} aria-pressed={aphorismResponse===key}
                    onClick={()=>setAphorismResponse(key)}>{label}</button>)}
              </div>
              {aphorismResponse&&<p className={styles.helper} role="status">
                {learning.aphorismHints[aphorismResponse]}</p>}
            </section>}
          </>}
          {slide.kind === 'understand' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.sections?.find(part => part.kind === 'learn')?.text}</p>
          </>}

          {slide.kind === 'recall' && (isDayOne
            ? <DayOneFocusPicker locale={locale} options={data.dayOneFocusOptions||[]}
                value={dayOneAnswers.focusId} disabled={locked}
                onSelect={value=>recordDayOne('focusId',value)}/>
            : <>
              <IllustratedMoment variant="calm" kind={slide.kind}/>
              <p className={styles.prompt}>{lesson.practiceV3?.recall}</p>
              <p className={styles.helper}>{words.recallHint}</p>
              {lesson.antiStress&&<div className={styles.feedbackOptions}
                role="group" aria-label={learning.recallTitle} data-course-active-recall-choice>
                {[['yes',learning.recallYes],['hint',learning.recallHint],['skip',learning.recallSkip]].map(([key,label])=>
                  <button type="button" key={key} disabled={locked} aria-pressed={recallAttempt===key}
                    onClick={()=>setRecallAttempt(key)}>{label}</button>)}
              </div>}
              {lesson.antiStress&&recallAttempt==='hint'&&
                <p className={styles.helper}>{(lesson.antiStress?.neutralText||lesson.disclaimer)}</p>}
            </>)}

          {slide.kind === 'phrase' && <>
            {!isOporaStateJourney&&<IllustratedMoment photo variant="books" kind={slide.kind}/>}
            {cycle.day===5 && !lesson.antiStress && <div className={[styles.modeTabs, styles.thoughtChoices].join(" ")} role="group" aria-label={words.choiceTitle}>
              {[['cbt',words.cbtChoice],['act',words.actChoice],['neutral',words.neutralChoice]].map(([key,label])=><button key={key} type="button"
                disabled={locked} aria-pressed={thoughtChoice===key} onClick={()=>setThoughtChoice(key)}>{label}</button>)}
            </div>}
            <blockquote className={styles.quote}>{cycle.day===5 && !lesson.antiStress ? (thoughtChoice==='cbt' ? words.cbtText : thoughtChoice==='act' ? words.actText : words.neutralText) : lesson.workbook?.workingPosition}</blockquote>
            <p className={styles.helper}>{words.phraseHint}</p>
            {lesson.antiStress&&<div data-course-support-phrase-choice>
              <p className={styles.prompt}>{learning.phraseTitle}</p>
              <div className={styles.feedbackOptions} role="group" aria-label={learning.phraseTitle}>
                {[['fits',learning.fits],['unsure',learning.phraseUnsure],['no',learning.phraseNo]].map(([key,label])=>
                  <button type="button" key={key} disabled={locked} aria-pressed={phraseResponse===key}
                    onClick={()=>setPhraseResponse(key)}>{label}</button>)}
              </div>
              {phraseResponse&&<p className={styles.helper}>{learning.phraseHints[phraseResponse]}</p>}
            </div>}
          </>}

          {slide.kind === 'guided' && <>
            {slide.section.kind !== 'arrive' && !isOporaStateJourney && <IllustratedMoment variant="calm" kind={slide.kind}/>}
            {slide.section.kind==='meditation' && !isSkillV5 && <div className={styles.practiceRating} data-course-practice-pre>
              <p className={styles.prompt}>{words.practicePrePrompt}</p>
              <MomentScale value={beforeNow} onChange={setBeforeNow} words={words}
                label={words.before + ': ' + focusLabel} disabled={locked}/>
            </div>}
            {slide.section.kind==='meditation'&&!isSkillV5&&lesson.antiStress&&(cycle.day>1||routePlan)&&
              data.programme?.id==='stress'&&!neutralMode&&
              <MethodActivityComponent key={String(cycle.day)} day={cycle.day} locale={locale} activity={routePlan?.methodActivity}
                value={dailyMethodChoice} onChange={setDailyMethodChoice}
                hintUsed={dailyMethodHintUsed} onHint={recordRouteHint} disabled={locked}/>}
            {isSkillV5&&slide.section.kind==='meditation'&&<SkillPracticeSteps key={cycle.day} text={neutralMode?words.neutralPractice:slide.section.text} locale={locale} disabled={locked}/>}
            {slide.section.kind === 'arrive' ? <section className={styles.arrivalExercise} data-course-arrival-exercise>
              <p className={styles.arrivalKicker}><Waves size={15} aria-hidden="true"/>{words.arrivalKicker}</p>
              <p className={styles.arrivalFocus}><span>{words.arrivalFocus}</span><strong>{focusLabel}</strong></p>
              <CoursePracticeVoice key={slide.key + ':' + neutralMode} locale={locale}
                text={neutralMode ? words.neutralPractice : words.arrivalAudioLead + ': ' + focusLabel + '. ' + words.arrivalAudioBody}/>
              <ol className={styles.arrivalSteps}>
                {words.arrivalSteps.map((step, stepIndex) => <li key={stepIndex}>
                  <span aria-hidden="true">{stepIndex + 1}</span><p>{step}</p>
                </li>)}
              </ol>
              <details className={styles.practiceTranscript}>
                <summary>{words.fullInstructions}<ChevronDown size={17} aria-hidden="true"/></summary>
                <div>
                  {lesson.sections?.find(part => part.kind === 'learn')?.text && <p>{lesson.sections.find(part => part.kind === 'learn').text}</p>}
                  <p>{neutralMode ? words.neutralPractice : slide.section.text}</p>
                </div>
              </details>
            </section> : <>
              <CoursePracticeVoice key={slide.key + ':' + neutralMode} locale={locale}
                text={neutralMode ? words.neutralPractice : slide.section.text}/>
              <details className={styles.practiceTranscript}>
                <summary>{words.fullInstructions}<ChevronDown size={17} aria-hidden="true"/></summary>
                <div><p>{neutralMode ? words.neutralPractice : slide.section.text}</p></div>
              </details>
            </>}
            <p className={styles.helper}>{isSkillV5
              ? (locale==='ru'?'Можно остановить упражнение в любой момент. Глаза остаются открытыми по выбору, дыхание — естественным.':'You may stop the exercise at any time. Eyes may stay open and breathing can be natural.')
              : words.gentle}</p>
            {!neutralMode && <details className={styles.timerDetails}>
              <summary><Compass size={16}/>{words.adjustPace}<ChevronDown size={15}/></summary>
              <div className={styles.preferenceRow} role="group" aria-label={words.adjustPace}>
                <button type="button" disabled={locked}
                  aria-pressed={cycle.preferences?.length === 'quick'}
                  onClick={() => void updatePreferences({length:'quick'})}>{words.short}</button>
                <button type="button" disabled={locked}
                  aria-pressed={cycle.preferences?.length !== 'quick'}
                  onClick={() => void updatePreferences({length:'standard'})}>{words.standard}</button>
                <button type="button" disabled={locked}
                  aria-pressed={cycle.preferences?.imagery === 'no_imagery'}
                  onClick={() => void updatePreferences({imagery:cycle.preferences?.imagery === 'no_imagery' ? 'optional' : 'no_imagery'})}>{words.noImagery}</button>
              </div>
            </details>}
            {!neutralMode && <details className={styles.timerDetails}><summary><Clock3 size={16}/>{words.optionalTimer}<ChevronDown size={15}/></summary>
              <CourseGuidedTimer key={String(cycle.id) + ':' + String(cycle.day) + ':' + slide.key + ':' + (cycle.preferences?.length || 'standard')}
                seconds={slide.section.seconds || 60} locale={locale}/>
            </details>}
            {slide.section.kind==='meditation' && isSkillV5 && <details className={styles.timerDetails} data-course-optional-moment-ratings>
              <summary>{locale==='ru'?'Необязательно: сравнить самочувствие до и после':'Optional: compare before and after'}<ChevronDown size={16}/></summary>
              <div className={styles.practiceRating}>
                <p className={styles.prompt}>{words.practicePrePrompt}</p>
                <MomentScale value={beforeNow} onChange={setBeforeNow} words={words} label={words.before+': '+focusLabel} disabled={locked}/>
                <p className={styles.prompt}>{words.practicePostPrompt}</p>
                <MomentScale value={afterNow} onChange={setAfterNow} words={words} label={words.after+': '+focusLabel} disabled={locked}/>
              </div>
            </details>}
            {slide.section.kind==='meditation' && !isSkillV5 && <div className={styles.practiceRating} data-course-practice-post>
              <p className={styles.prompt}>{words.practicePostPrompt}</p>
              <MomentScale value={afterNow} onChange={setAfterNow} words={words}
                label={words.after + ': ' + focusLabel} disabled={locked}/>
            </div>}
          </>}

          {slide.kind === 'ritual' && <>
            {!neutralMode&&!isOporaStateJourney&&(!isOporaModule||routePlan)&&<IllustratedMoment kind={slide.kind}/>}
            {!(isOporaModule&&!routePlan)&&<p className={styles.prompt}>{isOporaModule
              ? lesson.oporaModule.practice : lesson.ritual}</p>}
            <p className={styles.helper}>{words.transferHint}</p>
            {isOporaModule&&!routePlan&&!neutralMode&&
              <OporaModuleActivity moduleId={lesson.oporaModule.id} day={cycle.day}
                routerVersion={lesson.oporaModule.version} locale={locale}
                value={moduleActivityChoice} onChange={setModuleActivityChoice}
                draft={routeDrafts.main} onDraftChange={update=>updateRouteDraft('main',update)}
                onSaveReflection={appendRouteReflection} disabled={locked}/>}
            {(lesson.antiStress||isOporaModule)&&<section data-course-practice-attempt>
              <p className={styles.prompt}>{learning.practiceTitle}</p>
              <div className={styles.feedbackOptions} role="group" aria-label={learning.practiceTitle}>
                {[['tried',learning.tried],['simplified',learning.simplified],
                  ['neutral',learning.neutral],...(!isSkillV5?[['skip',learning.practiceSkip]]:[])].map(([key,label])=>
                  <button type="button" key={key} disabled={locked} aria-pressed={practiceAttempt===key}
                    onClick={()=>setPracticeAttempt(key)}>{label}</button>)}
              </div>
              <p className={styles.helper}>{isSkillV5
                ? (locale==='ru'?'Это честный отчёт об учебной попытке, не оценка здоровья. Ответ необязателен.':'This is your learning-attempt report, not a health score. A response is optional.')
                : learning.practiceNote}</p>
            </section>}
            {lesson.antiStress?.probe && <section className={styles.antiStressProbe} data-antistress-skill-probe>
              <p className={styles.antiStressProbeTag}>{locale==='ru'?'Практический выбор · навык '+lesson.antiStress.skillId:'Practice choice · skill '+lesson.antiStress.skillId}</p>
              <strong>{lesson.antiStress.probe.prompt}</strong>
              <div className={styles.antiStressProbeChoices} role="group" aria-label={lesson.antiStress.probe.prompt}>
                {lesson.antiStress.probe.choices.map(choice=><button type="button" key={choice.value}
                  disabled={locked} aria-pressed={skillProbeChoice===choice.value}
                  onClick={()=>setSkillProbeChoice(choice.value)}>
                  {choice.label}{skillProbeChoice===choice.value&&<Check size={16} aria-hidden="true"/>}
                </button>)}
              </div>
              <button type="button" className={styles.antiStressHint} disabled={locked}
                onClick={()=>setSkillProbeHintUsed(true)}>{locale==='ru'?'Показать подсказку':'Show a hint'}</button>
              {skillProbeHintUsed&&<p className={styles.helper}>{lesson.antiStress.probe.hint}</p>}
              <p className={styles.helper}>{locale==='ru'?'Можно не отвечать. Выбор — учебная проба, а не показатель психического здоровья.':'You may skip this. A choice here is an educational attempt, not a mental-health score.'}</p>
            </section>}
            {isExtendedStress&&!neutralMode&&<PracticeLabComponent key={'lab-main-'+cycle.day}
              day={cycle.day} locale={locale} part="main" plan={routePlan?.practiceLab} disabled={locked}
              onHint={routePlan?recordRouteHint:undefined}
              draft={routeDrafts.main} onDraftChange={update=>updateRouteDraft('main',update)}
              value={practiceLab.main||''} onChange={value=>updatePracticeLab('main',value)}
              attempt={practiceLab.attempt||''}
              onAttempt={value=>updatePracticeLab('attempt',value)}
              onSaveReflection={appendRouteReflection}/>}
          </>}

          {slide.kind === 'transfer' && <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment kind={slide.kind}/>}
            {isOporaStateJourney&&<OporaStateJourney part="plan" locale={locale}
              value={stateJourney} initialFeeling={welcomeFeeling}
              onChange={recordStateJourney} disabled={locked}/>}
            <p className={styles.prompt}>{lesson.workbook?.microPractice}</p>
            <p className={styles.helper}>{words.transferHint}</p>
            {(lesson.antiStress||isOporaModule)&&<section data-course-everyday-transfer>
              <details className={styles.oporaExtraDetails} open={!isOporaStateJourney&&!isSkillV5}>
                <summary>{locale==='ru'?'Дополнительно: как я планирую применить навык':'Optional: how I might use this skill'}<ChevronDown size={16}/></summary>
              <p className={styles.prompt}>{learning.transferTitle}</p>
              <div className={styles.feedbackOptions} role="group" aria-label={learning.transferTitle}>
                {[['plan',learning.plan],['imagined',learning.imagined],['phrase',learning.phrase],
                  ['real',learning.real],['skip',learning.skip]].map(([key,label])=>
                  <button type="button" key={key} disabled={locked} aria-pressed={transferStage===key}
                    onClick={()=>setTransferStage(key)}>{label}</button>)}
              </div>
              <p className={styles.helper}>{locale==='ru'?'Реальный шаг фиксируется только с ваших слов. Ни один шаг не обязателен.':'Real-world action is self-reported only. No action is required.'}</p>
              </details>
            </section>}
            {cycle.day===6 && !lesson.antiStress && <>
              <p className={styles.prompt}>{words.transferStageTitle}</p>
              <div className={styles.feedbackOptions} role="group" aria-label={words.transferStageTitle} data-course-transfer-stage>
                {[
                  ['plan',words.transferPlan],['imagined',words.transferImagined],
                  ['phrase',words.transferPhrase],['real',words.transferReal],
                  ['skip',words.transferSkip],
                ].map(([key,label])=><button type="button" key={key} disabled={locked}
                  aria-pressed={transferStage===key} onClick={()=>setTransferStage(key)}>{label}</button>)}
              </div>
              <label className={styles.noteField}><span>{words.transferPlanLabel}</span>
                <textarea rows={2} maxLength={300} value={transferPlan} disabled={locked}
                  onChange={event=>setTransferPlan(event.target.value)}/>
              </label>
            </>}
            {cycle.day===10 && !lesson.antiStress && <div className={styles.practiceRating} data-course-day-six-recall>
              <strong>{words.lastPlanTitle}</strong>
              <p>{data.daySixPlan?.plan || words.noSavedPlan}</p>
              {data.daySixPlan?.stage && <small>{words.transferStageTitle}: {data.daySixPlan.stage}</small>}
            </div>}
          </>}

          {slide.kind === 'symbol' && <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment variant="calm" kind={slide.kind}/>}
            <div className={styles.modeTabs} role="group" aria-label={words.symbol}>
              <button type="button" aria-pressed={symbolMode === 'words' || cycle.preferences?.imagery === 'no_imagery'}
                onClick={() => setSymbolMode('words')}>{words.words}</button>
              <button type="button" disabled={cycle.preferences?.imagery === 'no_imagery'}
                aria-pressed={symbolMode === 'image' && cycle.preferences?.imagery !== 'no_imagery'}
                onClick={() => setSymbolMode('image')}>{words.imagery}</button>
            </div>
            <p className={styles.prompt}>{symbolMode === 'image' && cycle.preferences?.imagery !== 'no_imagery'
              ? lesson.practiceV4?.invitation : lesson.practiceV4?.withoutImagery}</p>
            <p className={styles.helper}>{words.symbolHint}</p>
            {isExtendedStress&&!neutralMode&&<PracticeLabComponent key={'lab-reflect-'+cycle.day}
              day={cycle.day} locale={locale} part="reflect" plan={routePlan?.practiceLab}
              draft={routeDrafts.reflect} onDraftChange={update=>updateRouteDraft('reflect',update)}
              hintUsed={Boolean(routePlan&&dailyMethodHintUsed)} onHint={routePlan?recordRouteHint:undefined} disabled={locked}
              value={practiceLab.reflect||''} onChange={value=>updatePracticeLab('reflect',value)}
              onSaveReflection={appendRouteReflection}/>}
          </>}

          {slide.kind === 'reflection' && <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment kind={slide.kind}/>}
            <p className={styles.prompt}>{lesson.workbook?.question || lesson.reflection}</p>
            <label className={styles.noteField}><span>{words.note}</span>
              <textarea maxLength={500} rows={4} value={reflection}
                placeholder={lesson.workbook?.sentenceStarter || ''}
                onChange={event => setReflection(event.target.value)} disabled={locked}/>
            </label>
            <p className={styles.helper}><LockKeyhole size={15}/>{words.reflectionHint}</p>
            {phaseChecks.length>0&&<section data-phase-checkpoints className={styles.phaseCheckpoints}>
              <h3>{locale==='ru'?'Три необязательные учебные пробы':'Three optional learning checks'}</h3>
              <p className={styles.helper}>{locale==='ru'?'Это учебные ответы и ваш отчёт о попытке, не проверка клинического улучшения. Можно не пробовать или отметить, что задание не подходит.':'These record educational choices and your report of an attempt, not clinical improvement. You may leave them untried or mark them unsuitable.'}</p>
              {phaseChecks.map(check=>{
                const evidence=phaseCheckpoints[check.id]||{state:'not_tried',choice:null}
                const update=patch=>setPhaseCheckpoints(value=>({...value,[check.id]:{...evidence,...patch}}))
                return <fieldset key={check.id} disabled={locked} className={styles.noteField}>
                  <legend>{check.prompt}</legend>
                  {check.scene&&<p className={styles.helper}>{check.scene}</p>}
                  <select aria-label={check.prompt} value={evidence.choice||''} onChange={event=>update({choice:event.target.value||null,state:'not_tried'})}>
                    <option value="">{locale==='ru'?'Не выбрано':'No choice recorded'}</option>
                    {check.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {evidence.choice&&<p data-phase-selected-answer className={styles.helper}>{check.options.find(option=>option.value===evidence.choice)?.label}</p>}
                  <select aria-label={locale==='ru'?'Как я пробовал(а)':'How I tried'} value={evidence.state} onChange={event=>update({state:event.target.value})}>
                    <option value="not_tried">{locale==='ru'?'Не пробовал(а)':'Not tried'}</option>
                    <option value="not_suitable">{locale==='ru'?'Мне не подходит':'Not suitable'}</option>
                    <option value="guided" disabled={!evidence.choice}>{locale==='ru'?'С подсказкой':'With guidance'}</option>
                    <option value="independent" disabled={!evidence.choice||dailyMethodHintUsed}>{locale==='ru'?'Самостоятельная попытка (мой отчёт)':'Independent attempt (my report)'}</option>
                  </select>
                </fieldset>
              })}
            </section>}

          </>}

          {slide.kind === 'moment' && <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment kind={slide.kind}/>}
            {isOporaStateJourney&&<OporaStateJourney part="preview" locale={locale}
              value={stateJourney} initialFeeling={welcomeFeeling}/>}
            <p className={styles.focusName}>{words.focusForToday}: <strong>{focusLabel}</strong></p>
            <p className={styles.prompt}>{words.moment}</p>
            {compareLessonMoments(beforeNow,afterNow)
              ? <p className={styles.instruction}>{beforeNow}/10 → {afterNow}/10</p>
              : <p className={styles.helper}>{words.momentNoPair}</p>}
            <p className={styles.helper}>{words.momentHint}</p>
          </>}

          {isDayOne && slide.kind.startsWith('day1-') && <DayOneExercise
            kind={slide.kind} locale={locale} lesson={lesson} answers={dayOneAnswers}
            onAnswer={recordDayOne} locked={locked} associationWords={associationWords}
            onAssociationWords={setAssociationWords} selectedFocus={dayOneFocus}
            neutralMode={neutralMode} onReturnToPractice={()=>setNeutralMode(false)}
            onStopPractice={()=>{if(locked)return;recordDayOne('practiceAttempt','stopped');setNeutralMode(true);setSymbolMode('words');setIndex(slides.findIndex(item=>item.kind==='day1-exit'))}}
            onDiscomfort={()=>{setFeedback('uncomfortable');setDiscomfortOpen(true)}}/>}
          {slide.kind === 'feedback' && <>
            {!isOporaStateJourney&&!isSkillV5&&<IllustratedMoment variant="calm" kind={slide.kind}/>}
            {isOporaStateJourney&&<OporaStateJourney part="experience" locale={locale}
              value={stateJourney} initialFeeling={welcomeFeeling}
              onChange={recordStateJourney} disabled={locked}
              onUncomfortable={()=>{setFeedback('uncomfortable');setDiscomfortOpen(true)}}/>}
            <details className={styles.oporaExtraDetails} open={!isOporaStateJourney&&!isSkillV5}>
              <summary>{isOporaStateJourney
                ? (locale==='ru'?'Дополнительно: комфорт и пригодность практики':'Optional: comfort and usefulness')
                : words.feedbackHint}<ChevronDown size={16}/></summary>
            <p className={styles.helper}>{words.feedbackHint}</p>
            <p className={styles.prompt}>{words.comfortTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.comfortTitle} data-course-comfort>
              {[
                ['comfortable',words.comfortableChoice],['neutral',words.neutralComfort],
                ['uncomfortable',words.uncomfortable],...(!isSkillV5?[['skip',words.preferNot]]:[]),
              ].map(([key,label])=><button type="button" key={key} disabled={locked}
                aria-pressed={comfort===key} onClick={()=>{setComfort(key);if(key==='uncomfortable'){setFeedback('uncomfortable');setDiscomfortOpen(true)}}}>
                <span>{label}</span>{comfort===key&&<Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            <p className={styles.prompt}>{words.usefulTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.usefulTitle} data-course-usefulness>
              {[
                ['useful',words.usefulChoice],['unchanged',words.unchangedChoice],
                ['unsure',words.unsureChoice],...(!isSkillV5?[['skip',words.preferNot]]:[]),
              ].map(([key,label])=><button type="button" key={key} disabled={locked}
                aria-pressed={usefulness===key} onClick={()=>setUsefulness(key)}>
                <span>{label}</span>{usefulness===key&&<Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            <p className={styles.prompt}>{words.flexibilityTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.flexibilityTitle} data-course-flexibility>
              {[
                ['more_choice',words.moreChoice],['same',words.sameChoice],
                ['unsure',words.unsureChoice],...(!isSkillV5?[['skip',words.preferNot]]:[]),
              ].map(([key,label])=><button type="button" key={key} disabled={locked}
                aria-pressed={flexibility===key} onClick={()=>setFlexibility(key)}>
                <span>{label}</span>{flexibility===key&&<Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            {(comfort!=='skip'||usefulness!=='skip')&&<div className={styles.practiceRating} data-course-practice-adaptation>
              <p className={styles.prompt}>{words.adaptationTitle}</p>
              {adaptationProposal&&adaptationProposal.kind!=='stop'&&<p className={styles.helper}>
                {words.adaptationHint} {adaptationProposal.kind==='keep'?words.adaptationKeep:
                  adaptationProposal.kind==='simplify'?words.adaptationSimplify:words.adaptationNeutral}
              </p>}
              <div className={styles.feedbackOptions} role="group" aria-label={words.adaptationTitle}>
                {[
                  ['keep',words.adaptationKeep],['simplify',words.adaptationSimplify],
                  ['neutral',words.adaptationNeutral],
                ].map(([key,label])=><button key={key} type="button" disabled={locked}
                  aria-pressed={adaptationChoice===key} onClick={()=>setAdaptationChoice(key)}>
                  <span>{label}</span>{adaptationChoice===key&&<Check size={18} aria-hidden="true"/>}
                </button>)}
              </div>
            </div>}
            <small className={styles.helper}>{words.needSave}</small>
            </details>
          </>}
        </>}
        {!finished&&(GENTLE_EXERCISE_SLIDES.has(slide.kind)||(isDayOne&&slide.kind.startsWith('day1-')))&&
          <details className={styles.animalGuidance} key={'guidance-'+index}
            data-gentle-guidance={slide.kind}>
            <summary>
              <img src="/images/holistic-house/gentle-owl.svg" alt="" aria-hidden="true"
                width={43} height={43}/>
              <span>{locale==='ru'?'Показать мягкую подсказку'
                :locale==='es'?'Ver una pista suave':'Show gentle guidance'}</span>
              <ChevronDown size={16} aria-hidden="true"/>
            </summary>
            <p>{(GENTLE_TIPS[locale]||GENTLE_TIPS.en)[slide.kind]||
              (GENTLE_TIPS[locale]||GENTLE_TIPS.en).fallback}</p>
          </details>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </main>
      <footer className={styles.footer}>
        {!finished && !discomfortOpen && <div className={styles.subactions}>
          {index > 0 && <button type="button" disabled={locked} className={styles.back} onClick={goBack}>
            <ArrowLeft size={16}/>{words.back}</button>}
          {!isSkillV5&&(['baseline','checkin','guided','ritual','transfer','symbol','moment','reflection'].includes(slide.kind)
            || (isDayOne && slide.kind!=='welcome' && index<slides.length-1)) && <button
            type="button" className={styles.skip} disabled={locked} onClick={goNext}>
            {slide.kind === 'checkin' ? words.skipRating : words.skip}<SkipForward size={14}/></button>}
        </div>}
        {/* Close/skip stay available; voluntary comfort feedback can open neutral support. */}
        {!discomfortOpen && <button type="button" className={styles.primary} disabled={locked}
          onClick={finished ? (earned && rewardStep<2 ? () => setRewardStep(current=>Math.min(2,current+1))
              : (onFinish||onClose))
            : slide.kind === 'checkin' ? (lesson.antiStress||isOporaModule ? goNext : () => void saveCheckin())
            : index === slides.length - 1 ? () => void finishLesson()
            : goNext}>
          <span>{finished ? (earned && rewardStep<2 ? words.next : words.seeMap)
            : index === slides.length - 1 ? words.finish
            : slide.kind === 'checkin' && Number.isInteger(severity) ? words.saveNext : words.next}</span>
          {finished ? <CheckCircle2 size={19}/> : <ArrowRight size={19}/>}
        </button>}
        <p>{words.safety}</p>
      </footer>
    </div>
  </div>
}
