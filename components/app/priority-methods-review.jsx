'use client'

import { useMemo, useState } from 'react'
import { PRIORITY_METHODS_2026, PRIORITY_METHODS_RIGHTS_COUNTS } from '@/data/assessments/priority-methods-2026'
import styles from './priority-methods-review.module.css'

// Metadata only: never renders protected questionnaire items or enables a locked test.
const messages = {
  en: {
    label: '15 research measures · rights and readiness',
    intro: 'Research and licensing reference. Reuse permission is not the same as a published, ready-to-run assessment.',
    available: 'Reuse permitted', pending: 'Permission required', review: 'Rights to verify',
    search: 'Find a method', all: 'All licence statuses', topics: 'All topics', questions: 'items',
    time: 'Est. time', topic: 'Site topic', scales: 'Measured dimensions', rights: 'Use on a commercial website',
    source: 'Original source / permission', blocked: 'Questionnaire not available on Holistic House until permissions, translation and safety checks pass.',
    count: 'methods shown', show: 'Show all 15 methods', fewer: 'Show fewer',
    short: 'Find the separate 5-item CFPB version in Available',
    note: 'Do not use screening scores as diagnoses, treatment instructions or automatic homeopathic recommendations.',
  },
  ru: {
    label: '15 профессиональных методик · лицензии и готовность',
    intro: 'Справочник методик и прав. Разрешение использовать текст ещё не означает, что тест уже опубликован и доступен для прохождения.',
    available: 'Использование разрешено', pending: 'Требуется разрешение', review: 'Условия уточняются',
    search: 'Найти методику', all: 'Все лицензии', topics: 'Все темы', questions: 'вопросов',
    time: 'Время', topic: 'Тема сайта', scales: 'Измеряемые шкалы', rights: 'Использование на коммерческом сайте',
    source: 'Первичный источник / условия', blocked: 'Опросник недоступен на Holistic House до проверки прав, перевода и безопасности.',
    count: 'методик показано', show: 'Показать все 15 методик', fewer: 'Показать меньше',
    short: 'Найти отдельную короткую версию CFPB на 5 пунктов',
    note: 'Скрининг не устанавливает диагноз и не используется для автоматических назначений или подбора гомеопатии.',
  },
  es: {
    label: '15 cuestionarios profesionales · licencias y disponibilidad',
    intro: 'Ficha de investigación y licencias. El permiso de reproducción no implica que el cuestionario ya esté publicado.',
    available: 'Reutilización autorizada', pending: 'Requiere permiso', review: 'Derechos pendientes',
    search: 'Buscar cuestionario', all: 'Todas las licencias', topics: 'Todos los temas', questions: 'preguntas',
    time: 'Tiempo', topic: 'Área', scales: 'Dimensiones', rights: 'Uso en un sitio comercial',
    source: 'Fuente / autorización', blocked: 'No disponible hasta completar permisos, traducción y revisión de seguridad.',
    count: 'cuestionarios', show: 'Mostrar los 15 cuestionarios', fewer: 'Mostrar menos',
    short: 'Buscar la versión separada CFPB de 5 ítems',
    note: 'Las pruebas de cribado no son diagnósticos ni instrucciones de tratamiento.',
  },
}
const statusKey = { open_reuse: 'available', permission_required: 'pending', rights_review: 'review' }
function localized(value, locale) {
  return value?.[locale] || value?.en || ''
}

/** @param {{locale?: string, runnableKeys?: string[], onOpenCfpbShort?: () => void}} props */
export function PriorityMethodsReview({ locale = 'en', runnableKeys = [], onOpenCfpbShort }) {
  const lang = messages[locale] ? locale : 'en'
  const c = messages[lang]
  const [search, setSearch] = useState('')
  const [rightsFilter, setRightsFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const topics = useMemo(() => [...new Set(PRIORITY_METHODS_2026.map((item) => item.topic.en))], [])
  const filtered = useMemo(() => PRIORITY_METHODS_2026.filter((item) => {
    if (rightsFilter !== 'all' && item.status !== rightsFilter) return false
    if (topicFilter !== 'all' && item.topic.en !== topicFilter) return false
    const haystack = [item.key, item.abbr, item.name.en, item.name.ru, item.topic.en, item.topic.ru, item.scales.en, item.scales.ru].join(' ').toLocaleLowerCase()
    return !search.trim() || haystack.includes(search.trim().toLocaleLowerCase())
  }), [search, rightsFilter, topicFilter])
  const displayed = showAll || search || rightsFilter !== 'all' || topicFilter !== 'all' ? filtered : filtered.slice(0, 6)
  return (
    <section className={styles.panel} data-priority-methods-review aria-label={c.label}>
      <details className={styles.fold}>
        <summary className={styles.panelSummary}>
          <span className={styles.heading}>
            <strong>{c.label}</strong>
            <small>{c.intro}</small>
          </span>
          <span className={styles.badgeRow} aria-hidden="true">
            <span className={styles.reusable}>1 {c.available}</span>
            <span className={styles.pending}>{PRIORITY_METHODS_RIGHTS_COUNTS.permission_required} {c.pending}</span>
            <span className={styles.review}>{PRIORITY_METHODS_RIGHTS_COUNTS.rights_review} {c.review}</span>
          </span>
        </summary>
        <div className={styles.inside}>
          <div className={styles.filters}>
            <label><span>{c.search}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="WHO-5, CFPB, ECR…" /></label>
            <label><span>{c.topics}</span><select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
              <option value="all">{c.topics}</option>{topics.map((topic) => {
                const match = PRIORITY_METHODS_2026.find((item) => item.topic.en === topic)
                return <option key={topic} value={topic}>{localized(match.topic, lang)}</option>
              })}
            </select></label>
            <label><span>{c.all}</span><select value={rightsFilter} onChange={(event) => setRightsFilter(event.target.value)}>
              <option value="all">{c.all}</option>
              <option value="open_reuse">{c.available}</option>
              <option value="permission_required">{c.pending}</option>
              <option value="rights_review">{c.review}</option>
            </select></label>
          </div>
          <p className={styles.count} role="status" aria-live="polite">{filtered.length} {c.count}</p>
          <div className={styles.cards}>
            {displayed.map((item) => (
              <details key={item.key} className={styles.card} data-method-id={item.key}>
                <summary className={styles.cardSummary}>
                  <span className={styles.shortName}>{item.abbr}</span>
                  <span className={styles.cardTitle}>
                    <strong>{localized(item.name, lang)}</strong>
                    <small>{item.questions} {c.questions} · {item.minutes} min · {localized(item.topic, lang)}</small>
                  </span>
                  <span className={styles.status} data-status={item.status}>{c[statusKey[item.status]]}</span>
                </summary>
                <div className={styles.cardBody}>
                  <dl>
                    <div><dt>{c.scales}</dt><dd>{localized(item.scales, lang)}</dd></div>
                    <div><dt>{c.rights}</dt><dd>{localized(item.rights, lang)}</dd></div>
                  </dl>
                  {item.source && <a className={styles.source} href={item.source} rel="noopener noreferrer" target="_blank">{c.source} ↗</a>}
                  {item.status !== 'open_reuse' && <p className={styles.blocked}>{c.blocked}</p>}
                  {item.key === 'cfpb-fwbs-10' && item.relatedRunnableKey && runnableKeys.includes(item.relatedRunnableKey) && onOpenCfpbShort && <button className={styles.shortButton} type="button" onClick={onOpenCfpbShort}>{c.short} ↗</button>}
                </div>
              </details>
            ))}
          </div>
          {!showAll && !search && rightsFilter === 'all' && topicFilter === 'all' && filtered.length > 6 &&
            <button className={styles.showAll} type="button" onClick={() => setShowAll(true)}>{c.show}</button>}
          {showAll && <button className={styles.showAll} type="button" onClick={() => setShowAll(false)}>{c.fewer}</button>}
          <p className={styles.disclaimer}>{c.note}</p>
        </div>
      </details>
    </section>
  )
}
