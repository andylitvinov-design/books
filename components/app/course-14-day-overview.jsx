import { BookOpen, ChevronDown, Clock3, Leaf } from 'lucide-react'
import { coursePreEnrolmentPlan } from '@/lib/inner-growth/course-pre-enrolment'
import styles from './course-14-day-overview.module.css'

const COPY = {
  en: {
    eyebrow: 'YOUR PERSONAL LEARNING PATH',
    title: 'What happens during the 14 days?',
    intro: 'A clear journey from understanding your reactions to practising small, useful choices in everyday life.',
    daily: '5–12 min a day',
    days: 'Days',
    day: 'Day',
    allDays: 'See the plan for each of the 14 days',
    allDaysHint: 'Short topics for each daily lesson',
    optional: 'Each day includes a short idea, gentle practice and an optional real-life step. You choose your own focus; you can pause or skip exercises.',
    notTreatment: 'Self-guided education and reflection, not diagnosis or a substitute for professional care.',
  },
  ru: {
    eyebrow: 'ВАШ ЛИЧНЫЙ ПУТЬ РАЗВИТИЯ',
    title: 'Что вас ждёт за 14 дней?',
    intro: 'Понятный путь от изучения своих реакций к небольшим полезным действиям в повседневной жизни.',
    daily: '5–12 минут в день',
    days: 'Дни',
    day: 'День',
    allDays: 'Посмотреть план каждого из 14 дней',
    allDaysHint: 'Краткая тема каждого ежедневного урока',
    optional: 'Каждый день: короткая идея, мягкая практика и необязательный шаг в жизни. Вы сами выбираете направления, можете делать паузы и пропускать упражнения.',
    notTreatment: 'Самостоятельное обучение и рефлексия, не диагноз и не замена профессиональной помощи.',
  },
}

export default function Course14DayOverview({ locale = 'en', compact = false }) {
  const t = COPY[locale] || COPY.en
  const groups = coursePreEnrolmentPlan(locale)
  const days = groups.flatMap(group => group.days)
  return <section className={styles.overview} data-course-14-day-overview
    data-course-before-signup={compact ? 'guest' : 'intro'}
    aria-label={t.title}>
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <span className={styles.kicker}><Leaf size={14} aria-hidden="true"/>{t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.intro}</p>
      </div>
      <span className={styles.duration}><Clock3 size={16} aria-hidden="true"/>{t.daily}</span>
    </header>
    <div className={styles.phases} role="list" aria-label={t.title}>
      {groups.map((group, index) => <article role="listitem" className={styles.phase}
        key={group.id} data-course-phase={group.id}>
        <div className={styles.phaseTop}>
          <span className={styles.phaseRange}>{t.days} {group.start}–{group.end}</span>
          <span className={styles.phaseIndex} aria-hidden="true">{index + 1}<span>/4</span></span>
        </div>
        <h3>{group.title}</h3>
        <p>{group.summary}</p>
      </article>)}
    </div>
    <details className={styles.dayDisclosure} data-course-14-day-list>
      <summary className={styles.dayToggle}>
        <BookOpen size={19} aria-hidden="true"/>
        <span><strong>{t.allDays}</strong><small>{t.allDaysHint}</small></span>
        <ChevronDown size={18} className={styles.toggleIcon} aria-hidden="true"/>
      </summary>
      <ol className={styles.daysList}>
        {days.map(day => <li key={day.day} data-course-day={day.day}>
          <span className={styles.dayNumber}>{String(day.day).padStart(2, '0')}</span>
          <span className={styles.dayName}>{day.title}</span>
        </li>)}
      </ol>
    </details>
    <p className={styles.footnote}>{t.optional} <span>{t.notTreatment}</span></p>
  </section>
}
