'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3,
  Compass, HeartHandshake, Leaf, LockKeyhole, ShieldCheck, Sparkles, Waves,
} from 'lucide-react'
import Course14DayOverview from './course-14-day-overview'
import { PublicAntistressRouteMap } from '../public-antistress-route-map'
import { ANTISTRESS_ROUTER_VERSION } from '@/lib/inner-growth/antistress-module-router'
import styles from './course-guest-landing.module.css'

const COPY = {
  ru: {
    breadcrumb: 'Курсы', eyebrow: 'HOLISTIC HOUSE · КУРС ОПОРА', free: 'Первый курс бесплатно',
    brand: 'ОПОРА', title: 'Антистресс',
    headline: 'Меньше борьбы с собой. Больше внутренней опоры.',
    introduction: '14 небольших занятий, чтобы лучше понимать своё состояние и находить простые способы поддержки в повседневной жизни.',
    facts: ['14 занятий', '6 курсов', '5–12 минут в день'],
    start: 'Начать курс бесплатно', startTests: 'Войти и пройти стартовые тесты',
    programme: 'Посмотреть программу',
    privacy: 'Сначала вход и стартовая оценка состояния. Выбор тестов и участие — только с вашего согласия.',
    imageAlt: 'Человек на фоне спокойного горного пейзажа',
    caption: 'Можно начать с одного маленького шага.',
    valueEyebrow: 'ВАШИ ПЕРВЫЕ ШАГИ', valueTitle: 'Не нужно становиться другим человеком, чтобы помочь себе.',
    valueLead: 'Вместо сложной теории — короткие практики, выбор и внимание к тому, что подходит именно вам.',
    benefits: [
      { title: 'Замечать напряжение раньше', text: 'Понимать свои первые сигналы перегрузки и вовремя делать паузу.' },
      { title: 'Находить свою опору', text: 'Пробовать мягкие телесные, образные и повседневные способы поддержки.' },
      { title: 'Выбирать, а не заставлять', text: 'Развивать гибкость и право остановиться, изменить или пропустить упражнение.' },
    ],
    planEyebrow: 'ПРОГРАММА КУРСА', planTitle: 'Ваш путь за 14 дней',
    planLead: 'Шесть 14-дневных курсов соответствуют разным учебным задачам; в каждом — семь двухдневных навыковых блоков. Четвёртый курс требует специалиста. Выберите маршрут выше, чтобы посмотреть его занятия.',
    howEyebrow: 'КАК ЭТО РАБОТАЕТ', howTitle: 'Просто начать. Удобно продолжать.',
    how: [
      { title: 'Определите точку старта', text: 'После входа заполните HH Weekly Pulse — 8 коротких вопросов. Дополнительные тесты по желанию.' },
      { title: 'Практикуйтесь каждый день', text: 'Один небольшой урок, интерактивное упражнение и выбор комфортного темпа.' },
      { title: 'Заметьте свои изменения', text: 'В конце можно повторить стартовый тест и сравнить сопоставимые результаты.' },
    ],
    bottomTitle: 'Начните с того, что доступно вам сегодня.',
    bottomLead: 'Без спешки, оценок и требования быть «идеальным».',
    legacy: 'Перейти в прежний кабинет',
    legal: 'Самостоятельное обучение и самонаблюдение. Курс не предназначен для диагностики или замены профессиональной помощи.',
    retry: 'Попробовать снова',
    inviteTitle: 'Ваш бесплатный курс готов',
    inviteLead: '8 вопросов для начала, затем 14 коротких занятий по 5–12 минут в день.',
    inviteProgress: 'Прогресс и выбранные упражнения сохраняются приватно в кабинете.',
    inviteGoogle: 'Войти через Google и начать',
    inviteNote: 'После входа откроется этот курс. Можно продолжить позже.',
    inviteExplore: 'Подробнее о программе',
  },
  en: {
    breadcrumb: 'Courses', eyebrow: 'HOLISTIC HOUSE · OPORA COURSE', free: 'Your first course is free',
    brand: 'OPORA', title: 'Stress Relief',
    headline: 'Less pressure on yourself. More room to feel supported.',
    introduction: 'Fourteen short lessons to understand your responses and explore small, practical ways to support yourself each day.',
    facts: ['14 lessons', '5 routes', '5–12 min a day'],
    start: 'Start the free course', startTests: 'Sign in and start the assessments',
    programme: 'Explore the programme',
    privacy: 'Sign in and take a starting assessment first. Tests and participation are always your choice.',
    imageAlt: 'A person against a peaceful mountain landscape',
    caption: 'One small step is a meaningful beginning.',
    valueEyebrow: 'WHAT YOU CAN PRACTISE', valueTitle: 'You do not have to become someone else to care for yourself.',
    valueLead: 'Less theory, more small practices, choice and awareness of what feels manageable for you.',
    benefits: [
      { title: 'Notice tension sooner', text: 'Recognise early signs of overload and make room for a pause.' },
      { title: 'Find your own supports', text: 'Explore gentle body-based, imagery and everyday grounding practices.' },
      { title: 'Choose rather than force', text: 'Build flexibility and permission to pause, adjust or skip an exercise.' },
    ],
    planEyebrow: 'COURSE CURRICULUM', planTitle: 'Your 14-day journey',
    planLead: 'Six 14-day courses target different learning goals; each has seven two-day skill pairs. The fourth requires clinician support. Choose a route above to preview its lessons.',
    howEyebrow: 'HOW IT WORKS', howTitle: 'Easy to start. Simple to keep going.',
    how: [
      { title: 'See your starting point', text: 'After signing in, complete the 8-question HH Weekly Pulse. Extra assessments are optional.' },
      { title: 'Practise each day', text: 'One short lesson, an interactive exercise and a pace that feels right.' },
      { title: 'Notice what changes', text: 'At the end, you can repeat the same assessment and compare eligible results.' },
    ],
    bottomTitle: 'Begin with what is possible today.',
    bottomLead: 'No rush, no grading and no need to get it perfect.',
    legacy: 'Open the previous client cabinet',
    legal: 'Self-guided education and reflection. Not for diagnosis or as a substitute for professional care.',
    retry: 'Try again',
    inviteTitle: 'Your free course is ready',
    inviteLead: 'Start with an 8-question check-in, then explore 14 short lessons at your own pace.',
    inviteProgress: 'Your choices and progress are saved privately in your Cabinet.',
    inviteGoogle: 'Continue with Google',
    inviteNote: 'After signing in, you will return to this course and can continue anytime.',
    inviteExplore: 'Explore the programme',
  },
  es: {
    breadcrumb: 'Cursos', eyebrow: 'HOLISTIC HOUSE · CURSO OPORA', free: 'Tu primer curso es gratis',
    brand: 'OPORA', title: 'Menos estrés',
    headline: 'Menos exigencia. Más apoyo interior.',
    introduction: 'Catorce lecciones breves para comprender tus reacciones y explorar maneras sencillas de cuidarte cada día.',
    facts: ['14 clases', '5 rutas', '5–12 min al día'],
    start: 'Empezar gratis', startTests: 'Iniciar sesión y hacer la evaluación inicial',
    programme: 'Ver el programa',
    privacy: 'Primero inicia sesión y completa la evaluación inicial. Participar es siempre tu elección.',
    imageAlt: 'Una persona ante un paisaje tranquilo de montaña',
    caption: 'Un paso pequeño puede ser suficiente para empezar.',
    valueEyebrow: 'LO QUE PUEDES PRACTICAR', valueTitle: 'No tienes que cambiar quién eres para cuidarte.',
    valueLead: 'Menos teoría, más prácticas breves y libertad de elección.',
    benefits: [
      { title: 'Reconocer la tensión', text: 'Observar las primeras señales y permitirte una pausa.' },
      { title: 'Encontrar apoyo', text: 'Probar recursos corporales, imaginativos y cotidianos.' },
      { title: 'Elegir sin forzarte', text: 'Poder detener, adaptar o saltar un ejercicio.' },
    ],
    planEyebrow: 'PROGRAMA', planTitle: 'Tu recorrido de 14 días',
    planLead: 'Cada ruta contiene siete etapas, desde la seguridad y la estabilización hasta los recursos y la integración. Elige una ruta para ver sus lecciones.',
    howEyebrow: 'CÓMO FUNCIONA', howTitle: 'Fácil de empezar y continuar.',
    how: [
      { title: 'Conoce tu punto de partida', text: 'Después de iniciar sesión, completa el HH Weekly Pulse de 8 preguntas. El resto es opcional.' },
      { title: 'Practica cada día', text: 'Una lección corta, un ejercicio interactivo y tu propio ritmo.' },
      { title: 'Observa tus cambios', text: 'Al final, puedes repetir la evaluación y comparar los resultados compatibles.' },
    ],
    bottomTitle: 'Empieza con lo que puedas hoy.',
    bottomLead: 'Sin prisa, sin notas, sin necesidad de hacerlo perfecto.',
    legacy: 'Abrir el antiguo espacio privado',
    legal: 'Educación y reflexión personal; no es un diagnóstico ni sustituye la atención profesional.',
    retry: 'Reintentar',
    inviteTitle: 'Tu curso gratuito está listo',
    inviteLead: 'Empieza con 8 preguntas y sigue 14 clases breves a tu ritmo.',
    inviteProgress: 'Tus elecciones y progreso se guardan de forma privada.',
    inviteGoogle: 'Continuar con Google',
    inviteNote: 'Tras iniciar sesión, volverás a este curso y podrás continuar después.',
    inviteExplore: 'Conocer el programa',
  },
}

const benefitIcons = [Waves, HeartHandshake, Compass]

export default function CourseGuestLanding({
  locale = 'en', onStart, busy = false, stressSignup = false, compact = false,
  errorMessage, onRetry, legacyText, nonDiagnostic,
}) {
  const t = COPY[locale] || COPY.en
  const [previewModuleId,setPreviewModuleId]=useState('AS2')
  if (compact) return (
    <section className={styles.compactRoot} data-opora-guest-landing data-course-guest-invite aria-labelledby="course-guest-invite-title">
      <figure className={styles.compactPhoto}>
        <img src="/images/holistic-house/course-focus-mountain-boy.webp" width="920" height="700" decoding="async" alt={t.imageAlt} />
      </figure>
      <div className={styles.compactCopy}>
        <span className={styles.compactKicker}><Leaf size={15} aria-hidden="true"/>{t.brand} · {t.title}</span>
        <h1 id="course-guest-invite-title">{t.inviteTitle}</h1>
        <p className={styles.compactLead}>{t.inviteLead}</p>
        <p className={styles.compactProgress}><LockKeyhole size={17} aria-hidden="true"/>{t.inviteProgress}</p>
        <button type="button" className={styles.compactGoogle} disabled={busy} onClick={onStart} data-course-google-signin>
          {t.inviteGoogle}<ArrowRight size={19} aria-hidden="true"/>
        </button>
        <small className={styles.compactNote}>{t.inviteNote}</small>
        <Link className={styles.compactLink} href={`/${locale}/courses/antistress`}>{t.inviteExplore}<ArrowRight size={14} aria-hidden="true"/></Link>
        {errorMessage && <p className={styles.compactError} role="alert">{errorMessage} {onRetry && <button type="button" onClick={onRetry}>{t.retry}</button>}</p>}
      </div>
    </section>
  )
  return (
    <div className={styles.root} data-opora-guest-landing>
      <nav className={styles.breadcrumbs} aria-label={locale === 'ru' ? 'Навигация' : 'Breadcrumb'}>
        <Link href={`/${locale}/courses`}>{t.breadcrumb}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t.brand} · {t.title}</span>
      </nav>
      <section className={styles.hero} aria-labelledby="opora-guest-title">
        <div className={styles.heroCopy}>
          <div className={styles.kickerRow}>
            <span className={styles.kicker}><Leaf size={15} aria-hidden="true" />{t.eyebrow}</span>
            <span className={styles.free}><CheckCircle2 size={14} aria-hidden="true" />{t.free}</span>
          </div>
          <h1 id="opora-guest-title">{t.brand}<span>{t.title}</span></h1>
          <p className={styles.headline}>{t.headline}</p>
          <p className={styles.introduction}>{t.introduction}</p>
          <div className={styles.facts} aria-label={t.facts.join(', ')}>
            <span><CalendarDays size={17} aria-hidden="true" />{t.facts[0]}</span>
            <span><Sparkles size={17} aria-hidden="true" />{t.facts[1]}</span>
            <span><Clock3 size={17} aria-hidden="true" />{t.facts[2]}</span>
          </div>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primary} onClick={onStart} disabled={busy}
              data-antistress-start data-antistress-start-tests={stressSignup ? '' : undefined}>
              {stressSignup ? t.startTests : t.start}<ArrowRight size={18} aria-hidden="true" />
            </button>
            <a href="#opora-guest-plan" className={styles.secondary}>{t.programme}<ArrowRight size={16} aria-hidden="true" /></a>
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.privacy}</p>
        </div>
        <figure className={styles.heroVisual}>
          <div className={styles.photoFrame}>
            <img src="/images/holistic-house/course-focus-mountain-boy.webp"
              width="920" height="700" alt={t.imageAlt} decoding="async" />
          </div>
          <figcaption><span aria-hidden="true">✦</span> {t.caption}</figcaption>
        </figure>
      </section>

      <section className={styles.benefits} aria-labelledby="opora-guest-benefits">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.valueEyebrow}</p>
          <h2 id="opora-guest-benefits">{t.valueTitle}</h2>
          <p>{t.valueLead}</p>
        </div>
        <div className={styles.benefitGrid}>
          {t.benefits.map((benefit, index) => {
            const Icon = benefitIcons[index]
            return (
              <article className={styles.benefit} key={benefit.title}>
                <span className={styles.benefitIcon}><Icon size={21} aria-hidden="true" /></span>
                <h3>{benefit.title}</h3><p>{benefit.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {stressSignup&&<PublicAntistressRouteMap locale={locale} selectedId={previewModuleId} onSelect={setPreviewModuleId} onStart={onStart} busy={busy} />}

      <section className={styles.programme} id="opora-guest-plan" aria-labelledby="opora-guest-plan-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.planEyebrow}</p>
          <h2 id="opora-guest-plan-title">{t.planTitle}</h2>
          <p>{t.planLead}</p>
        </div>
        <Course14DayOverview locale={locale} programId="stress" moduleId={previewModuleId} routerVersion={ANTISTRESS_ROUTER_VERSION} compact />
      </section>

      <section className={styles.how} aria-labelledby="opora-guest-how">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.howEyebrow}</p>
          <h2 id="opora-guest-how">{t.howTitle}</h2>
        </div>
        <div className={styles.howGrid}>
          {t.how.map((step, index) => <article key={step.title} className={styles.howStep}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
            <h3>{step.title}</h3><p>{step.text}</p>
          </article>)}
        </div>
      </section>

      <section className={styles.endCta} aria-labelledby="opora-guest-final">
        <div>
          <span className={styles.endKicker}><ShieldCheck size={17} aria-hidden="true" />{t.free}</span>
          <h2 id="opora-guest-final">{t.bottomTitle}</h2>
          <p>{t.bottomLead}</p>
        </div>
        <button className={styles.primary} type="button" onClick={onStart} disabled={busy}>
          {stressSignup ? t.startTests : t.start}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>

      {errorMessage && <div className={styles.error} role="alert">
        <p>{errorMessage}</p>
        {onRetry && <button type="button" onClick={onRetry}>{t.retry}</button>}
      </div>}
      <footer className={styles.footer}>
        <p><BookOpen size={16} aria-hidden="true" />{nonDiagnostic || t.legal}</p>
        <a href={`/${locale}/client`}>{legacyText || t.legacy}</a>
      </footer>
    </div>
  )
}
