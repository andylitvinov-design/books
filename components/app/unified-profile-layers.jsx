'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Clock3, Compass, HeartPulse, LockKeyhole, Route } from 'lucide-react'
import { buildUnifiedProfileLayers } from '@/lib/profile/unified-profile'
import { appFetch } from '@/lib/app/client-fetch'
import styles from './unified-profile-layers.module.css'

const COPY = {
  en: {
    eyebrow: 'MY PERSONAL PROFILE', title: 'One profile, four useful perspectives',
    intro: 'Your profile grows as you complete suitable assessments and choose your goals. A missing result is not a weakness.',
    foundation: 'My foundation', foundationText: 'Personality descriptions and personal qualities — no traits to “fix”.',
    state: 'My state', stateText: 'Recent, source-linked self-reports about stress, energy and recovery.',
    life: 'My life', lifeText: 'Everyday functioning, work and relationships — not an income or relationship rating.',
    development: 'My development', developmentText: 'Your voluntarily saved targets and learning choices, not a clinical prescription.',
    recorded: 'source-linked observations', missing: 'Not assessed yet',
    dated: 'Date', source: 'Source', version: 'version', language: 'language',
    raw: 'Original scale', notPercent: 'Each number belongs to its source questionnaire, not a health or success percentage.',
    stale: 'Earlier observations exist but are not considered current.',
    goalSaved: 'Your personal goals are saved. Review or adjust them whenever you wish.',
    goalMissing: 'You have not saved a personal development goal yet.',
    goalUnavailable: 'Saved goal status could not be confirmed. Open your private development plan to check.',
    goalLoading: 'Checking your saved goals…',
    actionProfile: 'Explore eligible tests', actionResults: 'Open detailed results',
    actionGoals: 'Choose my goals', actionCourse: 'Explore a course',
    last: 'Only the latest verified source records are shown. You control your goals and what to explore next.',
    privacy: 'Private Cabinet · no new result is collected on this page · no diagnosis or automatic enrollment.',
  },
  ru: {
    eyebrow: 'МОЙ ЛИЧНЫЙ ПРОФИЛЬ', title: 'Один профиль — четыре стороны вашей жизни',
    intro: 'Профиль постепенно дополняется результатами подходящих тестов и вашими целями. Отсутствие данных — не недостаток.',
    foundation: 'Моя основа', foundationText: 'Описания личностных особенностей и качеств — не то, что обязательно нужно исправлять.',
    state: 'Моё состояние', stateText: 'Недавние самооценки стресса, энергии и восстановления с указанием источника.',
    life: 'Моя жизнь', lifeText: 'Повседневная деятельность, работа и отношения — не оценка дохода или успешности.',
    development: 'Моё развитие', developmentText: 'Добровольно сохранённые цели и учебные направления, а не медицинские назначения.',
    recorded: 'показателей с источником', missing: 'Ещё не исследовано',
    dated: 'Дата', source: 'Методика', version: 'версия', language: 'язык',
    raw: 'Исходная шкала', notPercent: 'Каждое число относится только к собственной шкале теста, а не к проценту здоровья или успешности.',
    stale: 'Есть прежние результаты, но они не считаются текущими.',
    goalSaved: 'Ваши личные цели сохранены. Их можно просмотреть или изменить.',
    goalMissing: 'Вы ещё не сохранили личные цели развития.',
    goalUnavailable: 'Статус целей не удалось подтвердить. Проверьте их в защищённом кабинете.',
    goalLoading: 'Проверяем сохранённые цели…',
    actionProfile: 'Подобрать доступные тесты', actionResults: 'Открыть подробные результаты',
    actionGoals: 'Выбрать свои цели', actionCourse: 'Посмотреть курсы',
    last: 'Показаны только последние проверенные источники. Вы сами выбираете цели и направления исследования.',
    privacy: 'Приватный кабинет · на этой странице новые результаты не собираются · не диагноз и не автоматическая запись на курс.',
  },
}
const ICONS = { foundation: Brain, state: HeartPulse, life: Compass, development: Route }
const dateText = (date, locale) => {
  const t = Date.parse(date || '')
  if (!Number.isFinite(t)) return ''
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', {dateStyle:'medium'}).format(new Date(t))
}
const numberText = value => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })

export function UnifiedProfileLayers({ data, locale = 'en' }) {
  const c = COPY[locale] || COPY.en
  const root = '/' + locale + '/app'
  const accountId = data?.account?.id
  const model = useMemo(() => buildUnifiedProfileLayers(data, locale),
    [data, locale])
  const [savedGoals, setSavedGoals] = useState('loading')
  useEffect(() => {
    const controller = new AbortController()
    setSavedGoals('loading')
    if (!accountId) {
      setSavedGoals('unavailable')
      return () => controller.abort()
    }
    appFetch('development-goals', undefined, 'GET', { accountId, signal: controller.signal })
      .then(response => {
        if (!controller.signal.aborted)
          setSavedGoals(Number.isInteger(response?.revision) && response.revision > 0 ? 'saved' : 'missing')
      })
      .catch(() => {
        if (!controller.signal.aborted) setSavedGoals('unavailable')
      })
    return () => controller.abort()
  }, [accountId])
  const developmentMessage = savedGoals === 'saved' ? c.goalSaved : savedGoals === 'missing'
    ? c.goalMissing : savedGoals === 'loading' ? c.goalLoading : c.goalUnavailable

  return <section className={styles.root} aria-labelledby="hh-unified-profile-title" data-unified-profile-layers>
    <header className={styles.header}>
      <p className={styles.eyebrow}>{c.eyebrow}</p>
      <h2 id="hh-unified-profile-title">{c.title}</h2>
      <p>{c.intro}</p>
    </header>
    <div className={styles.grid}>
      {model.layers.map(layer => {
        const Icon = ICONS[layer.id]
        const title = c[layer.id]
        const description = c[layer.id + 'Text']
        const isDevelopment = layer.id === 'development'
        const count = layer.rows.length
        const href = isDevelopment ? root + '/portfolio#hh-development-program'
          : layer.id === 'foundation' ? root + '/tests?filter=completed'
          : root + '/portfolio'
        return <article key={layer.id} className={styles.card} data-profile-layer={layer.id}>
          <div className={styles.cardHeading}>
            <span className={styles.icon} aria-hidden="true"><Icon size={19} /></span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </div>
          {isDevelopment
            ? <p className={styles.developmentStatus} role="status" data-profile-goals-status={savedGoals}>
                {developmentMessage}
              </p>
            : count > 0
              ? <>
                <p className={styles.coverage}>{count} {c.recorded}</p>
                <ul className={styles.evidence}>
                  {layer.rows.slice(0, 3).map(row => <li key={row.resultId + ':' + row.axis + ':' + row.label}>
                    <Link href={root + '/results/' + encodeURIComponent(row.resultId)} prefetch={false}
                      aria-label={c.actionResults + ': ' + row.sourceTitle + ' — ' + row.label}>
                      <strong>{row.label}</strong>
                      <span>{numberText(row.value)} ({c.raw}: {numberText(row.min)}–{numberText(row.max)} {row.unit})</span>
                      <small>{c.source}: {row.sourceTitle} · {c.version}: {row.version} · {c.language}: {row.instrumentLocale} · {c.dated}: {dateText(row.measuredAt, locale)}</small>
                    </Link>
                  </li>)}
                </ul>
                {count > 3 && <p className={styles.moreEvidence}>+{count - 3} {c.recorded}</p>}
                <p className={styles.disclaimer}>{c.notPercent}</p>
              </>
              : <p className={styles.noData} data-not-assessed>{c.missing}</p>}
          {!isDevelopment && layer.staleCount > 0 && <p className={styles.stale}><Clock3 size={14} aria-hidden="true"/>{c.stale}</p>}
          <div className={styles.cardActions}>
            <Link href={href} prefetch={false}>{isDevelopment ? c.actionGoals : count ? c.actionResults : c.actionProfile}<ArrowRight size={14} aria-hidden="true" /></Link>
            {isDevelopment && <Link href={root + '/course'} prefetch={false}><BookOpen size={14} aria-hidden="true"/>{c.actionCourse}</Link>}
          </div>
        </article>
      })}
    </div>
    <p className={styles.footer}><LockKeyhole size={15} aria-hidden="true" />{c.last} {c.privacy}</p>
  </section>
}
