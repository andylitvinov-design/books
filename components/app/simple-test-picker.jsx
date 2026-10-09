'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, Clock3, Compass, Heart, Leaf, Moon, Play, SlidersHorizontal, Smile, Sparkles, Sun, Target, Users, Zap } from 'lucide-react'
import styles from './simple-test-picker.module.css'

const TEXT = {
  en: {
    kicker:'TEST SELECTION', title:'Choose your tests',
    lead:'Find questionnaires that fit what you would like to explore. Your recommendations update as you select topics.',
    first:'What would you like to explore?', firstHelp:'Select one or more areas that matter to you right now.',
    detail:'Detailed selection (optional)', detailHelp:'Choose the level of detail or add time and format filters.',
    depth:'How deep do you want to go?', depthHelp:'This helps prioritize recommendations. It does not limit your options.',
    quick:'Quick check-in', quickNote:'Short introductory tests',
    balanced:'Core set', balancedNote:'A balanced overview',
    deep:'In-depth battery', deepNote:'More detailed questionnaires',
    time:'Time per test', anyTime:'Any duration', shortTime:'Up to 5 min', mediumTime:'Up to 10 min',
    professional:'Professional tests only', clear:'Clear optional filters',
    recommended:'Recommended for you', recommendedHelp:'Suggested from your selected topics, using tests available to take now.',
    why:'Why these tests?', whyText:'The match percentage is an approximate recommendation score calculated from your selected topics, questionnaire coverage and optional test depth. With no topics selected, it represents general starter relevance. It is not a clinical probability, diagnostic accuracy or health percentage.',
    suggested:'Suggested', available:'Available', selected:'selected', matching:'matching tests',
    minutes:'min total', viewSelection:'Included in your plan', none:'No available tests match. Try a different topic or clear optional filters.',
    build:'Start free testing', buildHelp:'Save your selection and get started',
    browse:'Browse full database', privacy:'Your selection stays on this page until you choose to continue. Google sign-in is required to save a personal plan.',
    noTests:'Choose a test to continue.', reset:'Use suggested set', back:'Back to easy selection', saved:'Already have a plan? Open my saved tests',
    more:'Show {count} more tests', showing:'Showing {shown} of {total} matching tests', fit:'match', fitInfo:'Estimated relevance — not a clinical score or diagnosis.',
  },
  ru: {
    kicker:'ПОДБОР ТЕСТОВ', title:'Подберите свои тесты',
    lead:'Найдите тесты по интересующим вас темам. Подходящие рекомендации меняются сразу.',
    first:'Что вы хотите исследовать?', firstHelp:'Отметьте одну или несколько важных для вас тем.',
    detail:'Подробный подбор (необязательно)', detailHelp:'Глубина, время прохождения и формат — при желании.',
    depth:'Насколько глубоко хотите исследовать?', depthHelp:'Меняет порядок рекомендаций, не закрывая другие тесты.',
    quick:'Быстрый обзор', quickNote:'Короткие вводные тесты',
    balanced:'Основной набор', balancedNote:'Сбалансированная подборка',
    deep:'Глубокий анализ', deepNote:'Более подробные опросники',
    time:'Время на один тест', anyTime:'Любое', shortTime:'До 5 мин', mediumTime:'До 10 мин',
    professional:'Только профессиональные тесты', clear:'Очистить дополнительные фильтры',
    recommended:'Рекомендуем для вас', recommendedHelp:'На основе выбранных тем и реально доступных тестов.',
    why:'Почему эти тесты?', whyText:'Процент соответствия — ориентировочная оценка по выбранным темам, охвату параметров и глубине теста. Если темы не указаны, он отражает пригодность для общего знакомства. Это не клиническая вероятность, не точность диагностики и не процент здоровья.',
    suggested:'Подходит', available:'Доступен', selected:'выбрано', matching:'подходящих тестов',
    minutes:'мин всего', viewSelection:'В вашем наборе', none:'Подходящих доступных тестов нет. Выберите другую тему или сбросьте фильтры.',
    build:'Пройти тестирование бесплатно', buildHelp:'Сохранить подборку и начать',
    browse:'Открыть всю базу тестов', privacy:'До нажатия кнопки продолжения выбор остаётся на этой странице. Для сохранения набора нужен вход через Google.',
    noTests:'Выберите тест для продолжения.', reset:'Вернуть рекомендованный набор', back:'Назад к простому подбору', saved:'Уже есть подборка? Открыть мои тесты',
    more:'Показать ещё {count} тестов', showing:'Показано {shown} из {total} подходящих тестов', fit:'соответствие', fitInfo:'Ориентировочная релевантность — не диагноз и не показатель здоровья.',
  },
  es: {
    kicker:'SELECCIÓN DE PRUEBAS', title:'Elige tus pruebas',
    lead:'Encuentra cuestionarios que se ajusten a tus intereses. Las recomendaciones cambian al elegir temas.',
    first:'¿Qué te gustaría explorar?', firstHelp:'Elige uno o varios temas importantes para ti.',
    detail:'Selección detallada (opcional)', detailHelp:'Profundidad, tiempo y formato.',
    depth:'¿Cuánto quieres profundizar?', depthHelp:'Ajusta la prioridad, sin excluir los demás tests.',
    quick:'Revisión rápida', quickNote:'Pruebas introductorias',
    balanced:'Conjunto básico', balancedNote:'Selección equilibrada',
    deep:'Análisis profundo', deepNote:'Cuestionarios más completos',
    time:'Tiempo por prueba', anyTime:'Sin límite', shortTime:'Hasta 5 min', mediumTime:'Hasta 10 min',
    professional:'Solo pruebas profesionales', clear:'Borrar filtros opcionales',
    recommended:'Recomendados para ti', recommendedHelp:'Basados en tus temas y pruebas disponibles.',
    why:'¿Por qué estas pruebas?', whyText:'El porcentaje es una estimación orientativa basada en temas, cobertura y profundidad del test. Sin temas elegidos indica relevancia general. No es una probabilidad clínica ni un diagnóstico.',
    suggested:'Sugerida', available:'Disponible', selected:'seleccionadas', matching:'pruebas coincidentes',
    minutes:'min en total', viewSelection:'En tu selección', none:'No hay pruebas disponibles con estos filtros.',
    build:'Comenzar pruebas gratuitas', buildHelp:'Guardar selección y empezar',
    browse:'Explorar base completa', privacy:'La selección queda en esta página hasta que continúes. Inicia sesión con Google para guardarla.',
    noTests:'Elige una prueba para continuar.', reset:'Usar selección sugerida', back:'Volver al selector sencillo', saved:'¿Ya tienes pruebas? Abrir mis pruebas',
    more:'Mostrar {count} pruebas más', showing:'Mostrando {shown} de {total} pruebas', fit:'coincidencia', fitInfo:'Relevancia estimada, no una puntuación médica ni un diagnóstico.',
  },
}

const TOPICS = [
  { key:'stress', en:'Stress', ru:'Стресс', es:'Estrés', Icon:Zap },
  { key:'anxiety', en:'Anxiety', ru:'Тревога', es:'Ansiedad', Icon:Heart },
  { key:'mood', en:'Mood', ru:'Настроение', es:'Ánimo', Icon:Smile },
  { key:'sleep', en:'Sleep', ru:'Сон', es:'Sueño', Icon:Moon },
  // These keys are deliberately mapped to existing, validated focus facets.
  { key:'body', en:'Energy', ru:'Энергия', es:'Energía', Icon:Sun },
  { key:'relationships', en:'Relationships', ru:'Отношения', es:'Relaciones', Icon:Users },
  { key:'resources', en:'Self-support', ru:'Внутренняя опора', es:'Apoyo interior', Icon:Leaf },
  { key:'attention', en:'Focus', ru:'Концентрация', es:'Atención', Icon:Target },
]

function iconFor(entry) {
  const topics = entry.topics || []
  if (topics.includes('anxiety')) return Heart
  if (topics.includes('sleep')) return Moon
  if (topics.includes('stress')) return Zap
  if (topics.includes('relationships') || topics.includes('support')) return Users
  if (topics.includes('energy') || topics.includes('recovery')) return Sun
  if (topics.includes('mood')) return Smile
  return Leaf
}

export function SimpleTestPicker({
  locale = 'en',
  focus, onToggleFocus,
  depth, onDepth,
  maxMinutes, onMaxMinutes,
  professionalOnly, onProfessional,
  recommendations, activeBattery, onToggleTest, onResetSuggested,
  matchCount, onStart, onBrowseFull,
  starting = false, actionError = null,
}) {
  const c = TEXT[locale] || TEXT.en
  const [visibleCount, setVisibleCount] = useState(5)
  const focusKey = [...focus].sort().join('|')
  useEffect(() => {
    // The first screen starts from the five closest matches after any filter change.
    setVisibleCount(5)
  }, [focusKey, depth, maxMinutes, professionalOnly])
  const visibleRecommendations = recommendations.slice(0, visibleCount)
  const remainingCount = Math.max(0, recommendations.length - visibleCount)
  const nextBatch = Math.min(5, remainingCount)
  const format = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
  const selectedKeys = new Set(activeBattery.map((item) => item.key))
  const minutes = activeBattery.reduce((total, item) => total + (item.durationMinutes || 0), 0)
  const hasExtraFilters = maxMinutes > 0 || professionalOnly || depth !== 'balanced'

  return <section className={styles.shell} aria-label={c.title} data-prelogin-test-picker>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>{c.kicker}</p>
        <h1>{c.title}</h1>
        <p className={styles.lead}>{c.lead}</p>
      </div>
      <Leaf className={styles.heroLeaf} size={78} strokeWidth={0.8} aria-hidden="true" />
    </header>

    <section className={styles.section} aria-labelledby="hh-simple-topic-title">
      <div className={styles.sectionHeader}>
        <span className={styles.step} aria-hidden="true">1</span>
        <div><h2 id="hh-simple-topic-title">{c.first}</h2><p>{c.firstHelp}</p></div>
      </div>
      <div className={styles.topicGrid} role="group" aria-label={c.first}>
        {TOPICS.map(({ key, Icon, ...labels }) => {
          const checked = focus.includes(key)
          return <button key={key} type="button" aria-pressed={checked}
            className={styles.topic} onClick={() => onToggleFocus(key)}>
            <Icon size={20} aria-hidden="true" strokeWidth={1.9}/>
            <span>{labels[locale] || labels.en}</span>
            {checked && <Check size={16} className={styles.topicCheck} aria-hidden="true"/>}
          </button>
        })}
      </div>
    </section>

    <details className={styles.advanced}>
      <summary>
        <span className={styles.filterIcon}><SlidersHorizontal size={20} aria-hidden="true"/></span>
        <span className={styles.filterText}><strong>{c.detail}</strong><small>{c.detailHelp}</small></span>
        {hasExtraFilters && <span className={styles.appliedMark} aria-label={locale === 'ru' ? 'Есть активные фильтры' : 'Filters active'}>•</span>}
        <ChevronDown aria-hidden="true" size={20} className={styles.chevron}/>
      </summary>
      <div className={styles.advancedBody}>
        <h3>{c.depth}</h3>
        <p>{c.depthHelp}</p>
        <div className={styles.depthOptions} role="group" aria-label={c.depth}>
          {[
            {key:'quick', name:c.quick, desc:c.quickNote, Icon:Zap},
            {key:'balanced', name:c.balanced, desc:c.balancedNote, Icon:Sparkles},
            {key:'deep', name:c.deep, desc:c.deepNote, Icon:Compass},
          ].map(({key,name,desc,Icon}) => <button type="button" className={styles.depthOption}
            aria-pressed={depth === key} onClick={() => onDepth(key)} key={key}>
            <Icon size={21} aria-hidden="true"/><span><strong>{name}</strong><small>{desc}</small></span>
          </button>)}
        </div>
        <div className={styles.extraRow}>
          <div className={styles.timeButtons} role="group" aria-label={c.time}>
            <strong>{c.time}</strong>
            {[[0,c.anyTime],[5,c.shortTime],[10,c.mediumTime]].map(([minutes,label]) =>
              <button key={minutes} type="button" aria-pressed={maxMinutes===minutes} onClick={() => onMaxMinutes(minutes)}>{label}</button>
            )}
          </div>
          <button className={styles.professional} type="button" aria-pressed={professionalOnly} onClick={onProfessional}>{professionalOnly ? '✓ ' : ''}{c.professional}</button>
        </div>
        <button type="button" className={styles.clearFilters} onClick={() => { onDepth('balanced'); onMaxMinutes(0); if (professionalOnly) onProfessional() }}>{c.clear}</button>
      </div>
    </details>

    <section className={styles.section} aria-labelledby="hh-simple-recommendations-title" id="hh-simple-recommendations">
      <div className={styles.sectionHeader}>
        <span className={styles.step} aria-hidden="true">2</span>
        <div><h2 id="hh-simple-recommendations-title">{c.recommended}</h2><p>{c.recommendedHelp}</p></div>
      </div>
      <div className={styles.matchCount} role="status" aria-live="polite">{matchCount} {c.matching}</div>
      <details className={styles.why}>
        <summary>{c.why} <ArrowRight size={14} aria-hidden="true"/></summary>
        <p>{c.whyText}</p>
      </details>
      {recommendations.length > 0 ? <div className={styles.testList} id="hh-public-recommended-tests" data-visible-test-count={visibleRecommendations.length}>
        {visibleRecommendations.map((entry,index) => {
          const Icon = iconFor(entry)
          const checked = selectedKeys.has(entry.key)
          return <label key={entry.key} className={styles.testRow} data-selected={checked} data-test-match={entry.key} data-relevance={entry.matchPercent}>
            <input type="checkbox" checked={checked} onChange={() => onToggleTest(entry.key)}
              aria-label={entry.title} />
            <span className={styles.testArt} aria-hidden="true"><Icon size={24} strokeWidth={1.7}/></span>
            <span className={styles.testInfo}>
              <strong>{entry.title}</strong>
              <small>{entry.description || entry.category}</small>
            </span>
            <span className={styles.testMeta}>
              <strong className={styles.matchBadge} title={c.fitInfo} aria-label={entry.matchPercent + '% ' + c.fit}>
                {entry.matchPercent}% <span>{c.fit}</span>
              </strong>
              <em>{checked ? c.viewSelection : index === 0 ? c.suggested : c.available}</em>
              <small><Clock3 size={14} aria-hidden="true"/> ~{entry.durationMinutes ?? '—'} min</small>
            </span>
          </label>
        })}
      </div> : <p className={styles.noMatches} role="status">{c.none}</p>}
      {recommendations.length > 0 && <div className={styles.moreTests} data-inline-test-expansion>
        <span role="status" aria-live="polite">
          {format(c.showing, { shown: visibleRecommendations.length, total: recommendations.length })}
        </span>
        {remainingCount > 0 && <button type="button" className={styles.showFiveMore}
          aria-controls="hh-public-recommended-tests" aria-expanded={visibleCount > 5}
          onClick={() => setVisibleCount((current) => Math.min(recommendations.length, current + 5))}>
          {format(c.more, { count: nextBatch })} <ArrowRight size={18} aria-hidden="true" />
        </button>}
      </div>}
      <p className={styles.fitNote}>{c.fitInfo}</p>

      <div className={styles.selectedSummary} role="status" aria-live="polite">
        <Check size={19} aria-hidden="true"/>
        <strong>{activeBattery.length} {c.selected} · ~{minutes} {c.minutes}</strong>
        <button type="button" onClick={onResetSuggested}>{c.reset}</button>
      </div>
      <button type="button" className={styles.cta} disabled={!activeBattery.length || starting} onClick={onStart}>
        <Play size={22} fill="currentColor" aria-hidden="true" />
        <span><strong>{starting ? '…' : c.build}</strong><small>{c.buildHelp}</small></span>
        <ArrowRight size={23} aria-hidden="true"/>
      </button>
      {actionError && <p className={styles.error} role="alert">{actionError.code || actionError.message || String(actionError)}</p>}
      {!activeBattery.length && <p className={styles.noMatches} role="status">{c.noTests}</p>}
      <button type="button" className={styles.fullDatabase} onClick={onBrowseFull}>
        <Compass size={20} aria-hidden="true"/>{c.browse}<ChevronDown size={17} aria-hidden="true" className={styles.browseArrow}/>
      </button>
    </section>
    <p className={styles.privacy}>{c.privacy} <Link href={`/${locale === 'ru' ? 'ru' : 'en'}/app`} prefetch={false}>{c.saved} →</Link></p>
  </section>
}
