'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Check, Crown, Heart, Leaf, LockKeyhole, MoreVertical, Archive, Plus, ShieldCheck, Sparkles, TrendingUp, UsersRound, X } from 'lucide-react'
import { GROWTH_GOALS, COURSE_TOPICS } from '@/lib/inner-growth/course-model'
import { courseProgramFromTopics } from '@/lib/inner-growth/course-programs'
import { COURSE_MEMBERSHIP, COURSE_PUBLIC_PLANS } from '@/lib/inner-growth/course-membership'
import ManualBillingRequest from './manual-billing-request'
import { appFetch } from '@/lib/app/client-fetch'
import Course14DayOverview from './course-14-day-overview'
import CabinetFreeCourseBanners from './cabinet-free-course-banners'
import { ReikiMyReviews } from '@/components/reiki-my-reviews'
import { antistressModuleTitle, ANTISTRESS_MODULE_IDS } from '@/lib/inner-growth/antistress-module-router'
import styles from './course-entry-selector.module.css'

const COPY = {
  en: {
    eyebrow: 'MY COURSES · HOLISTIC HOUSE',
    title: 'My courses', intro: 'Knowledge. Practice. Your own meaningful changes.',
    motto: 'The best in you is already here', plan: 'Course plan',
    benefitsTitle: 'What you will find in your courses', progressBenefit: 'Track your progress', practiceBenefit: 'Daily small practices', focusBenefit: 'A personal direction', rhythmBenefit: 'Your own pace',
    quote: 'Small steps each day make room for lasting habits',
    count: 'active course', current: 'CURRENT COURSE', defaultCourse: 'My personal course',
    setup: 'Setting up your course', programme: '14-day learning journey', focus: 'My development directions',
    lesson: 'Day', of: 'of', completed: 'Lessons completed', finished: 'Course completed', loading: 'Loading progress…', progressUnavailable: 'Progress temporarily unavailable',
    continue: 'Continue course', completeSetup: 'Continue setup', review: 'Review my course',
    add: 'Add a new course', first: 'Start OPORA Anti-Stress',
    addNote: 'A new topic and its own 14-day journey', firstNote: '5 stress routes · 14 lessons each · your choice',
    courseLabel: 'OPORA · STRESS RELIEF', nextLabel: 'EXPLORE COURSES', courseAction: 'Start for free', nextAction: 'View options',
    freeLimit: 'Free · 1 active course', currentLimit: 'The current course remains available for free.',
    upgrade: 'Add another learning journey', upgradeNote: 'Free includes one active course and a closing course offer. Advanced and Premium include up to five simultaneous courses without ads.',
    plans: 'Membership plans', free: 'Free', advanced: 'Advanced', premium: 'Premium', ads: 'Final course offer',
    one: '1 active course', five: 'Up to 5 active courses', noAds: 'No ads',
    introLabel: 'Advanced first month for new members', thenPrice: 'Then',
    tests: 'Included tests', session: '1 personal 60-minute session per month',
    perMonth: '/month', recommended: 'BEST FOR MULTIPLE COURSES',
    unavailable: 'Subscription checkout is not available yet. No payment will be taken on this screen. You may request manual one-month payment instructions below.',
    conditions: 'Advanced only: 50% off the first month (€10), then €20/month. Premium is €100/month; included-test and personal-session terms will be confirmed before purchase. No subscription starts on this screen.',
    close: 'Not now',
    courseOptions: 'Course options', closeCourse: 'Close course',
    closeCourseTitle: 'Close this course?',
    closeCourseExplanation: 'The course will disappear from My courses:',
    closeCourseSaved: 'Your completed tests and practice records will remain in your private account. You can start a new course later.',
    keepCourse: 'Keep course', closingCourse: 'Closing…',
    closeCourseFailed: 'The course could not be closed. Please try again.',
  },
  ru: {
    eyebrow: 'МОИ КУРСЫ · HOLISTIC HOUSE',
    title: 'Мои курсы', intro: 'Знания. Практика. Ваши собственные изменения.',
    motto: 'Лучшее в тебе уже здесь', plan: 'План курса',
    benefitsTitle: 'Что вы найдёте в наших курсах', progressBenefit: 'Наблюдение за прогрессом', practiceBenefit: 'Практики на каждый день', focusBenefit: 'Личное направление', rhythmBenefit: 'Удобный темп',
    quote: 'Маленькие шаги каждый день создают новые привычки',
    count: 'активный курс', current: 'ТЕКУЩИЙ КУРС', defaultCourse: 'Мой персональный курс',
    setup: 'Настройка курса', programme: '14-дневный курс развития', focus: 'Направления моей работы',
    lesson: 'День', of: 'из', completed: 'Уроков завершено', finished: 'Курс завершён', loading: 'Загружаем прогресс…', progressUnavailable: 'Прогресс временно недоступен',
    continue: 'Продолжить курс', completeSetup: 'Продолжить настройку', review: 'Посмотреть мой курс',
    add: 'Добавить новый курс', first: 'Начать «ОПОРА — Антистресс»',
    addNote: 'Ещё одна тема и отдельный путь на 14 дней', firstNote: '5 маршрутов · по 14 занятий · ваш выбор',
    courseLabel: 'ОПОРА · АНТИСТРЕСС', nextLabel: 'ДРУГИЕ НАПРАВЛЕНИЯ', courseAction: 'Начать бесплатно', nextAction: 'Посмотреть условия',
    freeLimit: 'Free · 1 активный курс', currentLimit: 'Текущий курс остаётся доступен бесплатно.',
    upgrade: 'Добавить ещё один курс', upgradeNote: 'Free — один активный курс с рекламным слайдом в конце программы. Advanced и Premium — до пяти курсов одновременно, без рекламы.',
    plans: 'Тарифы подписки', free: 'Free', advanced: 'Advanced', premium: 'Premium', ads: 'Реклама в финале курса',
    one: '1 активный курс', five: 'До 5 активных курсов', noAds: 'Без рекламы',
    introLabel: 'Первый месяц Advanced для новых подписчиков', thenPrice: 'Затем',
    tests: 'Тесты включены', session: '1 персональная сессия на 60 минут в месяц',
    perMonth: '/мес.', recommended: 'ДЛЯ НЕСКОЛЬКИХ КУРСОВ',
    unavailable: 'Оформление подписки пока недоступно. На этом экране оплата не списывается. Ниже можно запросить инструкции для ручной оплаты одного месяца.',
    conditions: 'Акция только для Advanced: первый месяц 10 € (−50%), затем 20 € в месяц. Premium — 100 € в месяц; условия включённых тестов и личной сессии уточняются до оплаты. На этом экране подписка не оформляется.',
    close: 'Не сейчас',
    courseOptions: 'Меню курса', closeCourse: 'Закрыть курс',
    closeCourseTitle: 'Закрыть этот курс?',
    closeCourseExplanation: 'Курс исчезнет из раздела «Мои курсы»: ',
    closeCourseSaved: 'Результаты пройденных тестов и записи занятий останутся в вашем личном кабинете. Позже можно начать новый курс.',
    keepCourse: 'Оставить курс', closingCourse: 'Закрываем…',
    closeCourseFailed: 'Не удалось закрыть курс. Попробуйте ещё раз.',
  },
}

function courseTitle(course, locale, t) {
  const program = courseProgramFromTopics(course?.focusTags)
  if (program) {
    const moduleId=course?.moduleChoice?.id
    if(program.id==='stress' && ANTISTRESS_MODULE_IDS.includes(moduleId)) {
      return (locale==='ru'?'Антистресс ':'Anti-Stress ')+moduleId.slice(2)+' · '+antistressModuleTitle(moduleId,locale,course.moduleChoice.version||'')
    }
    return program.title[locale]
  }
  const goal = (course?.goals || []).find(key => GROWTH_GOALS[key])
  if (goal) return GROWTH_GOALS[goal].title[locale]
  const topic = COURSE_TOPICS.find(item => course?.focusTags?.includes(item.id))
  return topic?.title?.[locale] || t.defaultCourse
}

const PLANS = COURSE_PUBLIC_PLANS

export default function CourseEntrySelector({ accountId, course, access, locale = 'en', onOpen, onAdd, onCloseCourse, closing = false }) {
  const t = COPY[locale] || COPY.en
  const hasCourse = Boolean(course?.stage > 0 && !['closed','archived'].includes(course?.status))
  const [progressSnapshot, setProgressSnapshot] = useState(null)
  const scope = accountId + ':' + (course?.id || '')
  const daily = progressSnapshot?.scope === scope ? progressSnapshot.value : null
  const activeCount = Number.isInteger(access?.activeCourseCount) ? access.activeCourseCount : (hasCourse ? 1 : 0)
  const activeLimit = Number.isInteger(access?.activeCourseLimit) ? access.activeCourseLimit : 1
  const tier = ({ free: 'Free', start: 'Start', advanced: 'Advanced', premium: 'Premium' })[access?.tier] || 'Free'
  const canAdd = access?.multiCourseEnabled === true && activeCount < activeLimit
  const [showPlan, setShowPlan] = useState(false)
  const [manualPlan, setManualPlan] = useState('advanced')
  const [progressError, setProgressError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [closeError, setCloseError] = useState(false)
  const menuRef = useRef(null)
  const closeCourseDialogRef = useRef(null)
  const dialogRef = useRef(null)
  const searchParams = useSearchParams()
  const requestedAdd = searchParams.get('add') === '1'
  const addIntent = useRef(null)
  if (!requestedAdd) addIntent.current = null
  else if (!addIntent.current) addIntent.current = { accountId, courseId: course?.id, consumed: false, invalidated: false }
  else if (addIntent.current.accountId !== accountId || addIntent.current.courseId !== course?.id) addIntent.current.invalidated = true

  useEffect(() => {
    if (!menuOpen) return
    function onOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function onEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onOutsideClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onOutsideClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [menuOpen])

  function openCloseConfirmation() {
    setMenuOpen(false)
    setCloseError(false)
    closeCourseDialogRef.current?.showModal()
  }

  async function confirmCloseCourse() {
    if (closing) return
    setCloseError(false)
    const success = await onCloseCourse?.()
    if (success) closeCourseDialogRef.current?.close()
    else setCloseError(true)
  }

  // A public link gets the same server-confirmed choice as the Add button,
  // once for its original account/course. Opening the consent flow never writes.
  useEffect(() => {
    const intent = addIntent.current
    if (!requestedAdd || !intent || intent.consumed) return
    intent.consumed = true
    const url = new URL(window.location.href)
    if (url.searchParams.get('add') !== '1') return
    url.searchParams.delete('add')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    if (intent.invalidated || !hasCourse || !accountId || !course?.id ||
        intent.accountId !== accountId || intent.courseId !== course.id) return
    addCourse()
  }, [requestedAdd, hasCourse, accountId, course?.id, canAdd, onAdd])

  useEffect(() => {
    setProgressError(false)
    if (!hasCourse || course.stage !== 4 || !accountId || !course.id) return
    let cancelled = false
    const controller = new AbortController()
    appFetch('course/progress?locale=' + encodeURIComponent(locale) + '&courseId=' + encodeURIComponent(course.id),
      undefined, 'GET', { accountId, signal: controller.signal }).then(result => {
      if (!cancelled && result?.courseId === course.id) setProgressSnapshot({ scope, value: result })
      else if (!cancelled) setProgressError(true)
    }).catch(() => {
      if (!cancelled) setProgressError(true)
    })
    return () => { cancelled = true; controller.abort() }
  }, [hasCourse, accountId, course?.id, course?.stage, locale, scope])

  const completed = Number.isInteger(daily?.progress?.practiceCount)
    ? Math.max(0, Math.min(14, daily.progress.practiceCount)) : null
  // A day is complete only after a saved lesson, not when a calendar day passes.
  const nextLesson = completed === null ? null : Math.min(14, completed + 1)
  const axes = (course?.goals || []).filter(key => GROWTH_GOALS[key])
    .slice(0, 3).map(key => GROWTH_GOALS[key].title[locale])
  const name = courseTitle(course, locale, t)

  function addCourse() {
    if (!hasCourse) { onOpen(); return }
    // Server-confirmed capacity only opens the existing consented flow.
    // The server rechecks capacity when the user actually starts a course.
    if (canAdd && typeof onAdd === 'function') { onAdd(); return }
    dialogRef.current?.showModal()
    dialogRef.current?.scrollTo?.({ top: 0 })
  }

  return <div className={styles.page} data-my-course data-course-selector>
    <header className={styles.header}>
      <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true"/>{t.eyebrow}</span>
      <div className={styles.headline}>
        <h1>{t.title}</h1>
        <span className={styles.headerMotto} aria-hidden="true">{t.motto}<Heart size={19} strokeWidth={1.7}/></span>
        <span className={styles.limitPill}><BookOpen size={16} aria-hidden="true"/>{activeCount + ' / ' + activeLimit}</span>
      </div>
      <p>{t.intro}</p>
    </header>

    <CabinetFreeCourseBanners locale={locale}/>

    <section className={styles.tiles} aria-label={t.title}>
      {hasCourse && <article className={styles.current} data-current-course-card>
        <div className={styles.courseMenu} ref={menuRef} data-course-actions>
          <button type="button" className={styles.courseMenuTrigger} data-course-menu-trigger
            aria-label={t.courseOptions} aria-expanded={menuOpen} aria-controls="my-course-actions-menu"
            onClick={() => setMenuOpen(open => !open)} disabled={closing}>
            <MoreVertical size={22} strokeWidth={2.2} aria-hidden="true"/>
          </button>
          {menuOpen && <div id="my-course-actions-menu" className={styles.courseMenuPopup} data-course-actions-menu>
            <button type="button" className={styles.courseMenuAction}
              onClick={openCloseConfirmation} disabled={closing}>
              <Archive size={17} aria-hidden="true"/>{t.closeCourse}
            </button>
          </div>}
        </div>
        <div className={styles.currentTop}>
          <div className={styles.currentPhoto} aria-hidden="true">
            <img src="/images/holistic-house/course-focus-mountain-boy.webp" alt=""
              width={240} height={280} loading="lazy" decoding="async"/>
            <span className={styles.currentIcon}><ShieldCheck size={21} strokeWidth={1.9}/></span>
          </div>
          <div className={styles.currentText}>
            <span className={styles.overline}>{t.current}</span>
            <h2>{name}</h2>
            <p>{t.programme}</p>
          </div>
        </div>
        {axes.length > 0 && <div className={styles.axes} aria-label={t.focus}>
          {axes.map(axis => <span key={axis}><Check size={13} aria-hidden="true"/>{axis}</span>)}
        </div>}
        <div className={styles.progressInfo}>
          <span>{course.stage === 4 && nextLesson !== null
            ? completed === 14 ? t.finished : t.lesson + ' ' + nextLesson + ' ' + t.of + ' 14'
            : course.stage === 4 ? (progressError ? t.progressUnavailable : t.loading) : t.setup}</span>
          {course.stage === 4 && <strong>{completed === null ? '— / 14' : completed + ' / 14'}</strong>}
        </div>
        <div className={styles.progressTrack} role={completed !== null ? 'progressbar' : undefined}
          aria-label={t.completed} aria-valuemin={completed !== null ? 0 : undefined}
          aria-valuenow={completed ?? undefined} aria-valuemax={completed !== null ? 14 : undefined}>
          <span style={{ width: completed === null ? '0%' : (completed / 14 * 100) + '%' }}/>
        </div>
        {course.stage === 4 && completed === null && !progressError && <small className={styles.loading}>{t.loading}</small>}
        <div className={styles.courseActions}>
          <button type="button" className={styles.openButton} onClick={onOpen}>
            {course.stage !== 4 ? t.completeSetup : completed === 14 ? t.review : t.continue}
            <ArrowRight size={19} aria-hidden="true"/>
          </button>
          <button type="button" className={styles.planButton} onClick={() => setShowPlan(value => !value)}
            aria-expanded={showPlan} aria-controls="my-course-plan">
            <BookOpen size={20} aria-hidden="true"/><span>{t.plan}</span>
          </button>
        </div>
        {showPlan && <div className={styles.planDetails} id="my-course-plan">
          <Course14DayOverview locale={locale} programId={courseProgramFromTopics(course?.focusTags)?.id||'stress'}
            moduleId={course?.moduleChoice?.id||null}
            routerVersion={course?.moduleChoice?.version||null}/>
        </div>}
      </article>}

      <button type="button" className={styles.addTile} onClick={addCourse} data-add-course>
        <span className={styles.addTileMedia} aria-hidden="true">
          <img src="/images/holistic-house/course-focus-mountain-boy.webp" alt=""
            width={240} height={180} loading="lazy" decoding="async" />
          <span className={styles.addTileMediaBadge}><Plus size={17} strokeWidth={2} /></span>
        </span>
        <span className={styles.addTileText}>
          <span className={styles.addTileEyebrow}>{hasCourse ? t.nextLabel : t.courseLabel}</span>
          <strong>{hasCourse ? t.add : t.first}</strong>
          <small>{hasCourse ? t.addNote : t.firstNote}</small>
          <span className={styles.addTileAction}>
            {hasCourse ? t.nextAction : t.courseAction}
            <ArrowRight size={16} aria-hidden="true"/>
          </span>
        </span>
      </button>
    </section>

    <ReikiMyReviews locale={locale} accountId={accountId} />

    <section className={styles.benefits} aria-labelledby="course-benefits-title">
      <div className={styles.benefitHeading}>
        <span className={styles.benefitMark}><Leaf size={23} strokeWidth={1.7} aria-hidden="true"/></span>
        <h2 id="course-benefits-title">{t.benefitsTitle}</h2>
      </div>
      <div className={styles.benefitGrid}>
        <div><span><TrendingUp size={22} aria-hidden="true"/></span><p>{t.progressBenefit}</p></div>
        <div><span><Heart size={22} aria-hidden="true"/></span><p>{t.practiceBenefit}</p></div>
        <div><span><Leaf size={22} aria-hidden="true"/></span><p>{t.focusBenefit}</p></div>
        <div><span><UsersRound size={22} aria-hidden="true"/></span><p>{t.rhythmBenefit}</p></div>
      </div>
      <p className={styles.benefitQuote}>«{t.quote}» <span>Holistic House</span></p>
    </section>

    <p className={styles.footnote}><LockKeyhole size={15} aria-hidden="true"/>
      {access ? tier + ' · ' + activeCount + ' / ' + activeLimit : hasCourse ? t.freeLimit + ' · ' + t.currentLimit : t.freeLimit}
    </p>

    <dialog ref={closeCourseDialogRef} className={styles.closeCourseDialog}
      aria-labelledby="close-course-title" aria-describedby="close-course-description"
      onClose={() => setCloseError(false)} data-close-course-dialog>
      <h2 id="close-course-title">{t.closeCourseTitle}</h2>
      <p id="close-course-description">{t.closeCourseExplanation} <strong>{name}</strong></p>
      <p>{t.closeCourseSaved}</p>
      {closeError && <p role="alert" className={styles.closeCourseError}>{t.closeCourseFailed}</p>}
      <div className={styles.closeCourseActions}>
        <button type="button" className={styles.keepCourseButton}
          onClick={() => closeCourseDialogRef.current?.close()} disabled={closing}>{t.keepCourse}</button>
        <button type="button" className={styles.confirmCloseButton}
          onClick={() => void confirmCloseCourse()} disabled={closing} data-confirm-close-course>
          {closing ? t.closingCourse : t.closeCourse}
        </button>
      </div>
    </dialog>

    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="course-upgrade-title"
      data-course-subscription-dialog>
      <div className={styles.dialogHead}>
        <span className={styles.crown}><Crown size={21} aria-hidden="true"/></span>
        <button type="button" className={styles.closeIcon} onClick={() => dialogRef.current?.close()}
          aria-label={t.close}><X size={22} aria-hidden="true"/></button>
      </div>
      <h2 id="course-upgrade-title">{t.upgrade}</h2>
      <p className={styles.dialogIntro}>{t.upgradeNote}</p>
      <h3>{t.plans}</h3>
      <div className={styles.planGrid}>
        {PLANS.map(plan => <article className={styles.planCard} key={plan.id}
          data-plan={plan.id} data-recommended={plan.id === 'advanced'}>
          {plan.id === 'advanced' && <span className={styles.recommended}>{t.recommended}</span>}
          <strong>{t[plan.id]}</strong>
          <div className={styles.price}>€{plan.price}<small>{plan.id === 'free' ? '' : t.perMonth}</small></div>
           {plan.id === COURSE_MEMBERSHIP.paidPlanId && <p className={styles.introOffer} data-first-month-offer>
             <Sparkles size={17} aria-hidden="true"/>
             <span><strong>{t.introLabel}: €{COURSE_MEMBERSHIP.introFirstMonthEUR} (−{COURSE_MEMBERSHIP.introDiscountPercent}%)</strong>
               <small>{t.thenPrice} €{COURSE_MEMBERSHIP.regularMonthlyEUR}{t.perMonth}</small></span>
           </p>}
          <p><Check size={15} aria-hidden="true"/>{t[plan.spots]}</p>
          {plan.items.map(item => <p key={item}><Check size={15} aria-hidden="true"/>{t[item]}</p>)}
          {plan.id !== 'free' && <button type="button" className={styles.paymentChoiceButton}
            aria-pressed={manualPlan === plan.id} onClick={() => setManualPlan(plan.id)}
            data-manual-plan-select={plan.id}>{locale === 'ru' ? 'Выбрать способ оплаты' : 'Choose payment method'}</button>}
        </article>)}
      </div>
      <ManualBillingRequest planId={manualPlan} locale={locale} accountId={accountId} />
      <p className={styles.unavailable} role="status">{t.unavailable}</p>
      <p className={styles.conditions}>{t.conditions}</p>
      <button type="button" className={styles.closeButton} onClick={() => dialogRef.current?.close()}>{t.close}</button>
    </dialog>
  </div>
}
