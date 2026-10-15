'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { appFetch } from '@/lib/app/client-fetch'
import { coursePendingKeys, startOrResumeCourseTest } from '@/lib/app/course-test-flow'
import { ArrowRight, Check, ClipboardList, Plus } from 'lucide-react'
import { COURSE_TOPICS, suggestedCourseTopics } from '@/lib/inner-growth/course-model'
import { courseMeasuredProfile, courseRecommendedTests, courseSuggestedFocus } from '@/lib/inner-growth/course-strategy'
import { courseProgramFromTopics, getCourseProgram, orderCourseProgramTests, suggestCourseProgramScales, ANTISTRESS_REQUIRED_BASELINE_KEY, ANTISTRESS_BASELINE_RECENCY_DAYS, isAntistressBaselineRecent, hasAntistressRequiredBaseline, withAntistressRequiredBaseline } from '@/lib/inner-growth/course-programs'
import { readCourseEntryIntent, discardCourseEntryIntent } from '@/lib/inner-growth/course-entry-client'
import CourseCompletionReview from './course-completion-review'
import AntiStressModuleFinder from './antistress-module-finder'
import CourseFocusPicker from './course-focus-picker'
import styles from './course-r3-steps.module.css'

const UI = {
  en: {
    focusTitle: 'Which areas matter to you?', focusHint: 'Choose one or several areas. You can also describe your concern in your own words.',
    optional: 'Describe my situation (optional)', describe: 'A few words about my concern (optional)',
    example: 'For example, I want to feel calmer in conversations and more supported.',
    useDescription: 'Suggest areas from my description', confirmFocus: 'Confirm my areas',
    urgent: 'If you might be in immediate danger, contact local emergency or crisis services. This course is not monitored.',
    editAreas: 'Edit my areas', testsTitle: 'Your five best-matching tests',
    testsIntro: 'Here is your starter measurement battery. Review the tests before confirming; existing results count.',
    stressTestsTitle: 'First, your Anti-Stress starting assessments',
    stressBaselineTitle: 'Before lesson 1: establish your starting point',
    stressBaselineText: 'HH Weekly Pulse (8 questions about the past week) is required. GAD-7 (7 questions about the past two weeks) and Resource Pulse (6 current-state questions) are optional. Recent compatible results count — no duplicate tests.',
    stressRequired: 'Core starting measurement · required', stressOptional: 'Optional',
    stressRetake: 'Previous result is too old for the baseline; please repeat this test.',
    stressMissingBaseline: 'Add and complete Weekly Pulse before opening lesson 1.',
    stressExtraNote: 'Only tests you confirm are saved to the course. GAD-7 is a symptom screen, not a diagnosis.',
    stressMeasuresTitle:'Your T0 measures before lesson one',
    stressMeasuresIntro:'The same selected questionnaires are offered after lesson 14 when their repeat interval is met. All measures are separate from skill practice and never combined into a diagnostic score.',
    stressPrimaryMeasure:'MAIN · ',stressWindowWeek:'Past 7 days',
    stressWindowFortnight:'Past 14 days',stressWindowNow:'Right now',
    stressScalesUnit:'separate scales',
    programmeLabel: 'Your chosen course', programmeBattery: 'Weekly Pulse is required before lessons; GAD-7 and Resource Pulse are optional. The Russian GAD-7 translation is not independently validated.',
    relevance: 'match', relevanceHint: 'The percentage estimates relevance to your chosen topics and measured scales, not diagnostic accuracy or psychological health.',
    completed: 'Already completed', needed: 'Not taken yet', recommended: 'Recommended',
    showMore: 'Add or remove more tests', showLess: 'Show the five suggestions',
    chosen: 'selected', saved: 'Confirmed for my course', saveTests: 'Confirm my test list',
    editTests: 'Change my test list', saveNotice: 'Only the tests you confirm are saved. Removing one here does not delete any existing result in My Tests.',
    returnTests: 'Open all My Tests and filters', pendingTitle: 'Complete your remaining tests',
    pendingText: 'Results already in your Cabinet count automatically. You only need the tests that are still missing.',
    allDone: 'All selected tests have compatible completed results.', review: 'See my measured profile',
    congratulations: 'Congratulations! You have completed your course tests.',
    completeDescription: 'Every test you selected has a saved result. Here is a short overview of your measured scales.',
    briefSummary: 'My course test results', noMeasuredScales: 'This questionnaire has no compatible displayable scales; its original result remains in My Tests.',
    viewMyResults: 'View results and choose my focus areas', reviseSelection: 'Change the course test selection',
    nextStage: 'NEXT STEP · MY COURSE',
    recommendedFocusTitle: 'Suggested focus areas for your course',
    recommendedFocusIntro: 'These areas are suggested from your own compatible test scales, with the strongest reported difficulties or lowest resources first. The choice is yours.',
    recommendationSafety: 'These are self-guided learning priorities, not a diagnosis, medical norms or proof that treatment is needed.',
    acceptSuggested: 'Yes, choose these {count} areas and start my course',
    chooseDifferent: 'Choose different focus areas',
    pickerIntro: 'Select 3–5 areas to work with. Every suitable measured scale is available below, with its original score.',
    mainSkillTitle:'My main course skill',mainSkillHelp:'The selected main scale is revisited throughout your new 14-day course. Your other selected scales remain supporting skills. You can change the main one before confirming.',
    generalFocusTitle: 'Choose my general learning directions',
    selectedFocusCount: 'areas selected', allEligibleFocus: 'Scales available for practice',
    availableFocus: 'available', suggested: 'Suggested',
    dailyTrackingTitle: 'Daily observation', dailyTrackingHelp: 'Your course includes an optional personal 0–10 check-in. Choose the name of the difficulty or resource you want to observe.',
    trackingFallback: 'Leave blank to use your first selected area as the daily observation label.',
    continueChosen: 'Continue with selected areas',
    backToSuggested: 'Back to recommended areas',
    reviewDisabled: 'Complete each remaining selected test to see your full profile.',
    profileTitle: 'Your current measured profile', profileIntro: 'These are the latest compatible scales from the tests you selected. Select any report to read its interpretation.',
    profileLink: 'Open full results portfolio', scaleGuide: 'Each bar shows the raw position in that questionnaire’s own range, not a health grade.', profileNone: 'No eligible measurements yet. Choose other questionnaires or review existing reports.',
    priorities: 'Seven possible focus areas', prioritiesHint: 'Ranked by position inside each individual questionnaire’s range, with symptom/resource directions interpreted correctly. This is not a clinical norm or comparable health percentage.',
    chooseScales: 'Choose 3–5 scales to practise', chooseScalesShort: 'Fewer valid scales are available. You can choose the available ones or take more tests.',
    share: 'areas selected', showOthers: 'Show all other eligible scales', noGoals: 'No suitable directional scales are available yet. You may choose a general skill, clearly not inferred from test results.',
    traitNote: 'Personality traits and traditional themes are informational, not deficits requiring correction.',
    otherScales: 'All measured scales', measured: 'Measured', older: 'Earlier result', personal: 'One issue to observe daily (optional)',
    goalConsent: 'I choose these areas and want a personal daily practice course.',
    startLessons: 'Start my daily course', requireScales: 'Choose at least 3 areas (up to 5), or all available if there are fewer than 3.',
    days: '14 days of gentle practice · about 5–12 minutes a day',
    error: 'Could not save the selection. Please try again.', report: 'View report',
    relativePriority: 'within-scale priority', noMedical: 'For education and self-observation; not diagnosis or psychotherapy.',
  },
  ru: {
    focusTitle: 'С какими сферами хотите работать?', focusHint: 'Выберите одну или несколько сфер. Если хотите, дополнительно опишите проблему своими словами.',
    optional: 'Описать ситуацию (по желанию)', describe: 'Несколько слов о моей ситуации (по желанию)',
    example: 'Например: хочу спокойнее общаться и чувствовать больше внутренней опоры.',
    useDescription: 'Предложить темы по моему описанию', confirmFocus: 'Подтвердить мои темы',
    urgent: 'Если вам угрожает опасность, обратитесь в экстренную или кризисную службу. Курс не отслеживается в реальном времени.',
    editAreas: 'Изменить мои темы', testsTitle: 'Пять наиболее подходящих тестов',
    testsIntro: 'Это стартовый набор измерений по теме курса. Проверьте тесты перед подтверждением; уже пройденные учитываются.',
    stressTestsTitle: 'Сначала — стартовые тесты Антистресс',
    stressBaselineTitle: 'Перед уроком 1: измеряем исходное состояние',
    stressBaselineText: 'HH Weekly Pulse (8 вопросов о последних 7 днях) — обязательный основной замер. GAD-7 (7 вопросов за 14 дней) и ресурсный опросник (6 вопросов о текущем состоянии) — по желанию. Недавние совместимые результаты учитываются без повторного прохождения.',
    stressRequired: 'Основной замер · обязателен', stressOptional: 'По желанию',
    stressRetake: 'Ранее пройденный тест устарел для исходного замера — пройдите ещё раз.',
    stressMissingBaseline: 'Добавьте и пройдите Weekly Pulse перед началом занятий.',
    stressExtraNote: 'В курс включаются только подтверждённые вами тесты. GAD-7 — скрининг симптомов, а не диагноз.',
    stressMeasuresTitle:'Исходное измерение T0 · до первого занятия',
    stressMeasuresIntro:'После 14-го урока предлагаются те же подтверждённые тесты при соблюдении интервалов повторения. Шкалы состояния и освоение навыков не смешиваются в общий клинический балл.',
    stressPrimaryMeasure:'ГЛАВНЫЙ · ',stressWindowWeek:'Последние 7 дней',
    stressWindowFortnight:'Последние 14 дней',stressWindowNow:'Прямо сейчас',
    stressScalesUnit:'отдельных шкал',
    programmeLabel: 'Ваш курс', programmeBattery: 'До первого урока нужен Weekly Pulse; GAD-7 и тест ресурсов — по желанию. Русский GAD-7 не прошёл самостоятельную валидацию.',
    relevance: 'соответствие', relevanceHint: 'Процент — примерная релевантность теста выбранным темам и реально измеряемым шкалам, а не точность диагноза и не уровень здоровья.',
    completed: 'Уже пройден', needed: 'Ещё не пройден', recommended: 'Рекомендуется',
    showMore: 'Добавить или убрать другие тесты', showLess: 'Показать только пять первых',
    chosen: 'выбрано', saved: 'Подтверждено для курса', saveTests: 'Подтвердить мой набор тестов',
    editTests: 'Изменить мой набор тестов', saveNotice: 'Только подтверждённые тесты сохраняются. Исключение теста из курса не удаляет старые результаты в «Моих тестах».',
    returnTests: 'Открыть все тесты и фильтры', pendingTitle: 'Пройти оставшиеся тесты',
    pendingText: 'Уже пройденные тесты из кабинета учитываются автоматически. Осталось выполнить только недостающие.',
    allDone: 'Все выбранные тесты уже пройдены в совместимых версиях.', review: 'Посмотреть мой профиль',
    congratulations: 'Поздравляем! Вы прошли все тесты курса.',
    completeDescription: 'Результаты выбранных тестов сохранены. Ниже краткая сводка измеренных шкал.',
    briefSummary: 'Результаты тестов курса', noMeasuredScales: 'Для этого опросника нет совместимых шкал для сводки; исходный результат сохранён в «Моих тестах».',
    viewMyResults: 'Смотреть результаты и выбрать направления работы', reviseSelection: 'Изменить набор тестов курса',
    nextStage: 'СЛЕДУЮЩИЙ ШАГ · МОЙ КУРС',
    recommendedFocusTitle: 'Рекомендованные шкалы для курса',
    recommendedFocusIntro: 'Эти темы предложены по вашим реальным совместимым шкалам: сначала более выраженные трудности или менее развитые ресурсы. Выбор остаётся за вами.',
    recommendationSafety: 'Это направления для самостоятельных практик, а не диагноз, медицинская норма или доказательство необходимости лечения.',
    acceptSuggested: 'Да, выбрать эти {count} темы и перейти к курсу',
    chooseDifferent: 'Выбрать другие шкалы',
    pickerIntro: 'Выберите 3–5 направлений для работы. Ниже доступны все подходящие измеренные шкалы с исходными баллами.',
    mainSkillTitle:'Мой основной навык курса',mainSkillHelp:'Основная шкала повторяется в течение нового 14-дневного курса. Остальные выбранные шкалы будут дополнительными. Основную можно поменять до подтверждения.',
    generalFocusTitle: 'Выбрать общие направления развития',
    selectedFocusCount: 'направлений выбрано', allEligibleFocus: 'Подходящие шкалы для практик',
    availableFocus: 'доступно', suggested: 'Рекомендуется',
    dailyTrackingTitle: 'Ежедневное наблюдение', dailyTrackingHelp: 'В курсе есть добровольная личная оценка состояния 0–10. Назовите трудность или ресурс, который хотите наблюдать.',
    trackingFallback: 'Если оставить пустым, используем название первой выбранной шкалы.',
    continueChosen: 'Продолжить с выбранными шкалами',
    backToSuggested: 'Вернуться к рекомендованным темам',
    reviewDisabled: 'Для полного профиля сначала пройдите недостающие выбранные тесты.',
    profileTitle: 'Мой текущий профиль по тестам', profileIntro: 'Здесь реальные шкалы из выбранных тестов и последние совместимые результаты. Нажмите на отчёт, чтобы увидеть подробности.',
    profileLink: 'Открыть полный профиль результатов', scaleGuide: 'Полоска показывает положение балла внутри шкалы конкретного теста, а не уровень здоровья.', profileNone: 'Пока нет подходящих измерений. Можно подобрать дополнительные тесты или посмотреть прошлые отчёты.',
    priorities: 'Семь возможных направлений работы', prioritiesHint: 'Сортировка по положению внутри шкалы с учётом направления симптомов и ресурсов. Это не медицинская норма и не общий процент психического здоровья.',
    chooseScales: 'Выберите 3–5 шкал для практики', chooseScalesShort: 'Доступно меньше трёх корректных шкал. Можно выбрать имеющиеся или пройти дополнительные тесты.',
    share: 'шкал выбрано', showOthers: 'Показать остальные доступные шкалы', noGoals: 'Пока нет подходящих шкал с однозначным направлением. Можно выбрать общие навыки, но они не считаются выводом из тестов.',
    traitNote: 'Черты личности и традиционные темы показаны для информации, а не для «исправления».',
    otherScales: 'Все измеренные шкалы', measured: 'Измерено', older: 'Более ранний результат', personal: 'Что я хочу наблюдать каждый день (по желанию)',
    goalConsent: 'Я самостоятельно выбираю эти направления и хочу проходить ежедневные практики.',
    startLessons: 'Начать ежедневный курс', requireScales: 'Выберите не меньше 3 и не больше 5 шкал (или все доступные, если их меньше 3).',
    days: '14 дней бережной практики · около 5–12 минут в день',
    error: 'Не получилось сохранить выбор. Попробуйте ещё раз.', report: 'Открыть отчёт',
    relativePriority: 'приоритет внутри шкалы', noMedical: 'Для обучения и самонаблюдения, не диагноз и не замена психотерапии.',
  },
}
const formatDate=(date,locale)=>{
  try { return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':'en-CA',{dateStyle:'medium'}).format(new Date(date)) }
  catch { return '' }
}
async function saveExistingAccountPlan(items) {
  const response=await fetch('/api/app/test-plans',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({items,operationId:crypto.randomUUID(),appendActive:true,replaceActive:false}),
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(result.error||'TEST_PLAN_UNAVAILABLE')
  return result
}

export default function CourseR3Steps({stage,locale='en',data,state,busy,onAct,onCourseCommand,onState,onError,root,quickEntry=false}) {
  const t=UI[locale]||UI.en,ru=locale==='ru'
  const router=useRouter()
  const current=state.course||{}, assessment=state.assessments||{}
  const [concerns,setConcerns]=useState(current.concerns||'')
  const [focusTags,setFocusTags]=useState(current.focusTags||[])
  const [chosenTests,setChosenTests]=useState([])
  const [testsTouched,setTestsTouched]=useState(false)
  const [showAll,setShowAll]=useState(false)
  const [chosenScales,setChosenScales]=useState([])
  const [scaleView,setScaleView]=useState('recommended')
  const actionLock=useRef(false)
  const [fallbackGoals,setFallbackGoals]=useState([])
  const [problemLabel,setProblemLabel]=useState((current.concerns||'').trim().slice(0,160))
  const [intention]=useState('')
  const [localBusy,setLocalBusy]=useState(false)
  const [openingTest,setOpeningTest]=useState(false)
  const [showCompletedOptions,setShowCompletedOptions]=useState(false)
  const predicted=useMemo(()=>suggestedCourseTopics(concerns),[concerns])
  const programme=useMemo(()=>courseProgramFromTopics(current.focusTags||[]),[current.focusTags])
  const ranked=useMemo(()=>orderCourseProgramTests(courseRecommendedTests({
    // A written concern may be the only confirmed request. Derive its
    // descriptive topic tags locally when no explicit sectors were selected.
    focusTags:current.focusTags?.length ? current.focusTags
      : suggestedCourseTopics(current.concerns||'').topics,
    results:data.results||[],locale,
  }),programme?.id),[current.focusTags,current.concerns,data.results,locale,programme?.id])
  const profile=useMemo(()=>courseMeasuredProfile({
    results:data.results||[],testKeys:current.testKeys||[],locale,
  }),[data.results,current.testKeys,locale])
  const confirmed=(current.testKeys||[]).length>0
  const confirmedKeys=current.testKeys||[]
  const isAntistress=programme?.id==='stress'
  const baselineConfirmed=hasAntistressRequiredBaseline(confirmedKeys,programme?.id)
  const optionByKey=new Map(ranked.map(item=>[item.key,item]))
  const savedCount=assessment.completedSelectedCount||0
  const confirmedStatuses=assessment.selectedTests||[]
  const pending=confirmedStatuses.filter(item=>!item.completed)
  const minScales=Math.min(3,profile.eligible.length)
  const suggestedScales=useMemo(()=>programme
    ? suggestCourseProgramScales(profile,programme.id,3) : courseSuggestedFocus(profile,3),[profile,programme])


  const courseTimeZone=()=>{
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
    catch { return 'UTC' }
  }
  async function submitFocusSelection(keys, isMeasured = true, moduleSelection = null) {
    if(actionLock.current || busy || localBusy) return
    const requested = isMeasured ? keys : fallbackGoals
    if(!Array.isArray(requested) || !requested.length) return
    if(isMeasured && (requested.length < minScales || requested.length > 5)) return
    actionLock.current=true
    setLocalBusy(true)
    onError('')
    try {
      // A stage-2 course must complete its private test review before goal
      // approval. Use the fresh revision from that response for the second
      // transaction, not the old revision captured by the UI closure.
      let revision=current.revision
      if(current.stage===2) {
        const reviewed=await onCourseCommand('review')
        onState(reviewed)
        revision=reviewed.course.revision
      }
      const firstSelected=profile.eligible.find(item=>isMeasured && keys.includes(item.id))?.label
      const label=(problemLabel.trim() || firstSelected || (ru?'Моё ежедневное наблюдение':'My daily observation')).slice(0,160)
      const result=await appFetch('course',{
        action:'choose-goals',expectedRevision:revision,
        ...(isMeasured ? {scaleKeys:keys} : {goals:fallbackGoals}),
        ...(moduleSelection?{
          moduleAnswers:moduleSelection.answers,moduleGoal:moduleSelection.goal,
          moduleId:moduleSelection.moduleId,
        }:{}),
        consent:true,durationDays:14,
        problemLabel:label,intention,timeZone:courseTimeZone(),
      })
      onState(result)
    } catch(error) {
      onError(error.message || 'COURSE_GOALS_UNAVAILABLE')
    } finally {
      actionLock.current=false
      setLocalBusy(false)
    }
  }

  async function openManualFocus() {
    if(actionLock.current || busy || localBusy) return
    actionLock.current=true
    setLocalBusy(true)
    onError('')
    try {
      if(current.stage===2) {
        const reviewed=await onCourseCommand('review')
        onState(reviewed)
      }
      setChosenScales(previous=>previous.length
        ? previous.filter(key=>profile.eligible.some(scale=>scale.id===key))
        : suggestedScales.map(scale=>scale.id))
      setScaleView('manual')
    } catch(error) { onError(error.message || 'COURSE_REVIEW_UNAVAILABLE') }
    finally { actionLock.current=false;setLocalBusy(false) }
  }

  async function openFirstCourseTest() {
    if (openingTest || localBusy || busy) return
    setOpeningTest(true)
    onError('')
    try {
      // A fresh, owner-scoped read is authoritative after edits in another tab.
      const fresh=await appFetch('course')
      const key=coursePendingKeys(fresh)[0]
      if (!key) { onState(fresh); return }
      const run=await startOrResumeCourseTest({ courseState:fresh, key, locale, request:appFetch })
      router.push(root+'/runs/'+encodeURIComponent(run.id)+'?mode=guided&course=1')
    } catch(error) { onError(error.message||'COURSE_TEST_UNAVAILABLE') }
    finally { setOpeningTest(false) }
  }

  useEffect(()=>{
    if(stage!==2 || testsTouched) return
    // A personal course entered from the public test selector reuses only
    // rights-cleared items that the course's server-backed list allows.
    let preferred = []
    const intent = readCourseEntryIntent()
    if (intent) {
      const available = new Set(ranked.map(item=>item.key))
      preferred = intent.testKeys.filter(key=>available.has(key))
    }
    const starter=programme?.id==='stress'
      ? ['hh-weekly-pulse'].filter(key=>ranked.some(item=>item.key===key))
      : ranked.slice(0,5).map(item=>item.key)
    // Weekly Pulse is the only compulsory existing questionnaire.
    // The short skill finder follows inside the course; GAD-7/Resource are opt-in.
    setChosenTests(withAntistressRequiredBaseline(confirmedKeys.length ? [...confirmedKeys] : preferred.length ? preferred : starter,programme?.id))
  },[stage,testsTouched,current.testKeys,ranked,programme?.id])
  function toggleTest(key) {
    if(isAntistress && key===ANTISTRESS_REQUIRED_BASELINE_KEY) return
    setTestsTouched(true)
    setChosenTests(previous=>previous.includes(key)
      ? previous.filter(value=>value!==key)
      : previous.length<12 ? [...previous,key] : previous)
  }
  function toggleScale(key) {
    setChosenScales(previous=>previous.includes(key)
      ? previous.filter(value=>value!==key)
      : previous.length<5 ? [...previous,key] : previous)
  }

  async function saveTestSelection() {
    if(localBusy||busy||!chosenTests.length||chosenTests.length>12) return
    if(!hasAntistressRequiredBaseline(chosenTests,programme?.id)) {
      onError('COURSE_ANTISTRESS_BASELINE_REQUIRED')
      return
    }
    setLocalBusy(true);onError('')
    try {
      const selected=chosenTests.map(key=>optionByKey.get(key))
      if(selected.some(item=>!item)) throw new Error('INVALID_PLAN_ITEM')
      const existing=new Set(assessment.planStatus==='cancelled'?[]:(assessment.planKeys||[]))
      const missing=selected.filter(item=>!existing.has(item.key))
      if(missing.length) await saveExistingAccountPlan(missing.map(item=>({
        definitionKey:item.key,definitionVersion:item.definitionVersion,instrumentLocale:item.instrumentLocale,
      })))
      // Server validates these keys against the actual private My Tests plan.
      const saved=await onCourseCommand('confirm-tests',{testKeys:chosenTests})
      onState(saved)
      // Saved authoritative course state now replaces the temporary visitor intent.
      discardCourseEntryIntent()
      setTestsTouched(false)
      setShowCompletedOptions(false)
    } catch(error){onError(error.message||'COURSE_TEST_SELECTION_UNAVAILABLE')}
    finally {setLocalBusy(false)}
  }


  // The short course CTA owns the starter battery: one mandatory HH Weekly
  // Pulse, two genuinely optional questionnaires. One button performs the
  // existing plan-save + course confirmation and opens the first *missing*
  // owner-scoped run. Never use a query parameter as proof of completion.
  async function startCompactTests() {
    if (busy || localBusy || openingTest || !chosenTests.length) return
    if (!hasAntistressRequiredBaseline(chosenTests, programme?.id)) {
      onError('COURSE_ANTISTRESS_BASELINE_REQUIRED')
      return
    }
    setLocalBusy(true)
    onError('')
    try {
      const sameSelection = confirmed && confirmedKeys.length === chosenTests.length &&
        confirmedKeys.every((key, index) => key === chosenTests[index])
      let fresh
      if (sameSelection) {
        fresh = await appFetch('course')
      } else {
        const selected = chosenTests.map(key => optionByKey.get(key))
        if (selected.some(item => !item)) throw new Error('INVALID_PLAN_ITEM')
        const existing = new Set(assessment.planStatus === 'cancelled' ? [] : (assessment.planKeys || []))
        const missing = selected.filter(item => !existing.has(item.key))
        if (missing.length) await saveExistingAccountPlan(missing.map(item => ({
          definitionKey: item.key, definitionVersion: item.definitionVersion,
          instrumentLocale: item.instrumentLocale,
        })))
        fresh = await onCourseCommand('confirm-tests', { testKeys: chosenTests })
        onState(fresh)
        discardCourseEntryIntent()
        setTestsTouched(false)
        setShowCompletedOptions(false)
      }
      const key = coursePendingKeys(fresh)[0]
      if (key) {
        const run = await startOrResumeCourseTest({ courseState: fresh, key, locale, request: appFetch })
        router.push(root + '/runs/' + encodeURIComponent(run.id) + '?mode=quick&course=1')
      } else {
        // Compatible saved results count. Continue to the existing five-level
        // navigator without forcing a duplicate test.
        const reviewed = await appFetch('course', {
          action: 'review', expectedRevision: fresh.course.revision,
        })
        onState(reviewed)
      }
    } catch (error) {
      onError(error.message || 'COURSE_TEST_UNAVAILABLE')
    } finally { setLocalBusy(false) }
  }

  if(stage===1 && quickEntry) return <section className={'hh-panel '+styles.section+' '+styles.compactTests} data-opora-fast-intake>
    <h2>{ru?'Начнём с исходного теста':'Begin with your baseline check'}</h2>
    <p>{ru?'Вы сможете выбрать интересующие темы и навыки после диагностики.':'You can choose your focus and skills after the starting assessment.'}</p>
    <button type="button" className={'hh-primary '+styles.cta} disabled={busy}
      onClick={()=>onAct('intake',{
        concerns:current.concerns||'',
        focusTags:current.focusTags?.length?current.focusTags:[...getCourseProgram('stress').focusTags],
      })}>{ru?'К стартовым тестам':'Continue to starting tests'} <ArrowRight size={17}/></button>
  </section>

  if(stage===1) return <section className={'hh-panel '+styles.section} data-course-focus>
    <h2>{t.focusTitle}</h2><p>{t.focusHint}</p>
    <div className={styles.topics} role="group" aria-label={t.focusTitle}>
      {COURSE_TOPICS.map(item=><button type="button" key={item.id}
        aria-pressed={focusTags.includes(item.id)}
        onClick={()=>setFocusTags(tags=>tags.includes(item.id)?tags.filter(key=>key!==item.id):[...tags,item.id])}>
        {item.title[ru?'ru':'en']}
      </button>)}
    </div>
    <details className={styles.details}>
      <summary>{t.optional}</summary>
      <label htmlFor="course-r3-concerns">{t.describe}</label>
      <textarea id="course-r3-concerns" rows={3} maxLength={1000} value={concerns}
        onChange={event=>setConcerns(event.target.value)} placeholder={t.example}/>
      {!!predicted.topics.length&&!predicted.urgent&&<button type="button" className={styles.secondary}
        onClick={()=>setFocusTags(predicted.topics)}>{t.useDescription}</button>}
    </details>
    {predicted.urgent&&<p role="alert" className={styles.warning}>{t.urgent}</p>}
    <button className={'hh-primary '+styles.cta} type="button"
      disabled={busy||predicted.urgent||(!focusTags.length&&!concerns.trim())}
      onClick={()=>onAct('intake',{concerns,focusTags})}>{t.confirmFocus}<ArrowRight size={17}/></button>
  </section>

  if(stage===2 && confirmed && baselineConfirmed && pending.length===0 && !showCompletedOptions && isAntistress){
    return <section className={'hh-panel '+styles.section} data-antistress-start-tests-complete>
      <div className={styles.completeHero}>
        <h2>{ru?'Исходное тестирование готово':'Your starting assessment is ready'}</h2>
        <p>{ru?'Weekly Pulse уже сохранён. Следующий шаг — восемь коротких вопросов о навыках. По ним мы предложим ваш уровень Антистресс 1–5.':
          'Your Weekly Pulse is saved. Next are eight short skill questions to suggest one of five Anti-Stress learning levels.'}</p>
        <strong>{confirmedStatuses.length} / {confirmedStatuses.length} {t.completed.toLowerCase()}</strong>
      </div>
      <div className={styles.focusActions}>
        <button type="button" className={'hh-primary '+styles.burgundyPrimary} disabled={busy||localBusy}
          data-open-antistress-module-finder onClick={()=>onAct('review')}>
          {ru?'Определить мой модуль':'Find my module'} <ArrowRight size={17}/>
        </button>
        <button type="button" className={styles.whiteSecondary}
          disabled={busy||localBusy} onClick={()=>setShowCompletedOptions(true)}>{t.reviseSelection}</button>
      </div>
    </section>
  }

  if(stage===2 && confirmed && baselineConfirmed && pending.length===0 && !showCompletedOptions) {
    return <CourseCompletionReview
      t={t} root={root} programId={programme?.id} locale={locale} confirmedStatuses={confirmedStatuses}
      optionByKey={optionByKey} profile={profile} suggested={suggestedScales}
      busy={busy||localBusy}
      onSuggested={()=>submitFocusSelection(suggestedScales.map(scale=>scale.id))}
      onAlternative={openManualFocus}
      onEditTests={()=>setShowCompletedOptions(true)}/>
  }


  // Default compact Anti-Stress battery; general test discovery stays in My Tests.
  // Existing confirmed extras are retained and can still be seen and edited.
  if(stage===2 && isAntistress) {
    const defaultKeys = new Set(['hh-weekly-pulse', 'gad-7', 'hh-resource-pulse'])
    const visible = ranked.filter((item,index) => defaultKeys.has(item.key) ||
      chosenTests.includes(item.key) || (showAll && index < 10))
    const hasPending = !confirmed || pending.length > 0
    return <section className={'hh-panel '+styles.section+' '+styles.compactTests} data-course-tests data-antistress-compact-picker>
      <p className={styles.compactEyebrow}>{ru?'ОПОРА · СТАРТОВАЯ ДИАГНОСТИКА':'OPORA · STARTING ASSESSMENT'}</p>
      <h2>{ru?'Начните с Weekly Pulse':'Start with Weekly Pulse'}</h2>
      <p className={styles.compactLead}>{ru
        ? '8 вопросов · около 2 минут. Результат поможет выбрать один из 5 уровней программы.'
        : '8 questions · about 2 minutes. Your answers help suggest one of five learning levels.'}</p>
      <div className={styles.shortTestList} data-course-antistress-pretests aria-label={t.stressTestsTitle}>
        {visible.map(item=>{
          const required=item.key===ANTISTRESS_REQUIRED_BASELINE_KEY
          const status=confirmedStatuses.find(row=>row.key===item.key)
          const days=ANTISTRESS_BASELINE_RECENCY_DAYS[item.key]
          const completed=status ? Boolean(status.completed) :
            Boolean(item.completed && (!days || isAntistressBaselineRecent(item.key,item.completedAt)))
          const outdated=Boolean(item.completed&&!completed)
          return <label key={item.key} className={styles.shortTestRow}
            data-checked={chosenTests.includes(item.key)}
            data-course-required-baseline={required?'true':undefined}>
            <input type="checkbox" checked={chosenTests.includes(item.key)}
              disabled={busy||localBusy||required||(!chosenTests.includes(item.key)&&chosenTests.length>=12)}
              onChange={()=>toggleTest(item.key)}/>
            <span className={styles.shortTestBody}>
              <strong>{item.title}</strong>
              <small>{required?(ru?'Обязательный · 8 вопросов':'Required · 8 questions')
                :item.key==='gad-7'?(ru?'По желанию · 7 вопросов':'Optional · 7 questions')
                :item.key==='hh-resource-pulse'?(ru?'По желанию · 6 вопросов':'Optional · 6 questions')
                :t.stressOptional}
                {' · '}{completed ? t.completed : outdated ? t.stressRetake : ('~'+(item.durationMinutes||2)+' min')}
              </small>
            </span>
            {completed && <Check size={18} className={styles.shortTestCheck} aria-label={t.completed}/>}
          </label>
        })}
      </div>
      <button type="button" className={'hh-primary '+styles.fastTestButton}
        disabled={busy||localBusy||openingTest||!chosenTests.length} onClick={startCompactTests}
        data-antistress-start-first-test>
        {localBusy||openingTest?(ru?'Подготавливаем…':'Preparing…')
          :hasPending?(ru?'Начать тестирование':'Start my assessment')
            :(ru?'Подобрать мой уровень':'Find my learning level')}
        <ArrowRight size={19} aria-hidden="true"/>
      </button>
      <div className={styles.shortTestExtras}>
        <button type="button" onClick={()=>setShowAll(value=>!value)} disabled={busy||localBusy}>
          <Plus size={15}/>{showAll?t.showLess:t.showMore}</button>
        <button type="button" onClick={()=>onAct('edit-intake')} disabled={busy||localBusy}>
          {t.editAreas}</button>
      </div>
      <details className={styles.shortTestDetails}>
        <summary>{ru?'О тестах и конфиденциальности':'About these tests and privacy'}</summary>
        <p>{t.stressBaselineText} {t.stressExtraNote}</p>
        <p>{t.saveNotice}</p>
        <Link href={root+'/tests?explore=1&course=1&filters=topics'}>{t.returnTests}</Link>
      </details>
    </section>
  }

  if(stage===2) {
    const visible=showAll?ranked:ranked.filter((item,i)=>i<5||chosenTests.includes(item.key))
    return <section className={'hh-panel '+styles.section} data-course-tests>
      {programme && <p className={styles.programmeContext} data-course-selected-programme><strong>{t.programmeLabel}:</strong> {programme.title[ru?'ru':'en']} · {t.programmeBattery}</p>}
      {isAntistress && <section className={styles.stressBaselineIntro} data-course-antistress-pretests aria-label={t.stressBaselineTitle}>
        <span className={styles.baselineIcon}><ClipboardList size={23} aria-hidden="true"/></span>
        <div><strong>{t.stressBaselineTitle}</strong><p>{t.stressBaselineText}</p></div>
      </section>}
      <div className={styles.sectionHeading}><h2>{isAntistress?t.stressTestsTitle:t.testsTitle}</h2>
        <button type="button" className={styles.secondary} disabled={busy}
          onClick={()=>onAct('edit-intake')}>{t.editAreas}</button></div>
      <p>{t.testsIntro}</p><p className={styles.small}>{t.relevanceHint}</p>
      <div className={styles.testList} aria-label={isAntistress?t.stressTestsTitle:t.testsTitle}>
        {visible.map((item,index)=>{
          const required=isAntistress && item.key===ANTISTRESS_REQUIRED_BASELINE_KEY
          const serverStatus=confirmedStatuses.find(row=>row.key===item.key)
          const recencyDays=ANTISTRESS_BASELINE_RECENCY_DAYS[item.key]
          const resultValid=serverStatus?Boolean(serverStatus.completed)
            :(isAntistress&&recencyDays?Boolean(item.completed &&
              isAntistressBaselineRecent(item.key,item.completedAt)):Boolean(item.completed))
          const outdated=Boolean(item.completed&&!resultValid)
          return <label className={styles.testRow} key={item.key} data-checked={chosenTests.includes(item.key)}
            data-course-required-baseline={required?'true':undefined}>
          <input type="checkbox" checked={chosenTests.includes(item.key)} disabled={busy||localBusy||required||
            (!chosenTests.includes(item.key)&&chosenTests.length>=12)}
            onChange={()=>toggleTest(item.key)}/>
          <span className={styles.testBody}><strong>{item.title}</strong>
            {isAntistress && ['hh-weekly-pulse','gad-7','hh-resource-pulse'].includes(item.key) &&
              <small className={required?styles.requiredBadge:styles.optionalBadge}>
                {required?t.stressRequired:t.stressOptional}
              </small>}
            <small>{item.measurementAxes.slice(0,3).join(' · ')}</small>
            <small className={resultValid?styles.completed:styles.pending}>
              {resultValid?<><Check size={13}/> {t.completed} · {formatDate(item.completedAt,locale)}</>
                :outdated&&isAntistress?t.stressRetake:<>{t.needed} · ~{item.durationMinutes||'?'} min</>}
              {serverStatus?.instrumentLocale&&<> · {serverStatus.instrumentLocale.toUpperCase()}</>}
              {item.recommended&&<> · {t.recommended}</>}
            </small>
          </span>
          <span className={styles.match}>{item.matchPercent}%<small>{t.relevance}</small></span>
        </label>})}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.secondary} onClick={()=>setShowAll(value=>!value)}>
          <Plus size={15}/>{showAll?t.showLess:t.showMore}</button>
        <Link href={root+'/tests?explore=1&course=1&filters=topics'}>{t.returnTests}<ArrowRight size={15}/></Link>
      </div>
      <p className={styles.small}>{t.saveNotice}</p>
      {isAntistress && <p className={styles.small} data-course-antistress-battery-note>{t.stressExtraNote}</p>}
      <div className={styles.selectionActions}><strong>{chosenTests.length} {t.chosen}</strong>
        <button className={confirmed ? styles.editSelection : 'hh-primary '+styles.cta}
          type="button" disabled={busy||localBusy||!chosenTests.length}
          onClick={saveTestSelection}>{confirmed?t.editTests:t.saveTests}<ArrowRight size={17}/></button>
      </div>
      {confirmed&&<section className={styles.progress} aria-label={t.pendingTitle}>
        <h3>{t.pendingTitle}</h3><p>{t.pendingText}</p>
        <strong>{savedCount} / {confirmedStatuses.length} {t.completed.toLowerCase()}</strong>
        <div className={styles.pendingList}>
          {confirmedStatuses.map(item=>{
            const meta=optionByKey.get(item.key)
            return <div key={item.key}><span>{item.completed?<Check size={15}/>:<ClipboardList size={15}/>}
              {meta?.title||item.key}</span><small>{item.completed?t.completed:t.needed}
                {item.outdated&&<> · {ru?'Нужен свежий исходный замер':'Fresh baseline needed'}</>}
                {item.instrumentLocale&&<> · {item.instrumentLocale.toUpperCase()}</>}</small></div>
          })}
        </div>
        {pending.length===0?<p className={baselineConfirmed?styles.completed:styles.pending}>{baselineConfirmed?t.allDone:t.stressMissingBaseline}</p>:
          <button type="button" className={'hh-primary '+styles.ctaLink} disabled={busy||localBusy||openingTest}
            onClick={openFirstCourseTest}>{t.pendingTitle}<ArrowRight size={17}/></button>}
        {pending.length===0&&baselineConfirmed&&<button type="button" disabled={busy||localBusy}
          className={'hh-primary '+styles.cta} onClick={()=>onAct('review')}>{t.review}<ArrowRight size={17}/></button>}
        {pending.length>0&&<p className={styles.small}>{t.reviewDisabled}</p>}
      </section>}
    </section>
  }

  if(stage===3 && isAntistress) {
    return <AntiStressModuleFinder locale={locale} profile={profile} busy={busy||localBusy}
      onStart={selection=>submitFocusSelection(suggestedScales.map(scale=>scale.id),
        profile.eligible.length>0,selection)}/>
  }

  if(stage===3) {
    if(scaleView!=='manual') {
      return <CourseCompletionReview
        t={t} root={root} programId={programme?.id} locale={locale} confirmedStatuses={confirmedStatuses}
        optionByKey={optionByKey} profile={profile} suggested={suggestedScales}
        busy={busy||localBusy}
        onSuggested={()=>submitFocusSelection(suggestedScales.map(scale=>scale.id))}
        onAlternative={openManualFocus}/>
    }
    return <CourseFocusPicker
      t={t} locale={locale} profile={profile} suggested={suggestedScales}
      chosenScales={chosenScales} chosenGoals={fallbackGoals}
      onToggleScale={toggleScale}
      onSetPrimaryScale={key=>setChosenScales(previous=>previous.includes(key)?[key,...previous.filter(item=>item!==key)]:previous)}
      onToggleGoal={key=>setFallbackGoals(previous=>previous.includes(key)
        ?previous.filter(x=>x!==key):previous.length<3?[...previous,key]:previous)}
      problemLabel={problemLabel} onProblemLabel={setProblemLabel}
      minScales={minScales} busy={busy||localBusy}
      onContinue={()=>submitFocusSelection(chosenScales,profile.eligible.length>0)}
      onBack={()=>setScaleView('recommended')}/>
  }

  return null
}
