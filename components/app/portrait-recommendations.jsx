'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, ShieldCheck } from 'lucide-react'
import { buildPortraitRecommendations } from '@/lib/profile/portrait-recommendations'
import styles from './portrait-recommendations.module.css'

const COPY = {
  en: {
    eyebrow:'YOUR TEST RESULTS', title:'Personal recommendations',
    intro:'Here are your recent, verified questionnaire measurements. Choose which topics feel useful to explore; scores never decide your worth or personal goals.',
    readings:'What your questionnaires report', consider:'Choose your own focus',
    nextEyebrow:'CHOOSE WHAT HAPPENS NEXT',goalsLabel:'Set my development goals',courseLabel:'Explore OPORA daily practices',supportLabel:'Request a free written review',nextHint:'You decide whether to practise independently or ask for support; your test results are not sent when you open these links.',
    chooseTitle:'Your priorities belong to you',
    chooseCopy:'No automatic “strengths” or “weaknesses” are inferred from arbitrary percentage cutoffs. If something feels important, explore its original score and choose a gentle next step.',
    noData:'There are no recent, source-verified results to summarize yet. You can review older reports or choose an available check-in.',
    verify:'Some saved results could not be verified, so they were excluded without replacing their values.',
    report:'Details', next:'Explore suitable tests',
    nextCopy:'Use the source-linked test finder to measure other areas, then review the exact scale and its original score in Reports.',
    note:'Numbers are original questionnaire scores, not a general health grade, published norms, diagnostic probabilities or a ranking across instruments. Optional private reflections are not measures of personal value, desire or consent.',
  },
  ru: {
    eyebrow:'РЕЗУЛЬТАТЫ ВАШИХ ТЕСТОВ', title:'Персональные рекомендации',
    intro:'Здесь собраны свежие подтверждённые результаты анкет. Какие направления вам важны, решаете вы: баллы не оценивают личность и не задают обязательных целей.',
    readings:'Что показали ваши опросники', consider:'Выберите собственный ориентир',
    nextEyebrow:'ВАШ СЛЕДУЮЩИЙ ШАГ',goalsLabel:'Установить цели развития',courseLabel:'Посмотреть ежедневные практики «ОПОРА»',supportLabel:'Запросить бесплатный письменный разбор',nextHint:'Вы сами выбираете дальнейшие действия. Переход по ссылкам не отправляет ваши результаты тестов.',
    chooseTitle:'Вы сами определяете приоритеты',
    chooseCopy:'По произвольным процентным порогам мы больше не объявляем показатели «сильными» или «слабыми». Откройте исходную шкалу, изучите контекст и только затем решите, что стоит практиковать.',
    noData:'Пока нет свежих проверенных результатов. Можно посмотреть прежние отчёты или пройти подходящий тест.',
    verify:'Часть сохранённых результатов не прошла проверку происхождения и исключена без подстановки значений.',
    report:'Подробнее', next:'Подобрать тесты',
    nextCopy:'Выбирайте дополнительные анкеты по реальным измеряемым шкалам; результаты и исходные баллы доступны в Reports.',
    note:'Здесь приведены исходные баллы отдельных опросников, а не универсальная оценка здоровья, клинические нормы или рейтинг между тестами. Добровольные личные размышления не оценивают достоинство, влечение или согласие.',
  },
  es: {
    eyebrow:'TUS RESULTADOS',title:'Recomendaciones personales',
    intro:'Mediciones recientes y verificadas. Elige qué temas te interesan; ningún número determina tu valor ni tus metas.',
    readings:'Resultados de cuestionarios',consider:'Elige tu propio enfoque',
    nextEyebrow:'ELIGE TU SIGUIENTE PASO',goalsLabel:'Definir mis objetivos',courseLabel:'Explorar las prácticas diarias OPORA',supportLabel:'Solicitar una revisión escrita gratuita',nextHint:'Tú eliges cómo continuar. Abrir estos enlaces no envía tus resultados personales.',
    chooseTitle:'Tú decides tus prioridades',
    chooseCopy:'No clasificamos fortalezas ni debilidades a partir de porcentajes arbitrarios. Consulta la escala original y decide qué explorar.',
    noData:'No hay resultados actuales verificados. Puedes consultar informes anteriores o hacer una prueba disponible.',
    verify:'Algunos resultados no pudieron verificarse y se excluyeron.',report:'Detalles',next:'Explorar pruebas',
    nextCopy:'Puedes escoger otras pruebas según lo que realmente miden.',
    note:'Las cifras son puntuaciones originales, no porcentajes de salud ni comparaciones entre pruebas. Estas reflexiones no evalúan consentimiento o valor personal.',
  },
}

function MeasurementCard({row,locale,copy}) {
  return <article className={styles.row} data-reported-dimension={row.dimensionKey}>
    <div className={styles.score}>
      <strong>{row.label}</strong>
      <b>{row.rawValue} / {row.max}</b>
    </div>
    <small>{row.sourceTitle}</small>
    <p>{row.reflection}</p>
    <Link href={`/${locale}/app/results/${encodeURIComponent(row.resultId)}?scale=${encodeURIComponent(row.dimensionKey)}#hh-assessment-scale-panel`}
      prefetch={false}>{copy.report} →</Link>
  </article>
}

export function PortraitRecommendations({results = [],locale = 'en'}) {
  const t=COPY[locale] || COPY.en
  const model=buildPortraitRecommendations(results,locale)
  return <section id="hh-portrait-recommendations" tabIndex={-1} className={styles.root}
    aria-labelledby="hh-portrait-recommendations-title" data-testid="portrait-recommendations">
    <header className={styles.header}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2 id="hh-portrait-recommendations-title">{t.title}</h2>
      <p>{t.intro}</p>
    </header>
    {model.rejectedCount > 0 && <p className={styles.warning} role="status">{t.verify}</p>}
    {model.measuredCount === 0
      ? <p className={styles.empty}>{t.noData}</p>
      : <div className={styles.columns}>
          <section className={styles.group} data-kind="measurements" aria-label={t.readings}>
            <h3><BookOpen size={18} aria-hidden="true"/>{t.readings}</h3>
            {model.measurements.slice(0,7).map(row=><MeasurementCard key={row.key} row={row} locale={locale} copy={t}/>)}
          </section>
          <section className={styles.group} data-kind="choice" aria-label={t.consider}>
            <h3><Compass size={18} aria-hidden="true"/>{t.consider}</h3>
            <div className={styles.row}>
              <ShieldCheck size={20} aria-hidden="true"/>
              <strong>{t.chooseTitle}</strong>
              <p>{t.chooseCopy}</p>
            </div>
          </section>
        </div>}
    <div className={styles.footer}>
      <p>{t.nextCopy}</p>
      <Link href={`/${locale}/app/tests?profile=missing`} prefetch={false}>
        {t.next}<ArrowRight size={16} aria-hidden="true"/>
      </Link>
    </div>
    <nav className={styles.nextSteps} aria-label={t.nextEyebrow} data-personal-next-steps>
      <p className={styles.nextEyebrow}>{t.nextEyebrow}</p>
      <div className={styles.nextLinks}>
        <Link href={`/${locale === 'es' ? 'en' : locale}/app/portfolio#hh-development-program`} prefetch={false}>
          <Compass size={17} aria-hidden="true"/>{t.goalsLabel}<ArrowRight size={15} aria-hidden="true"/>
        </Link>
        <Link href={`/${locale === 'es' ? 'en' : locale}/app/course?program=stress`} prefetch={false}>
          <BookOpen size={17} aria-hidden="true"/>{t.courseLabel}<ArrowRight size={15} aria-hidden="true"/>
        </Link>
        <Link href={`/${locale}/services/free-situation-review`} prefetch={false}>
          <ShieldCheck size={17} aria-hidden="true"/>{t.supportLabel}<ArrowRight size={15} aria-hidden="true"/>
        </Link>
      </div>
      <p className={styles.nextHint}>{t.nextHint}</p>
    </nav>
    <p className={styles.disclaimer}>{t.note}</p>
  </section>
}
