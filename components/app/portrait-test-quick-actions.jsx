'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, ChevronDown, ClipboardList, Sparkles } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { PORTRAIT_SECTORS } from '@/lib/assessments/portrait-sectors'
import { recommendPortraitSectorTests } from '@/lib/profile/portrait-test-suggestions'
import styles from './portrait-test-quick-actions.module.css'

const COPY = {
  en: {
    open: 'Take Test', analyses: 'Analyses', recommendations: 'Recommendations',
    heading: 'Recommended tests', all: 'All areas', select: 'Choose a test to start or resume it.',
    questions: 'questions', minutes: 'min', action: 'Take test', starting: 'Opening…',
    empty: 'No new eligible tests to recommend here. You may have already completed them.',
    error: 'Could not open this test. Please try again.',
    note: 'Only available, free, reviewed questionnaires are shown. These suggestions are not a diagnosis.',
  },
  ru: {
    open: 'Пройти тест', analyses: 'Анализы', recommendations: 'Рекомендации',
    heading: 'Рекомендуемые тесты', all: 'Все направления', select: 'Выберите тест, чтобы начать или продолжить его.',
    questions: 'вопросов', minutes: 'мин', action: 'Пройти тест', starting: 'Открываем…',
    empty: 'Новых разрешённых тестов для этого направления нет. Возможно, вы уже прошли их.',
    error: 'Не удалось открыть тест. Попробуйте ещё раз.',
    note: 'Показаны только доступные бесплатные проверенные опросники. Подбор не является диагнозом.',
  },
  es: {
    open: 'Hacer test', analyses: 'Análisis', recommendations: 'Recomendaciones',
    heading: 'Pruebas recomendadas', all: 'Todas las áreas', select: 'Elige una prueba para iniciarla o continuarla.',
    questions: 'preguntas', minutes: 'min', action: 'Hacer test', starting: 'Abriendo…',
    empty: 'No hay nuevas pruebas aptas para esta área. Es posible que ya las hayas completado.',
    error: 'No se pudo abrir la prueba. Inténtalo de nuevo.',
    note: 'Solo se muestran cuestionarios gratuitos y revisados. Las sugerencias no son diagnósticos.',
  },
}

const panelId = 'hh-portrait-test-recommendations'

export function PortraitTestQuickActions({
  locale = 'en', sector = 'all', portrait = null, entriesByKey,
  results = [], runs = [], accountId, activeTestPlan = null,
  activeTab = 'tests', onTabChange,
}) {
  const t = COPY[locale] || COPY.en
  const testsVisible = activeTab === 'tests'
  function selectTab(next) {
    if (next === 'tests') setExpanded(value => testsVisible ? !value : true)
    onTabChange?.(next)
    setError('')
  }
  function handleTabKeyDown(event) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    const current = event.target?.getAttribute('data-portrait-tab')
    const keys = ['tests', 'analyses', 'recommendations']
    if (!keys.includes(current)) return
    event.preventDefault()
    const index = keys.indexOf(current)
    const next = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys[keys.length - 1]
      : keys[(index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length]
    if (next === 'tests') setExpanded(true)
    onTabChange?.(next)
    event.currentTarget.querySelector('[data-portrait-tab="' + next + '"]')?.focus()
  }
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const expandedVisible = testsVisible && expanded
  const [startingKey, setStartingKey] = useState('')
  const [error, setError] = useState('')
  const starting = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const sectorLabel = sector === 'all'
    ? t.all
    : PORTRAIT_SECTORS.find(item => item.key === sector)?.label?.[locale] ||
      PORTRAIT_SECTORS.find(item => item.key === sector)?.label?.en || t.all
  const recommended = recommendPortraitSectorTests({
    entries: [...(entriesByKey?.values() || [])], results, sector, portrait, limit: 6,
  })
  const labelAxis = axis => TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis

  async function openTest(testKey) {
    const definition = entriesByKey?.get(testKey)?.definition
    if (!definition || !accountId || starting.current) return
    starting.current = true
    setStartingKey(testKey)
    setError('')
    try {
      // Resume a real saved draft; only an explicit per-test click may create a run.
      const draft = runs.find(run => run.definitionId === definition.id &&
        ['draft', 'in_progress'].includes(run.status))
      const run = draft || await appFetch('runs', {
        definitionKey: definition.key,
        definitionVersion: definition.version,
        instrumentLocale: definition.instrumentLocale,
        operationId: crypto.randomUUID(),
      }, 'POST', { accountId })
      if (!mounted.current) return
      const suffix = activeTestPlan?.status === 'active' &&
        activeTestPlan.definitionIds?.includes(definition.id)
        ? '&plan=' + encodeURIComponent(activeTestPlan.id) : ''
      router.push('/' + locale + '/app/runs/' + encodeURIComponent(run.id) + '?mode=quick' + suffix)
    } catch {
      if (mounted.current) setError(t.error)
    } finally {
      starting.current = false
      if (mounted.current) setStartingKey('')
    }
  }

  return <>
    <nav className="hh-portrait-quick-actions" role="tablist"
      onKeyDown={handleTabKeyDown}
      aria-label={locale === 'ru' ? 'Вкладки психологического портрета' :
        locale === 'es' ? 'Pestañas del retrato psicológico' : 'Psychological portrait tabs'}
      data-testid="portrait-quick-actions">
      <button type="button" id="hh-portrait-tab-tests" role="tab" data-portrait-tab="tests"
        className={testsVisible ? 'hh-portrait-quick-primary' : 'hh-portrait-quick-secondary'}
        data-testid="portrait-completion-action" aria-expanded={expandedVisible}
        aria-selected={testsVisible} tabIndex={testsVisible ? 0 : -1}
        aria-controls={panelId} onClick={() => selectTab('tests')}>
        <ClipboardList size={18} aria-hidden="true" />
        <span>{t.open}</span>
        <ChevronDown size={14} aria-hidden="true" className={expandedVisible ? styles.up : styles.down} />
      </button>
      <button type="button" id="hh-portrait-tab-analyses" role="tab" data-portrait-tab="analyses"
        className={activeTab === 'analyses' ? 'hh-portrait-quick-primary hh-portrait-quick-analyses' : 'hh-portrait-quick-secondary hh-portrait-quick-analyses'}
        data-testid="portrait-analyses-action" aria-selected={activeTab === 'analyses'}
        tabIndex={activeTab === 'analyses' ? 0 : -1}
        aria-controls="hh-portrait-panel-analyses" onClick={() => selectTab('analyses')}>
        <BarChart3 size={18} aria-hidden="true" /><span>{t.analyses}</span>
      </button>
      <button type="button" id="hh-portrait-tab-recommendations" role="tab" data-portrait-tab="recommendations"
        className={activeTab === 'recommendations' ? 'hh-portrait-quick-primary' : 'hh-portrait-quick-secondary'}
        data-testid="portrait-recommendations-action" aria-selected={activeTab === 'recommendations'}
        tabIndex={activeTab === 'recommendations' ? 0 : -1}
        aria-controls="hh-portrait-panel-recommendations" onClick={() => selectTab('recommendations')}>
        <Sparkles size={18} aria-hidden="true" /><span>{t.recommendations}</span>
      </button>
    </nav>
    <section id={panelId} className={styles.shell} role="tabpanel"
      aria-labelledby="hh-portrait-tab-tests" data-expanded={expandedVisible}
      data-testid="portrait-test-recommendations" aria-hidden={!expandedVisible} inert={!expandedVisible}
      aria-label={t.heading + ': ' + sectorLabel}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div><strong>{t.heading}</strong><span>{sectorLabel}</span></div>
          <p>{t.select}</p>
        </header>
        {recommended.length ? <ul className={styles.list}>
          {recommended.map((item) => <li className={styles.item} key={item.key}>
            <div className={styles.info}>
              <strong>{item.title}</strong>
              <small>{item.covers.map(labelAxis).join(' · ')}</small>
              <span>{[item.questionCount != null ? item.questionCount + ' ' + t.questions : null,
                item.durationMinutes != null ? item.durationMinutes + ' ' + t.minutes : null].filter(Boolean).join(' · ')}</span>
            </div>
            <button type="button" className={styles.takeTest}
              data-testid={'portrait-take-test-' + item.key}
              disabled={Boolean(startingKey)} onClick={() => { void openTest(item.key) }}>
              {startingKey === item.key ? t.starting : t.action}
            </button>
          </li>)}
        </ul> : <p className={styles.empty}>{t.empty}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.note}>{t.note}</p>
      </div>
    </section>
  </>
}
