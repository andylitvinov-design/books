'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, CheckCircle2, Sparkles, Target } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { TEST_EXPLORER_AXIS_LABELS } from '@/lib/assessments/test-explorer'
import { PORTRAIT_SECTORS } from '@/lib/assessments/portrait-sectors'
import { listPortraitProfileTests } from '@/lib/profile/portrait-test-suggestions'
import styles from './portrait-test-quick-actions.module.css'

const COPY = {
  en: {
    goals:'Goals', analyses:'Analyses', recommendations:'Recommendations',
    title:'Tests for selected axes', allAreas:'All four profiles',
    all:'All', pro:'Pro', checkin:'Check-in', completed:'Completed',
    take:'Take test', resume:'Continue', opening:'Opening…',
    questions:'questions', minutes:'min', done:'Done',
    count:'matching tests', noAxes:'Select at least one axis in the Axes tab to see matching tests.',
    empty:'No available tests match this profile, axes and filter.',
    note:'Available free questionnaires are matched to their documented axes. "Explore only" tests do not create wheel values. Pro means published-source, not a clinical diagnosis.',
    exploratory:'Explore only · not yet scored on the wheel',
    error:'Could not open the test. Please try again.',
  },
  ru: {
    goals:'Цели', analyses:'Анализы', recommendations:'Рекомендации',
    title:'Тесты для выбранных осей', allAreas:'Все четыре профиля',
    all:'Все', pro:'Pro', checkin:'Чек-ин', completed:'Пройден',
    take:'Пройти тест', resume:'Продолжить', opening:'Открываем…',
    questions:'вопросов', minutes:'мин', done:'Пройдено',
    count:'подходящих тестов', noAxes:'Выберите хотя бы одну ось во вкладке «Оси», чтобы увидеть подходящие тесты.',
    empty:'Для выбранного профиля, осей и фильтра пока нет доступных тестов.',
    note:'Показаны доступные бесплатные тесты с соответствием осям по каталогу. Тесты «Для изучения» не создают луч на диаграмме. Pro означает опубликованный источник, а не диагноз.',
    exploratory:'Для изучения · пока без показателя на диаграмме',
    error:'Не удалось открыть тест. Попробуйте ещё раз.',
  },
  es: {
    goals:'Metas', analyses:'Análisis', recommendations:'Recomendaciones',
    title:'Pruebas para los ejes elegidos', allAreas:'Los cuatro perfiles',
    all:'Todas', pro:'Pro', checkin:'Chequeo', completed:'Completada',
    take:'Hacer test', resume:'Continuar', opening:'Abriendo…',
    questions:'preguntas', minutes:'min', done:'Hecha',
    count:'pruebas compatibles', noAxes:'Selecciona al menos un eje en «Ejes» para ver pruebas compatibles.',
    empty:'No hay pruebas disponibles para la selección actual.',
    note:'Solo pruebas gratuitas disponibles y relacionadas con ejes documentados. Las de exploración no crean valores en la rueda. Pro significa fuente publicada, no diagnóstico.',
    exploratory:'Para explorar · aún sin puntuación en la rueda',
    error:'No se pudo abrir la prueba. Inténtalo de nuevo.',
  },
}

/** Third mini-tab: the *whole* rights-cleared test list, not just six suggestions. */
export function PortraitTestList({
  locale = 'en', sector = 'all', selectedAxes = [], entriesByKey,
  results = [], runs = [], accountId, activeTestPlan = null,
}) {
  const t = COPY[locale] || COPY.en
  const router = useRouter()
  const [kind, setKind] = useState('all')
  const [startingKey, setStartingKey] = useState('')
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const matching = listPortraitProfileTests({
    entries: [...(entriesByKey?.values() || [])], results, sector, selectedAxes,
  })
  const filtered = kind === 'all' ? matching : matching.filter(item => item.kind === kind)
  const complete = matching.filter(item => item.completed).length
  const sectorTitle = sector === 'all' ? t.allAreas :
    PORTRAIT_SECTORS.find(item => item.key === sector)?.shortLabel?.[locale] ||
    PORTRAIT_SECTORS.find(item => item.key === sector)?.shortLabel?.en || t.allAreas
  const axisLabel = axis => TEST_EXPLORER_AXIS_LABELS[axis]?.[locale] ||
    TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis

  async function openTest(key) {
    const definition = entriesByKey?.get(key)?.definition
    if (!definition || !accountId || busy.current || matching.find(item => item.key === key)?.completed) return
    busy.current = true
    setStartingKey(key)
    setError('')
    try {
      // Resuming a saved draft is safe. Only an explicit click can create a run.
      const draft = runs.find(run => run.definitionId === definition.id &&
        ['draft', 'in_progress'].includes(run.status))
      const run = draft || await appFetch('runs', {
        definitionKey: definition.key,
        definitionVersion: definition.version,
        instrumentLocale: definition.instrumentLocale,
        operationId: crypto.randomUUID(),
      }, 'POST', { accountId })
      if (!mounted.current) return
      const planSuffix = activeTestPlan?.status === 'active' &&
        activeTestPlan.definitionIds?.includes(definition.id)
        ? '&plan=' + encodeURIComponent(activeTestPlan.id) : ''
      router.push('/' + locale + '/app/runs/' + encodeURIComponent(run.id) + '?mode=quick' + planSuffix)
    } catch {
      if (mounted.current) setError(t.error)
    } finally {
      busy.current = false
      if (mounted.current) setStartingKey('')
    }
  }

  return <div className={styles.catalog} data-testid="portrait-profile-test-catalogue">
    <header className={styles.catalogHeader}>
      <div><strong>{t.title}</strong><small>{sectorTitle} · {selectedAxes.length} / {sector === 'all' ? 17 :
        (PORTRAIT_SECTORS.find(item => item.key === sector)?.axes.length || 0)} {locale === 'ru' ? 'осей' : locale === 'es' ? 'ejes' : 'axes'}</small></div>
      <span className={styles.count} role="status">{matching.length} {t.count} · {complete} {t.done.toLowerCase()}</span>
    </header>
    <div className={styles.kindTabs} role="group"
      aria-label={locale === 'ru' ? 'Фильтр по типу теста' : locale === 'es' ? 'Tipo de prueba' : 'Test type filter'}>
      {[
        ['all', t.all],
        ['professional', t.pro],
        ['monitoring', t.checkin],
      ].map(([value, name]) => <button key={value} type="button"
        data-portrait-test-kind={value} aria-pressed={kind === value}
        onClick={() => setKind(value)}>{name}<span aria-hidden="true">{
          value === 'all' ? matching.length : matching.filter(test => test.kind === value).length
        }</span></button>)}
    </div>
    {selectedAxes.length === 0 ? <p role="status" className={styles.empty}>{t.noAxes}</p>
      : filtered.length === 0 ? <p role="status" className={styles.empty}>{t.empty}</p>
      : <ul className={styles.catalogList}>{filtered.map(item => {
        const draft = !item.completed && runs.some(run => run.definitionId === entriesByKey?.get(item.key)?.definition?.id &&
          ['draft', 'in_progress'].includes(run.status))
        return <li className={styles.catalogItem} key={item.key}
          data-test-definition={item.key} data-test-kind={item.kind} data-completed={item.completed}>
          <div className={styles.info}>
            <strong>{item.title}</strong>
            <small>{item.covers.map(axisLabel).join(' · ')}</small>
            {!item.chartReady && <em className={styles.exploratory}>{t.exploratory}</em>}
            <span>{[
              item.questionCount != null ? item.questionCount + ' ' + t.questions : null,
              item.durationMinutes != null ? item.durationMinutes + ' ' + t.minutes : null,
            ].filter(Boolean).join(' · ')}</span>
          </div>
          {item.completed
            ? <span className={styles.completed} aria-label={item.title + ' · ' + t.completed}>
                <CheckCircle2 size={15} aria-hidden="true" />{t.done}
              </span>
            : <button type="button" className={styles.takeTest} disabled={Boolean(startingKey) || !accountId}
                data-testid={'portrait-take-test-' + item.key}
                onClick={() => { void openTest(item.key) }}>
                {startingKey === item.key ? t.opening : draft ? t.resume : t.take}
              </button>}
        </li>
      })}</ul>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p className={styles.note}>{t.note}</p>
  </div>
}

/** The former lower Tests action is now Goals, linked to the single saved plan editor. */
export function PortraitTestQuickActions({ locale = 'en', activeTab = 'goals', onTabChange }) {
  const t = COPY[locale] || COPY.en
  return <nav className="hh-portrait-quick-actions" role="group"
    aria-label={locale === 'ru' ? 'Цели, анализ и рекомендации' :
      locale === 'es' ? 'Metas, análisis y recomendaciones' : 'Goals, analyses and recommendations'}
    data-testid="portrait-quick-actions">
    <a href="#hh-development-program" className={activeTab === 'goals' ? 'hh-portrait-quick-primary' : 'hh-portrait-quick-secondary'}
      data-testid="portrait-goals-action"
      onClick={() => {
        onTabChange?.('goals')
        // Native hash scrolling + the existing private DevelopmentProgram editor.
        window.dispatchEvent(new Event('hh:open-development-goals'))
      }}>
      <Target size={18} aria-hidden="true" /><span>{t.goals}</span>
    </a>
    <button type="button" id="hh-portrait-tab-analyses" aria-pressed={activeTab === 'analyses'}
      className={activeTab === 'analyses' ? 'hh-portrait-quick-primary hh-portrait-quick-analyses' : 'hh-portrait-quick-secondary hh-portrait-quick-analyses'}
      data-testid="portrait-analyses-action" onClick={() => onTabChange?.(activeTab === 'analyses' ? 'goals' : 'analyses')}>
      <BarChart3 size={18} aria-hidden="true" /><span>{t.analyses}</span>
    </button>
    <button type="button" id="hh-portrait-tab-recommendations" aria-pressed={activeTab === 'recommendations'}
      className={activeTab === 'recommendations' ? 'hh-portrait-quick-primary' : 'hh-portrait-quick-secondary'}
      data-testid="portrait-recommendations-action" onClick={() => onTabChange?.(activeTab === 'recommendations' ? 'goals' : 'recommendations')}>
      <Sparkles size={18} aria-hidden="true" /><span>{t.recommendations}</span>
    </button>
  </nav>
}
