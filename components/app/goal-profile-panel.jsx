'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'
import { GOAL_RATING_KEYS, GOAL_RATING_LABELS, GOAL_SUPPORT_RULES, eligibleGoalSupportEntry } from '@/lib/profile/goal-profile'
import { verifiedHistoryView } from '@/lib/assessments/verified-history'
import styles from './goal-profile-panel.module.css'

const COPY = {
  en: {
    title:'My Goal Profile', description:'Three separate 0–10 self-ratings for one goal you choose. Not a diagnosis, psychometric norm, or a score inferred from other tests.',
    missing:'No saved self-rating', updated:'Self-rated on', loading:'Loading private goal ratings…', error:'Could not retrieve private goal ratings. Try reopening the profile.',
    target:'Update my 3 ratings', note:'Your ratings are saved only after you choose all three and click Save in My Development Path.',
    chain:'From goal to action', step1:'1 · My starting point', step2:'2 · Supporting tests', step3:'3 · Personal practice', step4:'4 · Optional expert help',
    tests:'Supporting questionnaires', testHint:'These explore related constructs (mental clarity, energy/readiness, self-support). They do NOT independently measure goal clarity, motivation or goal-specific confidence.',
    take:'Explore test', done:'Completed', noTests:'No currently eligible source-backed test. Your self-rating remains available.',
    practice:'Set a small action and review your goals', practiceNote:'Use the existing My Development Path. No automatic course enrolment.',
    help:'Ask for tailored support (optional)', disclaimer:'Recommendations are an optional route, not predicted treatment effects or guaranteed goal achievement.',
    service:{
      clarity:['Free Situation Review','Discuss direction and available next steps'],
      motivation:['Guided Imagery Therapy','Explore blocks and personal resources with a practitioner'],
      confidence:['Personal Coaching','Clarify feasible actions and support for confidence'],
    },
  },
  ru: {
    title:'Мой профиль цели', description:'Три отдельные самооценки 0–10 для одной выбранной цели. Это не диагноз, психологическая норма или баллы, вычисленные по другим тестам.',
    missing:'Нет сохранённой самооценки', updated:'Самооценка от', loading:'Загружаем личные оценки цели…', error:'Не удалось загрузить приватные оценки. Повторно откройте профиль.',
    target:'Изменить три оценки', note:'Все три оценки сохраняются только по вашему действию «Сохранить» в «Моём пути развития».',
    chain:'Путь от цели к действию', step1:'1 · Моя отправная точка', step2:'2 · Вспомогательные тесты', step3:'3 · Личная практика', step4:'4 · Помощь специалиста по желанию',
    tests:'Подходящие тесты', testHint:'Тесты исследуют близкие, но другие понятия: ясность мышления, ресурс/готовность, самоподдержку. Они НЕ измеряют напрямую ясность, мотивацию и уверенность именно в вашей цели.',
    take:'Выбрать тест', done:'Пройден', noTests:'Нет разрешённого источникового теста. Самооценка по-прежнему доступна.',
    practice:'Выбрать небольшой шаг и пересмотреть цели', practiceNote:'Используйте существующий «Мой путь развития». Курс не назначается автоматически.',
    help:'Получить индивидуальную поддержку', disclaimer:'Услуги предлагаются по выбору, без обещания достижения цели или лечебного эффекта.',
    service:{
      clarity:['Бесплатный разбор ситуации','Обсудить направление и возможные действия'],
      motivation:['Терапия с направленными образами','Исследовать препятствия и личные ресурсы на сессии'],
      confidence:['Персональный коучинг','Наметить выполнимые шаги и поддержку уверенности'],
    },
  },
  es: {
    title:'Mi perfil de la meta', description:'Tres autoevaluaciones de 0 a 10 de una meta elegida, no un diagnóstico ni un resultado inventado de otras pruebas.',
    missing:'Sin autoevaluación guardada', updated:'Evaluado el', loading:'Cargando tus evaluaciones privadas…', error:'No se pudo obtener tu evaluación privada. Abre de nuevo el perfil.',
    target:'Editar mis tres puntuaciones', note:'Tus tres puntuaciones se guardan solo al confirmar en Mi plan de desarrollo.',
    chain:'De la meta a la acción', step1:'1 · Mi punto de partida', step2:'2 · Pruebas complementarias', step3:'3 · Práctica personal', step4:'4 · Ayuda profesional opcional',
    tests:'Cuestionarios complementarios', testHint:'Estas pruebas exploran la claridad mental, la energía y el apoyo personal. NO miden directamente las tres cualidades de tu meta.',
    take:'Explorar prueba', done:'Completada', noTests:'No hay pruebas habilitadas con fuente. Puedes seguir autoevaluándote.',
    practice:'Elegir un paso pequeño y revisar mis metas', practiceNote:'Usa Mi plan de desarrollo, sin inscripciones automáticas.',
    help:'Solicitar ayuda individual (opcional)', disclaimer:'Las recomendaciones no garantizan resultados ni efectos terapéuticos.',
    service:{
      clarity:['Revisión gratuita de la situación','Explorar prioridades y posibles pasos'],
      motivation:['Terapia con imágenes guiadas','Explorar obstáculos y recursos personales'],
      confidence:['Coaching personal','Definir acciones realistas y apoyos'],
    },
  },
}
const SERVICE_PATH = Object.freeze({
  clarity:'/services/free-situation-review',
  motivation:'/services/imagery-therapy',
  confidence:'/coaching',
})
const supportingTests = (entries, key, results) => {
  const matches = []
  const seen = new Set()
  for (const rule of GOAL_SUPPORT_RULES.filter(item => item.facet === key)) {
    const test = entries?.get(rule.testKey)
    if (!eligibleGoalSupportEntry(test, rule) || seen.has(test.key)) continue
    seen.add(test.key)
    const complete = (results || []).some(result => result.definitionKey === test.key &&
      result.definitionVersion === test.definition.version)
    matches.push({ key:test.key, title:test.title, completed:complete, kind:test.testKind,
      axis:rule.axis, dimensionKey:rule.dimensionKey })
  }
  return matches.sort((a,b) => Number(a.completed)-Number(b.completed)).slice(0,3)
}

export function GoalProfilePanel({ locale = 'en', accountId, entriesByKey, results = [] }) {
  const lang = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[lang]
  const [rating, setRating] = useState(null)
  const [state, setState] = useState('loading')
  useEffect(() => {
    let active = true
    if (!accountId) { setState('error'); return () => {} }
    const reload = () => {
      setState('loading')
      appFetch('development-goals', undefined, 'GET', { accountId })
        .then(response => { if (active) {
          setRating(response?.goals?.goalCheckin || null)
          setState('ready')
        }})
        .catch(() => { if (active) setState('error') })
    }
    reload()
    // The existing private editor reports success without exposing values in an event.
    window.addEventListener('hh:goal-checkin-saved', reload)
    return () => { active = false; window.removeEventListener('hh:goal-checkin-saved', reload) }
  }, [accountId])
  // Only the newest provenance-verified source result may count as completed.
  // A forged or stale answer with the same test key is not evidence of a test.
  const verifiedCurrent = useMemo(() => verifiedHistoryView(results).current, [results])
  const rows = useMemo(() => GOAL_RATING_KEYS.map(key => ({
    key, label:GOAL_RATING_LABELS[key][lang], value:rating?.values?.[key] ?? null,
    tests:supportingTests(entriesByKey, key, verifiedCurrent),
  })), [entriesByKey, verifiedCurrent, rating, lang])
  const openGoals = () => {
    window.location.hash = 'hh-development-program'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  return <section className={styles.root} data-goal-profile aria-labelledby="hh-goal-profile-title">
    <header><h3 id="hh-goal-profile-title">{t.title}</h3><p>{t.description}</p></header>
    {state === 'loading' ? <p role="status">{t.loading}</p> :
      state === 'error' ? <p role="alert">{t.error}</p> :
      <div className={styles.scaleGrid} data-goal-profile-ratings>
        {rows.map(row => <div key={row.key} className={styles.scaleCard} data-goal-rating={row.key}>
          <strong>{row.label}</strong>
          <span className={styles.value}>{row.value === null ? '—' : row.value + ' / 10'}</span>
          {row.value !== null && <meter min="0" max="10" value={row.value} aria-label={row.label + ' ' + row.value + ' / 10'} />}
          {row.value === null && <small>{t.missing}</small>}
        </div>)}
      </div>}
    {rating?.measuredAt && state === 'ready' && <small className={styles.date}>{t.updated} {new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-CA', { dateStyle:'medium' }).format(new Date(rating.measuredAt))}</small>}
    <a className={styles.mainAction} href="#hh-development-program" onClick={openGoals}>{t.target}</a>
    <small className={styles.note}>{t.note}</small>
    <h4>{t.chain}</h4>
    <ol className={styles.steps}>
      <li><strong>{t.step1}</strong><span>{t.description}</span></li>
      <li><strong>{t.step2}</strong><span>{t.testHint}</span>
        <div className={styles.testGroup}>
          {rows.map(row => <div key={row.key} className={styles.testSection} data-goal-support-facet={row.key}>
            <strong>{row.label}</strong>
            {row.tests.length ? <ul>{row.tests.map(test => <li key={test.key}>
              <span>{test.title} <small>· {test.kind === 'professional' ? 'Pro' : 'Check-in'}</small></span>
              {test.completed ? <small>{t.done}</small> :
                <Link href={'/' + lang + '/app/tests?explore=1&suggest=' + encodeURIComponent(test.key) +
                  '&axis=' + encodeURIComponent(test.axis)} prefetch={false}>{t.take}</Link>}
            </li>)}</ul> : <small>{t.noTests}</small>}
          </div>)}
        </div>
      </li>
      <li><strong>{t.step3}</strong><Link href={'/' + lang + '/app/insights#hh-development-program'} prefetch={false}>{t.practice}</Link><span>{t.practiceNote}</span></li>
      <li><strong>{t.step4}</strong><span>{t.help}</span>
        <div className={styles.serviceGrid}>{GOAL_RATING_KEYS.map(key => <div key={key}>
          <strong>{GOAL_RATING_LABELS[key][lang]}</strong>
          <Link href={'/' + lang + SERVICE_PATH[key]} prefetch={false}>{t.service[key][0]}</Link>
          <small>{t.service[key][1]}</small>
        </div>)}</div>
      </li>
    </ol>
    <p className={styles.note}>{t.disclaimer}</p>
  </section>
}
