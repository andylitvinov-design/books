import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, ClipboardList, FileText, Route, Sparkles } from 'lucide-react'
import styles from './my-space-topics.module.css'

// Existing editorial images and real public destinations; no placeholder actions.
const TOPICS = [
  { id: 'money', route: 'explore/business', image: '/images/holistic-house/course-focus-mountain-boy.webp' },
  { id: 'love', route: 'explore/love', image: '/images/holistic-house/video-posters/constellations-en-v1.webp' },
  { id: 'energy', route: 'explore/energy', image: '/images/holistic-house/reiki-approved-sunrise-v3.webp' },
  { id: 'stress', route: 'explore/stress', image: '/images/holistic-house/hero-olive-incense.webp' },
  { id: 'learning', route: 'academy', image: '/images/holistic-house/books-library.webp' },
  { id: 'sessions', route: 'services', image: '/images/holistic-house/course-start-heron.webp' },
]
const WORDS = {
  en: {
    title: 'Explore by topic', intro: 'Choose what matters most to you today.',
    topics: { money: 'Goals & Money', love: 'Love & Relationships', energy: 'Energy & Confidence',
      stress: 'Stress & Anxiety', learning: 'Learning & Practice', sessions: 'Sessions & Support' },
    freeTitle: 'Three free ways to begin', free: ['Free self-test', 'Free personal review', 'Free Reiki course'],
    path: 'My Path', pathDetail: 'Explore your seven steps at Holistic House',
  },
  ru: {
    title: 'Выберите направление', intro: 'Что для вас важнее всего сегодня?',
    topics: { money: 'Цели и деньги', love: 'Любовь и отношения', energy: 'Энергия и уверенность',
      stress: 'Стресс и тревога', learning: 'Обучение и практики', sessions: 'Сессии и поддержка' },
    freeTitle: 'Три бесплатных варианта начала', free: ['Пройти тест', 'Разбор ситуации', 'Курс Reiki'],
    path: 'Мой путь', pathDetail: 'Семь шагов развития в Holistic House',
  },
  es: {
    title: 'Explora por temas', intro: 'Elige lo que más te importa hoy.',
    topics: { money: 'Metas y dinero', love: 'Amor y relaciones', energy: 'Energía y confianza',
      stress: 'Estrés y ansiedad', learning: 'Aprendizaje y práctica', sessions: 'Sesiones y apoyo' },
    freeTitle: 'Tres maneras gratuitas de empezar', free: ['Test gratuito', 'Análisis personal', 'Curso Reiki gratis'],
    path: 'Mi camino', pathDetail: 'Siete pasos de desarrollo en Holistic House',
  },
}

// Shared public and private discovery; actions always resolve to existing routes.
// No account data is fetched until the visitor explicitly enters a protected flow.
export function MySpaceTopics({ locale = 'en', signedIn = false, publicHome = false }) {
  const language = Object.hasOwn(WORDS, locale) ? locale : 'en'
  const t = WORDS[language]
  const accountLocale = language === 'es' ? 'en' : language
  const testsHref = signedIn ? '/' + accountLocale + '/app/tests' : '/' + language + '/client/tests'
  const pathHref = signedIn ? '/' + accountLocale + '/app/portrait?space=path'
    : publicHome ? '#home-my-space-features' : '/' + language + '/personality-profiles'
  const startOptions = [
    { icon: ClipboardList, title: t.free[0], href: testsHref },
    { icon: FileText, title: t.free[1], href: '/' + language + '/services/free-situation-review' },
    { icon: BookOpen, title: t.free[2], href: '/' + language + '/academy' },
  ]

  return <section className={styles.root} data-my-space-topics="true" aria-labelledby="hh-myspace-topics-title">
    <header className={styles.heading}>
      <span className={styles.headingIcon}><Sparkles size={23} strokeWidth={1.8} aria-hidden="true" /></span>
      <div>
        <h2 id="hh-myspace-topics-title">{t.title}</h2>
        <p>{t.intro}</p>
      </div>
    </header>
    <div className={styles.grid}>
      {TOPICS.map(topic => <Link key={topic.id} prefetch={false}
        href={'/' + language + '/' + topic.route} className={styles.topic}
        data-my-space-topic={topic.id} aria-label={t.topics[topic.id]}>
        <span className={styles.photo}>
          <Image src={topic.image} alt="" fill loading="lazy"
            sizes="(max-width: 700px) 47vw, (max-width: 1100px) 32vw, 280px" />
        </span>
        <span className={styles.topicBody}>
          <strong>{t.topics[topic.id]}</strong>
          <ArrowUpRight size={17} aria-hidden="true" />
        </span>
      </Link>)}
    </div>
    <div className={styles.free} id={publicHome ? 'profile-free-tests' : undefined}>
      <h3>{t.freeTitle}</h3>
      <nav className={styles.freeGrid} aria-label={t.freeTitle}>
        {startOptions.map(({ icon: Icon, title, href }) => <Link key={href} href={href} prefetch={false}>
          <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
          <span>{title}</span>
        </Link>)}
      </nav>
    </div>
    <Link href={pathHref} prefetch={false} className={styles.path}>
      <Route size={25} strokeWidth={1.8} aria-hidden="true" />
      <span><strong>{t.path}</strong><small>{t.pathDetail}</small></span>
      <ArrowRight size={20} aria-hidden="true" />
    </Link>
  </section>
}
