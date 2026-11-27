import Link from 'next/link'
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, Heart, Sparkles } from 'lucide-react'
import styles from './profile-space-dashboard.module.css'

const COPY = {
  ru: {
    label: 'МОИ КУРСЫ', title: 'Мои курсы',
    intro: 'Обучение, практики и развитие в твоём темпе.',
    life: 'Моя жизнь', work: 'Моя работа',
    path: 'Мой путь обучения', pathDetail: 'Продолжайте развитие и следуйте своей программе.',
  },
  en: {
    label: 'MY COURSES', title: 'My Courses',
    intro: 'Learning, practice and growth at your own pace.',
    life: 'My Life', work: 'My Work',
    path: 'My learning path', pathDetail: 'Keep learning and follow your own programme.',
  },
  es: {
    label: 'MIS CURSOS', title: 'Mis cursos',
    intro: 'Aprende, practica y crece a tu propio ritmo.',
    life: 'Mi vida', work: 'Mi trabajo',
    path: 'Mi ruta de aprendizaje', pathDetail: 'Sigue aprendiendo a tu propio ritmo.',
  },
}

/** Course index inherits the current Profile's hero, imagery, Life/Work navigation and scale. */
export function CourseSpaceIntro({ locale = 'en', root = '/en/app' }) {
  const selected = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[selected]
  return <div className={styles.dashboard} data-profile-course-landing>
    <nav className={styles.mode} aria-label={t.label}>
      <Link className={styles.life} href={root + '/portrait'} prefetch={false} data-profile-space-life>
        <Heart size={20} aria-hidden="true"/>{t.life}
      </Link>
      <Link className={styles.work} href={'/' + selected + '/practice'} prefetch={false} data-profile-space-work>
        <BriefcaseBusiness size={20} aria-hidden="true"/>{t.work}
      </Link>
    </nav>
    <section className={styles.scenic} aria-label={t.title}>
      <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true"/>{t.label}</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>
      <Link className={styles.path} href={'/'+selected+'/app/daybook/self-discovery'} prefetch={false} data-self-discovery-course>
        <span className={styles.pathIcon} aria-hidden="true"><Sparkles size={30}/></span>
        <span className={styles.pathText}><strong>Self Discovery</strong><small>{{en:'Your tests, personal profile and measurements over time',ru:'Ваши тесты, личный профиль и история измерений',es:'Tus pruebas, perfil personal y mediciones en el tiempo'}[selected]}</small></span>
        <ArrowRight className={styles.pathArrow} size={23} aria-hidden="true"/>
      </Link>
      <a className={styles.path} href="#my-courses-content" data-course-learning-path>
        <span className={styles.pathIcon} aria-hidden="true"><BookOpenCheck size={30}/></span>
        <span className={styles.pathText}><strong>{t.path}</strong><small>{t.pathDetail}</small></span>
        <ArrowRight className={styles.pathArrow} size={23} aria-hidden="true"/>
      </a>
    </section>
  </div>
}
