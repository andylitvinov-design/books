import Link from 'next/link'
import { ArrowRight, BookOpen, ClipboardCheck, HeartHandshake } from 'lucide-react'
import { growthGuideFor, type GrowthGuideLocale } from '@/data/growth-guides'
import styles from './topic-growth-guide.module.css'

const labels = {
  en: {
    eyebrow:'LEARN & REFLECT',steps:'Three gentle ways to begin',faq:'Common questions',
    first:'Choose your free self-check',course:'Explore the OPORA course',
    review:'Request a free written situation review',
    note:'Education and self-reflection only. These tools do not diagnose conditions or replace qualified healthcare or emergency support.',
  },
  ru: {
    eyebrow:'МАТЕРИАЛЫ ДЛЯ САМООСМЫСЛЕНИЯ',steps:'Три бережных шага',faq:'Частые вопросы',
    first:'Выбрать бесплатные тесты',course:'Посмотреть курс «ОПОРА»',
    review:'Запросить бесплатный письменный разбор',
    note:'Материалы для обучения и самонаблюдения. Они не ставят диагноз и не заменяют медицинскую или экстренную помощь.',
  },
  es: {
    eyebrow:'APRENDER Y REFLEXIONAR',steps:'Tres pasos sencillos',faq:'Preguntas frecuentes',
    first:'Elegir las pruebas gratuitas',course:'Explorar el curso OPORA',
    review:'Solicitar una revisión escrita gratuita',
    note:'Educación y reflexión personal. Estas herramientas no diagnostican enfermedades ni sustituyen la atención sanitaria o urgente.',
  },
} as const

export function TopicGrowthGuide({theme,locale}:{theme:string;locale:GrowthGuideLocale}) {
  const guide=growthGuideFor(theme,locale)
  if(!guide)return null
  const t=labels[locale]
  return <section className={styles.section} id="hh-topic-growth-guide" data-growth-guide={theme}
    aria-labelledby="hh-topic-growth-heading">
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-topic-growth-heading">{guide.title}</h2>
      <p>{guide.lead}</p>
    </header>
    <section className={styles.steps} aria-label={t.steps}>
      <h3>{t.steps}</h3>
      <div className={styles.stepGrid}>
        {guide.steps.map(([title,body],i)=><article key={title} className={styles.step}>
          <span className={styles.number}>{String(i+1).padStart(2,'0')}</span>
          <h4>{title}</h4><p>{body}</p>
        </article>)}
      </div>
    </section>
    <section className={styles.faq} aria-label={t.faq}>
      <h3>{t.faq}</h3>
      {guide.faq.map(([question,answer])=><details key={question}>
        <summary>{question}</summary><p>{answer}</p>
      </details>)}
    </section>
    <nav className={styles.actions} aria-label={t.first}>
      <a className={styles.primary} href="#hh-topic-selection-heading"><ClipboardCheck size={18} aria-hidden="true" />{t.first}<ArrowRight size={16} aria-hidden="true" /></a>
      <Link href={'/'+locale+'/courses/antistress'}><BookOpen size={18} aria-hidden="true"/>{t.course}</Link>
      <Link href={'/'+locale+'/services/free-situation-review'}><HeartHandshake size={18} aria-hidden="true"/>{t.review}</Link>
    </nav>
    <p className={styles.note}>{t.note}</p>
  </section>
}
