'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CirclePause, ClipboardList, Clock3, HeartHandshake, Leaf, Lightbulb, RotateCcw, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import { GROWTH_GOALS } from '@/lib/inner-growth/course-model'
import CourseGuidedTimer from './course-guided-timer'
import { CourseQuestMap } from './course-quest'
import CourseSlidePlayer from './course-slide-player'
import CourseFinalRetest from './course-final-retest'
import { appFetch } from '@/lib/app/client-fetch'
import { startOrResumeCourseFinalRetest } from '@/lib/app/course-test-flow'
import { useCoursePromotion } from './use-course-promotion'
import CourseMomentTrends from './course-moment-trends'
import styles from './course-today.module.css'

const UI={
 en:{
  welcome:'Your daily course',open:'Open',close:'Close',day:'Day',of:'of',mins:'minutes',daily:'My daily check-in',
  dailyText:'During the last 24 hours, how difficult was this specific problem?',high:'10 · Extremely difficult',low:'0 · Not difficult at all',
  impact:'How much did it interfere with your day? (optional)',resources:'How supported or capable did you feel? (optional)',
  addNote:'Optional private note',skip:'Skip this check-in',save:'Save today’s check-in',update:'Correct today’s check-in',
  saved:'Your check-in was saved. You can correct it without changing previous days.',
  thought:'Thought of the day',idea:'Why we practise this',meditation:'Guided practice',ritual:'Your small ritual',
  reflection:'Integration and reflection',afterNow:'How strong is the feeling RIGHT NOW, after the exercise? (optional)',
  beforeNow:'How strong was it RIGHT BEFORE the exercise? (optional)',feedback:'How did the practice feel?',
  helpful:'Helpful',neutral:'Neutral',uncomfortable:'Uncomfortable',noAnswer:'Prefer not to say',
  journal:'Optional private reflection',finish:'Save completed practice',finished:'Today’s practice is saved.',
  step:'Step',next:'Next step',start:'Start practice',restart:'Read again',short:'2-minute practice',
  standard:'Normal practice',comfort:'A gentler option',eyes:'Keep eyes open; breathe naturally. Skip any uncomfortable step.',
  stop:'Pause course',resume:'Resume course',paused:'Your course is paused. Come back whenever you are ready.',
  symptoms:'My problem over 14 days',history:'Daily self-reports, last 24 hours (0–10: higher means more difficulty). Missing days remain empty.',
  noScores:'No daily ratings saved yet.',engagement:'Practice days completed',changes:'Changes since my first observation',
  changeText:'These figures describe your answers, not a clinical diagnosis or proof that a lesson caused a change.',
  noChange:'Two recorded days are needed for a descriptive comparison.',
  weekly:'My weekly reflection',weeklyText:'What did you notice in your ordinary life? Which skills felt usable?',
  firstWeek:'Day 7 review',lastWeek:'Day 14 review',saveReview:'Save reflection',
  keep:'Continue my current direction',softer:'Choose gentler practices',rest:'Give myself more rest',
  completed:'You reached the end of this cycle. Your observations and history remain yours.',
  nextCycle:'Start another 14-day cycle',newGoal:'My next learning direction',
  approvedNextGoal:'Choose from the directions represented by your confirmed scales. A different direction requires a new measured-scale confirmation before a cycle can start.',
  problem:'The one problem I want to observe',intention:'One everyday skill I would like to practise (optional)',
  activate:'Start my daily 14-day course',activateText:'Your course has been updated. Confirm your personal problem to begin daily check-ins and reviewed lessons.',
  consent:'My daily problem ratings are an optional Holistic House self-monitoring tool, not a validated psychological test.',
  recommendations:'Review tests and recommendations',disclaimer:'Self-guided educational practice, not a psychotherapy session or real-time clinical monitoring.',
  error:'Could not save your information. Nothing has been marked complete; you can try again.',
  retry:'Try again',quickTip:'Any section can be skipped. Finishing does not require a special feeling.',
  lessonDone:'Already completed',count:'practices',outOf:'out of',rating:'rating',zero:'0',none:'Not answered',
  reviewSaved:'Your weekly reflection was saved.',private:'Private to your account',printReport:'Print or save my course report',
  checkinSchedule:'How often to offer a problem check-in',dailyFrequency:'Every day',alternateFrequency:'Every other day',weeklyFrequency:'Once a week',
  softerSuggestion:'The last practice felt uncomfortable. You can choose the short or no-imagery version today.',
  retestDue:'Your optional weekly self-report is due',retestLater:'Next eligible weekly self-report',startRetest:'Open this test',
  urgentHelp:'For immediate danger or thoughts of self-harm, contact local emergency or crisis services. This course is not monitored.',
  learn:'Read this thought',prompt:'Review the practice',dayReview:'Your week in perspective',
  action:'Try in ordinary life',markDone:'Finish today’s lesson',date:'Local course day',
  journeyTitle:'Your 14-day learning map',journeyIntro:'Each day brings a new theme and a small practical takeaway. Your chosen scales shape the lesson topics.',
  outcome:'A small takeaway',planned:'Coming up',pastDay:'Earlier day',doneDay:'Completed',todayDay:'Today',openToday:'Open today’s practice',
  optionalResult:'An invitation, not a requirement. You may skip an action or return to it later.',
  skillLabel:'Skill for today',workbookTitle:'My workbook question',practiceApproach:'Inspired by',workingPosition:'A flexible working phrase',
  notAffirmation:'No forced affirmations: you do not have to believe this phrase or feel differently.',todayExperiment:'A small, safe experiment',
  anchorTitle:'Repeat a familiar resource',anchorIntro:'Optional 30–60 seconds, even on days with a different topic.',
  sentenceStarter:'If it helps, begin with',journalHelp:'One honest sentence is enough; the note is kept privately in your account.',
  continuedLearning:'My next few weeks',noHabitGuarantee:'Fourteen days offer a starting cycle, not a guarantee that a habit or belief has changed.',
  savedWorkbookHistory:'My saved reflections',savedWorkbookIntro:'Your previous private notes may help you review your learning. Older notes might come from an earlier lesson version.',savedNote:'Saved note',
  coreFocus:'My main practice skill',supportFocus:'Supporting skill',activeRecall:'Recall before reading',recallOptional:'Try remembering in your own words; you can skip this.',
  transferPrompt:'Optional real-life practice',transferHint:'A small choice, not a required challenge.',reflectionV3:'A question to bring into tomorrow',
  afterGap:'Welcome back. You can restart gently with a shorter lesson; there is no catching up to do.',
  progressThree:'What the data can and cannot show',participation:'Sessions saved',helpfulCount:'Times you said the practice helped',
  weeklyComparison:'Weekly self-ratings (median)',weekOne:'Days 1–7',weekTwo:'Days 8–14',
  insufficientRatings:'A weekly comparison needs at least four observations in each week. Missing values stay missing.',
  learningBoundaries:'These are descriptive self-reports, not clinical scores or proof that the programme caused change.',
  showJourney:'Open the full 14-day path',
  symbolicLab:'Creative reflection · optional',symbolicIntro:'One image or simple words',symbolImage:'Use an image',symbolWords:'Use plain words',
  symbolLens:'Symbolic resource',symbolArtifact:'My one-line takeaway',
  symbolSafety:'This metaphor is for personal reflection only, not diagnosis or therapy. You can always switch to words or skip.',
 },
 ru:{
  welcome:'Ваш ежедневный курс',open:'Открыть',close:'Свернуть',day:'День',of:'из',mins:'минут',daily:'Мой ежедневный замер',
  dailyText:'Насколько выражена именно эта проблема за последние 24 часа?',high:'10 · Очень сильно',low:'0 · Совсем не было',
  impact:'Насколько проблема мешала вашим делам? (по желанию)',resources:'Насколько вы ощущали опору и доступные силы? (по желанию)',
  addNote:'Личная заметка (необязательно)',skip:'Пропустить замер',save:'Сохранить сегодняшний замер',update:'Исправить сегодняшний замер',
  saved:'Замер сохранён. Сегодня его можно исправить, не меняя предыдущие дни.',
  thought:'Афоризм дня',idea:'Для чего эта практика',meditation:'Направленная практика',ritual:'Маленький ритуал',
  reflection:'Интеграция и рефлексия',afterNow:'Насколько сильно ощущение ПРЯМО СЕЙЧАС после упражнения? (необязательно)',
  beforeNow:'Насколько сильно оно было НЕПОСРЕДСТВЕННО ПЕРЕД упражнением? (необязательно)',feedback:'Как прошла практика?',
  helpful:'Помогло',neutral:'Нейтрально',uncomfortable:'Было некомфортно',noAnswer:'Не хочу отвечать',
  journal:'Личная рефлексия (необязательно)',finish:'Сохранить выполнение',finished:'Сегодняшняя практика сохранена.',
  step:'Шаг',next:'Следующий шаг',start:'Начать практику',restart:'Прочитать ещё раз',short:'2-минутная практика',
  standard:'Обычная практика',comfort:'Более мягкий вариант',eyes:'Можно держать глаза открытыми и дышать естественно. Неудобный шаг пропускайте.',
  stop:'Поставить курс на паузу',resume:'Продолжить курс',paused:'Курс на паузе. Вернуться можно в удобное время.',
  symptoms:'Моя проблема за 14 дней',history:'Ежедневные самооценки за последние 24 часа (0–10: выше — труднее). Пропущенные дни остаются пустыми.',
  noScores:'Пока нет сохранённых ежедневных оценок.',engagement:'Пройденных дней практики',changes:'Динамика от первого наблюдения',
  changeText:'Цифры описывают ваши ответы, но не являются диагнозом и не доказывают, что изменения вызваны занятиями.',
  noChange:'Для описательного сравнения необходимы два разных дня с замерами.',
  weekly:'Мой недельный обзор',weeklyText:'Что вы заметили в обычной жизни? Какие упражнения были приемлемыми?',
  firstWeek:'Обзор дня 7',lastWeek:'Обзор дня 14',saveReview:'Сохранить обзор',
  keep:'Продолжить выбранное направление',softer:'Выбрать более мягкие практики',rest:'Дать себе больше отдыха',
  completed:'Вы завершили этот цикл. Все наблюдения и история остаются у вас.',
  nextCycle:'Начать ещё 14 дней',newGoal:'Новое направление развития',
  approvedNextGoal:'Выберите направление среди подтверждённых шкал. Для другого направления нужно заново подтвердить подходящие измеренные шкалы до начала цикла.',
  problem:'Проблема, за которой хочу наблюдать',intention:'Какой повседневный навык хочу развивать? (необязательно)',
  activate:'Начать мой ежедневный курс на 14 дней',activateText:'Ваш курс обновлён. Подтвердите личную проблему, чтобы начать ежедневные замеры и полноценные уроки.',
  consent:'Ежедневные оценки — авторское наблюдение Holistic House, не валидированный психологический тест.',
  recommendations:'Результаты тестов и рекомендации',disclaimer:'Самостоятельная образовательная практика, а не сеанс психотерапии или круглосуточное наблюдение специалиста.',
  error:'Не удалось сохранить данные. Ничего не отмечено как выполненное; можно попробовать ещё раз.',
  retry:'Повторить',quickTip:'Любой этап можно пропустить. Не требуется специально менять самочувствие.',
  lessonDone:'Уже выполнено',count:'практик',outOf:'из',rating:'оценка',zero:'0',none:'Нет оценки',
  reviewSaved:'Недельный обзор сохранён.',private:'Приватно в кабинете',printReport:'Распечатать или сохранить отчёт о курсе',
  checkinSchedule:'Как часто предлагать оценивать проблему',dailyFrequency:'Каждый день',alternateFrequency:'Через день',weeklyFrequency:'Раз в неделю',
  softerSuggestion:'Предыдущее упражнение было некомфортным. Сегодня можно выбрать короткую практику или вариант без визуализаций.',
  retestDue:'Подошёл срок дополнительного недельного замера',retestLater:'Следующий допустимый недельный замер',startRetest:'Открыть этот тест',
  urgentHelp:'При непосредственной опасности или мыслях о причинении себе вреда обратитесь в местную экстренную или кризисную службу. За курсом никто не следит в реальном времени.',
  learn:'Прочитать мысль',prompt:'Посмотреть упражнение',dayReview:'Неделя в перспективе',
  action:'Применить в обычной жизни',markDone:'Завершить сегодняшний урок',date:'Местный день курса',
  journeyTitle:'Карта моего 14-дневного курса',journeyIntro:'Каждый день — новая тема и небольшой практический результат. Темы уроков учитывают выбранные вами шкалы.',
  outcome:'Что можно взять с собой',planned:'Впереди',pastDay:'Прошедший день',doneDay:'Завершено',todayDay:'Сегодня',openToday:'Перейти к практике дня',
  optionalResult:'Это приглашение, а не обязанность. Действие можно пропустить или выполнить позже.',
  skillLabel:'Навык дня',workbookTitle:'Вопрос из моей рабочей тетради',practiceApproach:'Основано на идеях',workingPosition:'Гибкая рабочая фраза',
  notAffirmation:'Без навязанных аффирмаций: необязательно верить этой фразе или испытывать другие чувства.',todayExperiment:'Небольшой безопасный эксперимент',
  anchorTitle:'Повторить знакомую опору',anchorIntro:'По желанию 30–60 секунд, даже когда тема дня отличается.',
  sentenceStarter:'Можно начать так',journalHelp:'Достаточно одного честного предложения. Запись приватно хранится в кабинете.',
  continuedLearning:'Мои следующие недели',noHabitGuarantee:'14 дней — стартовый цикл, а не гарантия закрепившейся привычки или изменившегося убеждения.',
  savedWorkbookHistory:'Мои сохранённые наблюдения',savedWorkbookIntro:'Предыдущие приватные записи помогают осмыслить путь. Старые записи могли быть сделаны до обновления программы.',savedNote:'Сохранённая заметка',
  coreFocus:'Мой основной навык',supportFocus:'Дополнительный навык',activeRecall:'Вспомнить перед чтением',recallOptional:'Попробуйте вспомнить самостоятельно. Можно пропустить.',
  transferPrompt:'Необязательная практика в жизни',transferHint:'Маленький выбор, а не обязательное испытание.',reflectionV3:'Вопрос для переноса опыта',
  afterGap:'Рады вашему возвращению. Можно начать с короткой версии; ничего догонять не нужно.',
  progressThree:'Что показывают наблюдения',participation:'Сохранённых занятий',helpfulCount:'Раз вы отметили, что практика помогла',
  weeklyComparison:'Недельные самооценки (медиана)',weekOne:'Дни 1–7',weekTwo:'Дни 8–14',
  insufficientRatings:'Для сравнения недель нужно хотя бы четыре наблюдения за каждую. Пропуски не заменяются нулями.',
  learningBoundaries:'Это описательные самоотчёты, не клинические показатели и не доказательство влияния курса.',
  showJourney:'Открыть полный маршрут 14 дней',
  symbolicLab:'Творческая рефлексия · по желанию',symbolicIntro:'Один образ или обычные слова',symbolImage:'Через образ',symbolWords:'Через слова',
  symbolLens:'Метафора ресурса',symbolArtifact:'Мой итог одним предложением',
  symbolSafety:'Образ используется только для личной рефлексии, не является диагнозом или лечением. Можно перейти к словам или пропустить.',
 }
}
async function api(action,locale,body){
  const response=await fetch('/api/app/course/'+action+'?locale='+locale,{
    method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
  })
  const value=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(value.error||'SERVICE_UNAVAILABLE')
  return value
}
const choices=[null,0,1,2,3,4,5,6,7,8,9,10]
function Rating({value,onChange,label,optional=false}){
  return <label className={styles.rating}>
    <span>{label}</span>
    <select value={value===null?'':String(value)}
      onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}
      aria-label={label}>
      <option value="" disabled={!optional}>—</option>
      {choices.filter(x=>x!==null).map(x=><option key={x} value={x}>{x}/10</option>)}
    </select>
  </label>
}
function DailyCard({number,title,subtitle,icon:Icon,expanded,onToggle,completed,completedLabel,children}){
 return <section className={styles.card} data-course-card={number} id={number==='checkin'?'course-today-lesson':undefined}>
  <button type="button" className={styles.cardHeader} aria-expanded={expanded} onClick={onToggle}>
    <span className={styles.cardIcon}><Icon aria-hidden="true" size={20}/></span>
    <span className={styles.cardTitle}><strong>{title}</strong><small>{subtitle}</small></span>
    {completed?<CheckCircle2 aria-label={completedLabel} size={19} className={styles.checked}/>:expanded?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
  </button>
  {expanded&&<div className={styles.cardContent}>{children}</div>}
 </section>
}

export default function CourseToday({locale='en',accountId=null}){
 const t=UI[locale]||UI.en,ru=locale==='ru',root='/'+locale+'/app'
 const router=useRouter()
 const promotion=useCoursePromotion(accountId)
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const [expanded,setExpanded]=useState('checkin'),[stage,setStage]=useState(0),[symbolMode,setSymbolMode]=useState('image')
 const [questOpen,setQuestOpen]=useState(false)
 const [retestBusyKey,setRetestBusyKey]=useState(''),[retestError,setRetestError]=useState('')
 const retestLock=useRef(false)
 const [view,setView]=useState('today')
 const [severity,setSeverity]=useState(null),[interference,setInterference]=useState(null),[resource,setResource]=useState(null)
 const [dailyNote,setDailyNote]=useState(''),[beforeNow,setBeforeNow]=useState(null),[afterNow,setAfterNow]=useState(null)
 const [feedback,setFeedback]=useState('skip'),[reflection,setReflection]=useState('')
 const [reviewNote,setReviewNote]=useState(''),[reviewDecision,setReviewDecision]=useState('continue')
 const [targetLabel,setTargetLabel]=useState(''),[intention,setIntention]=useState(''),[newGoal,setNewGoal]=useState('')
 const hydratedDayRef=useRef('')
 const hydrate=useCallback((response)=>{
  setData(response)
  const nextDay=response?.cycle ? response.cycle.id+':'+response.cycle.day+':'+response.cycle.todayLocalDate : ''
  if(nextDay!==hydratedDayRef.current){
    // Change of local day or cycle: never carry an unsaved private answer into
    // another lesson. Same-day preference changes must preserve draft text.
    hydratedDayRef.current=nextDay
    setBeforeNow(response?.currentSession?.beforeNow??null)
    setAfterNow(response?.currentSession?.afterNow??null)
    setFeedback(response?.currentSession?.feedback||'skip')
    setReflection(response?.currentSession?.reflection||'')
    setSeverity(response?.currentCheckin?.severity??null)
    setInterference(response?.currentCheckin?.interference??null)
    setResource(response?.currentCheckin?.resource??null)
    setDailyNote(response?.currentCheckin?.note||'')
    setReviewNote('')
    setReviewDecision('continue')
    setStage(0)
    setSymbolMode('image')
    setExpanded('checkin')
    setQuestOpen(false)
    setView('today')
  }else {
    if(response?.currentSession){
      setBeforeNow(response.currentSession.beforeNow)
      setAfterNow(response.currentSession.afterNow)
      setFeedback(response.currentSession.feedback||'skip')
      setReflection(response.currentSession.reflection||'')
    }
    if(response?.currentCheckin){
      setSeverity(response.currentCheckin.severity)
      setInterference(response.currentCheckin.interference)
      setResource(response.currentCheckin.resource)
      setDailyNote(response.currentCheckin.note||'')
    }
  }
 },[])
 const reload=useCallback(async()=>{
  setLoading(true);setError('')
  try{hydrate(await api('today',locale))}catch(e){setError(e.message)}
  finally{setLoading(false)}
 },[hydrate,locale])
 useEffect(()=>{void reload()},[reload])
 async function submit(action,body={},after){
  setBusy(true);setError('')
  try {
    const result=await api(action,locale,body)
    hydrate(result)
    if(['session','pause','resume','activate','review','new-cycle'].includes(action) &&
       typeof window!=='undefined') window.dispatchEvent(new Event('hh-course-changed'))
    if(after)after()
    return result
  }catch(e){setError(e.message);return null}
  finally{setBusy(false)}
 }
 async function openFinalRetest(key){
  if(retestLock.current)return
  retestLock.current=true
  setRetestBusyKey(key);setRetestError('')
  try{
   const run=await startOrResumeCourseFinalRetest({key,locale,request:appFetch})
   router.push(root+'/runs/'+encodeURIComponent(run.id)+'?mode=guided&course=retest')
  }catch(e){setRetestError(e.message||'COURSE_RETEST_UNAVAILABLE')}
  finally{setRetestBusyKey('');retestLock.current=false}
 }
 function showFinalRetest(){
  setQuestOpen(false);setView('today')
  requestAnimationFrame(()=>document.getElementById('course-final-retest')?.scrollIntoView({behavior:'smooth',block:'start'}))
 }
 const timezone=()=>{
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}
 }
 if(loading&&!data)return <section className={'hh-panel '+styles.shell} aria-busy="true">{ru?'Открываем ваш ежедневный курс…':'Opening your daily course…'}</section>
 if(!data)return <section className={'hh-panel '+styles.shell} role="alert"><p>{t.error}</p><button type="button" onClick={reload}>{t.retry}</button></section>
 const cycle=data.cycle,lesson=data.lesson,progress=data.progress||{},target=data.target||{},today=data.currentCheckin
 const continuationGoals=(data.continuationGoals||[]).filter(goal=>GROWTH_GOALS[goal])
 const nextGoal=continuationGoals.includes(newGoal)?newGoal
  :continuationGoals.includes(cycle?.primaryGoal)?cycle.primaryGoal:continuationGoals[0]||''
 const session=data.currentSession,completed=Boolean(session),paused=cycle?.status==='paused',isFinished=cycle?.status==='completed'||Boolean(cycle?.afterCycle)
 const reportDay=cycle?.day>=14?14:cycle?.day>=7?7:null
 const reviewed=reportDay&&data.reviews?.some(r=>r.day===reportDay)
 const problem=target.label||''
 const activeName=GROWTH_GOALS[cycle?.activeGoal||cycle?.primaryGoal]?.title?.[locale]||''
 const isV3=Boolean(lesson?.practiceV3)
 const isV4=Boolean(lesson?.practiceV4)
 const firstWeekMedian=progress.weeklyMedian?.[0],secondWeekMedian=progress.weeklyMedian?.[1]
 const hasComparableWeeks=Number.isFinite(firstWeekMedian)&&Number.isFinite(secondWeekMedian)
 // The thought and everyday action are separate cards; do not make the
 // guided timer repeat their text as additional meditation steps.
 const guidedSections=(lesson?.sections||[]).filter(section=>['arrive','meditation','finish'].includes(section.kind))
 const beforeValue=v=>v===null||v===undefined?null:v
 if(data.requiresTarget) return <section className={'hh-panel '+styles.shell+' '+styles.activatePanel}
    data-course-activation>
   <header className={styles.activateHeading}>
     <p className="hh-kicker">Holistic House · My Course</p>
     <h2>{t.activateText}</h2>
     <p>{t.consent}</p>
   </header>
   <div className={styles.activateFields}>
     <label className={styles.field}>{t.problem}<input maxLength={160} value={targetLabel} onChange={e=>setTargetLabel(e.target.value)} placeholder={ru?'Напряжение при общении':'Tension during conversations'}/></label>
     <label className={styles.field}>{t.intention}<textarea maxLength={300} value={intention} onChange={e=>setIntention(e.target.value)}/></label>
   </div>
   <button type="button" className={'hh-primary '+styles.activatePrimary}
     disabled={busy||targetLabel.trim().length<3}
     onClick={()=>submit('activate',{problemLabel:targetLabel,intention,timeZone:timezone()},()=>setExpanded('checkin'))}>
     {t.activate}<ArrowRight size={18} aria-hidden="true"/>
   </button>
   {error&&<p role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:t.error} ({error})</p>}
 </section>
 if(!cycle)return <section className={'hh-panel '+styles.shell}>{t.error}<button onClick={reload}>{t.retry}</button></section>
 return <section className={styles.shell} data-daily-course data-course-view={view}>
  {view==='today'&&<div className={styles.todayGreeting} data-course-today-heading>
    <div><p>Holistic House</p><h1>{ru?'Мой курс':'My course'}</h1></div>
    <span className={styles.todayReward} title={ru?'Баллы только за сохранённые практики':'Points earned for saved practices only'}>
      <Sparkles size={20} aria-hidden="true"/>{20*(Number(progress.practiceCount)||0)} XP
    </span>
  </div>}
  <div className={styles.viewSwitch} role="group" aria-label={ru?'Экраны моего курса':'My Course screens'} data-course-screen-switch>
    {[
      ['today',ru?'Сегодня':'Today'],
      ['path',ru?'Путь · 14 дней':'14-day path'],
      ['details',ru?'Подробнее':'Details'],
    ].map(([key,label])=><button key={key} type="button" aria-pressed={view===key}
      onClick={()=>setView(key)}>{label}</button>)}
  </div>
  {view==='today'&&<>
  <header className={styles.questHero} data-course-teal-hero>
    <div className={styles.heroPhoto} aria-hidden="true"/>
    <img className={styles.heroPerson} src="/images/holistic-house/course-hero-mindful.svg" width={460} height={560}
      alt="" aria-hidden="true" decoding="async"/>
    <div className={styles.heroInner}>
      <div className={styles.questTopline}>
        <span className={styles.heroBrand}>{data.programme?.title || (ru?'СЕГОДНЯШНИЙ ШАГ':'TODAY’S STEP')}</span>
        <span className={styles.questDayPill}>{t.day} {cycle.day} {t.of} {cycle.durationDays}</span>
      </div>
      <h2>{lesson?.title||lesson?.journey?.heading}</h2>
      <p className={styles.heroPurpose}>{completed&&!isFinished?
        (ru?'Сегодняшний урок завершён. Следующий откроется завтра.':'Today’s lesson is complete. Your next one opens tomorrow.'):
        (data.programme?.day?.prompt || (ru?'Один новый урок в день — в своём темпе.':'One new lesson each day, at your own pace.'))}</p>
      <button type="button" className={styles.todayPrimary} disabled={busy}
        data-course-today-primary onClick={()=>
          paused ? void submit('resume',{expectedRevision:cycle.revision}) :
          data.finalRetest?.ready ? showFinalRetest() :
          (isFinished||(completed&&reportDay&&!reviewed)) ? setView('details') :
          setQuestOpen(true)}>
        {paused?(ru?'Возобновить курс':'Resume course') :
          data.finalRetest?.ready?(ru?'Повторить стартовые тесты':'Repeat my starting tests') :
          isFinished?(ru?'Посмотреть итоги курса':'Review course results') :
          completed&&reportDay&&!reviewed?(ru?'Подвести итоги недели':'Review my week') :
          completed?(ru?'Посмотреть урок дня':'Review today’s lesson') :
          (ru?'Начать практику':'Start today’s practice')}
        <ArrowRight size={19} aria-hidden="true"/>
      </button>
      <div className={styles.heroProgress}><span>{ru?'Мой прогресс':'My progress'}</span>
        <strong>{progress.practiceCount||0}/{cycle.durationDays}</strong>
        <progress max={cycle.durationDays} value={progress.practiceCount||0} aria-label={t.engagement}/>
      </div>
    </div>
  </header>
  <details className={styles.momentPeek} data-course-today-trends>
    <summary><span><Sparkles size={16} aria-hidden="true"/>{ru?'Моя динамика':'My progress over time'}</span>
      <ChevronDown size={18} aria-hidden="true"/></summary>
    <CourseMomentTrends key={cycle.id} locale={locale} cycle={cycle}
      progress={progress} roadmap={data.roadmap||[]}/>
  </details>
  <CourseFinalRetest locale={locale} plan={data.finalRetest}
    onStart={openFinalRetest} busyKey={retestBusyKey} error={retestError}/>
  </>}
  {view==='details'&&<>
  {(isV3||lesson?.workbook?.skill)&&<details className={styles.focusDetails}>
    <summary>{ru?'Мои персональные навыки':'My personal skills'}</summary>
    {isV3&&<p className={styles.focusRoleBanner} data-course-primary-skill>
      <strong>{t.coreFocus}: </strong>{GROWTH_GOALS[cycle?.primaryGoal]?.title?.[locale]||activeName}
      {cycle?.primaryScaleLabel?' · '+cycle.primaryScaleLabel:''}
    </p>}
    {isV3&&cycle.activeFocusRole==='support'&&<p className={styles.supportRole}>{t.supportFocus}: {activeName}</p>}
    {lesson?.workbook?.skill&&<p className={styles.heroSkill}><strong>{t.skillLabel}:</strong> {lesson.workbook.skill}</p>}
  </details>}
  {lesson?.aphorism&&<aside className={styles.quoteStrip}><Leaf size={18} aria-hidden="true"/>
    <span>“{lesson.aphorism}”</span>
  </aside>}
  </>}
  {error&&<p className={styles.error} role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:t.error} ({error}) <button type="button" onClick={reload}>{t.retry}</button></p>}
  {view==='details'&&<>
    {paused&&<p className={styles.note}>{t.paused}</p>}
    {isFinished&&<p className={styles.notice}><CheckCircle2 size={20}/>{t.completed}</p>}
    {isV3&&data.returnSuggestion==='restart'&&!isFinished&&
      <p className={styles.returnMessage} data-course-gentle-return>{t.afterGap}</p>}
  </>}
  {view==='path'&&<CourseQuestMap locale={locale} cycle={cycle} progress={progress}
    roadmap={data.roadmap||[]} paused={paused} finished={isFinished}
    onPlay={()=>setQuestOpen(true)}/>}
  {questOpen&&<CourseSlidePlayer key={cycle.id+':'+cycle.day} locale={locale}
    data={data} busy={busy} promotion={promotion} onClose={()=>setQuestOpen(false)}
     onFinish={()=>{setQuestOpen(false);setView('path')}}
    onOpenRetest={showFinalRetest}
    onCheckin={body=>submit('checkin',body)}
    onSession={body=>submit('session',body)}
    onPreferences={patch=>submit('preferences',{
      expectedRevision:cycle.revision,
      length:patch.length||cycle.preferences?.length||'standard',
      imagery:patch.imagery||cycle.preferences?.imagery||'optional',
      checkinFrequency:cycle.preferences?.checkinFrequency||'daily',
    })}/>}
  {view==='details'&&<>
  <details className={styles.classicPanel}>
    <summary>{ru?'Полный текст урока и дополнительные настройки':'Full lesson text and additional settings'}</summary>
  <details className={styles.journeyPanel} data-course-journey>
    <summary className={styles.journeyHeading}>
      <span className={styles.journeyToggleLabel}>{t.showJourney}<ChevronDown size={16} aria-hidden="true"/></span>
      <div><p className="hh-kicker">HOLISTIC HOUSE · 14 DAYS</p>
        <h3 id="course-journey-heading">{t.journeyTitle}</h3>
        <p>{t.journeyIntro}</p>
      </div>
      <span className={styles.journeyCount}>{progress.practiceCount||0} / 14</span>
    </summary>
    <div className={styles.journeyGrid} role="list">
      {(data.roadmap||[]).map(item=><article key={item.day} role="listitem"
        className={styles.journeyDay} data-day-state={item.status}
        aria-current={item.status==='today'?'step':undefined}>
        <div className={styles.journeyMeta}>
          <span>{t.day} {String(item.day).padStart(2,'0')}</span>
          <span>{item.status==='completed'?t.doneDay:item.status==='today'?t.todayDay:item.status==='past'?t.pastDay:t.planned}</span>
        </div>
        <h4>{item.title}</h4>
        <p className={styles.journeyTheme}>{item.heading} · {item.phaseTitle}</p>
        {item.workbookSkill&&<p className={styles.journeySkill}><strong>{t.skillLabel}:</strong> {item.workbookSkill}</p>}
        <p className={styles.journeyFocus}>
          {isV3&&<strong className={styles.focusRoleTag}>{item.focusRole==='support'?t.supportFocus:t.coreFocus} · </strong>}
          {item.focusTitle}{item.scaleLabel?' · '+item.scaleLabel:''}
        </p>
        <p className={styles.journeyOutcome}><strong>{t.outcome}:</strong> {item.outcome}</p>
        {item.status==='today'&&!isFinished&&<a href="#course-today-lesson"
          className={styles.journeyAction} onClick={()=>setExpanded('checkin')}>
          {t.openToday}<ArrowRight size={15} aria-hidden="true"/>
        </a>}
      </article>)}
    </div>
  </details>
  {!isFinished&&<>
   <DailyCard number="checkin" title={'01 · '+t.daily} subtitle="~30 sec" icon={ClipboardList}
    expanded={expanded==='checkin'} onToggle={()=>setExpanded(x=>x==='checkin'?'':'checkin')} completed={Boolean(today)} completedLabel={t.doneDay}>
    <p className={styles.hint}>{t.consent}</p>
    <label className={styles.field}>{t.checkinSchedule}
      <select disabled={busy||paused} value={cycle.preferences?.checkinFrequency||'daily'}
        onChange={e=>submit('preferences',{expectedRevision:cycle.revision,
          checkinFrequency:e.target.value,length:cycle.preferences?.length||'standard',
          imagery:cycle.preferences?.imagery||'optional'})}>
        <option value="daily">{t.dailyFrequency}</option>
        <option value="every_other_day">{t.alternateFrequency}</option>
        <option value="weekly">{t.weeklyFrequency}</option>
      </select>
    </label>
    <p><strong>{problem}</strong> — {t.dailyText}</p>
    <div className={styles.scale}><span>{t.low}</span><span>{t.high}</span></div>
    <Rating value={severity} onChange={setSeverity} label={t.dailyText}/>
    <Rating value={interference} onChange={setInterference} label={t.impact} optional/>
    <Rating value={resource} onChange={setResource} label={t.resources} optional/>
    <label className={styles.field}>{t.addNote}<textarea maxLength={500} rows={2} value={dailyNote} onChange={e=>setDailyNote(e.target.value)}/></label>
    {today&&<p className={styles.saved}><Check size={15}/>{t.saved}</p>}
    <div className={styles.actions}>
      <button type="button" disabled={busy||paused||!Number.isInteger(severity)} className="hh-primary" onClick={()=>submit('checkin',{
        severity,interference,resource,note:dailyNote,operationId:crypto.randomUUID(),
        ...(today?{expectedRevision:today.revision}:{})
      },()=>setExpanded('thought'))}>{today?t.update:t.save}<ArrowRight size={16}/></button>
      <button type="button" onClick={()=>setExpanded('thought')}>{t.skip}</button>
    </div>
   </DailyCard>
   <DailyCard number="thought" title={'02 · '+t.thought} subtitle={lesson?.title||''} icon={Lightbulb}
    expanded={expanded==='thought'} onToggle={()=>setExpanded(x=>x==='thought'?'':'thought')}>
      {isV3&&<aside className={styles.recallCard} data-course-active-recall>
        <strong>{t.activeRecall}</strong><p>{lesson.practiceV3.recall}</p>
        <small>{t.recallOptional}</small>
      </aside>}
      <blockquote className={styles.aphorism}>“{lesson?.aphorism}”</blockquote>
      <p>{lesson?.sections?.find(x=>x.kind==='learn')?.text}</p>
      {lesson?.workbook&&<aside className={styles.workingPosition}>
        <strong>{t.workingPosition}</strong><p>{lesson.workbook.workingPosition}</p>
        <small>{t.notAffirmation}</small>
      </aside>}
      <button type="button" className={styles.nextButton} onClick={()=>setExpanded('meditation')}>{t.next}<ArrowRight size={16}/></button>
   </DailyCard>
   <DailyCard number="meditation" title={'03 · '+t.meditation} subtitle={lesson?Math.ceil(guidedSections.reduce((seconds,item)=>seconds+item.seconds,0)/60)+' '+t.mins:''} icon={Leaf}
    expanded={expanded==='meditation'} onToggle={()=>setExpanded(x=>x==='meditation'?'':'meditation')}>
     <p className={styles.hint}>{t.eyes}</p>
     {data.gentleSuggested&&<p className={styles.note}>{t.softerSuggestion}</p>}
     <div className={styles.prefs}><button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.length==='quick'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:'quick',
         imagery:cycle.preferences?.imagery||'optional',checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.short}</button>
       <button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.length!=='quick'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:'standard',
         imagery:cycle.preferences?.imagery||'optional',checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.standard}</button>
       <button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.imagery==='no_imagery'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:cycle.preferences?.length||'standard',
         imagery:cycle.preferences?.imagery==='no_imagery'?'optional':'no_imagery',
         checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.comfort}</button>
     </div>
     <div className={styles.lessonStep}>
       <span>{t.step} {stage+1} {t.of} {guidedSections.length} · <Clock3 size={13} aria-hidden="true"/> ~{guidedSections[stage]?.seconds||0}s</span>
       <h3>{guidedSections[stage]?.title}</h3>
       <p>{guidedSections[stage]?.text}</p>
       {guidedSections[stage] && <CourseGuidedTimer
         key={cycle.id+'-'+cycle.day+'-'+stage+'-'+(cycle.preferences?.length||'standard')}
         seconds={guidedSections[stage].seconds} locale={locale}/>}
     </div>
     <div className={styles.actions}>
       <button type="button" className="hh-primary" onClick={()=>{
         if(stage < guidedSections.length-1)setStage(x=>x+1)
         else {setStage(0);setExpanded('ritual')}
       }}>{stage<guidedSections.length-1?t.next:t.action}<ArrowRight size={16}/></button>
       <button type="button" onClick={()=>setStage(0)}><RotateCcw size={15}/>{t.restart}</button>
     </div>
     <details className={styles.transcript}><summary>{t.prompt}</summary>
       {guidedSections.map((s,i)=><p key={i}><strong>{i+1}. {s.title}</strong> — {s.text}</p>)}
     </details>
   </DailyCard>
   <DailyCard number="ritual" title={'04 · '+t.ritual} subtitle={t.action} icon={Sprout}
    expanded={expanded==='ritual'} onToggle={()=>setExpanded(x=>x==='ritual'?'':'ritual')}>
      <p>{lesson?.ritual}</p>
      {lesson?.workbook&&<section className={styles.workbookTask} data-course-micro-experiment>
        <h4>{t.todayExperiment}</h4><p>{lesson.workbook.microPractice}</p>
      </section>}
      {isV4&&<details className={styles.symbolLab} data-course-symbolic-lab>
        <summary className={styles.symbolSummary}>
          <span className={styles.symbolTile}><Sprout size={20} aria-hidden="true"/></span>
          <span><strong>{t.symbolicLab}</strong><small>{t.symbolicIntro} · {lesson.practiceV4.symbol}</small></span>
          <ChevronDown size={17} aria-hidden="true"/>
        </summary>
        <div className={styles.symbolContent}>
          <p className={styles.symbolLens}><strong>{t.symbolLens}:</strong> {lesson.practiceV4.element}</p>
          <h4>{lesson.practiceV4.symbol}</h4>
          <div className={styles.symbolModes} role="group" aria-label={t.symbolicLab}>
            <button type="button" disabled={cycle.preferences?.imagery==='no_imagery'}
              aria-pressed={symbolMode==='image'&&cycle.preferences?.imagery!=='no_imagery'}
              onClick={()=>setSymbolMode('image')}>{t.symbolImage}</button>
            <button type="button" aria-pressed={symbolMode==='words'||cycle.preferences?.imagery==='no_imagery'}
              onClick={()=>setSymbolMode('words')}>{t.symbolWords}</button>
          </div>
          <p className={styles.symbolInvitation}>{symbolMode==='image'&&cycle.preferences?.imagery!=='no_imagery'
            ?lesson.practiceV4.invitation:lesson.practiceV4.withoutImagery}</p>
          <div className={styles.symbolArtifact}><strong>{t.symbolArtifact}</strong><p>{lesson.practiceV4.artifact}</p></div>
          <small>{t.symbolSafety}</small>
        </div>
      </details>}
      {isV3&&<details className={styles.transferCard} data-course-skill-transfer>
        <summary>{t.transferPrompt}</summary>
        <p>{lesson.practiceV3.microAction}</p><small>{t.transferHint}</small>
      </details>}
      {data.anchor&&<details className={styles.anchorBox}>
        <summary>{t.anchorTitle}: {data.anchor.title}</summary>
        <p className={styles.hint}>{t.anchorIntro}</p><p>{data.anchor.practice}</p>
      </details>}
      <p className={styles.journeyOutcome}><strong>{t.outcome}:</strong> {lesson?.journey?.outcome}</p>
      <p className={styles.hint}>{t.optionalResult} {t.quickTip}</p>
      <button type="button" className={styles.nextButton} onClick={()=>setExpanded('reflection')}>{t.next}<ArrowRight size={16}/></button>
   </DailyCard>
   <DailyCard number="reflection" title={'05 · '+t.reflection} subtitle={t.private} icon={HeartHandshake}
    expanded={expanded==='reflection'} onToggle={()=>setExpanded(x=>x==='reflection'?'':'reflection')} completed={completed} completedLabel={t.doneDay}>
    <p>{lesson?.reflection}</p>
    {lesson?.workbook&&<section className={styles.workbookPrompt} data-course-workbook>
      <span>{t.workbookTitle} · {t.practiceApproach}: {lesson.workbook.method}</span>
      <h4>{lesson.workbook.question}</h4>
      <p><strong>{t.sentenceStarter}:</strong> {lesson.workbook.sentenceStarter}</p>
    </section>}
    {isV3&&<p className={styles.reflectionTransfer} data-course-reflection-transfer>
      <strong>{t.reflectionV3}:</strong> {lesson.practiceV3.review}
    </p>}
    <div className={styles.ratingPair}>
      <Rating optional label={t.beforeNow} value={beforeNow} onChange={setBeforeNow}/>
      <Rating optional label={t.afterNow} value={afterNow} onChange={setAfterNow}/>
    </div>
    <fieldset className={styles.feedback}><legend>{t.feedback}</legend>
      {[['helped',t.helpful],['neutral',t.neutral],['uncomfortable',t.uncomfortable],['skip',t.noAnswer]].map(([value,label])=>
      <label key={value}><input type="radio" name="course-feedback" checked={feedback===value} onChange={()=>setFeedback(value)}/>{label}</label>)}
    </fieldset>
    <label className={styles.field}>{t.journal}<textarea maxLength={500} rows={3} value={reflection}
      readOnly={completed} placeholder={lesson?.workbook?.sentenceStarter||''} onChange={e=>setReflection(e.target.value)}/>
      <small className={styles.hint}>{t.journalHelp}</small>
      {isV4&&<small className={styles.symbolNotebookCue}>{t.symbolArtifact}: {lesson.practiceV4.artifact}</small>}</label>
    {completed?<p className={styles.saved}><CheckCircle2 size={18}/>{t.finished}</p>:
      <button type="button" className="hh-primary" disabled={busy||paused} onClick={()=>submit('session',{
        operationId:crypto.randomUUID(),day:cycle.day,lessonId:lesson.id,feedback,
        beforeNow:beforeValue(beforeNow),afterNow:beforeValue(afterNow),reflection,
      },()=>setExpanded(''))}>{t.finish}<Check size={17}/></button>}
   </DailyCard>
  </>}
  </details>
  <details className={styles.courseInsights} data-course-insights>
    <summary><span className={styles.insightsIcon}><Clock3 size={20} aria-hidden="true"/></span><span><strong>{ru?'Моя динамика и наблюдения':'My trends and observations'}</strong><small>{ru?'График, оценки и история занятий':'Chart, ratings and saved sessions'}</small></span><ChevronDown size={19} aria-hidden="true"/></summary>
  <section className={styles.graph} aria-labelledby="course-problem-graph">
   <header><div><h3 id="course-problem-graph">{t.symptoms}</h3><p className={styles.hint}>{t.history}</p></div><span>{progress.observations||0} {t.rating}</span></header>
   <div className={styles.chart} role="img" aria-label={t.symptoms+': '+(progress.days||[]).map(d=>d.date+' '+(d.severity??t.none)).join('; ')}>
    {(progress.days||[]).map(d=><div className={styles.chartDay} key={d.day}>
      <div className={styles.barZone}>{d.severity!==null&&
        <span className={styles.bar} style={{height:Math.max(3,(d.severity/10)*100)+'%'}}
          title={d.date+': '+d.severity+'/10'}/>}</div>
      <span>{d.day}</span>
    </div>)}
   </div>
   {progress.comparison?<p className={styles.compare}>
     {t.changes}: {progress.comparison.from}/10 → {progress.comparison.to}/10
     <small> ({progress.comparison.change>0?'+':''}{progress.comparison.change})</small>
   </p>:<p className={styles.hint}>{t.noChange}</p>}
   <p className={styles.hint}>{t.changeText}</p>
  </section>
  {isV3&&<section className={styles.learningEvidence} data-course-learning-evidence>
    <h3>{t.progressThree}</h3>
    <div className={styles.learningEvidenceGrid}>
      <div><strong>{progress.practiceCount||0} / 14</strong><span>{t.participation}</span></div>
      <div><strong>{progress.helpful||0}</strong><span>{t.helpfulCount}</span></div>
    </div>
    {hasComparableWeeks?<p className={styles.weekComparison}>
      {t.weeklyComparison}: {t.weekOne} {firstWeekMedian}/10 → {t.weekTwo} {secondWeekMedian}/10
    </p>:<p className={styles.hint}>{t.insufficientRatings}</p>}
    <p className={styles.hint}>{t.learningBoundaries}</p>
  </section>}
  </details>
  {data.journalHistory?.length>0&&<section className={styles.workbookHistory} data-course-journal-history>
    <details>
      <summary>{t.savedWorkbookHistory} ({data.journalHistory.length})</summary>
      <p className={styles.hint}>{t.savedWorkbookIntro}</p>
      <ol>{data.journalHistory.map(item=><li key={item.day}>
        <strong>{t.day} {item.day} · {t.savedNote}</strong>
        <p>{item.reflection}</p>
      </li>)}</ol>
    </details>
  </section>}
  {reportDay&&!reviewed&&<section className={styles.review}>
    <h3>{reportDay===7?t.firstWeek:t.lastWeek}</h3><p>{t.weeklyText}</p>
    <textarea rows={3} maxLength={650} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder={t.weeklyText}/>
    <fieldset className={styles.feedback}><legend>{t.dayReview}</legend>
      {[['continue',t.keep],['softer',t.softer],['rest',t.rest]].map(([value,label])=>
        <label key={value}><input type="radio" checked={reviewDecision===value} onChange={()=>setReviewDecision(value)} name="course-review-choice"/>{label}</label>)}
    </fieldset>
    <button type="button" className="hh-primary" disabled={busy} onClick={()=>submit('review',{
      operationId:crypto.randomUUID(),day:reportDay,decision:reviewDecision,note:reviewNote
    })}>{t.saveReview}<Check size={17}/></button>
   </section>}
  {reviewed&&<p className={styles.saved}><CheckCircle2 size={17}/>{t.reviewSaved}</p>}
  {isFinished&&<section className={styles.workbookFinish} data-course-continuation>
    <h3>{t.continuedLearning}</h3>
    <p>{lesson?.workbook?.microPractice}</p>
    {session?.reflection&&<p className={styles.savedWorkbook}>{session.reflection}</p>}
    <p className={styles.hint}>{t.noHabitGuarantee}</p>
  </section>}
  {isFinished&&<div className={styles.reportActions}>
    <button type="button" onClick={()=>window.print()}>{t.printReport}</button>
  </div>}
  {isFinished&&<section className={styles.review}>
    <h3>{t.nextCycle}</h3><label className={styles.field}>{t.problem}
      <input maxLength={160} value={targetLabel} onChange={e=>setTargetLabel(e.target.value)} placeholder={problem}/>
    </label>
    <label className={styles.field}>{t.intention}<textarea maxLength={300} value={intention} onChange={e=>setIntention(e.target.value)}/></label>
    {data.continuationRequiresMeasuredChoice&&<p className={styles.hint}>{t.approvedNextGoal}</p>}
    <label className={styles.field}>{t.newGoal}<select value={nextGoal} onChange={e=>setNewGoal(e.target.value)}>
      {continuationGoals.map(id=><option key={id} value={id}>{GROWTH_GOALS[id].title[locale]}</option>)}
    </select></label>
    <button type="button" className="hh-primary" disabled={busy||!nextGoal||targetLabel.trim().length<3}
      onClick={()=>submit('new-cycle',{problemLabel:targetLabel,intention,timeZone:timezone(),goal:nextGoal},
        ()=>{setExpanded('checkin');setStage(0);setReflection('');setNewGoal('')})}>{t.nextCycle}<ArrowRight size={16}/></button>
   </section>}
  {data.recommendedTest&&<aside className={styles.retest}>
    <div><strong>{data.recommendedTest.due?t.retestDue:t.retestLater}</strong>
      <small>{data.recommendedTest.nextDueAt?.slice(0,10)} · {data.recommendedTest.explanation}</small></div>
    {data.recommendedTest.due&&<Link href={root+'/monitoring/hh-weekly-pulse'} prefetch={false}>
      {t.startRetest}<ChevronRight size={16}/></Link>}
  </aside>}
  <div className={styles.footer}>
    {!isFinished&&<button type="button" disabled={busy} onClick={()=>submit(paused?'resume':'pause',{expectedRevision:cycle.revision})}>
      {paused?<RotateCcw size={16}/>:<CirclePause size={16}/>}
      {paused?t.resume:t.stop}
    </button>}
    <Link href={root+'/portfolio'} prefetch={false}>{t.recommendations}<ChevronRight size={16}/></Link>
  </div>
  <p className={styles.footnote}><ShieldCheck size={16}/>{t.disclaimer} {t.noHabitGuarantee}</p>
  </>}
 </section>
}
