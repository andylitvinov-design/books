import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import styles from './cabinet-free-course-banners.module.css'

// These are existing Academy learning and free introductory initiation pages.
// Opening a banner is navigation only; it never enrolls a client or books a session.
const COURSES = [
  {
    id: 'energywork',
    path: 'principles-of-energywork',
    image: '/academy/reiki-yggdrasil/source/program-overview.jpg',
    en: { offer: 'FREE INTRODUCTORY COURSE', title: 'Energywork Basics', description: 'Foundations and three Reiki traditions' },
    ru: { offer: 'БЕСПЛАТНЫЙ ВВОДНЫЙ КУРС', title: 'Основы энергетики', description: 'Основы практики и три системы Рейки' },
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
    action: 'Open course',
  },
  ru: {
    eyebrow: 'АКАДЕМИЯ HOLISTIC HOUSE',
    title: 'Бесплатные курсы',
    note: 'Начальные материалы бесплатны. Инициация проводится по согласованию.',
    action: 'Открыть курс',
  },
}

export default function CabinetFreeCourseBanners({ locale = 'en' }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[language]

  return <section className={styles.section} aria-labelledby="cabinet-free-course-heading" data-cabinet-free-courses>
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />{t.eyebrow}</span>
        <h2 id="cabinet-free-course-heading">{t.title}</h2>
      </div>
      <p className={styles.note}>{t.note}</p>
    </div>
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
            <Image src={course.image} alt="" fill sizes="(max-width: 860px) 96px, 92px" />
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
