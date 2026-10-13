'use client'

import { useState } from 'react'
import { ArrowRight, BookOpenCheck, Check, ChevronDown, Crown, HeartHandshake, Leaf, LockKeyhole, Plus, ShieldCheck, Sparkles, Star, X } from 'lucide-react'
import { GROWTH_GOALS, COURSE_TOPICS } from '@/lib/inner-growth/course-model'
import { COURSE_PLANS } from '@/lib/inner-growth/course-plans'
import { getCoursePreset } from '@/lib/inner-growth/course-presets'
import styles from './my-courses-dashboard.module.css'

const copy={
  en:{
    eyebrow:'MY COURSES',heading:'Your growth journey',more:'Build one skill at a time, or explore several paths in parallel.',
    primary:'MAIN COURSE',primaryAction:'Make main',today:'Continue course',setup:'Finish setting up',day:'Day',of:'of',lessons:'lessons complete',
    axes:'Your three development axes',other:'Other courses',add:'Start another course',addNote:'Explore a new learning direction',
    full:'Your plan is full. Finish or close a course, or choose a plan with more spaces.',completed:'Completed courses',
    archived:'Course history',viewArchive:'View completed and closed courses',hideArchive:'Hide history',closed:'Closed early',
    completedTitle:'Completed',paused:'Paused',locked:'Temporarily locked',unlock:'Restore this course',close:'Close course',back:'Not now',
    confirm:'Close this course?',confirmText:'Its private notes and progress stay in your history. Closing frees an active place.',
    confirmClose:'Close and save history',plans:'Compare membership plans',upgrade:'Upgrade my membership',
    planIntro:'Paid memberships add convenience and parallel practice. A full self-guided course remains free.',
    free:'Free',start:'Start',advanced:'Advanced',premium:'Premium',
    adFree:'No ads',five:'Up to five active courses',one:'One active course',
    tests:'Included self-assessment tests',session:'One personal session per month',
    current:'Current plan',choose:'Choose plan',monthly:'/month',notReady:'Subscription checkout is not yet available here.',
    premiumTerms:'Session booking and the list of included tests will be confirmed before purchase.',
    lockedNotice:'This course is saved, but your current plan does not have enough parallel places.',
  },
  ru:{
    eyebrow:'МОИ КУРСЫ',heading:'Ваш путь развития',more:'Развивайте один навык или работайте над несколькими темами параллельно.',
    primary:'ГЛАВНЫЙ КУРС',primaryAction:'Сделать главным',today:'Продолжить курс',setup:'Завершить настройку',
    day:'День',of:'из',lessons:'уроков пройдено',axes:'Три оси развития',other:'Другие курсы',
    add:'Начать новый курс',addNote:'Выберите ещё одно направление развития',
    full:'Лимит активных курсов достигнут. Завершите или закройте курс либо перейдите на другой тариф.',
    completed:'Завершённые курсы',archived:'История курсов',viewArchive:'Открыть историю курсов',hideArchive:'Скрыть историю',
    closed:'Закрыт досрочно',completedTitle:'Завершён',paused:'На паузе',locked:'Временно ограничен',unlock:'Восстановить курс',
    close:'Закрыть курс',back:'Не сейчас',confirm:'Закрыть этот курс?',
    confirmText:'Личные заметки и прогресс сохранятся в истории. Освободится место для нового курса.',
    confirmClose:'Закрыть с сохранением истории',plans:'Сравнить тарифы',upgrade:'Выбрать подписку',
    planIntro:'Подписка даёт дополнительные возможности, но полноценный самостоятельный курс остаётся бесплатным.',
    free:'Free',start:'Start',advanced:'Advanced',premium:'Premium',
    adFree:'Без рекламы',five:'До пяти активных курсов',one:'Один активный курс',
    tests:'Тесты включены',session:'Одна персональная сессия в месяц',
    current:'Ваш тариф',choose:'Выбрать тариф',monthly:'/мес.',notReady:'Оплата подписки пока недоступна.',
    premiumTerms:'Условия записи на персональную сессию и перечень включённых тестов уточняются до оплаты.',
    lockedNotice:'Этот курс сохранён, но текущий тариф не позволяет продолжать столько курсов одновременно.',
  },
}
function topicName(course,language){
  const preset=getCoursePreset(course.presetId)
  if(preset) return preset.title[language]
  const byTag=COURSE_TOPICS.find(topic=>course.focusTags?.includes(topic.id))
  const byGoal=GROWTH_GOALS[course.goals?.[0]]
  return byTag?.title?.[language]||byGoal?.title?.[language]|| (language==='ru'?'Мой персональный курс':'My personal course')
}
function axes(course,language){
  const preset=getCoursePreset(course.presetId)
  if(preset) return preset.axes[language]
  const normalized=course.scaleKeys?.map(key=>key.split('::').pop()?.replace(/^(weekly|scale)\./,'').replace(/[_-]/g,' ')).filter(Boolean) || []
  const names=[...normalized,...(course.goals||[]).map(g=>GROWTH_GOALS[g]?.title?.[language]).filter(Boolean)]
  return [...new Set(names)].slice(0,3)
}
function CourseTile({course,locale,t,hero=false,onOpen,onClose,onMakePrimary,onUnlock,busy}){
  const title=topicName(course,locale)
  const day=Math.min(14,(course.completedLessons||0)+1)
  const finished=course.status==='completed'
  const locked=course.status==='locked'
  const paused=course.status==='paused'
  const progress=Math.min(100,Math.round(100*(course.completedLessons||0)/14))
  return <article className={hero?styles.mainCard:styles.smallCard} data-course-item={course.id}>
    <div className={styles.cardTop}>
      <span className={styles.courseIllustration} aria-hidden="true">{hero?<ShieldCheck size={28}/>:<Leaf size={22}/>}</span>
      <div className={styles.cardHeading}>
        {hero&&<span className={styles.micro}>{t.primary}</span>}
        <h3>{title}</h3>
        <small>{course.stage<4?(locale==='ru'?'Настройка курса':'Course setup'):t.day+' '+day+' '+t.of+' 14'}
          {paused?' · '+t.paused:locked?' · '+t.locked:''}</small>
      </div>
      {course.isPrimary&&<Star size={18} fill="currentColor" className={styles.favorite} aria-label={t.primary}/>}
    </div>
    <div className={styles.progressTrack} role="progressbar" aria-label={t.lessons}
      aria-valuenow={course.completedLessons||0} aria-valuemin={0} aria-valuemax={14}>
      <span style={{width:progress+'%'}}/>
    </div>
    {hero&&<div className={styles.axisSection}>
      <p>{t.axes}</p>
      <div className={styles.axes}>{axes(course,locale).map((axis,i)=><span key={axis}><Check size={14}/>{axis}</span>)}</div>
    </div>}
    <div className={styles.tileActions}>
      {locked?<button type="button" className={styles.secondary} disabled={busy} onClick={()=>onUnlock(course)}>{t.unlock}</button>:
        <button className={styles.primaryButton} type="button" disabled={busy} onClick={()=>onOpen(course)}>
          {course.stage===4?t.today:t.setup}<ArrowRight size={17}/>
        </button>}
      {!hero&&!course.isPrimary&&!finished&&!locked&&<button type="button" className={styles.linkButton} disabled={busy} onClick={()=>onMakePrimary(course)}>{t.primaryAction}</button>}
      {!finished&&!locked&&<button type="button" className={styles.linkButton} disabled={busy} onClick={()=>onClose(course)}>{t.close}</button>}
    </div>
    {!hero&&<small className={styles.micro}>{course.completedLessons||0}/14 {t.lessons}</small>}
    {locked&&<small className={styles.muted}>{t.lockedNotice}</small>}
  </article>
}
export default function MyCoursesDashboard({
  courses=[],membership={},locale='en',busy=false,paywall=false,onOpen,onNew,onClose,onPrimary,onUnlock,onCheckout,
}){
  const t=copy[locale]||copy.en
  const [openPlans,setOpenPlans]=useState(paywall)
  const [openHistory,setOpenHistory]=useState(false)
  const [closing,setClosing]=useState(null)
  const [planError,setPlanError]=useState('')
  const active=courses.filter(c=>['active','paused'].includes(c.status))
  const history=courses.filter(c=>['completed','archived','locked'].includes(c.status))
  const main=active.find(c=>c.isPrimary)||active[0]
  const others=active.filter(c=>c.id!==main?.id)
  const full=active.length>=(membership.maxActiveCourses||1)
  async function choosePlan(tier){
    setPlanError('')
    if(tier==='free')return
    try{await onCheckout(tier)}catch(e){setPlanError(e?.message||t.notReady)}
  }
  return <div className={styles.dashboard} data-my-courses-dashboard>
    <header className={styles.heading}>
      <div><span className={styles.micro}>{t.eyebrow} · HOLISTIC HOUSE</span><h2>{t.heading}</h2><p>{t.more}</p></div>
      <span className={styles.cap}><Sparkles size={15}/>{active.length} / {membership.maxActiveCourses||1}</span>
    </header>
    {main&&<CourseTile course={main} locale={locale} t={t} hero onOpen={onOpen} onClose={setClosing} onMakePrimary={onPrimary} onUnlock={onUnlock} busy={busy}/>}
    {others.length>0&&<section aria-label={t.other} className={styles.additional}>
      <h3>{t.other}</h3>
      <div className={styles.extraGrid}>{others.map(course=><CourseTile key={course.id} course={course} locale={locale} t={t}
        onOpen={onOpen} onClose={setClosing} onMakePrimary={onPrimary} onUnlock={onUnlock} busy={busy}/>)}</div>
    </section>}
    <button type="button" className={styles.addTile} disabled={busy} onClick={onNew}>
      <Plus size={26}/><strong>{t.add}</strong><small>{full?t.full:t.addNote}</small>
    </button>
    {full&&<p className={styles.limitTip}><LockKeyhole size={14}/>{t.full}</p>}
    {!!history.length&&<section className={styles.history}>
      <button type="button" className={styles.historyToggle} aria-expanded={openHistory} onClick={()=>setOpenHistory(!openHistory)}>
        <BookOpenCheck size={18}/>{openHistory?t.hideArchive:t.viewArchive}<ChevronDown size={16}/>
      </button>
      {openHistory&&<div className={styles.historyGrid}>{history.map(course=><article key={course.id} className={styles.historyCard}>
        <strong>{topicName(course,locale)}</strong><span>{course.status==='completed'?t.completedTitle:course.status==='locked'?t.locked:t.closed}</span>
        <small>{course.completedLessons||0}/14 {t.lessons}</small>
        {course.status==='locked'&&<button type="button" disabled={busy} onClick={()=>onUnlock(course)}>{t.unlock}</button>}
      </article>)}</div>}
    </section>}
    <button type="button" className={styles.planLink} onClick={()=>setOpenPlans(!openPlans)} aria-expanded={openPlans}>
      <Crown size={17}/>{t.plans}<ChevronDown size={17}/>
    </button>
    {openPlans&&<section className={styles.pricing} id="course-memberships">
      <p>{t.planIntro}</p>
      <div className={styles.planGrid}>{Object.values(COURSE_PLANS).map(plan=><article key={plan.id} className={styles.planCard} data-current={plan.id===membership.tier}>
        <h3>{t[plan.id]}</h3><div className={styles.price}>{plan.euroMonthly===0?'€0':'€'+plan.euroMonthly}<span>{plan.euroMonthly?t.monthly:''}</span></div>
        <small>{plan.maxActiveCourses===1?t.one:t.five}</small>
        {plan.adFree&&<small><Check size={13}/>{t.adFree}</small>}
        {plan.includedTests&&<small><Check size={13}/>{t.tests}</small>}
        {plan.personalSessionsMonthly>0&&<small><HeartHandshake size={13}/>{t.session}</small>}
        {plan.id===membership.tier?<span className={styles.currentPlan}>{t.current}</span>:
          <button type="button" disabled={busy||!membership.checkoutConfigured||plan.id==='free'} onClick={()=>choosePlan(plan.id)}>{t.choose}</button>}
      </article>)}</div>
      {!membership.checkoutConfigured&&<p className={styles.unavailable} role="status">{t.notReady}</p>}
      <p className={styles.conditions}>{t.premiumTerms}</p>
      {planError&&<p role="alert" className={styles.unavailable}>{planError}</p>}
    </section>}
    {closing&&<div className={styles.confirmOverlay} role="presentation" onClick={()=>setClosing(null)}>
      <section className={styles.confirmCard} role="dialog" aria-modal="true" aria-labelledby="course-close-title" onClick={event=>event.stopPropagation()}>
        <button aria-label="Close" className={styles.closeCross} onClick={()=>setClosing(null)}><X size={20}/></button>
        <h3 id="course-close-title">{t.confirm}</h3><p>{t.confirmText}</p>
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={()=>{const c=closing;setClosing(null);onClose(c)}}>{t.confirmClose}</button>
        <button type="button" className={styles.secondary} onClick={()=>setClosing(null)}>{t.back}</button>
      </section>
    </div>}
  </div>
}
