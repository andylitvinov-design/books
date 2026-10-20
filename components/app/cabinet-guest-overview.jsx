'use client'

import Link from 'next/link'
import {
  Activity, ArrowRight, BookOpenCheck, ChartNoAxesCombined, ClipboardCheck,
  FilePenLine, GraduationCap, LockKeyhole, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import styles from './cabinet-guest-overview.module.css'

const TEXT = {
  en: {
    eyebrow: 'HOLISTIC HOUSE · PERSONAL CABINET',
    title: 'Discover where you are. Grow into what comes next.',
    intro: 'Your own space for self-discovery and development — bringing together your assessments, changing wellbeing, recommendations and learning in one thoughtful journey.',
    free: 'Free to begin',
    personal: 'Personal and private',
    signin: 'Open my Cabinet with Google',
    signingIn: 'Connecting to Google…',
    testsLink: 'Explore free tests',
    sectionEyebrow: 'YOUR PERSONAL JOURNEY',
    sectionTitle: 'A clear path, built around you',
    sectionIntro: 'Start with a few minutes of reflection. Your next steps become clearer as your personal picture grows.',
    features: [
      { id: 'tests', title: 'Know yourself better', text: 'Take self-checks and professional questionnaires; keep your results and personal profile together.' },
      { id: 'trends', title: 'Notice real changes', text: 'Follow your state, wellbeing and resources over time with simple progress charts.' },
      { id: 'plan', title: 'Find your next step', text: 'Get individual guidance, practical suggestions and a development programme shaped around your goals.' },
      { id: 'courses', title: 'Learn at your own pace', text: 'Save your courses, return to your last lesson and build small daily practices.' },
    ],
    practiceEyebrow: 'ALSO FOR PRACTITIONERS',
    practiceTitle: 'Let your own practice grow here',
    practiceIntro: 'Your Cabinet can also become the starting point for sharing your experience and reaching people looking for support.',
    practiceFeatures: [
      { id: 'services', title: 'Present your services', text: 'Develop a professional profile, describe your sessions and offer your services on Holistic House.' },
      { id: 'articles', title: 'Share articles and knowledge', text: 'Create helpful articles and materials for your audience, with publication review where required.' },
    ],
    privacy: 'Your personal tests and reports stay private. You choose what to submit for public publication.',
    unavailable: 'Google sign-in is temporarily unavailable. You can still explore free tests and return later.',
    retry: 'Try again',
    sessionNotice: 'We couldn’t check your sign-in status just now. You can still explore free tests, or try connecting again.' ,
    legacyLead: 'Already have an earlier private Cabinet link?',
    legacy: 'Open the previous access page',
  },
  ru: {
    eyebrow: 'HOLISTIC HOUSE · ЛИЧНЫЙ КАБИНЕТ',
    title: 'Познайте себя. Увидьте изменения. Найдите свой путь.',
    intro: 'Ваше личное пространство развития: тесты, наблюдение за состоянием, индивидуальные рекомендации и обучение складываются в единую программу, созданную вокруг вас.',
    free: 'Начните бесплатно',
    personal: 'Лично и конфиденциально',
    signin: 'Открыть мой кабинет через Google',
    signingIn: 'Подключаем Google…',
    testsLink: 'Посмотреть бесплатные тесты',
    sectionEyebrow: 'ВАШ ПУТЬ РАЗВИТИЯ',
    sectionTitle: 'От понимания себя — к реальным шагам',
    sectionIntro: 'Начните с небольшой самопроверки. Постепенно здесь сложится ваш личный профиль и понятная программа развития.',
    features: [
      { id: 'tests', title: 'Лучше понять себя', text: 'Проходите экспресс- и профессиональные тесты, сохраняйте результаты и свой личный профиль.' },
      { id: 'trends', title: 'Замечать динамику', text: 'Отслеживайте состояние, самочувствие и ресурсы во времени с помощью наглядных графиков.' },
      { id: 'plan', title: 'Получать личные подсказки', text: 'Собирайте индивидуальную программу развития с рекомендациями и следующими шагами под ваш запрос.' },
      { id: 'courses', title: 'Учиться в своём темпе', text: 'Сохраняйте курсы, возвращайтесь к последнему уроку и осваивайте короткие ежедневные практики.' },
    ],
    practiceEyebrow: 'ТАКЖЕ ДЛЯ СПЕЦИАЛИСТОВ',
    practiceTitle: 'Развивайте здесь и свою практику',
    practiceIntro: 'Ваш кабинет может стать профессиональным пространством, где вы представляете свой опыт и находите тех, кому он нужен.',
    practiceFeatures: [
      { id: 'services', title: 'Размещайте свои услуги', text: 'Создавайте профиль специалиста, рассказывайте о сессиях и предлагайте услуги на Holistic House.' },
      { id: 'articles', title: 'Делитесь статьями и знаниями', text: 'Публикуйте полезные материалы для аудитории сайта после предусмотренной проверки.' },
    ],
    privacy: 'Личные тесты и отчёты остаются приватными. Только вы решаете, какие материалы отправить на публикацию.',
    unavailable: 'Вход через Google временно недоступен. Бесплатные тесты по-прежнему можно посмотреть.',
    retry: 'Повторить',
    sessionNotice: 'Сейчас не удалось проверить статус входа. Вы можете посмотреть бесплатные тесты или попробовать подключиться ещё раз.',
    legacyLead: 'Уже есть приватная ссылка на прежний кабинет?',
    legacy: 'Открыть прежний способ входа',
  },
  es: {
    eyebrow: 'HOLISTIC HOUSE · GABINETE PERSONAL',
    title: 'Conócete mejor. Observa tus avances. Encuentra tu camino.',
    intro: 'Tu espacio personal de desarrollo reúne evaluaciones, seguimiento del bienestar, orientación individual y cursos en un recorrido creado para ti.',
    free: 'Empieza gratis',
    personal: 'Personal y privado',
    signin: 'Abrir mi gabinete con Google',
    signingIn: 'Conectando con Google…',
    testsLink: 'Explorar tests gratuitos',
    sectionEyebrow: 'TU CAMINO PERSONAL',
    sectionTitle: 'Del autoconocimiento a los próximos pasos',
    sectionIntro: 'Empieza con una breve evaluación y construye gradualmente tu perfil y tu plan de desarrollo.',
    features: [
      { id: 'tests', title: 'Conócete mejor', text: 'Realiza autoevaluaciones y pruebas profesionales y conserva tus resultados y perfil personal.' },
      { id: 'trends', title: 'Observa tus cambios', text: 'Sigue tu estado de ánimo, bienestar y recursos con gráficos de evolución.' },
      { id: 'plan', title: 'Recibe orientación personal', text: 'Crea un plan individual con recomendaciones y sugerencias adaptadas a tus objetivos.' },
      { id: 'courses', title: 'Aprende a tu ritmo', text: 'Guarda cursos, vuelve a tu última lección y practica pequeños pasos diarios.' },
    ],
    practiceEyebrow: 'TAMBIÉN PARA PROFESIONALES',
    practiceTitle: 'Haz crecer también tu práctica',
    practiceIntro: 'Presenta tu experiencia y comparte tu trabajo con quienes buscan acompañamiento.',
    practiceFeatures: [
      { id: 'services', title: 'Presenta tus servicios', text: 'Crea un perfil profesional, describe tus sesiones y ofrece tus servicios en Holistic House.' },
      { id: 'articles', title: 'Comparte artículos', text: 'Prepara artículos y materiales útiles para su publicación tras la revisión necesaria.' },
    ],
    privacy: 'Tus tests e informes son privados. Tú decides qué materiales enviar para su publicación.',
    unavailable: 'El acceso con Google no está disponible temporalmente. Puedes explorar los tests gratuitos.',
    retry: 'Reintentar',
    sessionNotice: 'No pudimos comprobar el acceso ahora mismo. Puedes explorar los tests gratuitos o volver a intentarlo.',
    legacyLead: '¿Ya tienes un enlace privado de tu gabinete anterior?',
    legacy: 'Abrir el acceso anterior',
  },
}

const FEATURE_ICONS = { tests: ClipboardCheck, trends: Activity, plan: ChartNoAxesCombined, courses: BookOpenCheck }
const PRACTICE_ICONS = { services: Users, articles: FilePenLine }

export default function CabinetGuestOverview({
  locale = 'en', busy = false, onSignin, unavailable = false, onRetry, errorMessage, sessionNotice = false,
}) {
  const selectedLocale = Object.hasOwn(TEXT, locale) ? locale : 'en'
  const t = TEXT[selectedLocale]

  return (
    <section className={styles.shell} aria-labelledby="cabinet-guest-title" data-cabinet-guest-overview="true">
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={17} />{t.eyebrow}</p>
          <h1 id="cabinet-guest-title" className={styles.title}>{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>
          <div className={styles.pills}>
            <span><ShieldCheck size={16} aria-hidden="true" />{t.free}</span>
            <span><LockKeyhole size={16} aria-hidden="true" />{t.personal}</span>
          </div>
          <div className={styles.actions}>
            {!unavailable && <button type="button" className={styles.primaryAction} disabled={busy} onClick={onSignin}>
              {busy ? t.signingIn : t.signin}<ArrowRight aria-hidden="true" size={19} />
            </button>}
            <Link href={'/' + selectedLocale + '/client/tests'} className={styles.secondaryAction} prefetch={false}>
              {t.testsLink}<ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
          {unavailable && <p className={styles.error} role="status">{t.unavailable}</p>}
          {sessionNotice && <p className={styles.sessionNotice} role="status">{t.sessionNotice}</p>}
          {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
          {onRetry && <button type="button" className={styles.retry} onClick={onRetry}>{t.retry}</button>}
        </div>
      </header>

      <div className={styles.path} aria-label={t.sectionEyebrow}>
        <p className={styles.sectionEyebrow}>{t.sectionEyebrow}</p>
        <h2 className={styles.sectionTitle}>{t.sectionTitle}</h2>
        <p className={styles.sectionIntro}>{t.sectionIntro}</p>
        <div className={styles.cards}>
          {t.features.map(feature => {
            const Icon = FEATURE_ICONS[feature.id]
            return (
              <article className={styles.card} key={feature.id}>
                <span className={styles.cardIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <section className={styles.practice} aria-labelledby="cabinet-practice-title">
        <p className={styles.practiceEyebrow}><GraduationCap size={18} aria-hidden="true" />{t.practiceEyebrow}</p>
        <h2 id="cabinet-practice-title">{t.practiceTitle}</h2>
        <p className={styles.practiceIntro}>{t.practiceIntro}</p>
        <div className={styles.practiceCards}>
          {t.practiceFeatures.map(feature => {
            const Icon = PRACTICE_ICONS[feature.id]
            return (
              <article className={styles.practiceCard} key={feature.id}>
                <Icon size={24} aria-hidden="true" strokeWidth={1.6} />
                <div><h3>{feature.title}</h3><p>{feature.text}</p></div>
              </article>
            )
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.privacy}><LockKeyhole size={17} aria-hidden="true" />{t.privacy}</p>
        <p className={styles.previous}>{t.legacyLead} <Link href={'/' + selectedLocale + '/client'} prefetch={false}>{t.legacy}<ArrowRight size={15} aria-hidden="true" /></Link></p>
      </footer>
    </section>
  )
}
