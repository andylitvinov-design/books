'use client'

import { ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck, Target, Waves, Sparkles } from 'lucide-react'
import { COURSE_PRESETS, coursePresetTests } from '@/lib/inner-growth/course-presets'
import styles from './course-preset-catalog.module.css'

const TEXT = {
  en: {
    eyebrow: 'PICK YOUR DIRECTION',
    title: 'Choose your 14-day journey',
    intro: 'Start from a clear goal. Each programme uses five fixed tests, real results and the same guided 14-day course.',
    tests: '5 fixed tests',
    days: '14 days',
    minutes: '5–12 min/day',
    included: 'See the included tests',
    start: 'Choose this course',
    change: 'Switch to this course',
    completed: 'Already completed compatible tests count toward your baseline.',
    customTitle: 'A Course Made for Me',
    customSubtitle: 'Personalized to my own situation',
    customText: 'Describe your situation, choose relevant tests and approve your own measured focus areas.',
    customAction: 'Create my personal course',
    customChange: 'Switch to personal selection',
    privacy: 'Your test results remain in your private account. No diagnosis or guaranteed outcome.',
  },
  ru: {
    eyebrow: 'ВЫБЕРИТЕ НАПРАВЛЕНИЕ',
    title: 'Ваш путь на 14 дней',
    intro: 'Начните с понятной цели. Каждый курс включает пять фиксированных тестов, анализ реальных результатов и единую программу практик.',
    tests: '5 фиксированных тестов',
    days: '14 дней',
    minutes: '5–12 мин/день',
    included: 'Какие тесты входят',
    start: 'Выбрать курс',
    change: 'Перейти на этот курс',
    completed: 'Совместимые результаты ранее пройденных тестов засчитываются.',
    customTitle: 'Курс персонально для меня',
    customSubtitle: 'Подбор по моему запросу',
    customText: 'Опишите свою ситуацию, выберите подходящие тесты и подтвердите направления работы по результатам.',
    customAction: 'Создать личный курс',
    customChange: 'Перейти к личному подбору',
    privacy: 'Результаты тестов остаются приватными. Это не диагностика и не гарантия результата.',
  },
}
const ICONS = {calm_balance: Waves, business_focus: Target, confidence: ShieldCheck}

export default function CoursePresetCatalog({locale='en',busy=false,onPreset,onPersonal,switchMode=false}) {
  const language=locale==='ru'?'ru':'en',t=TEXT[language]
  return <section className={styles.catalog} aria-label={t.title} data-course-presets>
    <header className={styles.heading}>
      <small>{t.eyebrow}</small>
      <h2>{t.title}</h2>
      <p>{t.intro}</p>
    </header>
    <div className={styles.cards}>
      {COURSE_PRESETS.map((preset,index)=>{
        const Icon = ICONS[preset.id]
        const tests = coursePresetTests(preset.id,language)
        return <article className={styles.card} key={preset.id} data-preset-id={preset.id}>
          <div className={styles.cardTop}>
            <span className={styles.mark} data-variant={index}><Icon size={24} strokeWidth={1.8} aria-hidden="true"/></span>
            <div><h3>{preset.title[language]}</h3><p>{preset.subtitle[language]}</p></div>
          </div>
          <p className={styles.description}>{preset.description[language]}</p>
          <div className={styles.axes}>{preset.axes[language].map(axis=><span key={axis}>{axis}</span>)}</div>
          <div className={styles.info}><span><ClipboardCheck size={15}/>{t.tests}</span>
            <span>{t.days}</span><span>{t.minutes}</span></div>
          <details className={styles.testDetails}>
            <summary>{t.included}</summary>
            <ol>{tests.map(item=><li key={item.key}>{item.title}
              {item.durationMinutes != null&&<small> · ~{item.durationMinutes} min</small>}</li>)}</ol>
            <p>{t.completed}</p>
          </details>
          <button type="button" className={'hh-primary '+styles.action} disabled={busy}
            onClick={()=>onPreset(preset.id)}>{switchMode?t.change:t.start}<ArrowRight size={17} aria-hidden="true"/></button>
        </article>
      })}
    </div>
    <aside className={styles.personal} data-course-personal-card>
      <span className={styles.personalIcon}><Sparkles size={26} aria-hidden="true"/></span>
      <div><p className={styles.personalEyebrow}>{t.customSubtitle}</p><h3>{t.customTitle}</h3>
        <p>{t.customText}</p></div>
      <button type="button" className={styles.personalButton} disabled={busy}
        onClick={onPersonal}>{switchMode?t.customChange:t.customAction}<ArrowRight size={17} aria-hidden="true"/></button>
    </aside>
    <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true"/>{t.privacy}</p>
  </section>
}
