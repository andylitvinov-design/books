'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Check, ChevronDown, Crown, HeartHandshake, Leaf, LockKeyhole, Plus, Sparkles, Star, X } from 'lucide-react'
import { GROWTH_GOALS, COURSE_TOPICS } from '@/lib/inner-growth/course-model'
import { COURSE_PLANS } from '@/lib/inner-growth/course-plans'
import { canStartCheckout, PURCHASABLE_PLAN_KEYS } from '@/lib/billing/public-plan'
import { useSubscription } from './subscription-access'
import { COURSE_PRESETS, getCoursePreset } from '@/lib/inner-growth/course-presets'
import CabinetFreeCourseBanners from './cabinet-free-course-banners'
import styles from './my-courses-dashboard.module.css'

const copy={
  en:{
    eyebrow:'MY COURSES',started:'Continue learning',heading:'Your growth journey',more:'Build one skill at a time, or explore several paths in parallel.',
    primary:'MAIN COURSE',primaryAction:'Make main',today:'Continue course',setup:'Finish setting up',day:'Day',of:'of',lessons:'lessons complete',
    axes:'Your development focus',other:'Other courses',options:'Other possible courses',explore:'Explore',add:'Start another course',addNote:'Explore a new learning direction',
    full:'Your active-course limit is reached. Pause or close a course to free a place.',fullSingle:'One course at a time. Close the current course to start a new one.',completed:'Completed courses',
    archived:'Course history',viewArchive:'View completed and closed courses',hideArchive:'Hide history',closed:'Closed early',
    completedTitle:'Completed',paused:'Paused',close:'Close course',back:'Not now',
    confirm:'Close this course?',confirmText:'Its private notes and progress stay in your history. Closing frees an active place.',
    confirmClose:'Close and save history',plans:'Compare membership plans',upgrade:'Upgrade my membership',
    planIntro:'Paid memberships add convenience and parallel practice. A full self-guided course remains free.',
    free:'Free',start:'Start',advanced:'Advanced',premium:'Premium',
    adFree:'No ads',five:'Up to five active courses',one:'One active course',
    tests:'Additional included tests',session:'One 60-minute personal session per month',
    current:'Current plan',choose:'Choose plan',monthly:'/month',notReady:'Subscription checkout is not yet available here.',
    premiumTerms:'Baseline tests stay free on every plan. Paid plans are billed monthly in EUR until cancelled. The Premium session requires separate scheduling confirmation.',
    preserved:'Your existing active courses and history are preserved after a plan change. The current limit applies to starting and resuming courses.',
    viewHistory:'Review course', historySafe:'Pausing or closing frees an active place while preserving history.',historySafeSingle:'Closing frees the course place. Your saved tests and lessons remain.', closeDialog:'Dismiss', setupAxes:'Choose your focus areas during setup.', billingError:'Payment could not be opened. Please try again from subscription settings.',
  },
  ru:{
    eyebrow:'МОИ КУРСЫ',started:'Продолжить обучение',heading:'Ваш путь развития',more:'Развивайте один навык или работайте над несколькими темами параллельно.',
    primary:'ГЛАВНЫЙ КУРС',primaryAction:'Сделать главным',today:'Продолжить курс',setup:'Завершить настройку',
    day:'День',of:'из',lessons:'уроков пройдено',axes:'Направления развития',other:'Другие курсы',options:'Другие возможные курсы',explore:'Посмотреть',
    add:'Начать новый курс',addNote:'Выберите ещё одно направление развития',
    full:'Достигнут лимит активных курсов. Поставьте курс на паузу или закройте его.',fullSingle:'Одновременно можно проходить один курс. Закройте текущий, чтобы начать новый.',
    completed:'Завершённые курсы',archived:'История курсов',viewArchive:'Открыть историю курсов',hideArchive:'Скрыть историю',
    closed:'Закрыт досрочно',completedTitle:'Завершён',paused:'На паузе',
    close:'Закрыть курс',back:'Не сейчас',confirm:'Закрыть этот курс?',
    confirmText:'Личные заметки и прогресс сохранятся в истории. Освободится место для нового курса.',
    confirmClose:'Закрыть с сохранением истории',plans:'Сравнить тарифы',upgrade:'Выбрать подписку',
    planIntro:'Подписка даёт дополнительные возможности, но полноценный самостоятельный курс остаётся бесплатным.',
    free:'Free',start:'Start',advanced:'Advanced',premium:'Premium',
    adFree:'Без рекламы',five:'До пяти активных курсов',one:'Один активный курс',
    tests:'Дополнительные тесты включены',session:'Одна персональная сессия 60 минут в месяц',
    current:'Ваш тариф',choose:'Выбрать тариф',monthly:'/мес.',notReady:'Оплата подписки пока недоступна.',
    premiumTerms:'Базовые тесты бесплатны на каждом тарифе. Платная подписка списывается ежемесячно в EUR до отмены. Сессия Premium требует отдельного подтверждения записи.',
    preserved:'После смены тарифа текущие активные курсы и история сохраняются. Лимит применяется к началу и возобновлению курсов.',
    viewHistory:'Посмотреть курс', historySafe:'Пауза или закрытие освобождают место и сохраняют историю.',historySafeSingle:'Закрытие освобождает место. Пройденные тесты и занятия сохраняются.', closeDialog:'Закрыть окно', setupAxes:'Выберите направления во время настройки.', billingError:'Не удалось открыть оплату. Повторите попытку в настройках подписки.',
  },
}
function topicName(course,language){
  const preset=getCoursePreset(course.presetId)
  if(preset) return preset.title[language]
  if(typeof course.title==='string'&&course.title.trim())return course.title
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
function CourseTile({course,locale,t,hero=false,onOpen,onClose,onMakePrimary,busy,canManageCourses}){
  const title=topicName(course,locale)
  const duration=[14,28].includes(course.durationDays)?course.durationDays:14
  const completed=Math.min(duration,Math.max(0,Number(course.completedLessons)||0))
  const day=Math.min(duration,completed+1)
  const finished=course.status==='completed'
  const paused=course.status==='paused'
  const progress=Math.round(100*completed/duration)
  return <article className={hero?styles.mainCard:styles.smallCard} data-course-item={course.id} data-started-course-card>
    <span className={styles.coursePhoto} aria-hidden="true">
      <img src="/images/holistic-house/course-focus-mountain-boy.webp" alt=""
        width={240} height={220} loading="lazy" decoding="async" />
    </span>
    <div className={styles.courseBody}>
      <div className={styles.cardTop}>
        <div className={styles.cardHeading}>
          <span className={styles.micro}>{hero?t.primary:paused?t.paused:t.other}</span>
          <h3>{title}</h3>
          <small>{course.stage<4?(locale==='ru'?'Настройка курса':'Course setup'):t.day+' '+day+' '+t.of+' '+duration}
            {paused?' · '+t.paused:''}</small>
        </div>
        {course.isPrimary&&<Star size={16} fill="currentColor" className={styles.favorite} aria-label={t.primary}/>}
      </div>
      {hero&&axes(course,locale).length>0&&<div className={styles.axes} aria-label={t.axes}>
        {axes(course,locale).slice(0,3).map(axis=><span key={axis}><Check size={13} aria-hidden="true"/>{axis}</span>)}
      </div>}
      <div className={styles.progressTrack} role="progressbar" aria-label={t.lessons}
        aria-valuenow={completed} aria-valuemin={0} aria-valuemax={duration}>
        <span style={{width:progress+'%'}}/>
      </div>
      <div className={styles.tileActions}>
        <button className={styles.primaryButton} type="button" disabled={busy} onClick={()=>onOpen(course)}>
          {course.stage===4?t.today:t.setup}<ArrowRight size={16} aria-hidden="true"/>
        </button>
        {!hero&&!course.isPrimary&&!finished&&<button type="button" className={styles.linkButton}
          disabled={busy||!canManageCourses} onClick={()=>onMakePrimary(course)}>{t.primaryAction}</button>}
        {!finished&&<button type="button" className={styles.linkButton} disabled={busy||!canManageCourses}
          onClick={()=>onClose(course)}>{t.close}</button>}
      </div>
    </div>
  </article>
}
export default function MyCoursesDashboard({
  courses=[],membership={},locale='en',busy=false,canAddCourse=false,canManageCourses=false,multiCourseEnabled=true,overLimit=false,onOpen,onNew,onClose,onPrimary,
}){
  const t=copy[locale]||copy.en
  const {status,phase,busy:billingBusy,error:billingError,startCheckout}=useSubscription()
  const [openPlans,setOpenPlans]=useState(false)
  const [openHistory,setOpenHistory]=useState(false)
  const [closing,setClosing]=useState(null)
  const closeRef=useRef(null),closeId=useId()
  useEffect(()=>{
    if(closing)closeRef.current?.showModal()
    else closeRef.current?.close()
  },[closing])
  const active=courses.filter(c=>['draft','active','paused'].includes(c.status))
  const history=courses.filter(c=>['completed','archived','closed'].includes(c.status))
  const main=active.find(c=>c.isPrimary)||active[0]
  const others=active.filter(c=>c.id!==main?.id)
  const suggested=COURSE_PRESETS.filter(preset=>!active.some(course=>course.presetId===preset.id))
  const limit=membership.maxActiveCourses||1
  const occupied=Number.isInteger(membership.occupiedCount)?membership.occupiedCount:courses.filter(course=>course.status==='active').length
  const full=occupied>=limit
  const fullMessage=multiCourseEnabled?t.full:t.fullSingle
  const historyMessage=multiCourseEnabled?t.historySafe:t.historySafeSingle
  const tier=phase==='ready'?status?.entitlement?.tier:membership.tier
  const checkoutAvailable=Object.keys(COURSE_PLANS).some(id=>canStartCheckout(status,phase,id))
  function choosePlan(tier){
    if(busy||billingBusy||!canStartCheckout(status,phase,tier))return
    void startCheckout(tier)
  }
  return <div className={styles.dashboard} data-my-courses-dashboard>
    <header className={styles.heading}>
      <div><span className={styles.micro}>{t.eyebrow} · HOLISTIC HOUSE</span><h2>{t.heading}</h2><p>{t.more}</p></div>
      <span className={styles.cap}><Sparkles size={15}/>{occupied} / {limit}</span>
    </header>
    <Link href={'/' + (locale==='ru'?'ru':'en') + '/app/business'} prefetch={false}
      className={styles.businessTrack} data-business-coaching-course-link>
      <span className={styles.businessTrackPhoto} aria-hidden="true">
        <img src="/images/holistic-house/books-library.webp" alt=""
          width={240} height={220} loading="lazy" decoding="async" />
      </span>
      <span className={styles.businessTrackBody}>
        <span className={styles.businessTrackEyebrow}>{locale==='ru'?'БЕСПЛАТНЫЙ КУРС':'FREE PERSONAL COURSE'}</span>
        <strong className={styles.businessTrackTitle}>{locale==='ru'?'Бизнес и карьера · 90 дней':'Business & Career · 90 Days'}</strong>
        <span className={styles.businessTrackDescription}>
          {locale==='ru'?'Личный план под ваши цели, рефлексию и реальные результаты':'A personal plan for your goals, reflection and real-world outcomes'}
        </span>
        <span className={styles.businessTrackAction}>
          {locale==='ru'?'Создать бесплатный план':'Start free plan'}<ArrowRight size={16} aria-hidden="true"/>
        </span>
      </span>
    </Link>
    {main&&<section className={styles.startedCourses} aria-label={t.started} data-started-courses>
      <h3>{t.started}</h3>
      <CourseTile course={main} locale={locale} t={t} hero onOpen={onOpen} onClose={setClosing}
        onMakePrimary={onPrimary} busy={busy} canManageCourses={canManageCourses}/>
      {others.length>0&&<div className={styles.startedList}>
        {others.map(course=><CourseTile key={course.id} course={course} locale={locale} t={t}
          onOpen={onOpen} onClose={setClosing} onMakePrimary={onPrimary}
          busy={busy} canManageCourses={canManageCourses}/>)}
      </div>}
    </section>}
    <CabinetFreeCourseBanners locale={locale}/>
    {suggested.length>0&&<section className={styles.discover} aria-label={t.options} data-course-options>
      <h3>{t.options}</h3>
      <div className={styles.discoverList}>{suggested.map(preset=><article key={preset.id}
        className={styles.discoverCard} data-course-option={preset.id}>
        <span className={styles.discoverIcon} aria-hidden="true"><Leaf size={19}/></span>
        <div><h4>{preset.title[locale==='ru'?'ru':'en']}</h4>
          <p>{preset.subtitle[locale==='ru'?'ru':'en']}</p></div>
        {canAddCourse&&<button type="button" disabled={busy} onClick={onNew}>
          {t.explore}<ArrowRight size={15} aria-hidden="true"/></button>}
      </article>)}</div>
    </section>}
    <button type="button" className={styles.addTile} disabled={busy||!canAddCourse} onClick={onNew}>
      <Plus size={26}/><strong>{t.add}</strong><small>{full?fullMessage:t.addNote}</small>
    </button>
    {overLimit&&<p className={styles.limitTip} role="status">{t.preserved}</p>}
    <p className={styles.muted}>{historyMessage}</p>
    {full&&<p className={styles.limitTip}><LockKeyhole size={14}/>{fullMessage}</p>}
    {!!history.length&&<section className={styles.history}>
      <button type="button" className={styles.historyToggle} aria-expanded={openHistory} onClick={()=>setOpenHistory(!openHistory)}>
        <BookOpenCheck size={18}/>{openHistory?t.hideArchive:t.viewArchive}<ChevronDown size={16}/>
      </button>
      {openHistory&&<div className={styles.historyGrid}>{history.map(course=><article key={course.id} className={styles.historyCard}>
        <strong>{topicName(course,locale)}</strong><span>{course.status==='completed'?t.completedTitle:t.closed}</span>
        <small>{course.completedLessons||0}/{course.durationDays||14} {t.lessons}</small>
        <button type="button" disabled={busy} onClick={()=>onOpen(course)}>{t.viewHistory}</button>
      </article>)}</div>}
    </section>}
    <button type="button" className={styles.planLink} onClick={()=>setOpenPlans(!openPlans)} aria-expanded={openPlans}>
      <Crown size={17}/>{t.plans}<ChevronDown size={17}/>
    </button>
    {openPlans&&<section className={styles.pricing} id="course-memberships">
      <p>{t.planIntro}</p>
      <div className={styles.planGrid}>{['free', ...PURCHASABLE_PLAN_KEYS].map(id=>COURSE_PLANS[id]).map(plan=><article key={plan.id} className={styles.planCard} data-plan-id={plan.id} data-current={plan.id===tier}>
        <h3>{t[plan.id]}</h3><div className={styles.price}>{plan.euroMonthly===0?'€0':'€'+plan.euroMonthly}<span>{plan.euroMonthly?t.monthly:''}</span></div>
        <small>{plan.maxActiveCourses===1?t.one:t.five}</small>
        {plan.adFree&&<small><Check size={13}/>{t.adFree}</small>}
        {plan.includedTests&&<small><Check size={13}/>{t.tests}</small>}
        {plan.personalSessionsMonthly>0&&<small><HeartHandshake size={13}/>{t.session}</small>}
        {plan.id===tier?<span className={styles.currentPlan}>{t.current}</span>:
          <button type="button" disabled={busy||Boolean(billingBusy)||!canStartCheckout(status,phase,plan.id)} onClick={()=>choosePlan(plan.id)}>{t.choose}</button>}
      </article>)}</div>
      {!checkoutAvailable&&<p className={styles.unavailable} role="status">{t.notReady}</p>}
      <p className={styles.conditions}>{t.premiumTerms}</p>
      {billingError&&<p role="alert" className={styles.unavailable}>{t.billingError}</p>}
    </section>}
    <dialog ref={closeRef} className={styles.confirmDialog} aria-labelledby={closeId}
      onCancel={()=>setClosing(null)} onClose={()=>setClosing(null)}>
      {closing&&<section className={styles.confirmCard}>
        <button type="button" aria-label={t.closeDialog} className={styles.closeCross} onClick={()=>setClosing(null)}><X size={20}/></button>
        <h3 id={closeId}>{t.confirm}</h3><p>{t.confirmText}</p>
        <button type="button" className={styles.primaryButton} disabled={busy||!canManageCourses} onClick={()=>{if(busy||!canManageCourses)return;const course=closing;setClosing(null);onClose(course)}}>{t.confirmClose}</button>
        <button type="button" className={styles.secondary} onClick={()=>setClosing(null)}>{t.back}</button>
      </section>}
    </dialog>
  </div>
}
