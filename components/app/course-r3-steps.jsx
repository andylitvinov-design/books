'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { appFetch } from '@/lib/app/client-fetch'
import { coursePendingKeys, startOrResumeCourseTest } from '@/lib/app/course-test-flow'
import { ArrowRight, Check, ClipboardList, Plus } from 'lucide-react'
import { COURSE_TOPICS, suggestedCourseTopics } from '@/lib/inner-growth/course-model'
import { courseMeasuredProfile, courseRecommendedTests, courseSuggestedFocus } from '@/lib/inner-growth/course-strategy'
import { getCoursePreset, coursePresetSuggestedScales } from '@/lib/inner-growth/course-presets'
import CourseCompletionReview from './course-completion-review'
import CourseFocusPicker from './course-focus-picker'
import styles from './course-r3-steps.module.css'

const UI = {
  en: {
    presetTag: 'Fixed', presetFixed: 'Fixed set for this programme', presetTestIntro: 'These five tests are already selected for your course. Confirm the list, complete only any missing tests, and then choose your focus from real measured scales.',
    focusTitle: 'Which areas matter to you?', focusHint: 'Choose one or several areas. You can also describe your concern in your own words.',
    optional: 'Describe my situation (optional)', describe: 'A few words about my concern (optional)',
    example: 'For example, I want to feel calmer in conversations and more supported.',
    useDescription: 'Suggest areas from my description', confirmFocus: 'Confirm my areas',
    urgent: 'If you might be in immediate danger, contact local emergency or crisis services. This course is not monitored.',
    editAreas: 'Edit my areas', testsTitle: 'Your five best-matching tests',
    testsIntro: 'We matched available questionnaires to your chosen areas. These five are selected for review, not saved until you confirm.',
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
    presetTag: 'Входит', presetFixed: 'Фиксированный набор для этой программы', presetTestIntro: 'Для этого курса заранее выбрано пять тестов. Подтвердите их, пройдите только недостающие и выберите направления по реальным измеренным шкалам.',
    focusTitle: 'С какими сферами хотите работать?', focusHint: 'Выберите одну или несколько сфер. Если хотите, дополнительно опишите проблему своими словами.',
    optional: 'Описать ситуацию (по желанию)', describe: 'Несколько слов о моей ситуации (по желанию)',
    example: 'Например: хочу спокойнее общаться и чувствовать больше внутренней опоры.',
    useDescription: 'Предложить темы по моему описанию', confirmFocus: 'Подтвердить мои темы',
    urgent: 'Если вам угрожает опасность, обратитесь в экстренную или кризисную службу. Курс не отслеживается в реальном времени.',
    editAreas: 'Изменить мои темы', testsTitle: 'Пять наиболее подходящих тестов',
    testsIntro: 'Мы подобрали доступные опросники по вашим темам. Пять первых отмечены для просмотра, но не сохранятся без подтверждения.',
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
async function saveExistingAccountPlan(items, accountId) {
  const response=await fetch('/api/app/test-plans',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','X-HH-Account-ID':accountId},
    body:JSON.stringify({items,operationId:crypto.randomUUID(),appendActive:true,replaceActive:false}),
  })
  const result=await response.json()
  if(!response.ok||result?.error) throw new Error(result.error||'TEST_PLAN_UNAVAILABLE')
  return result
}

export default function CourseR3Steps({stage,locale='en',data,state,busy,onAct,onCourseCommand,onCourseRead,isCourseCurrent,onState,onError,root}) {
  const t=UI[locale]||UI.en,ru=locale==='ru'
  const router=useRouter()
  const current=state.course||{}, assessment=state.assessments||{}
  const preset=getCoursePreset(current.presetId)
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
  const ranked=useMemo(()=>{
    const options=courseRecommendedTests({
      // Personal courses keep their editable relevance-ranked shortlist.
      focusTags:current.focusTags?.length ? current.focusTags
        : suggestedCourseTopics(current.concerns||'').topics,
      results:data.results||[],locale,
    })
    if (!preset) return options
    const choices=new Map(options.map(test=>[test.key,test]))
    // Fixed published battery: no opportunistic dynamic substitutions.
    return preset.testKeys.map(key=>choices.get(key)).filter(Boolean)
  },[current.focusTags,current.concerns,data.results,locale,preset])
  const profile=useMemo(()=>courseMeasuredProfile({
    results:data.results||[],testKeys:current.testKeys||[],locale,
  }),[data.results,current.testKeys,locale])
  const confirmed=(current.testKeys||[]).length>0
  const confirmedKeys=useMemo(()=>current.testKeys||[],[current.testKeys])
  const optionByKey=new Map(ranked.map(item=>[item.key,item]))
  const savedCount=assessment.completedSelectedCount||0
  const confirmedStatuses=assessment.selectedTests||[]
  const pending=confirmedStatuses.filter(item=>!item.completed)
  const minScales=Math.min(3,profile.eligible.length)
  const suggestedScales=useMemo(()=>preset
    ? coursePresetSuggestedScales(profile,preset.id,3)
    : courseSuggestedFocus(profile,3),[profile,preset])


  const ensureCurrent=()=>{if(!isCourseCurrent())throw new Error('COURSE_SELECTION_CHANGED')}
  const boundRequest=async(path,body)=>{
    ensureCurrent()
    const result=await appFetch(path,body,undefined,{accountId:data.account.id})
    ensureCurrent()
    return result
  }
  const courseTimeZone=()=>{
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
    catch { return 'UTC' }
  }
  async function submitFocusSelection(keys, isMeasured = true) {
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
      const result=await onCourseCommand('choose-goals',{
        expectedRevision:revision,
        ...(isMeasured ? {scaleKeys:keys} : {goals:fallbackGoals}),
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
      const fresh=await onCourseRead()
      const key=coursePendingKeys(fresh)[0]
      if (!key) { onState(fresh); return }
      const run=await startOrResumeCourseTest({ courseState:fresh, key, locale, request:boundRequest })
      ensureCurrent()
      router.push(root+'/runs/'+encodeURIComponent(run.id)+'?mode=guided&course=1&courseId='+encodeURIComponent(fresh.course.id))
    } catch(error) { onError(error.message||'COURSE_TEST_UNAVAILABLE') }
    finally { setOpeningTest(false) }
  }

  useEffect(()=>{
    if(stage!==2 || testsTouched) return
    setChosenTests(preset ? [...preset.testKeys] : confirmedKeys.length
      ? [...confirmedKeys] : ranked.slice(0,5).map(item=>item.key))
  },[stage,testsTouched,confirmedKeys,ranked,preset])
  function toggleTest(key) {
    if (preset) return
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
    if(actionLock.current||localBusy||busy||!chosenTests.length||chosenTests.length>12) return
    if(preset && (chosenTests.length!==preset.testKeys.length ||
      chosenTests.some((key,index)=>key!==preset.testKeys[index]))) {
      onError('COURSE_PRESET_TESTS_FIXED')
      return
    }
    actionLock.current=true
    setLocalBusy(true);onError('')
    try {
      ensureCurrent()
      const selected=chosenTests.map(key=>optionByKey.get(key))
      if(selected.some(item=>!item)) throw new Error('INVALID_PLAN_ITEM')
      const existing=new Set(assessment.planStatus==='cancelled'?[]:(assessment.planKeys||[]))
      const missing=selected.filter(item=>!existing.has(item.key))
      if(missing.length) await saveExistingAccountPlan(missing.map(item=>({
        definitionKey:item.key,definitionVersion:item.definitionVersion,instrumentLocale:item.instrumentLocale,
      })),data.account.id)
      ensureCurrent()
      // Server validates these keys against the actual private My Tests plan.
      const saved=await onCourseCommand('confirm-tests',{testKeys:chosenTests})
      onState(saved)
      setTestsTouched(false)
      setShowCompletedOptions(false)
    } catch(error){onError(error.message||'COURSE_TEST_SELECTION_UNAVAILABLE')}
    finally {actionLock.current=false;setLocalBusy(false)}
  }

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

  if(stage===2 && confirmed && pending.length===0 && !showCompletedOptions) {
    return <CourseCompletionReview
      t={t} root={root} confirmedStatuses={confirmedStatuses}
      optionByKey={optionByKey} profile={profile} suggested={suggestedScales}
      busy={busy||localBusy}
      onSuggested={()=>submitFocusSelection(suggestedScales.map(scale=>scale.id))}
      onAlternative={openManualFocus}
      onEditTests={preset?undefined:()=>setShowCompletedOptions(true)}/>
  }

  if(stage===2) {
    const visible=preset?ranked:showAll?ranked:ranked.filter((item,i)=>i<5||chosenTests.includes(item.key))
    return <section className={'hh-panel '+styles.section} data-course-tests>
      <div className={styles.sectionHeading}><h2>{t.testsTitle}</h2>
        {!preset&&<button type="button" className={styles.secondary} disabled={busy}
          onClick={()=>onAct('edit-intake')}>{t.editAreas}</button>}</div>
      <p>{preset?t.presetTestIntro:t.testsIntro}</p>
      {preset?<p className={styles.small}><strong>{t.presetFixed} · {preset.title[ru?'ru':'en']}</strong></p>
        :<p className={styles.small}>{t.relevanceHint}</p>}
      <div className={styles.testList} aria-label={t.testsTitle}>
        {visible.map(item=><label className={styles.testRow} key={item.key} data-checked={chosenTests.includes(item.key)}>
          <input type="checkbox" checked={chosenTests.includes(item.key)} disabled={busy||localBusy||Boolean(preset)||
            (!chosenTests.includes(item.key)&&chosenTests.length>=12)}
            onChange={()=>toggleTest(item.key)}/>
          <span className={styles.testBody}><strong>{item.title}</strong>
            <small>{item.measurementAxes.slice(0,3).join(' · ')}</small>
            <small className={item.completed?styles.completed:styles.pending}>
              {item.completed?<><Check size={13}/> {t.completed} · {formatDate(item.completedAt,locale)}</>
                :<>{t.needed} · ~{item.durationMinutes||'?'} min</>}
              {item.recommended&&<> · {t.recommended}</>}
            </small>
          </span>
          <span className={styles.match}>{preset?t.presetTag:<>{item.matchPercent}%<small>{t.relevance}</small></>}</span>
        </label>)}
      </div>
      {!preset&&<div className={styles.controls}>
        <button type="button" className={styles.secondary} onClick={()=>setShowAll(value=>!value)}>
          <Plus size={15}/>{showAll?t.showLess:t.showMore}</button>
        <Link href={root+'/tests?explore=1&course=1&filters=topics&courseId='+encodeURIComponent(current.id)}>{t.returnTests}<ArrowRight size={15}/></Link>
      </div>}
      {!preset&&<p className={styles.small}>{t.saveNotice}</p>}
      <div className={styles.selectionActions}><strong>{chosenTests.length} {t.chosen}</strong>
        <button className={confirmed ? styles.editSelection : 'hh-primary '+styles.cta}
          type="button" disabled={busy||localBusy||!chosenTests.length}
          onClick={saveTestSelection}>{preset?t.saveTests:confirmed?t.editTests:t.saveTests}<ArrowRight size={17}/></button>
      </div>
      {confirmed&&<section className={styles.progress} aria-label={t.pendingTitle}>
        <h3>{t.pendingTitle}</h3><p>{t.pendingText}</p>
        <strong>{savedCount} / {confirmedStatuses.length} {t.completed.toLowerCase()}</strong>
        <div className={styles.pendingList}>
          {confirmedStatuses.map(item=>{
            const meta=optionByKey.get(item.key)
            return <div key={item.key}><span>{item.completed?<Check size={15}/>:<ClipboardList size={15}/>}
              {meta?.title||item.key}</span><small>{item.completed?t.completed:t.needed}</small></div>
          })}
        </div>
        {pending.length===0?<p className={styles.completed}>{t.allDone}</p>:
          <button type="button" className={'hh-primary '+styles.ctaLink} disabled={busy||localBusy||openingTest}
            onClick={openFirstCourseTest}>{t.pendingTitle}<ArrowRight size={17}/></button>}
        {pending.length===0&&<button type="button" disabled={busy||localBusy}
          className={'hh-primary '+styles.cta} onClick={()=>onAct('review')}>{t.review}<ArrowRight size={17}/></button>}
        {pending.length>0&&<p className={styles.small}>{t.reviewDisabled}</p>}
      </section>}
    </section>
  }

  if(stage===3) {
    if(scaleView!=='manual') {
      return <CourseCompletionReview
        t={t} root={root} confirmedStatuses={confirmedStatuses}
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
