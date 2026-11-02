'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, List, Sparkles } from 'lucide-react'
import { ANTISTRESS_MODULE_FINDER_ITEMS, ANTISTRESS_MODULE_GOALS, recommendAntistressModule } from '@/lib/inner-growth/antistress-module-router'
import styles from './antistress-module-finder.module.css'

// Approved course-start screen (17 Oct 2026): one calm welcome after completed tests.
// Alternative programme blocks are available on demand, not shown by default.
const words = {
  en: {
    label: 'CONGRATULATIONS', title: 'Your course is ready',
    intro: 'Based on your test results, we recommend starting here.',
    firstLesson: 'YOUR FIRST LESSON', as2Lesson: 'Notice my first stress signals', progress: '0/14 completed',
    suggested: 'Recommended starting point', selected: 'Your chosen starting point',
    day: 'Day 1 of 14', viewAll: 'View all 6 programme blocks',
    duration: '14 days', recommended: 'Recommended', clinical: 'Clinician only',
    start: 'Start my first lesson', starting: 'Opening your first lesson…',
    reset: 'Use recommended starting point',
    missing: 'Please complete a recent Weekly Pulse assessment before starting.',
    clinicianNotice: 'This block requires a qualified clinician and cannot be started independently. Please choose another block.',
    note: 'A suggested learning direction, not a diagnosis.',
    heroAlt: 'A traveller in a blue hoodie taking a peaceful pause overlooking the sea',
  },
  ru: {
    label: 'ПОЗДРАВЛЯЕМ', title: 'Ваш курс готов!',
    intro: 'По результатам тестов рекомендуем начать здесь.',
    firstLesson: 'ПЕРВЫЙ УРОК', as2Lesson: 'Замечаю первые сигналы стресса', progress: '0 из 14 пройдено',
    suggested: 'Рекомендуемый старт', selected: 'Выбранное направление',
    day: 'День 1 из 14', viewAll: 'Посмотреть все 6 блоков программы',
    duration: '14 дней', recommended: 'Рекомендуем', clinical: 'Со специалистом',
    start: 'Начать первый урок', starting: 'Открываем первый урок…',
    reset: 'Вернуться к рекомендации',
    missing: 'Чтобы начать, пройдите актуальный тест Weekly Pulse.',
    clinicianNotice: 'Этот блок возможен только при сопровождении квалифицированного специалиста. Выберите другой блок.',
    note: 'Рекомендация для обучения и самонаблюдения, не диагноз.',
    heroAlt: 'Парень в бирюзовой толстовке отдыхает с видом на море',
  },
  es: {
    label: '¡FELICIDADES!', title: '¡Tu curso está listo!',
    intro: 'Según tus resultados, te recomendamos empezar aquí.',
    firstLesson: 'PRIMERA LECCIÓN', as2Lesson: 'Reconozco mis primeras señales de estrés', progress: '0 de 14 completados',
    suggested: 'Punto de partida recomendado', selected: 'Tu punto de partida',
    day: 'Día 1 de 14', viewAll: 'Ver los 6 bloques del programa',
    duration: '14 días', recommended: 'Recomendado', clinical: 'Con especialista',
    start: 'Empezar mi primera lección', starting: 'Abriendo tu primera clase…',
    reset: 'Volver a la recomendación',
    missing: 'Completa primero una evaluación Weekly Pulse reciente.',
    clinicianNotice: 'Este bloque requiere acompañamiento profesional cualificado. Elige otro bloque.',
    note: 'Una sugerencia educativa, no un diagnóstico.',
    heroAlt: 'Un viajero sentado en la montaña frente al mar',
  },
}

function savedWeekly(profile) {
  const ids = ['weekly.load', 'weekly.tension', 'weekly.functioning']
  const relevant = ids.map(id => profile?.scales?.find(s =>
    s.testKey === 'hh-weekly-pulse' && s.id === 'hh-weekly-pulse::' + id &&
    Number.isInteger(s.score) && s.min === 0 && s.max === 10 && s.recent &&
    Number.isFinite(Date.parse(s.measuredAt || '')) &&
    Date.parse(s.measuredAt) <= Date.now() &&
    Date.now() - Date.parse(s.measuredAt) <= 7 * 86400000
  ))
  if (relevant.some(row => !row) || new Set(relevant.map(row => row.resultId)).size !== 1) return null
  return Object.fromEntries(ids.map((id, index) => [id, relevant[index].score]))
}

export default function AntiStressModuleFinder({ locale = 'en', profile, busy = false, onStart }) {
  const language = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const t = words[language]
  const [chosenRoute, setChosenRoute] = useState(null)
  const weekly = useMemo(() => savedWeekly(profile), [profile])
  // The recommendation is stable when the user explores alternative blocks.
  const recommendation = useMemo(() => recommendAntistressModule({ weekly: weekly || {}, answers: {} }), [weekly])
  const chosen = chosenRoute || recommendation.moduleId
  const selected = ANTISTRESS_MODULE_GOALS.find(item => item.id === chosen)
  const isClinicianOnly = Boolean(selected?.clinicalOnly)
  const canStart = Boolean(weekly) && !isClinicianOnly && !busy && typeof onStart === 'function'

  function startDayOne() {
    if (!canStart) return
    onStart({
      moduleId: chosen,
      answers: Object.fromEntries(ANTISTRESS_MODULE_FINDER_ITEMS.map(item => [item.id, null])),
      goal: chosenRoute || 'undecided',
    })
  }

  return (
    <section className={styles.root} data-course-module-finder data-course-welcome-screen data-course-unified-entry
      data-opora-route-version={recommendation.version}>
      <div className={styles.card}>
        <div className={styles.heroArt}>
          <img src="/images/holistic-house/course-focus-mountain-boy.webp" width="705" height="411"
            alt={t.heroAlt} loading="eager" decoding="async" />
        </div>
        <div className={styles.content}>
          <div className={styles.celebration}><Sparkles size={17} aria-hidden="true"/>{t.label}</div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>

          <div className={styles.selectedCard} aria-live="polite" data-module-recommendation={recommendation.moduleId}>
            <div className={styles.selectedMeta}>
              <span className={styles.selectedBadge}>
                <CheckCircle2 size={14} aria-hidden="true"/>
                {chosenRoute ? t.selected : t.suggested}
              </span>
              <span className={styles.dayTag}>{t.day}</span>
            </div>
            <div className={styles.moduleInfo}>
              <span className={styles.routeNumber}>{String(ANTISTRESS_MODULE_GOALS.findIndex(item => item.id === chosen) + 1).padStart(2, '0')}</span>
              <div>
                <h2>{selected?.title[language] || selected?.title.en}</h2>
                <p>{selected?.short[language] || selected?.short.en}</p>
              </div>
            </div>
            <div className={styles.lessonPreview} data-course-first-lesson-preview>
              <BookOpen size={17} aria-hidden="true"/>
              <div>
                <small>{t.firstLesson}</small>
                <strong>{chosen === 'AS2' ? t.as2Lesson : (selected?.title[language] || selected?.title.en)}</strong>
              </div>
            </div>
            <div className={styles.progressLine}>
              <progress className={styles.courseProgress} value={0} max={14} aria-label={t.progress}/>
              <span>{t.progress}</span>
            </div>
          </div>

          <details className={styles.routeDisclosure} data-opora-route-picker>
            <summary><List size={17} aria-hidden="true"/>{t.viewAll}<ChevronDown size={17} className={styles.chevron} aria-hidden="true"/></summary>
            <div className={styles.moduleList}>
              {ANTISTRESS_MODULE_GOALS.map((item, index) => (
                <button key={item.id} type="button" className={styles.moduleChoice}
                  data-selected={chosen === item.id} aria-pressed={chosen === item.id}
                  disabled={busy} onClick={() => setChosenRoute(item.id)}>
                  <span className={styles.moduleIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.moduleBody}>
                    <strong>{item.title[language] || item.title.en}</strong>
                    <small>{item.short[language] || item.short.en}</small>
                  </span>
                  <span className={styles.moduleSide}>
                    {item.id === recommendation.moduleId ? <span className={styles.recommendedBadge}>{t.recommended}</span> : null}
                    <span>{item.clinicalOnly ? t.clinical : t.duration}</span>
                    {chosen === item.id ? <CheckCircle2 size={18} aria-hidden="true"/> : null}
                  </span>
                </button>
              ))}
              {chosenRoute && <button type="button" className={styles.reset} disabled={busy}
                onClick={() => setChosenRoute(null)}>{t.reset}</button>}
            </div>
          </details>

          {!weekly && <p className={styles.warning} role="status">{t.missing}</p>}
          {isClinicianOnly && <p className={styles.warning} role="status">{t.clinicianNotice}</p>}
          <button type="button" className={styles.cta} data-course-consent-module
            disabled={!canStart} onClick={startDayOne}>
            <span>{busy ? t.starting : t.start}</span><ArrowRight size={23} aria-hidden="true"/>
          </button>
          <p className={styles.note}>{t.note}</p>
        </div>
      </div>
    </section>
  )
}
