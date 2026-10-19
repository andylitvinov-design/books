'use client'

import { useEffect, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import Image from 'next/image'
import { cardArtworkUrl, hasCardArtwork } from '@/lib/public-card-artwork'
import Link from 'next/link'
import { ArrowUpRight, Check, LockKeyhole, Sparkles } from 'lucide-react'
import { energyworkLessonRanges, energyworkSequence } from '@/data/academy/energywork-ai-schema'
import { energyworkLessons } from '@/data/academy/energywork-ai-curriculum'
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
    image: '/images/holistic-house/tantra-reiki-yin-yang-cover.svg',
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

const ENERGYWORK_SEQUENCE = energyworkSequence()
const ENERGYWORK_LESSON_RANGES = energyworkLessonRanges(ENERGYWORK_SEQUENCE)

const COPY = {
  en: {
    eyebrow: 'HOLISTIC HOUSE ACADEMY',
    title: 'Free courses',
    note: 'Explore for free. Teacher-led initiations require personal confirmation.',
    action: 'Open course', started: 'CONTINUE LEARNING', energywork: 'Energywork Basics', continueTitle: 'Continue Energywork Basics', continueText: 'Your saved slides and private reflections are ready.', continueAction: 'Resume from last slide', completed: 'Completed', slide: 'Slide',
    lesson: 'Lesson', intro: 'Introduction', of: 'of', slides: 'slides', chooseLesson: 'Go to a lesson', locked: 'Reach this lesson to unlock it',
  },
  ru: {
    eyebrow: 'АКАДЕМИЯ HOLISTIC HOUSE',
    title: 'Бесплатные курсы',
    note: 'Начальные материалы бесплатны. Инициация проводится по согласованию.',
    action: 'Открыть курс', started: 'ПРОДОЛЖИТЬ ОБУЧЕНИЕ', energywork: 'Основы энергетики', continueTitle: 'Продолжить «Основы энергетики»', continueText: 'Ваши пройденные слайды и приватные ответы сохранены.', continueAction: 'Продолжить с последнего слайда', completed: 'Завершён', slide: 'Слайд',
    lesson: 'Урок', intro: 'Введение', of: 'из', slides: 'слайдов', chooseLesson: 'Перейти к уроку', locked: 'Урок ещё не открыт',
  },
}

export default function CabinetFreeCourseBanners({ locale = 'en' }) {
  const language = locale === 'ru' ? 'ru' : 'en'
  const t = COPY[language]
  const [academyProgress, setAcademyProgress] = useState(null)
  const courseHref = '/' + language + '/academy/principles-of-energywork/learn'
  useEffect(() => {
    let alive = true
    appFetch('academy-energywork').then(value => {
      if (alive && value?.enrolled && typeof value.slideId === 'string') setAcademyProgress(value)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const savedIndex = academyProgress ? Math.max(0, ENERGYWORK_SEQUENCE.indexOf(academyProgress.slideId)) : 0
  const currentLesson = ENERGYWORK_LESSON_RANGES.find(range => savedIndex >= range.start && savedIndex < range.end)
  const resumeLabel = currentLesson
    ? `${t.lesson} ${currentLesson.lesson} · ${t.slide} ${savedIndex - currentLesson.start + 1} ${t.of} ${currentLesson.count}`
    : `${t.intro} · ${t.slide} ${savedIndex + 1} ${t.of} ${ENERGYWORK_LESSON_RANGES[0].start}`

  return <>
    {academyProgress ? <section className={styles.savedSection} aria-label={t.started}>
      <article className={styles.savedCourse} data-energywork-course-resume>
        <span className={styles.savedPhoto} aria-hidden="true">
          <Image src={cardArtworkUrl(COURSES[0].image)} unoptimized={hasCardArtwork(COURSES[0].image)}
            alt="" fill sizes="(max-width: 540px) 100px, 140px" />
        </span>
        <div className={styles.savedOverview}>
          <span className={styles.savedEyebrow}>{academyProgress.status === 'completed' ? t.completed : t.started}</span>
          <strong className={styles.savedLabel}>{t.energywork}</strong>
          <p>{resumeLabel}</p>
          <Link className={styles.savedAction} href={courseHref + "?slide=" + encodeURIComponent(academyProgress.slideId)} prefetch={false} data-energywork-resume-last>
            {t.continueAction}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <details className={styles.lessonDisclosure}>
          <summary>{t.chooseLesson}</summary>
          <div className={styles.lessonPicker} data-energywork-cabinet-lessons>
            <ol className={styles.lessonGrid}>
              {ENERGYWORK_LESSON_RANGES.map((range, number) => {
                const unlocked = savedIndex >= range.start
                const finished = academyProgress.status === 'completed' || savedIndex >= range.end
                const label = <><span>{t.lesson} {range.lesson} · {energyworkLessons[number].title[language]}</span>
                  <small>{finished ? <Check size={13} aria-hidden="true" /> : null}{range.count} {t.slides}</small></>
                return <li key={range.firstSlideId}>
                  {unlocked
                    ? <Link className={styles.lessonLink} href={courseHref + '?slide=' + encodeURIComponent(range.firstSlideId)} prefetch={false} aria-current={currentLesson?.lesson === range.lesson ? 'step' : undefined}>{label}</Link>
                    : <span className={styles.lessonLocked} title={t.locked} aria-disabled="true"><LockKeyhole size={13} aria-hidden="true" />{label}</span>}
                </li>
              })}
            </ol>
          </div>
        </details>
      </article>
    </section> : null}
    <section className={styles.section} aria-labelledby="cabinet-free-course-heading" data-cabinet-free-courses>
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" />{t.eyebrow}</span>
        <h2 id="cabinet-free-course-heading">{t.title}</h2>
      </div>
      <p className={styles.note}>{t.note}</p>
    </div>
    <div className={styles.grid}>
      {COURSES.filter(course => !(academyProgress && course.id === 'energywork')).map(course => {
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
  </>
}
