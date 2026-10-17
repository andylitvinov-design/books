'use client'

import { useEffect, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import Image from 'next/image'
import { cardArtworkUrl, hasCardArtwork } from '@/lib/public-card-artwork'
import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import styles from './cabinet-free-course-banners.module.css'

// These are existing Academy learning and free introductory initiation pages.
// Opening a banner is navigation only; it never enrolls a client or books a session.
const COURSES = [
  {
    id: 'energywork',
    path: 'principles-of-energywork/learn',
    image: '/academy/reiki-yggdrasil/source/program-overview.jpg',
    en: { offer: 'INTERACTIVE COURSE · PREVIEW', title: 'Energywork Basics', description: 'Slides, original videos and private save after sign-in' },
    ru: { offer: 'ИНТЕРАКТИВНЫЙ КУРС · ПРЕВЬЮ', title: 'Основы энергетики', description: 'Слайды, видео и сохранение после входа в аккаунт' },
  },
  {
    id: 'tantra-reiki',
    path: 'reiki/tantra-reiki/free-initiation',
    image: '/library/maya-mysteries/media/post-217-1.jpg',
    en: { offer: 'FREE LEVEL 1 INTRODUCTION', title: 'Tantra Reiki', description: 'Practice, materials and first steps' },
    ru: { offer: 'БЕСПЛАТНОЕ ЗНАКОМСТВО С 1 СТУПЕНЬЮ', title: 'Тантра Рейки', description: 'Практика и материалы первой ступени' },
  },
  {
    id: 'reiki-yggdrasil',
    path: 'reiki/yggdrasil/free-initiation',
    image: '/academy/reiki-yggdrasil/source/basic-program.jpg',
    en: { offer: 'FREE LEVEL 1 INTRODUCTION', title: 'Reiki Yggdrasil', description: 'First-level lessons and preparations' },
    ru: { offer: 'БЕСПЛАТНОЕ ЗНАКОМСТВО С 1 СТУПЕНЬЮ', title: 'Рейки Иггдрасиль', description: 'Уроки и подготовка к первой ступени' },
  },
]

const COPY = {
  en: {
    eyebrow: 'HOLISTIC HOUSE ACADEMY',
    title: 'Free courses',
    note: 'Explore for free. Teacher-led initiations require personal confirmation.',
    action: 'Open course', continueTitle: 'Continue Energywork Basics', continueText: 'Your saved slides and private reflections are ready.', continueAction: 'Resume saved course', completed: 'Completed', slide: 'Slide',
  },
  ru: {
    eyebrow: 'АКАДЕМИЯ HOLISTIC HOUSE',
    title: 'Бесплатные курсы',
    note: 'Начальные материалы бесплатны. Инициация проводится по согласованию.',
    action: 'Открыть курс', continueTitle: 'Продолжить «Основы энергетики»', continueText: 'Ваши пройденные слайды и приватные ответы сохранены.', continueAction: 'Продолжить сохранённый курс', completed: 'Завершён', slide: 'Слайд',
  },
}

export default function CabinetFreeCourseBanners({ locale = 'en' }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[language]
  const [academyProgress, setAcademyProgress] = useState(null)
  useEffect(() => {
    let alive = true
    appFetch('academy-energywork').then(value => {
      if (alive && value?.enrolled && typeof value.slideId === 'string') setAcademyProgress(value)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  return <section className={styles.section} aria-labelledby="cabinet-free-course-heading" data-cabinet-free-courses>
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />{t.eyebrow}</span>
        <h2 id="cabinet-free-course-heading">{t.title}</h2>
      </div>
      <p className={styles.note}>{t.note}</p>
    </div>
    {academyProgress ? <div className={styles.savedCourse} data-energywork-course-resume>
      <div>
        <span className={styles.savedLabel}>{academyProgress.status === 'completed' ? t.completed : t.continueTitle}</span>
        <p>{t.continueText}</p>
        <small>{t.slide}: {academyProgress.slideId}</small>
      </div>
      <Link className={styles.savedAction} href={'/' + language + '/academy/principles-of-energywork/learn'} prefetch={false}>
        {t.continueAction}<ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div> : null}
    <div className={styles.grid}>
      {COURSES.map(course => {
        const content = course[language]
        return <Link
          key={course.id}
          href={'/' + language + '/academy/' + course.path}
          className={styles.card}
          data-free-course-id={course.id}
        >
          <span className={styles.photo} aria-hidden="true">
            <Image src={cardArtworkUrl(course.image)} unoptimized={hasCardArtwork(course.image)} alt="" fill sizes="(max-width: 860px) 96px, 92px" />
          </span>
          <span className={styles.body}>
            <span className={styles.offer}>{content.offer}</span>
            <strong className={styles.courseTitle}>{content.title}</strong>
            <span className={styles.description}>{content.description}</span>
            <span className={styles.action}>{t.action}<ArrowUpRight size={15} aria-hidden="true" /></span>
          </span>
        </Link>
      })}
    </div>
  </section>
}
