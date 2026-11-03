'use client'

import { ArrowLeft, ArrowRight, BarChart3, Check, Heart, Leaf } from 'lucide-react'
import styles from './course-immersive-start.module.css'

const COPY = {
  en: {
    back: 'Back to my courses',
    eyebrow: 'HOLISTIC HOUSE · ANTI-STRESS COURSE',
    title: 'Your journey to inner stability',
    intro: 'Short daily lessons and gentle practices to explore calm, balance and self-regulation at your own pace.',
    short: 'Short lessons', shortHelp: '5–12 minutes a day',
    practise: 'Gentle practices', practiseHelp: 'Body, breathing and mind',
    progress: 'Your progress', progressHelp: 'Saved practices, not a health score',
    day: 'Day', of: 'of', done: 'completed',
    journey: 'Skills you will practise',
    path: 'See all 14 days', details: 'Course details',
    safe: 'Pause and return whenever you like.',
    current: 'Today', complete: 'Completed', upcoming: 'Upcoming',
    genericSkill: 'My next small step',
  },
  ru: {
    back: 'Вернуться к моим курсам',
    eyebrow: 'HOLISTIC HOUSE · КУРС АНТИСТРЕСС',
    title: 'Ваш путь к внутренней опоре',
    intro: 'Короткие занятия и мягкие практики, чтобы исследовать способы саморегуляции, спокойствия и восстановления в своём темпе.',
    short: 'Короткие уроки', shortHelp: '5–12 минут в день',
    practise: 'Бережные практики', practiseHelp: 'Тело, дыхание, внимание',
    progress: 'Ваш прогресс', progressHelp: 'Сохранённые занятия, не оценка здоровья',
    day: 'День', of: 'из', done: 'завершено',
    journey: 'Навыки вашего курса',
    path: 'Все 14 дней', details: 'О курсе',
    safe: 'Можно сделать паузу и вернуться позже.',
    current: 'Сегодня', complete: 'Завершено', upcoming: 'Впереди',
    genericSkill: 'Мой следующий небольшой шаг',
  },
}

export default function CourseImmersiveStart({
  locale = 'en', day = 1, duration = 14, completed = 0, roadmap = [],
  moduleTitle = '', actionLabel, actionDisabled = false,
  onStart, onBack, onViewChange,
}) {
  const t = COPY[locale] || COPY.en
  const safeDuration = Number.isInteger(duration) && duration > 0 ? duration : 14
  const safeCompleted = Math.max(0, Math.min(safeDuration, Number(completed) || 0))
  const today = Math.max(1, Math.min(safeDuration, Number(day) || 1))
  const days = Array.isArray(roadmap) ? roadmap
    .filter(item => Number.isInteger(item?.day) && item.day >= 1 && item.day <= safeDuration)
    .slice(0, safeDuration) : []

  return <section className={styles.scene} data-course-scenic-hero aria-label={t.eyebrow}>
    <div className={styles.top}>
      <button className={styles.back} type="button" onClick={onBack} aria-label={t.back} title={t.back}>
        <ArrowLeft size={22} aria-hidden="true" />
      </button>
      <div className={styles.intro}>
        <span className={styles.eyebrow}>{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        {moduleTitle && <span className={styles.moduleTitle}>{moduleTitle}</span>}
      </div>
    </div>

    <div className={styles.bottom}>
      <div className={styles.benefits} aria-label={locale === 'ru' ? 'Особенности занятий' : 'Course features'}>
        <div><span className={styles.iconCircle}><Leaf size={19} aria-hidden="true"/></span><strong>{t.short}</strong><small>{t.shortHelp}</small></div>
        <div><span className={styles.iconCircle}><Heart size={19} aria-hidden="true"/></span><strong>{t.practise}</strong><small>{t.practiseHelp}</small></div>
        <div><span className={styles.iconCircle}><BarChart3 size={19} aria-hidden="true"/></span><strong>{t.progress}</strong><small>{t.progressHelp}</small></div>
      </div>

      <div className={styles.progress}>
        <div><strong>{t.day} {today} {t.of} {safeDuration}</strong><span>{safeCompleted}/{safeDuration} {t.done}</span></div>
        <progress value={safeCompleted} max={safeDuration} aria-label={t.progress} />
      </div>

      {days.length > 0 && <div className={styles.pathBlock} data-course-scenic-days>
        <div className={styles.pathHeading}><span>{t.journey}</span>
          <button type="button" onClick={() => onViewChange?.('path')}>{t.path} <ArrowRight size={13} aria-hidden="true"/></button>
        </div>
        <ol className={styles.days} aria-label={t.journey}>
          {days.map(item => {
            const isDone = item.status === 'completed'
            const isCurrent = item.day === today && !isDone
            return <li key={item.day} className={styles.day}
              data-day-status={isDone ? 'completed' : isCurrent ? 'current' : 'upcoming'}
              aria-current={isCurrent ? 'step' : undefined}>
              <span className={styles.dayCircle}>{isDone ? <Check size={17} aria-hidden="true"/> : item.day}</span>
              <strong>{t.day} {item.day}</strong>
              <span className={styles.daySkill} title={item.workbookSkill || item.title || item.heading || t.genericSkill}>
                {item.workbookSkill || item.title || item.heading || t.genericSkill}
              </span>
            </li>
          })}
        </ol>
      </div>}

      <button className={styles.cta} type="button" disabled={actionDisabled}
        data-course-today-primary onClick={onStart}>
        {actionLabel}<ArrowRight size={24} aria-hidden="true"/>
      </button>
      <div className={styles.foot}><span>{t.safe}</span>
        <button type="button" onClick={() => onViewChange?.('details')}>{t.details}</button>
      </div>
    </div>
  </section>
}
