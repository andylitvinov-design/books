'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookmarkCheck, Check, CheckCircle2, ChevronDown,
  Clock3, Compass, Crown, Heart, Leaf, LockKeyhole, ShieldCheck,
  SkipForward, Sparkles, Star, Target, Trophy, Waves, X,
} from 'lucide-react'
import CourseGuidedTimer from './course-guided-timer'
import { compareLessonMoments, changeAmount } from '@/lib/inner-growth/course-moment-trends'
import { practiceAdjustmentSuggestion } from '@/lib/inner-growth/course-adaptation'
import styles from './course-slide-player.module.css'

const WORDS = {
  en: {
    day: 'Day', step: 'Step', of: 'of', close: 'Return to my course',
    pace: 'Choose your rhythm', pacePrompt: 'How would you like to practise today?',
    shortDetail: 'A gentle, shorter version', standardDetail: 'Take the time you need', noImageryDetail: 'Stay with words and senses',
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
    checkin: 'Notice your day', checkinQuestion: 'How difficult was this concern during the last 24 hours?',
    ratingHint: 'There is no correct number. This voluntary self-rating is not a clinical test.',
    low: '0 · Not difficult', high: '10 · Very difficult', skipRating: 'Skip this check-in',
    idea: 'A thought to take with you', ideaLabel: 'Today’s thought',
    recall: 'Remember a familiar skill', recallHint: 'Try recalling it without pressure, or simply continue.',
    phrase: 'A more flexible thought', phraseHint: 'This is a possible phrase, not something you must believe.',
    guided: 'A moment of practice', gentle: 'Eyes can remain open; breathe naturally. Pause or skip anything uncomfortable.',
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
    discomfortAction: 'I feel uncomfortable', discomfortTitle: 'You may stop the exercise',
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
    finish: 'Finish and save', finished: 'A little step forward!',
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
    promoContinue: 'See the Pro options', promoBrand: 'PRO FEATURES · ADVANCED PLAN',
    promoTitle: 'Grow in five directions', promoText: 'With Advanced you can run up to five courses in parallel, without advertising.',
    promoPrice: 'Advanced · €20 / month', promoCta: 'Explore subscription options',
    promoSoon: 'Checkout is not active yet. Your free course stays available.',
    promoSkip: 'No thanks, back to my course', promoDisclaimer: 'Optional monthly membership. Your lessons and results stay yours.',
  },
  ru: {
    day: 'День', step: 'Шаг', of: 'из', close: 'Вернуться к моему курсу',
    pace: 'Выберите свой темп', pacePrompt: 'Как вам будет комфортнее сегодня?',
    shortDetail: 'Мягко и немного короче', standardDetail: 'Без спешки, в своём ритме', noImageryDetail: 'Только слова и ощущения',
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
    checkin: 'Заметьте свой день', checkinQuestion: 'Насколько эта трудность ощущалась за последние 24 часа?',
    ratingHint: 'Правильных чисел нет. Это добровольная самооценка, не клинический тест.',
    low: '0 · Не беспокоила', high: '10 · Очень сильно', skipRating: 'Пропустить замер',
    idea: 'Мысль, которую можно взять с собой', ideaLabel: 'Мысль дня',
    recall: 'Вспомните знакомый навык', recallHint: 'Попробуйте вспомнить без напряжения — или просто продолжайте.',
    phrase: 'Более гибкая мысль', phraseHint: 'Это возможная формулировка. Не обязательно верить в неё.',
    guided: 'Момент практики', gentle: 'Можно не закрывать глаза и не менять дыхание. Неудобный шаг пропускайте.',
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
    discomfortAction: 'Мне некомфортно', discomfortTitle: 'Вы можете остановить упражнение',
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
    finish: 'Завершить и сохранить', finished: 'Маленький шаг вперёд!',
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
    promoContinue: 'Возможности Pro', promoBrand: 'PRO-ВОЗМОЖНОСТИ · ТАРИФ ADVANCED',
    promoTitle: 'Развивайтесь в пяти направлениях', promoText: 'С тарифом Advanced можно вести до пяти курсов одновременно, без рекламы.',
    promoPrice: 'Advanced · 20 € / месяц', promoCta: 'Посмотреть варианты подписки',
    promoSoon: 'Оплата пока не подключена. Бесплатный курс остаётся доступным.',
    promoSkip: 'Не сейчас, вернуться в курс', promoDisclaimer: 'Необязательная ежемесячная подписка. Уроки и результаты сохраняются.',
  },
}

const SCENE = {
  pace: Compass,
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

function buildSlides(lesson) {
  const guided = (lesson.sections || []).filter(section => ['arrive', 'meditation', 'finish'].includes(section.kind))
  return [
    { key: 'pace', kind: 'pace' },
    { key: 'baseline', kind: 'baseline' },
    { key: 'checkin', kind: 'checkin' },
    ...(lesson.practiceV3?.recall ? [{ key: 'recall', kind: 'recall' }] : []),
    { key: 'idea', kind: 'idea' },
    ...((lesson.sections||[]).some(section=>section.kind==='learn')?[{key:'understand',kind:'understand'}]:[]),
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

export default function CourseSlidePlayer({
  locale = 'en', data, busy = false, promotion = {}, onOpenRetest, onClose, onFinish, onCheckin, onSession, onPreferences,
}) {
  const words = WORDS[locale] || WORDS.en
  const cycle = data.cycle || {}
  const lesson = data.lesson || {}
  const today = data.currentCheckin
  const session = data.currentSession
  const focusLabel = cycle.activeScaleLabel || data.roadmap?.find(item => item.day === cycle.day)?.focusTitle || data.target?.label || words.todaySkill
  const resourceFocus = /(ресурс.*опор|опор.*ресурс|resource.*support|support.*resource)/i.test(String(focusLabel))
  const baselinePrompt = resourceFocus ? words.baselineResourceQuestion : words.baselineQuestion
  const alreadyDone = Boolean(session)
  const slides = useMemo(() => buildSlides(lesson), [lesson])
  const [index, setIndex] = useState(alreadyDone ? slides.length : 0)
  const [severity, setSeverity] = useState(today?.severity ?? null)
  const [reflection, setReflection] = useState(session?.reflection || '')
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
  const [discomfortOpen, setDiscomfortOpen] = useState(false)
  const [neutralMode, setNeutralMode] = useState(false)
  const [pace, setPace] = useState(() => cycle.preferences?.imagery === 'no_imagery'
    ? 'no_imagery' : cycle.preferences?.length === 'quick' ? 'quick' : 'standard')
  const [earned, setEarned] = useState(false)
  const [rewardStep, setRewardStep] = useState(alreadyDone ? 2 : 0)
  const [promoOpen, setPromoOpen] = useState(false)
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
  const finished = index >= slides.length
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

  useEffect(() => {
    frame.current?.querySelector('[data-slide-scroller]')?.scrollTo({top:0,behavior:'instant'})
    headingRef.current?.focus()
  }, [index, rewardStep, promoOpen])

  function goNext() { setError(''); setIndex(current => Math.min(current + 1, slides.length)) }
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

  async function savePace() {
    if (submitting.current) return
    const previous = cycle.preferences || {}
    const next = pace === 'quick'
      ? { length:'quick', imagery:previous.imagery || 'optional' }
      : pace === 'no_imagery'
        ? { length:previous.length || 'standard', imagery:'no_imagery' }
        : { length:'standard', imagery:'optional' }
    if ((previous.length||'standard') === next.length &&
        (previous.imagery||'optional') === next.imagery) { goNext(); return }
    submitting.current = true
    setSaving(true); setError('')
    try {
      const result = await onPreferences(next)
      if (result) goNext()
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  async function finishLesson() {
    if (alreadyDone) { setIndex(slides.length); return }
    if (submitting.current) return
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
        transferPlan:cycle.day===6?transferPlan:'',
      })
      if (response) { sessionOp.current = null; setEarned(true); setIndex(slides.length) }
      else setError(words.saveError)
    } catch { setError(words.saveError) }
    finally { submitting.current = false; setSaving(false) }
  }

  const title = promoOpen ? words.promoTitle : finished ? words.finished : slide.kind === 'guided' ? (slide.section.title || words.guided) : words[slide.kind]
  const Icon = finished ? Trophy : (SCENE[slide.kind] || Sparkles)
  const progress = finished ? 100 : Math.round((index / slides.length) * 100)
  const lessonsSaved = Number(data.progress?.practiceCount) || 0
  const practiceStreak = Number(data.progress?.practiceStreak) || 0
  const paired = compareLessonMoments(alreadyDone ? session?.beforeNow : beforeNow, alreadyDone ? session?.afterNow : afterNow)
  const scenicBaseline = !finished && !promoOpen && !discomfortOpen && slide.kind === 'baseline'

  return <div className={styles.overlay} role="dialog" aria-modal="true"
    aria-label={words.day + ' ' + cycle.day + ': ' + title}
    data-course-slide-player ref={frame}>
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
          <small>{finished ? words.completed : words.step + ' ' + (index + 1) + ' ' + words.of + ' ' + slides.length}</small>
        </div>
        <div className={styles.dayPill}>{cycle.day}/14</div>
      </header>
      <main className={styles.content} data-slide-scroller data-slide-kind={promoOpen ? "offer" : finished ? "completion" : slide.kind}>
        {!finished && discomfortOpen ? <section className={styles.discomfortPanel} data-course-discomfort-support aria-label={words.discomfortTitle}>
          <ShieldCheck size={36} aria-hidden="true"/>
          <h2 tabIndex={-1} ref={headingRef}>{words.discomfortTitle}</h2><p>{words.discomfortIntro}</p>
          <button type="button" onClick={() => { setNeutralMode(true); setSymbolMode('words'); setFeedback('uncomfortable'); setDiscomfortOpen(false) }}>{words.discomfortNeutral}</button>
          <button type="button" onClick={onClose}>{words.discomfortExit}</button>
          <a href="https://findahelpline.com/en" target="_blank" rel="noopener noreferrer">{words.discomfortHelp}<ArrowRight size={16}/></a>
          <small>{words.discomfortEmergency}</small>
        </section> : promoOpen && promotion.show ? <div className={styles.promoSlide} data-course-post-lesson-promo>
          <div className={styles.promoIcon}><Crown size={42} aria-hidden="true"/></div>
          <p className={styles.promoBrand}>{words.promoBrand}</p>
          <h2 tabIndex={-1} ref={headingRef}>{words.promoTitle}</h2>
          <p className={styles.promoLead}>{words.promoText}</p>
          <div className={styles.promoBenefits}>
            <div><CheckCircle2 size={21}/><span>5 {locale==='ru'?'параллельных курсов':'parallel courses'}</span></div>
            <div><CheckCircle2 size={21}/><span>{locale==='ru'?'Без рекламы':'No advertising'}</span></div>
          </div>
          <strong className={styles.promoPrice}>{words.promoPrice}</strong>
          {promotion.checkoutReady ? <a className={styles.promoLink} href={'/'+locale+'/app/settings#subscriptions'}>{words.promoCta}<ArrowRight size={17}/></a>
            : <p className={styles.promoSoon}>{words.promoSoon}</p>}
          <p className={styles.promoLegal}>{words.promoDisclaimer}</p>
        </div> : finished && earned && rewardStep===0 ? <div className={styles.finished}
          data-course-slide-completion data-course-reward-stage="celebration" aria-live="polite">
          <IllustratedMoment variant="celebration"/>
          <p className={styles.rewardKicker}><CheckCircle2 size={17}/>{words.day} {cycle.day} · {words.celebrationLabel}</p>
          <h2 tabIndex={-1} ref={headingRef}>{words.finished}</h2>
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
          <h2 tabIndex={-1} ref={headingRef}>{earned ? words.rewardPath : words.completed}</h2>
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
          <div className={styles.slideIdentity}>
            <span className={styles.identityTag}><Icon size={17} aria-hidden="true"/>{words.day} {cycle.day}</span>
            <span className={styles.identityLabel}>{lesson.title}</span>
          </div>
          <h2 className={styles.slideTitle} ref={headingRef} tabIndex={-1}>{title}</h2>

          {slide.kind === 'pace' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.prompt}>{words.pacePrompt}</p>
            <div className={styles.paceChoices} role="group" aria-label={words.pacePrompt}>
              {[
                ['quick',words.short,words.shortDetail,Clock3],
                ['standard',words.standard,words.standardDetail,Waves],
                ['no_imagery',words.noImagery,words.noImageryDetail,Leaf],
              ].map(([key,label,detail,OptionIcon])=><button key={key} type="button"
                disabled={locked} aria-pressed={pace===key} onClick={()=>setPace(key)}>
                <span className={styles.paceIcon}><OptionIcon size={22} aria-hidden="true"/></span>
                <span className={styles.paceCopy}><strong>{label}</strong><small>{detail}</small></span>
                {pace===key?<CheckCircle2 size={19} className={styles.paceCheck} aria-hidden="true"/>:
                  <ArrowRight size={18} aria-hidden="true"/>}
              </button>)}
            </div>
          </>}

          {slide.kind === 'baseline' && <>
            <p className={styles.focusName}>{words.focusForToday}: <strong>{focusLabel}</strong></p>
            <p className={styles.prompt} data-course-baseline-presence>{baselinePrompt}</p>
            <MomentScale value={entryNow} onChange={setEntryNow} words={words}
              label={baselinePrompt + ': ' + focusLabel} lowLabel={words.baselineLow}
              highLabel={words.baselineHigh} disabled={locked}/>
            <p className={styles.helper}>{words.ratingHint}</p>
          </>}

          {slide.kind === 'checkin' && <>
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
          </>}

          {slide.kind === 'idea' && <>
            <IllustratedMoment photo kind={slide.kind}/>
            <blockquote className={styles.quote}>“{lesson.aphorism}”</blockquote>
          </>}
          {slide.kind === 'understand' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.sections?.find(part => part.kind === 'learn')?.text}</p>
          </>}

          {slide.kind === 'recall' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.practiceV3?.recall}</p>
            <p className={styles.helper}>{words.recallHint}</p>
          </>}

          {slide.kind === 'phrase' && <>
            <IllustratedMoment photo variant="books" kind={slide.kind}/>
            {cycle.day===5 && <div className={[styles.modeTabs, styles.thoughtChoices].join(" ")} role="group" aria-label={words.choiceTitle}>
              {[['cbt',words.cbtChoice],['act',words.actChoice],['neutral',words.neutralChoice]].map(([key,label])=><button key={key} type="button"
                disabled={locked} aria-pressed={thoughtChoice===key} onClick={()=>setThoughtChoice(key)}>{label}</button>)}
            </div>}
            <blockquote className={styles.quote}>{cycle.day===5 ? (thoughtChoice==='cbt' ? words.cbtText : thoughtChoice==='act' ? words.actText : words.neutralText) : lesson.workbook?.workingPosition}</blockquote>
            <p className={styles.helper}>{words.phraseHint}</p>
          </>}

          {slide.kind === 'guided' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            {slide.section.kind==='meditation' && <div className={styles.practiceRating} data-course-practice-pre>
              <p className={styles.prompt}>{words.practicePrePrompt}</p>
              <MomentScale value={beforeNow} onChange={setBeforeNow} words={words}
                label={words.before + ': ' + focusLabel} disabled={locked}/>
            </div>}
            <p className={styles.prompt}>{neutralMode ? words.neutralPractice : slide.section.text}</p>
            <p className={styles.helper}>{words.gentle}</p>
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
            {slide.section.kind==='meditation' && <div className={styles.practiceRating} data-course-practice-post>
              <p className={styles.prompt}>{words.practicePostPrompt}</p>
              <MomentScale value={afterNow} onChange={setAfterNow} words={words}
                label={words.after + ': ' + focusLabel} disabled={locked}/>
            </div>}
          </>}

          {slide.kind === 'ritual' && <>
            <IllustratedMoment kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.ritual}</p>
            <p className={styles.helper}>{words.transferHint}</p>
          </>}

          {slide.kind === 'transfer' && <>
            <IllustratedMoment kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.workbook?.microPractice}</p>
            <p className={styles.helper}>{words.transferHint}</p>
            {cycle.day===6 && <>
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
            {cycle.day===10 && <div className={styles.practiceRating} data-course-day-six-recall>
              <strong>{words.lastPlanTitle}</strong>
              <p>{data.daySixPlan?.plan || words.noSavedPlan}</p>
              {data.daySixPlan?.stage && <small>{words.transferStageTitle}: {data.daySixPlan.stage}</small>}
            </div>}
          </>}

          {slide.kind === 'symbol' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
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
          </>}

          {slide.kind === 'reflection' && <>
            <IllustratedMoment kind={slide.kind}/>
            <p className={styles.prompt}>{lesson.workbook?.question || lesson.reflection}</p>
            <label className={styles.noteField}><span>{words.note}</span>
              <textarea maxLength={500} rows={4} value={reflection}
                placeholder={lesson.workbook?.sentenceStarter || ''}
                onChange={event => setReflection(event.target.value)} disabled={locked}/>
            </label>
            <p className={styles.helper}><LockKeyhole size={15}/>{words.reflectionHint}</p>
          </>}

          {slide.kind === 'moment' && <>
            <IllustratedMoment kind={slide.kind}/>
            <p className={styles.focusName}>{words.focusForToday}: <strong>{focusLabel}</strong></p>
            <p className={styles.prompt}>{words.moment}</p>
            {compareLessonMoments(beforeNow,afterNow)
              ? <p className={styles.instruction}>{beforeNow}/10 → {afterNow}/10</p>
              : <p className={styles.helper}>{words.momentNoPair}</p>}
            <p className={styles.helper}>{words.momentHint}</p>
          </>}

          {slide.kind === 'feedback' && <>
            <IllustratedMoment variant="calm" kind={slide.kind}/>
            <p className={styles.helper}>{words.feedbackHint}</p>
            <p className={styles.prompt}>{words.comfortTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.comfortTitle} data-course-comfort>
              {[
                ['comfortable',words.comfortableChoice],['neutral',words.neutralComfort],
                ['uncomfortable',words.uncomfortable],['skip',words.preferNot],
              ].map(([key,label])=><button type="button" key={key} disabled={locked}
                aria-pressed={comfort===key} onClick={()=>{setComfort(key);if(key==='uncomfortable'){setFeedback('uncomfortable');setDiscomfortOpen(true)}}}>
                <span>{label}</span>{comfort===key&&<Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            <p className={styles.prompt}>{words.usefulTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.usefulTitle} data-course-usefulness>
              {[
                ['useful',words.usefulChoice],['unchanged',words.unchangedChoice],
                ['unsure',words.unsureChoice],['skip',words.preferNot],
              ].map(([key,label])=><button type="button" key={key} disabled={locked}
                aria-pressed={usefulness===key} onClick={()=>setUsefulness(key)}>
                <span>{label}</span>{usefulness===key&&<Check size={18} aria-hidden="true"/>}
              </button>)}
            </div>
            <p className={styles.prompt}>{words.flexibilityTitle}</p>
            <div className={styles.feedbackOptions} role="group" aria-label={words.flexibilityTitle} data-course-flexibility>
              {[
                ['more_choice',words.moreChoice],['same',words.sameChoice],
                ['unsure',words.unsureChoice],['skip',words.preferNot],
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
          </>}
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </main>
      <footer className={styles.footer}>
        {promoOpen && promotion.show && <div className={styles.subactions}>
          <button type="button" className={styles.skip} onClick={onFinish||onClose}>{words.promoSkip}<SkipForward size={14}/></button>
        </div>}
        {!finished && !discomfortOpen && <div className={styles.subactions}>
          {index > 0 && <button type="button" disabled={locked} className={styles.back} onClick={goBack}>
            <ArrowLeft size={16}/>{words.back}</button>}
          {['baseline','checkin','guided','ritual','transfer','symbol','moment','reflection'].includes(slide.kind) && <button
            type="button" className={styles.skip} disabled={locked} onClick={goNext}>
            {slide.kind === 'checkin' ? words.skipRating : words.skip}<SkipForward size={14}/></button>}
        </div>}
        {/* Safe exit must be reachable from every learning slide, including the initial rating and reflection. The active timer is unmounted when the support panel opens. */}
        {!finished && !discomfortOpen && !promoOpen && <button type="button" className={styles.discomfortShortcut} disabled={locked} onClick={()=>setDiscomfortOpen(true)} data-course-global-discomfort>{words.discomfortAction}</button>}
        {!discomfortOpen && <button type="button" className={styles.primary} disabled={locked}
          onClick={promoOpen ? (onFinish||onClose)
            : finished ? (earned && rewardStep<2 ? () => setRewardStep(current=>Math.min(2,current+1))
              : promotion.show && earned ? () => setPromoOpen(true) : (onFinish||onClose))
            : slide.kind === 'pace' ? () => void savePace()
            : slide.kind === 'checkin' ? () => void saveCheckin()
            : index === slides.length - 1 ? () => void finishLesson()
            : goNext}>
          <span>{promoOpen ? words.seeMap : finished ? (earned && rewardStep<2 ? words.next
              : promotion.show && earned ? words.promoContinue : words.seeMap)
            : index === slides.length - 1 ? words.finish
            : slide.kind === 'pace' || (slide.kind === 'checkin' && Number.isInteger(severity)) ? words.saveNext : words.next}</span>
          {finished ? <CheckCircle2 size={19}/> : <ArrowRight size={19}/>}
        </button>}
        <p>{words.safety}</p>
      </footer>
    </div>
  </div>
}
