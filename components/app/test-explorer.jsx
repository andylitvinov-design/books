'use client'

import { useMemo, useState } from 'react'
import { TEST_RECOMMENDATION_FOCUS, TEST_STYLE_FILTERS, TEST_LENGTH_FILTERS } from '@/lib/assessments/test-recommendations'
import { MONITOR_AREAS } from '@/data/assessments/mind-body-monitor-registry'
import { buildExplorerEntries, buildStarterBattery, coverageForSelection, coverageForFocus, filterExplorerEntries, rankExplorerEntries } from '@/lib/assessments/test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import styles from './test-explorer.module.css'

const COPY = {
  en: { kicker: 'Mind–Body Monitor', title: 'Build your test set', intro: 'Choose the concerns you want to monitor. Matching tests and analysis areas update as you select them.', available: 'Available now', full: 'Full database', themes: 'Filter tests by your concerns', style: 'Style', length: 'Length', depth: 'Preferred depth', area: 'Area', free: 'Free only', search: 'Search the database', sort: 'Sort', recommended: 'Recommended first', shortest: 'Shortest first', deepest: 'Deepest first', alphabetic: 'A–Z', suggested: 'Select suggested set', clear: 'Clear', selected: 'selected', questions: 'questions', minutes: 'min', axes: 'axes', focused: 'Focused', balanced: 'Balanced', broad: 'Broad', start: 'Start free testing', choose: 'Choose at least one test', availableStatus: 'Available', metadata: 'Research reference', details: 'Details', warning: 'More than 8 tests or 30 minutes may be hard to complete in one sitting.', privacy: 'Selections and filters stay only in this page until you explicitly consent to start.', relevance: 'Selection match', matchNote: 'This reflects fit with your selected topics and format, not a medical probability.', best: 'Best match', complements: 'Complements your set', filters: 'More filters', selectedThemes: 'topics selected', filterClear: 'Reset filters', matching: 'matching tests', of: 'out of', kept: 'selected tests kept visible', noMatches: 'No tests match these filters. Remove a topic or filter to see more.', topicHint: 'These topics filter the list immediately; select tests below to build your monitoring battery.', topicPreview: 'Axes related to your chosen topics', testCoverage: 'Coverage of selected tests', totalAvailable: 'available to start' },
  ru: { kicker: 'Монитор состояния', title: 'Соберите свой набор тестов', intro: 'Выберите проблемы, которые хотите отслеживать. Список тестов и оси анализа меняются сразу.', available: 'Доступно сейчас', full: 'Вся база', themes: 'Фильтр тестов по проблемам', style: 'Стиль', length: 'Длина', depth: 'Желаемая глубина', area: 'Область', free: 'Только бесплатные', search: 'Поиск по базе', sort: 'Сортировка', recommended: 'Сначала рекомендуемые', shortest: 'Сначала короткие', deepest: 'Сначала глубокие', alphabetic: 'А–Я', suggested: 'Выбрать оптимальный набор', clear: 'Очистить', selected: 'выбрано', questions: 'вопросов', minutes: 'мин', axes: 'осей', focused: 'Фокусный', balanced: 'Сбалансированный', broad: 'Широкий', start: 'Пройти тестирование бесплатно', choose: 'Выберите хотя бы один тест', availableStatus: 'Доступен', metadata: 'Исследовательская карточка', details: 'Подробнее', warning: 'Больше 8 тестов или 30 минут может быть сложно пройти за один раз.', privacy: 'Выбор и фильтры остаются только на этой странице, пока вы явно не согласитесь начать.', relevance: 'Релевантность подбора', matchNote: 'Это соответствие выбранным темам и формату, а не медицинская вероятность.', best: 'Лучшее совпадение', complements: 'Дополняет набор', filters: 'Дополнительные фильтры', selectedThemes: 'тем выбрано', filterClear: 'Сбросить фильтры', matching: 'подходящих тестов', of: 'из', kept: 'выбранных тестов остаются видны', noMatches: 'По этим фильтрам тестов нет. Уберите тему или другой фильтр.', topicHint: 'Темы сразу отбирают тесты. Отметьте нужные тесты ниже, чтобы создать набор для мониторинга.', topicPreview: 'Оси по выбранным темам', testCoverage: 'Покрытие выбранных тестов', totalAvailable: 'доступно для прохождения' },
  es: { kicker: 'Monitor mente–cuerpo', title: 'Prepara tu selección de pruebas', intro: 'Elige los temas y el formato que más te interesen. Los cuestionarios se realizan en su idioma disponible y los resultados se muestran en la aplicación en inglés.', available: 'Disponibles ahora', full: 'Base completa', themes: 'Filtrar pruebas por temas', style: 'Tipo', length: 'Duración', depth: 'Profundidad deseada', area: 'Área', free: 'Solo gratuitas', search: 'Buscar pruebas', sort: 'Ordenar', recommended: 'Recomendadas primero', shortest: 'Más breves primero', deepest: 'Más detalladas primero', alphabetic: 'A–Z', suggested: 'Elegir una selección recomendada', clear: 'Limpiar', selected: 'seleccionadas', questions: 'preguntas', minutes: 'min', axes: 'ejes', focused: 'Enfocada', balanced: 'Equilibrada', broad: 'Amplia', start: 'Comenzar pruebas gratuitas', choose: 'Elige al menos una prueba', availableStatus: 'Disponible', metadata: 'Referencia de investigación', details: 'Detalles', warning: 'Más de 8 pruebas o 30 minutos pueden resultar difíciles de completar en una sola sesión.', privacy: 'Tus selecciones no se guardan hasta que aceptas expresamente iniciar las pruebas.', relevance: 'Coincidencia', matchNote: 'Muestra la afinidad con los temas elegidos, no una probabilidad médica.', best: 'Mejor coincidencia', complements: 'Complementa tu selección', filters: 'Más filtros', selectedThemes: 'temas elegidos', filterClear: 'Limpiar filtros', matching: 'pruebas encontradas', of: 'de', kept: 'pruebas elegidas visibles', noMatches: 'No hay pruebas para estos filtros. Cambia un tema o filtro.', topicHint: 'Los temas filtran al instante; elige las pruebas para construir tu seguimiento.', topicPreview: 'Ejes de los temas elegidos', testCoverage: 'Cobertura de pruebas elegidas', totalAvailable: 'disponibles para empezar' },
}

const toggle = (items, key) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]
const depthOptions = ['quick', 'balanced', 'deep']

export function TestExplorer({ locale = 'en', audience = 'guest', onStart, activePlan = null, onResume, embedded = false }) {
  const c = COPY[locale] || COPY.en
  const [availability, setAvailability] = useState('available')
  const [focus, setFocus] = useState([])
  const [stylesFilter, setStylesFilter] = useState([])
  const [lengths, setLengths] = useState([])
  const [depth, setDepth] = useState('balanced')
  const [areas, setAreas] = useState([])
  const [freeOnly, setFreeOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [axisFilter, setAxisFilter] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const entries = useMemo(() => buildExplorerEntries({ locale: locale === 'es' ? 'en' : locale, audience }), [locale, audience])
  const matching = useMemo(() => filterExplorerEntries(entries, { availability, focus, styles: stylesFilter, lengths, areas, freeOnly, search: query }), [entries, availability, focus, stylesFilter, lengths, areas, freeOnly, query])
  // A selected test stays visible even if new filters no longer match it.
  const filtered = useMemo(() => filterExplorerEntries(entries, { availability, focus, styles: stylesFilter, lengths, areas, freeOnly, search: query, selectedKeys }), [entries, availability, focus, stylesFilter, lengths, areas, freeOnly, query, selectedKeys])
  const ranked = useMemo(() => rankExplorerEntries(filtered, { focus, depth, styles: stylesFilter, lengths, selectedKeys }), [filtered, focus, depth, stylesFilter, lengths, selectedKeys])
  const visible = useMemo(() => ranked.filter((entry) => !axisFilter || selectedKeys.includes(entry.key) || entry.analysisAxes.some((axis) => axis.key === axisFilter)).sort((a, b) => sort === 'shortest' ? (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity) : sort === 'deepest' ? (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0) : sort === 'alphabetic' ? a.title.localeCompare(b.title, locale) : 0), [ranked, sort, locale, axisFilter, selectedKeys])
  const selected = entries.filter((entry) => selectedKeys.includes(entry.key))
  const coverage = useMemo(() => coverageForSelection(entries, selectedKeys), [entries, selectedKeys])
  const topicCoverage = useMemo(() => coverageForFocus(focus), [focus])
  const showingCoverage = selectedKeys.length > 0
  const displayedCoverage = showingCoverage ? coverage : topicCoverage
  const matchCount = matching.filter((entry) => !axisFilter || entry.analysisAxes.some((axis) => axis.key === axisFilter)).length
  const appliedFilters = stylesFilter.length + lengths.length + areas.length + (freeOnly ? 1 : 0) + (query.trim() ? 1 : 0) + (axisFilter ? 1 : 0)
  const questions = selected.reduce((sum, entry) => sum + (entry.questionCount || 0), 0)
  const minutes = selected.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0)
  const breadth = c[coverage.breadth]
  const chooseSuggested = () => setSelectedKeys(buildStarterBattery(matching.filter((entry) => !axisFilter || entry.analysisAxes.some((axis) => axis.key === axisFilter)), { focus, depth, styles: stylesFilter, lengths }).map((entry) => entry.key))
  const resetFilters = () => { setAvailability('available'); setFocus([]); setStylesFilter([]); setLengths([]); setDepth('balanced'); setAreas([]); setFreeOnly(false); setQuery(''); setSort('recommended'); setAxisFilter(null) }
  const toggleSelected = (key) => setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length < 12 ? [...current, key] : current)
  const start = async () => {
    if (!selected.length || !onStart) return
    setStarting(true); setActionError(null)
    try { await onStart(selected) } catch (error) { setActionError(error) } finally { setStarting(false) }
  }

  return <section className={`${styles.explorer} ${embedded ? styles.embedded : ''}`}>
        <header className={styles.header}><p className={styles.eyebrow}>{c.kicker}</p><h1>{c.title}</h1><p>{c.intro}</p>{activePlan?.status === 'active' && <button type="button" onClick={() => onResume?.(activePlan)}>{locale === 'ru' ? `Продолжить набор: шаг ${activePlan.currentIndex + 1}` : locale === 'es' ? `Continuar selección: paso ${activePlan.currentIndex + 1}` : `Resume set: step ${activePlan.currentIndex + 1}`}</button>}</header>
    <div className={styles.availability} role="tablist" aria-label={c.title}><button type="button" role="tab" aria-selected={availability === 'available'} onClick={() => setAvailability('available')}>{c.available}</button><button type="button" role="tab" aria-selected={availability === 'full'} onClick={() => setAvailability('full')}>{c.full}</button></div>
    <section className={styles.toolbar} aria-label={c.themes}>
      <div className={styles.filterStatus} role="status" aria-live="polite"><strong>{matchCount} {c.matching}</strong><span>{focus.length} {c.selectedThemes} · {appliedFilters} {c.filters.toLocaleLowerCase()}</span><button type="button" onClick={resetFilters}>{c.filterClear}</button></div>
      <div className={styles.filterGroup}><span>{c.themes}</span><p className={styles.topicHint}>{c.topicHint}</p><div>{TEST_RECOMMENDATION_FOCUS.map((item) => <button key={item.key} type="button" aria-pressed={focus.includes(item.key)} onClick={() => setFocus((value) => toggle(value, item.key))}>{item.label[locale] || item.label.en}</button>)}</div></div>
      <details className={styles.moreFilters} open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}><summary>{c.filters} {appliedFilters ? `(${appliedFilters})` : ''}</summary><div className={styles.filterGrid}>
        <Filter label={c.style} items={TEST_STYLE_FILTERS} selected={stylesFilter} onToggle={(key) => setStylesFilter((value) => toggle(value, key))} locale={locale} />
        <Filter label={c.length} items={TEST_LENGTH_FILTERS} selected={lengths} onToggle={(key) => setLengths((value) => toggle(value, key))} locale={locale} />
        <Filter label={c.depth} items={depthOptions.map((key) => ({ key, label: { en: key[0].toUpperCase() + key.slice(1), ru: key === 'quick' ? 'Быстро' : key === 'balanced' ? 'Сбалансированно' : 'Глубоко', es: key === 'quick' ? 'Breve' : key === 'balanced' ? 'Equilibrada' : 'Profunda' } }))} selected={[depth]} onToggle={setDepth} locale={locale} single />
        <Filter label={c.area} items={MONITOR_AREAS.map((area) => ({ key: area.key, label: { en: area.en, ru: area.ru } }))} selected={areas} onToggle={(key) => setAreas((value) => toggle(value, key))} locale={locale} />
        <label className={styles.check}><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />{c.free}</label>
      </div></details>
      <input className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.search} />
      <label className={styles.sort}>{c.sort}<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{c.recommended}</option><option value="shortest">{c.shortest}</option><option value="deepest">{c.deepest}</option><option value="alphabetic">{c.alphabetic}</option></select></label>
    </section>
    <div className={styles.workspace}><div className={styles.database}><div className={styles.databaseHeader}><div className={styles.countBlock}><strong role="status" aria-live="polite">{matchCount} {c.matching}</strong><small>{c.of} {availability === 'available' ? entries.filter((entry) => entry.selectable).length : entries.length} · {c.totalAvailable}{selectedKeys.length > 0 && ` · ${selectedKeys.length} ${c.kept}`}</small></div><button type="button" onClick={chooseSuggested}>{c.suggested}</button></div>
      {visible.length === 0 && <p className={styles.emptyState} role="status">{c.noMatches}</p>}
      <div className={styles.list}>{visible.map((entry, index) => <article key={entry.key} className={`${styles.row} ${selectedKeys.includes(entry.key) ? styles.rowSelected : ''} ${axisFilter && entry.analysisAxes.some((axis) => axis.key === axisFilter) ? styles.rowAxis : ''}`}>
        <div className={styles.rowSelect}>{entry.selectable ? <input type="checkbox" checked={selectedKeys.includes(entry.key)} onChange={() => toggleSelected(entry.key)} aria-label={entry.title} /> : <span className={styles.status}>{entry.source === 'research' ? c.metadata : entry.managedSafety ? 'Managed safety' : entry.rightsStatus}</span>}</div>
        <div className={styles.rowBody}><div className={styles.rowTitle}><span className={styles.area}>{entry.area}</span><h2>{entry.title}</h2>{index === 0 && entry.selectable && <b>{c.best}</b>}{entry.marginalCoverageGain >= .08 && selected.length > 0 && <b>{c.complements}</b>}</div><p>{entry.description || entry.category}</p><div className={styles.meta}><span>{entry.questionCount ?? '—'} {c.questions}</span><span>~{entry.durationMinutes ?? '—'} {c.minutes}</span><span>{entry.testStyle}</span><span>{entry.testLength}</span>{entry.acronym && <span>{entry.acronym}</span>}</div></div>
        {entry.selectable && <div className={styles.relevance} title={c.matchNote} style={{ '--match': `${Math.max(0, Math.min(100, Math.round(entry.score / 1.2)))}%` }}><strong>{Math.max(0, Math.min(100, Math.round(entry.score / 1.2)))}%</strong><span>{c.relevance}</span></div>}
      </article>)}</div></div>
      <TestExplorerVisual locale={locale} coverage={displayedCoverage} mode={showingCoverage ? 'selected' : 'topics'} topicCount={focus.length} selectedCount={selectedKeys.length} axisFilter={axisFilter} onAxisFilter={setAxisFilter} />
    </div>
        <footer className={styles.battery}><div><strong>{selected.length ? `${selected.length} · ${questions} ${c.questions} · ~${minutes} ${c.minutes} · ${coverage.coveredCount} ${c.axes} · ${breadth}` : c.choose}</strong>{(selected.length > 8 || minutes > 30) && <p>{c.warning}</p>}<small>{c.privacy}</small>{actionError && <p role="alert">{actionError.code || actionError.message}</p>}</div><div><button type="button" onClick={() => setSelectedKeys([])}>{c.clear}</button><button className={styles.primary} type="button" disabled={!selected.length || starting} onClick={start}>{starting ? '…' : c.start}</button></div></footer>
  </section>
}

function Filter({ label, items, selected, onToggle, locale, single = false }) { return <fieldset className={styles.filter}><legend>{label}</legend>{items.map((item) => <button type="button" key={item.key} aria-pressed={selected.includes(item.key)} onClick={() => onToggle(item.key)}>{item.label[locale] || item.label.en}</button>)}</fieldset> }
