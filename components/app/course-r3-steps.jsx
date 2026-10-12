'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ClipboardList, Heart, Plus, SlidersHorizontal } from 'lucide-react'
import { COURSE_TOPICS, GROWTH_GOALS, suggestedCourseTopics } from '@/lib/inner-growth/course-model'
import { courseMeasuredProfile, courseRecommendedTests } from '@/lib/inner-growth/course-strategy'
import styles from './course-r3-steps.module.css'

const UI = {
  en: {
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
    reviewDisabled: 'Complete each remaining selected test to see your full profile.',
    profileTitle: 'Your current measured profile', profileIntro: 'These are the latest compatible scales from the tests you selected. Select any report to read its interpretation.',
    profileLink: 'Open full results portfolio', scaleGuide: 'Each bar shows the raw position in that questionnaire’s own range, not a health grade.', profileNone: 'No eligible measurements yet. Choose other questionnaires or review existing reports.',
    priorities: 'Seven possible focus areas', prioritiesHint: 'Ranked by position inside each individual questionnaire’s range, with symptom/resource directions interpreted correctly. This is not a clinical norm or comparable health percentage.',
    chooseScales: 'Choose 3–5 scales to practise', chooseScalesShort: 'Fewer valid scales are available. You can choose the available ones or take more tests.',
    share: 'areas selected', showOthers: 'Show all other eligible scales', noGoals: 'No suitable directional scales are available yet. You may choose a general skill, clearly not inferred from test results.',
    traitNote: 'Personality traits and traditional themes are informational, not deficits requiring correction.',
    otherScales: 'All measured scales', measured: 'Measured', older: 'Earlier result', personal: 'One issue to observe daily (optional)',
    goalConsent: 'I choose these areas and want a personal daily practice course.',
    startLessons: 'Start my daily course', requireScales: 'Select at least the available number of scales (up to three) to continue.',
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
    testsIntro: 'Мы подобрали доступные опросники по вашим темам. Пять первых отмечены для просмотра, но не сохранятся без подтверждения.',
    relevance: 'соответствие', relevanceHint: 'Процент — примерная релевантность теста выбранным темам и реально измеряемым шкалам, а не точность диагноза и не уровень здоровья.',
    completed: 'Уже пройден', needed: 'Ещё не пройден', recommended: 'Рекомендуется',
    showMore: 'Добавить или убрать другие тесты', showLess: 'Показать только пять первых',
    chosen: 'выбрано', saved: 'Подтверждено для курса', saveTests: 'Подтвердить мой набор тестов',
    editTests: 'Изменить мой набор тестов', saveNotice: 'Только подтверждённые тесты сохраняются. Исключение теста из курса не удаляет старые результаты в «Моих тестах».',
    returnTests: 'Открыть все тесты и фильтры', pendingTitle: 'Пройти оставшиеся тесты',
    pendingText: 'Уже пройденные тесты из кабинета учитываются автоматически. Осталось выполнить только недостающие.',
    allDone: 'Все выбранные тесты уже пройдены в совместимых версиях.', review: 'Посмотреть мой профиль',
    reviewDisabled: 'Для полного профиля сначала пройдите недостающие выбранные тесты.',
    profileTitle: 'Мой текущий профиль по тестам', profileIntro: 'Здесь реальные шкалы из выбранных тестов и последние совместимые результаты. Нажмите на отчёт, чтобы увидеть подробности.',
    profileLink: 'Открыть полный профиль результатов', scaleGuide: 'Полоска показывает положение балла внутри шкалы конкретного теста, а не уровень здоровья.', profileNone: 'Пока нет подходящих измерений. Можно подобрать дополнительные тесты или посмотреть прошлые отчёты.',
    priorities: 'Семь возможных направлений работы', prioritiesHint: 'Сортировка по положению внутри шкалы с учётом направления симптомов и ресурсов. Это не медицинская норма и не общий процент психического здоровья.',
    chooseScales: 'Выберите 3–5 шкал для практики', chooseScalesShort: 'Доступно меньше трёх корректных шкал. Можно выбрать имеющиеся или пройти дополнительные тесты.',
    share: 'шкал выбрано', showOthers: 'Показать остальные доступные шкалы', noGoals: 'Пока нет подходящих шкал с однозначным направлением. Можно выбрать общие навыки, но они не считаются выводом из тестов.',
    traitNote: 'Черты личности и традиционные темы показаны для информации, а не для «исправления».',
    otherScales: 'Все измеренные шкалы', measured: 'Измерено', older: 'Более ранний результат', personal: 'Что я хочу наблюдать каждый день (по желанию)',
    goalConsent: 'Я самостоятельно выбираю эти направления и хочу проходить ежедневные практики.',
    startLessons: 'Начать ежедневный курс', requireScales: 'Выберите не меньше доступного количества шкал (до трёх) для продолжения.',
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

export default function CourseR3Steps({stage,locale='en',data,state,busy,onAct,onCourseCommand,onState,onError,root}) {
  const t=UI[locale]||UI.en,ru=locale==='ru'
  const current=state.course||{}, assessment=state.assessments||{}
  const [concerns,setConcerns]=useState(current.concerns||'')
  const [focusTags,setFocusTags]=useState(current.focusTags||[])
  const [chosenTests,setChosenTests]=useState([])
  const [testsTouched,setTestsTouched]=useState(false)
  const [showAll,setShowAll]=useState(false)
  const [chosenScales,setChosenScales]=useState([])
  const [showOtherScales,setShowOtherScales]=useState(false)
  const [fallbackGoals,setFallbackGoals]=useState([])
  const [problemLabel,setProblemLabel]=useState((current.concerns||'').trim().slice(0,160))
  const [intention]=useState('')
  const [goalsAccepted,setGoalsAccepted]=useState(false)
  const [localBusy,setLocalBusy]=useState(false)
  const predicted=useMemo(()=>suggestedCourseTopics(concerns),[concerns])
  const ranked=useMemo(()=>courseRecommendedTests({
    focusTags:current.focusTags||[],results:data.results||[],locale,
  }),[current.focusTags,data.results,locale])
  const profile=useMemo(()=>courseMeasuredProfile({
    results:data.results||[],testKeys:current.testKeys||[],locale,
  }),[data.results,current.testKeys,locale])
  const confirmed=(current.testKeys||[]).length>0
  const confirmedKeys=current.testKeys||[]
  const optionByKey=new Map(ranked.map(item=>[item.key,item]))
  const savedCount=assessment.completedSelectedCount||0
  const confirmedStatuses=assessment.selectedTests||[]
  const pending=confirmedStatuses.filter(item=>!item.completed)
  const minScales=Math.min(3,profile.eligible.length)

  useEffect(()=>{
    if(stage!==2 || testsTouched) return
    setChosenTests(confirmedKeys.length ? [...confirmedKeys] : ranked.slice(0,5).map(item=>item.key))
  },[stage,testsTouched,current.testKeys,ranked])
  function toggleTest(key) {
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
      setTestsTouched(false)
    } catch(error){onError(error.message||'COURSE_TEST_SELECTION_UNAVAILABLE')}
    finally {setLocalBusy(false)}
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

  if(stage===2) {
    const visible=showAll?ranked:ranked.filter((item,i)=>i<5||chosenTests.includes(item.key))
    return <section className={'hh-panel '+styles.section} data-course-tests>
      <div className={styles.sectionHeading}><h2>{t.testsTitle}</h2>
        <button type="button" className={styles.secondary} disabled={busy}
          onClick={()=>onAct('edit-intake')}>{t.editAreas}</button></div>
      <p>{t.testsIntro}</p><p className={styles.small}>{t.relevanceHint}</p>
      <div className={styles.testList} aria-label={t.testsTitle}>
        {visible.map((item,index)=><label className={styles.testRow} key={item.key} data-checked={chosenTests.includes(item.key)}>
          <input type="checkbox" checked={chosenTests.includes(item.key)} disabled={busy||localBusy||
            (!chosenTests.includes(item.key)&&chosenTests.length>=12)}
            onChange={()=>toggleTest(item.key)}/>
          <span className={styles.testBody}><strong>{item.title}</strong>
            <small>{item.measurementAxes.slice(0,3).join(' · ')}</small>
            <small className={item.completed?styles.completed:styles.pending}>
              {item.completed?<><Check size={13}/> {t.completed} · {formatDate(item.completedAt,locale)}</>
                :<>{t.needed} · ~{item.durationMinutes||'?'} min</>}
              {index<5&&<> · {t.recommended}</>}
            </small>
          </span>
          <span className={styles.match}>{item.matchPercent}%<small>{t.relevance}</small></span>
        </label>)}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.secondary} onClick={()=>setShowAll(value=>!value)}>
          <Plus size={15}/>{showAll?t.showLess:t.showMore}</button>
        <Link href={root+'/tests?explore=1&course=1&filters=topics'}>{t.returnTests}<ArrowRight size={15}/></Link>
      </div>
      <p className={styles.small}>{t.saveNotice}</p>
      <div className={styles.selectionActions}><strong>{chosenTests.length} {t.chosen}</strong>
        <button className={'hh-primary '+styles.cta} type="button" disabled={busy||localBusy||!chosenTests.length}
          onClick={saveTestSelection}>{confirmed?t.editTests:t.saveTests}<ArrowRight size={17}/></button>
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
          <Link className={styles.ctaLink} href={root+'/tests?filter=remaining'}>{t.pendingTitle}<ArrowRight size={17}/></Link>}
        <button type="button" disabled={busy||localBusy||pending.length>0}
          className={'hh-primary '+styles.cta} onClick={()=>onAct('review')}>{t.review}<ArrowRight size={17}/></button>
        {pending.length>0&&<p className={styles.small}>{t.reviewDisabled}</p>}
      </section>}
    </section>
  }

  if(stage===3) {
    const selectedEligible=chosenScales.length>=minScales&&chosenScales.length<=5
    const direct=profile.eligible.length>0
    const list=showOtherScales?profile.eligible:profile.priority
    const defaultLabel=profile.eligible.find(item=>chosenScales.includes(item.id))?.label||profile.eligible[0]?.label||''
    return <section className={'hh-panel '+styles.section} data-course-profile>
      <h2>{t.profileTitle}</h2><p>{t.profileIntro}</p>
      <Link className={styles.link} href={root+'/portfolio'}>{t.profileLink}<ArrowRight size={16}/></Link>
      {profile.scales.length>0?<section className={styles.measuredPanel} aria-label={t.otherScales}>
        <div className={styles.profileHeading}>
          <h3>{t.otherScales} ({profile.scales.length})</h3><p className={styles.small}>{t.scaleGuide}</p>
        </div>
        <div className={styles.allScales}>{profile.scales.map(item=><div key={item.id} className={styles.scaleRow}>
          <div className={styles.scaleDetail}>
            <strong>{item.label}</strong>
            <small>{item.testTitle} · {formatDate(item.measuredAt,locale)}</small>
            <meter className={styles.scaleMeter} min={item.min} max={item.max} value={item.score}
              aria-label={item.label+' · '+item.score+' / '+item.max}/>
            <small>{item.recent?'':t.older} {item.axisLabel}</small>
          </div>
          <div className={styles.score}><strong>{item.score}<small>{item.min}–{item.max}</small></strong>
            <Link href={root+'/results/'+encodeURIComponent(item.resultId)}>{t.report}</Link></div>
        </div>)}</div>
      </section>:<p>{t.profileNone}</p>}
      {direct?<><h3>{t.priorities}</h3><p className={styles.small}>{t.prioritiesHint}</p>
        <h3>{t.chooseScales}</h3>
        {profile.eligible.length<3&&<p className={styles.small}>{t.chooseScalesShort}</p>}
        <div className={styles.scaleOptions}>
          {list.map(item=><label key={item.id} className={styles.scaleOption}
            data-checked={chosenScales.includes(item.id)}>
            <input type="checkbox" checked={chosenScales.includes(item.id)} disabled={busy||(!chosenScales.includes(item.id)&&chosenScales.length>=5)}
              onChange={()=>toggleScale(item.id)}/>
            <span><strong>{item.label}</strong>
              <small>{item.testTitle} · {item.score} ({item.min}–{item.max})</small>
              <small>{item.practice}</small></span>
            <em>{item.priorityPercent}%<small>{t.relativePriority}</small></em>
          </label>)}
        </div>
        {profile.eligible.length>7&&<button className={styles.secondary} type="button"
          onClick={()=>setShowOtherScales(value=>!value)}><SlidersHorizontal size={16}/>{t.showOthers}</button>}
        <p className={styles.small}>{t.traitNote}</p>
        </>:<>
          <p>{t.noGoals}</p><div className={styles.topics}>
            {Object.entries(GROWTH_GOALS).map(([key,goal])=><button type="button"
              key={key} aria-pressed={fallbackGoals.includes(key)}
              onClick={()=>setFallbackGoals(current=>current.includes(key)?current.filter(x=>x!==key):
                current.length<3?[...current,key]:current)}>{goal.title[ru?'ru':'en']}</button>)}
          </div>
        </>}
      <div className={styles.formBottom}>
        <label htmlFor="course-r3-target">{t.personal}</label>
        <input id="course-r3-target" maxLength={160} value={problemLabel} placeholder={defaultLabel}
          onChange={event=>setProblemLabel(event.target.value)}/>
        <label className={styles.consent}><input type="checkbox" checked={goalsAccepted}
          onChange={event=>setGoalsAccepted(event.target.checked)}/><span>{t.goalConsent}</span></label>
        <p className={styles.small}>{t.days} · {t.noMedical}</p>
        <button type="button" className={'hh-primary '+styles.cta}
          disabled={busy||!goalsAccepted||(direct?!selectedEligible:!fallbackGoals.length)}
          onClick={()=>onAct('choose-goals',{
            ...(direct?{scaleKeys:chosenScales}:{goals:fallbackGoals}),consent:true,durationDays:14,
            problemLabel:(problemLabel.trim()||defaultLabel||(ru?'Моя ежедневная трудность':'My daily concern')).slice(0,160),
            intention,
            timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
          })}>{t.startLessons}<Heart size={17}/></button>
        {direct&&!selectedEligible&&<p className={styles.small}>{t.requireScales}</p>}
      </div>
    </section>
  }
  return null
}
