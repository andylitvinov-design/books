'use client'

import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { buildPortraitAnalyses } from '@/lib/profile/portrait-analyses'
import styles from './portrait-analyses.module.css'

const COPY = {
  en: {
    eyebrow: 'YOUR PERSONAL ANALYSIS', title: '4 stronger signals · 4 areas to explore',
    intro: 'A closer look at your own questionnaire answers, grouped into higher and lower measured positions.',
    stronger: 'Stronger reported signals', weaker: 'Areas to explore',
    details: 'Open original analysis', source: 'Based on',
    partial: 'Only measured results are shown; more answers may be needed to fill both groups.',
    empty: 'Two or more recent, verified directional scores from one questionnaire are needed for this comparison.',
    takeTest: 'Explore free tests',
    privacy: 'Only your private, verified results are used. Higher and lower positions are within one questionnaire, not a diagnosis, a ranking of your character, a health percentage or a comparison between different tests.',
    verify: 'Some saved attempts could not be verified and were excluded.',
  },
  ru: {
    eyebrow: 'ВАШ ПЕРСОНАЛЬНЫЙ АНАЛИЗ', title: '4 сильные стороны · 4 зоны внимания',
    intro: 'Сравните более высокие и более низкие ответы в пределах одного пройденного опросника.',
    stronger: 'Более высокие показатели', weaker: 'Зоны для внимания',
    details: 'Разбор показателя', source: 'По результатам',
    partial: 'Показаны только реальные измерения. Для полного списка может понадобиться дополнительный тест.',
    empty: 'Для сравнения нужны как минимум два свежих подтверждённых показателя одного опросника.',
    takeTest: 'Подобрать бесплатные тесты',
    privacy: 'Используются только ваши подтверждённые результаты. Позиции сравниваются внутри одного опросника: это не диагноз, не оценка личности, не процент здоровья и не сопоставление разных тестов.',
    verify: 'Часть сохранённых результатов не прошла проверку и исключена.',
  },
  es: {
    eyebrow: 'TU ANÁLISIS PERSONAL', title: '4 señales más altas · 4 áreas por explorar',
    intro: 'Compara las respuestas más altas y bajas de un único cuestionario completado.',
    stronger: 'Señales más altas', weaker: 'Áreas por explorar',
    details: 'Ver análisis original', source: 'Basado en',
    partial: 'Solo se muestran mediciones reales; puede que falten respuestas para completar ambos grupos.',
    empty: 'Se necesitan al menos dos mediciones direccionales recientes y verificadas del mismo cuestionario.',
    takeTest: 'Explorar pruebas gratuitas',
    privacy: 'Solo se utilizan resultados privados y verificados. Estas posiciones corresponden a un solo cuestionario; no son un diagnóstico, una puntuación de salud ni una comparación entre pruebas.',
    verify: 'Se excluyeron los intentos que no pudieron verificarse.',
  },
}

function Signal({ row, locale, copy }) {
  const raw = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : locale === 'es' ? 'es-ES' : 'en-US', {maximumFractionDigits: 2})
  return <li className={styles.signal} data-analysis-dimension={row.dimensionKey}>
    <div className={styles.metric}>
      <strong>{row.label}</strong>
      <span>{raw.format(row.rawValue)} / {raw.format(row.max)}</span>
    </div>
    <div className={styles.track} aria-hidden="true"><span style={{ width: String(row.position) + '%' }} /></div>
    <p>{row.reflection}</p>
    <Link href={'/' + locale + '/app/results/' + encodeURIComponent(row.resultId) +
      '?scale=' + encodeURIComponent(row.dimensionKey) + '#hh-assessment-scale-panel'} prefetch={false}>
      {copy.details}<ArrowRight size={15} aria-hidden="true" />
    </Link>
  </li>
}

export function PortraitAnalyses({ results = [], locale = 'en' }) {
  const t = COPY[locale] || COPY.en
  const model = buildPortraitAnalyses(results, locale)
  return <section id="hh-portrait-analyses" className={styles.root} tabIndex={-1}
    aria-labelledby="hh-portrait-analyses-title" data-testid="portrait-analyses">
    <header className={styles.header}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-portrait-analyses-title">{t.title}</h2>
      <p>{t.intro}</p>
      {model.sourceTitle && <small>{t.source}: {model.sourceTitle}</small>}
    </header>
    {model.rejectedCount > 0 && <p className={styles.warning} role="status">{t.verify}</p>}
    {model.measuredCount > 0
      ? <>
          <div className={styles.columns}>
            <section className={styles.group} data-kind="strongest" aria-label={t.stronger}>
              <h3><TrendingUp size={18} aria-hidden="true" />{t.stronger}</h3>
              <ol className={styles.list}>{model.strongest.map(row =>
                <Signal key={row.dimensionKey} row={row} locale={locale} copy={t} />)}</ol>
            </section>
            <section className={styles.group} data-kind="weakest" aria-label={t.weaker}>
              <h3><TrendingDown size={18} aria-hidden="true" />{t.weaker}</h3>
              <ol className={styles.list}>{model.weakest.map(row =>
                <Signal key={row.dimensionKey} row={row} locale={locale} copy={t} />)}</ol>
            </section>
          </div>
          {(model.strongest.length < 4 || model.weakest.length < 4) &&
            <p className={styles.partial}>{t.partial}</p>}
        </>
      : <div className={styles.empty}>
          <p>{t.empty}</p>
          <Link href={'/' + locale + '/app/tests?profile=missing'} prefetch={false}>
            {t.takeTest}<ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>}
    <p className={styles.note}>{t.privacy}</p>
  </section>
}
