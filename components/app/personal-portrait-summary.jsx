'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Compass, Leaf, Sprout, TrendingUp } from 'lucide-react'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { buildPersonalPortraitSummary, approvedCourseFocus } from '@/lib/profile/personal-portrait'
import { TestExplorerVisual } from './test-explorer-visual'
import styles from './personal-portrait-summary.module.css'

const COPY = {
  en: {
    eyebrow:'PERSONAL PORTRAIT', heading:'My personal picture',
    intro:'A simple overview of the resources you have explored, areas you may want to understand and the direction you choose next.',
    portraitNote:'The portrait uses saved professional measurements only. Missing results have no scores.',
    resources:'My resources', growth:'Areas to explore', progress:'My progress', focus:'Current focus',
    noResources:'Not measured yet', noGaps:'All five profile layers explored',
    noComparisons:'No comparable retest yet', comparison:'comparable measured changes',
    focusEmpty:'Choose my development direction', focusNote:'Only your chosen course themes or approved measured skills appear here.',
    resourcesNote:'Measured themes, not a claim of personal strength.',
    growthNote:'Unmeasured themes are not weaknesses.',
    progressNote:'Only equivalent repeated measurements are compared; changes do not establish a cause.',
    measured:'measured professional scales', saved:'personal reports saved',
    continue:'Continue my development', private:'Private to your account · self-reflection, not a diagnosis',
  },
  ru: {
    eyebrow:'ЛИЧНЫЙ ПОРТРЕТ', heading:'Моя личная картина',
    intro:'Ваши измеренные ресурсы, ещё не исследованные стороны профиля и направления развития, которые вы выбираете сами.',
    portraitNote:'Портрет строится только по реальным результатам профессиональных тестов. Отсутствующим данным баллы не присваиваются.',
    resources:'Мои ресурсы', growth:'Что ещё изучить', progress:'Моя динамика', focus:'Мой фокус',
    noResources:'Пока не измерено', noGaps:'Изучены все пять слоёв профиля',
    noComparisons:'Пока нет сопоставимых повторных замеров', comparison:'сопоставимых изменений',
    focusEmpty:'Выберите направление развития', focusNote:'Показаны только выбранные вами темы или подтверждённые шкалы курса.',
    resourcesNote:'Измеренные темы, а не вывод о сильных сторонах.',
    growthNote:'Неизмеренные области не означают недостатки.',
    progressNote:'Сравниваются только совместимые замеры; причины изменений неизвестны.',
    measured:'шкал профессиональных тестов', saved:'личных отчётов сохранено',
    continue:'Продолжить своё развитие', private:'Только в вашем кабинете · информация для самопознания, не диагноз',
  },
}

export function PersonalPortraitSummary({ data, locale = 'en' }) {
  const t = COPY[locale] || COPY.en
  const root = '/' + locale + '/app'
  const summary = buildPersonalPortraitSummary(data, locale)
  const [courseFocus, setCourseFocus] = useState([])
  useEffect(() => {
    // Read-only authenticated course preferences. Never show optional private notes.
    const controller = new AbortController()
    fetch('/api/app/course', { credentials:'same-origin', cache:'no-store', signal:controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (value?.course) setCourseFocus(approvedCourseFocus(value.course, locale)) })
      .catch(() => {})
    return () => controller.abort()
  }, [locale])
  const cards = [
    {
      id:'resources', icon:Leaf, title:t.resources, href:root+'/portfolio',
      value:summary.measuredResourceLabels.length ? summary.measuredResourceLabels.join(' · ') : t.noResources,
      note:t.resourcesNote,
    },
    {
      id:'growth', icon:Sprout, title:t.growth, href:root+'/tests?explore=1&filters=topics',
      value:summary.unmeasuredAreaLabels.length ? summary.unmeasuredAreaLabels.join(' · ') : t.noGaps,
      note:t.growthNote,
    },
    {
      id:'progress', icon:TrendingUp, title:t.progress, href:root+'/portfolio',
      value:summary.comparableAxes ? summary.comparableAxes + ' ' + t.comparison : t.noComparisons,
      note:t.progressNote,
    },
    {
      id:'focus', icon:Compass, title:t.focus, href:root+'/course',
      value:courseFocus.length ? courseFocus.join(' · ') : t.focusEmpty,
      note:t.focusNote,
    },
  ]
  return <section className={styles.root} aria-labelledby="hh-personal-portrait-title" data-personal-portrait-summary>
    <div className={styles.heading}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-personal-portrait-title">{t.heading}</h2>
      <p>{t.intro}</p>
    </div>
    <div className={styles.layout}>
      <div className={styles.visual}>
        <div data-profile-head className={styles.image}>
          <TestExplorerVisual compact locale={locale} coverage={coverageForFocus([])} portrait={summary.portrait}/>
        </div>
        <p className={styles.visualNote}><CheckCircle2 size={14} aria-hidden="true"/>{t.portraitNote}</p>
      </div>
      <div className={styles.cards}>
        {cards.map(({id,icon:Icon,title,href,value,note}) =>
          <Link key={id} href={href} prefetch={false} className={styles.card} data-portrait-theme={id}>
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <strong>{title}</strong>
            <span>{value}</span>
            <small>{note}</small>
            <ArrowRight className={styles.cardArrow} size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
    <div className={styles.footer}>
      <span>{summary.professionalScaleCount} {t.measured} · {summary.savedReportCount} {t.saved}</span>
      <Link href={root+'/course'} className={styles.primary}>{t.continue}<ArrowRight size={16} aria-hidden="true"/></Link>
    </div>
    <p className={styles.privacy}>{t.private}</p>
  </section>
}
