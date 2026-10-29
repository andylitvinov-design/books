'use client'

import { Check, ClipboardList } from 'lucide-react'
import { getDefinitionById } from '@/lib/assessments/definitions'
import { monitoringCatalogItem } from '@/data/assessments/catalog'
import { guestTestJourneyMetrics } from '@/lib/app/guest-test-journey'
import styles from './guest-test-journey-progress.module.css'

const COPY = {
  en: { kicker: 'YOUR PROFILE · FREE TESTS', progress: 'Test progress', test: 'Test',
    of: 'of', complete: 'complete', completed: 'completed', allDone: 'All selected tests completed',
    temporary: 'Guest progress is temporary until you choose to save results in your Cabinet.' },
  ru: { kicker: 'ВАШ ПРОФИЛЬ · БЕСПЛАТНЫЕ ТЕСТЫ', progress: 'Прогресс тестов', test: 'Тест',
    of: 'из', complete: 'готово', completed: 'пройдено', allDone: 'Все выбранные тесты пройдены',
    temporary: 'Гостевой прогресс временный. Результаты можно сохранить в личном кабинете по вашему выбору.' },
  es: { kicker: 'TU PERFIL · PRUEBAS GRATIS', progress: 'Progreso de las pruebas', test: 'Prueba',
    of: 'de', complete: 'completado', completed: 'completadas', allDone: 'Todas las pruebas completadas',
    temporary: 'El progreso de invitado es temporal. Puedes elegir guardar los resultados en tu espacio privado.' },
}

function publicTestTitle(id, locale) {
  try {
    const definition = getDefinitionById(id)
    const catalogue = monitoringCatalogItem(definition.key)
    return catalogue?.title?.[locale] || catalogue?.title?.en || definition.title || definition.key
  } catch {
    return null
  }
}

export function GuestTestJourneyProgress({ locale = 'en', plan = null, definition = null, answeredCount = 0, phase = 'questions' }) {
  const c = COPY[locale] || COPY.en
  if (!plan && !definition) return null
  const metrics = guestTestJourneyMetrics(plan, { answeredCount, questionCount: definition?.questions?.length, phase })
  const ids = Array.isArray(plan?.definitionIds) && plan.definitionIds.length
    ? plan.definitionIds : definition?.id ? [definition.id] : []
  const finished = metrics.completed === metrics.total
  const activeTitle = definition ? publicTestTitle(definition.id, locale) : null

  return <header className={styles.shell} data-guest-test-journey-progress
    aria-label={c.progress}>
    <div className={styles.topline}>
      <div className={styles.heading}>
        <p className={styles.kicker}><ClipboardList size={14} aria-hidden="true" />{c.kicker}</p>
        <strong>{finished ? c.allDone : `${c.test} ${metrics.position + 1} ${c.of} ${metrics.total}`}</strong>
        {activeTitle && !finished && <span className={styles.testName}>{activeTitle}</span>}
      </div>
      <div className={styles.percent} style={{ '--hh-complete': metrics.percent + '%' }} aria-hidden="true"><strong>{metrics.percent}%</strong><span>{c.complete}</span></div>
    </div>
    <div className={styles.track} role="progressbar" aria-label={c.progress} aria-valuemin="0"
      aria-valuemax="100" aria-valuenow={metrics.percent}>
      <span style={{ width: metrics.percent + '%' }} />
    </div>
    <ol className={styles.steps} style={{ gridTemplateColumns: `repeat(${metrics.total}, minmax(0, 1fr))` }}>
      {Array.from({ length: metrics.total }, (_, index) => {
        const completed = index < metrics.completed
        const current = index === metrics.position && !finished
        const title = publicTestTitle(ids[index], locale)
        return <li key={ids[index] || index} className={completed ? styles.done : current ? styles.current : styles.pending}
          aria-current={current ? 'step' : undefined}
          aria-label={`${c.test} ${index + 1} ${c.of} ${metrics.total}${title ? ': ' + title : ''}${completed ? ', ' + c.completed : ''}`}>
          <span className={styles.stepDot}>{completed ? <Check size={15} aria-hidden="true" /> : index + 1}</span>
          {metrics.total <= 4 && <small aria-hidden="true">{c.test} {index + 1}</small>}
        </li>
      })}
    </ol>
    <p className={styles.note}>{metrics.completed} / {metrics.total} {c.completed} · {c.temporary}</p>
  </header>
}
