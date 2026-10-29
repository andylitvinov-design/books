'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'
import { buildMyProgress } from '@/lib/app/my-progress.mjs'
import { assessmentHistoryTitle } from '@/lib/assessments/personal-guidance'
import styles from './my-progress.module.css'

const COPY = {
  en: {
    eyebrow:'MY HOUSE · MY JOURNEY', title:'My Progress',
    intro:'Your saved tests, courses, practices, reports, requests and private video mandalas — together in one chronological history.',
    tests:'Tests', courses:'Courses', practices:'Practices', mandalas:'Video mandalas',
    all:'All', videos:'Watched videos', reports:'Reports', services:'Services', notes:'Check-ins & notes',
    history:'Activity history', saved:'Saved', completed:'Completed', watched:'Marked watched', mastered:'Self-marked mastered', in_progress:'In progress',
    active:'In progress', paused:'Paused', draft:'Draft', closed:'Closed', archived:'Archived',
    logged:'Recorded', requested:'Requested (not booked)', contacted:'Contacted',
    cancelled:'Cancelled', unavailable:'No longer available', pending:'Pending',
    open:'Open', more:'Show more', empty:'Nothing saved in this category yet.',
    partial:'Some sources could not be loaded. The activity shown below is incomplete. Refresh to try again.',
    loading:'Checking your private saved progress…',
    watchTitle:'Academy video viewing marks',
    watchNote:'Open an Academy video, then explicitly mark it as watched or mastered. These are your own confirmations, not automatic measurements of playback or skill.',
    watchAction:'Explore video courses', mandalaNote:'Only completed MP4 files explicitly saved to your private account are included. Browser-only edits and device downloads cannot be recovered here.',
    mandalaAction:'Open my saved videos', compare:'Compare test results',
    courseAction:'Continue my courses', privacy:'Visible only inside your signed-in account. No clinical score is shared with a practitioner, messaging app or marketing tracker.',
    foot:'Finishing a practice records participation, not a guaranteed change in wellbeing.',
    countCourses:'started / saved', countTests:'completed', countPractices:'confirmed', countMandalas:'cloud saved', countVideos:'self-marked',
    refresh:'Refresh progress',
  },
  ru: {
    eyebrow:'МОЙ ДОМ · МОЙ ПУТЬ', title:'Мой прогресс',
    intro:'Пройденные тесты, курсы, практики, отчёты, заявки и сохранённые видеомандалы — в одной истории по датам.',
    tests:'Тесты', courses:'Курсы', practices:'Практики', mandalas:'Видеомандалы',
    all:'Всё', videos:'Просмотренные видео', reports:'Отчёты', services:'Услуги', notes:'Наблюдения',
    history:'История активности', saved:'Сохранено', completed:'Завершено', watched:'Отмечено просмотренным', mastered:'Отмечено освоенным', in_progress:'В процессе',
    active:'В процессе', paused:'Приостановлено', draft:'Черновик', closed:'Закрыто', archived:'В архиве',
    logged:'Записано', requested:'Заявка (не запись)', contacted:'Связались',
    cancelled:'Отменена', unavailable:'Больше недоступно', pending:'Ожидает',
    open:'Открыть', more:'Показать ещё', empty:'В этой категории пока нет сохранённых записей.',
    partial:'Часть источников сейчас недоступна. История ниже неполная. Обновите данные и попробуйте снова.',
    loading:'Проверяем сохранённый прогресс вашего аккаунта…',
    watchTitle:'Отметки о просмотренных видео Академии',
    watchNote:'Откройте видео в Академии, затем отметьте «Я посмотрел(а)» или «Я освоил(а)». Это ваше подтверждение, а не автоматический подсчёт просмотра.',
    watchAction:'Перейти к видеокурсам', mandalaNote:'Здесь только готовые MP4, явно сохранённые в приватном кабинете. Несохранённые проекты браузера и скачивания на устройство восстановить отсюда нельзя.',
    mandalaAction:'Мои сохранённые видео', compare:'Динамика тестов',
    courseAction:'Продолжить курсы', privacy:'Эта информация видна только после входа. Результаты тестов не отправляются практику, в мессенджеры или рекламную аналитику.',
    foot:'Выполнение практики означает участие, но не гарантирует улучшение состояния.',
    countCourses:'начато / сохранено', countTests:'завершено', countPractices:'подтверждено', countMandalas:'сохранено в облаке', countVideos:'отмечено лично',
    refresh:'Обновить прогресс',
  },
  es: {
    eyebrow:'MI CASA · MI CAMINO', title:'Mi progreso',
    intro:'Tests, cursos, prácticas, informes, solicitudes y videomandalas guardadas, en una sola cronología privada.',
    tests:'Tests', courses:'Cursos', practices:'Prácticas', mandalas:'Videomandalas',
    all:'Todo', videos:'Vídeos vistos', reports:'Informes', services:'Servicios', notes:'Registros',
    history:'Historial de actividad', saved:'Guardado', completed:'Completado', watched:'Marcado visto', mastered:'Marcado aprendido', in_progress:'En curso',
    active:'En curso', paused:'Pausado', draft:'Borrador', closed:'Cerrado', archived:'Archivado',
    logged:'Registrado', requested:'Solicitud (sin reserva)', contacted:'Contactado',
    cancelled:'Cancelado', unavailable:'No disponible', pending:'Pendiente',
    open:'Abrir', more:'Mostrar más', empty:'Todavía no hay registros guardados en esta categoría.',
    partial:'Algunas fuentes no se han podido cargar. La cronología está incompleta. Actualiza para intentarlo de nuevo.',
    loading:'Comprobando tu progreso guardado…',
    watchTitle:'Mis vídeos de Academy marcados',
    watchNote:'Abre un vídeo en Academy y márcalo como visto o aprendido. Es tu confirmación, no una medición automática.',
    watchAction:'Explorar los vídeos', mandalaNote:'Solo se incluyen MP4 guardados expresamente en tu cuenta privada; los proyectos locales no pueden recuperarse aquí.',
    mandalaAction:'Mis vídeos guardados', compare:'Comparar tests',
    courseAction:'Continuar mis cursos', privacy:'Solo visible en tu cuenta. No compartimos resultados con profesionales, mensajes ni analítica publicitaria.',
    foot:'Terminar una práctica no garantiza una mejora de bienestar.',
    countCourses:'iniciados / guardados', countTests:'completados', countPractices:'confirmadas', countMandalas:'guardadas en nube', countVideos:'marcados por mí',
    refresh:'Actualizar progreso',
  },
}

const FILTERS = ['all','tests','courses','practices','videos','mandalas','reports','services','notes']
const DATE_LOCALES = {en:'en-US',ru:'ru-RU',es:'es-ES'}
function dateLabel(value,locale) {
  try { return new Intl.DateTimeFormat(DATE_LOCALES[locale] || DATE_LOCALES.en,
    {dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) }
  catch { return '' }
}
function Status({status,t}) {
  return <span className={styles.status} data-progress-status={status}>{t[status] || t.saved}</span>
}

export default function MyProgress({ data, locale = 'en' }) {
  const lang = Object.hasOwn(COPY,locale) ? locale : 'en'
  const t = COPY[lang]
  const accountId = data?.account?.id
  const [sources,setSources] = useState({growth:null,energywork:null,videos:null,videoProgress:null,loading:true,failed:0})
  const [reloadKey,setReloadKey] = useState(0)
  const [filter,setFilter] = useState('all')
  const [shown,setShown] = useState(30)
  useEffect(() => {
    if (!accountId) return
    let active = true
    setSources({growth:null,energywork:null,videos:null,videoProgress:null,loading:true,failed:0})
    const endpoints = ['course','academy-energywork','personal-videos','video-progress']
    Promise.allSettled(endpoints.map(endpoint => appFetch(endpoint,undefined,'GET',{accountId})))
      .then(results => {
        if (!active) return
        const values = results.map(item => item.status === 'fulfilled' ? item.value : null)
        setSources({
          growth:values[0],energywork:values[1],videos:values[2],videoProgress:values[3],loading:false,
          // Cloud video storage may be disabled and remains an optional category.
          failed:results.filter((item,index) => item.status === 'rejected' &&
            !(index === 2 && item.reason?.code === 'FEATURE_UNAVAILABLE')).length,
        })
      })
    return () => { active = false }
  },[accountId,reloadKey])

  const progress = useMemo(() => buildMyProgress({
    bootstrap:data || {}, growth:sources.growth, energywork:sources.energywork,
    videos:sources.videos,videoProgress:sources.videoProgress,titleOfTest:assessmentHistoryTitle,locale:lang,
  }),[data,sources,lang])
  const filtered = useMemo(() => filter === 'all'
    ? progress.entries : progress.entries.filter(item => item.category === filter),
  [filter,progress])
  const root = '/' + lang + '/app'
  const overview = [
    {key:'tests',value:progress.totals.tests,label:t.tests,detail:t.countTests},
    {key:'courses',value:progress.totals.courses,label:t.courses,detail:t.countCourses},
    {key:'practices',value:progress.totals.practices,label:t.practices,detail:t.countPractices},
    {key:'mandalas',value:progress.totals.mandalas,label:t.mandalas,detail:t.countMandalas},
    {key:'videos',value:progress.totals.watchedVideos,label:t.videos,detail:t.countVideos},
  ]
  return <section className={styles.page} data-my-progress data-account-progress-loaded={!sources.loading}>
    <header className={styles.head}>
      <p className={styles.kicker}>{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <div className={styles.quickLinks}>
        <Link href={root + '/history'}>{t.compare}</Link>
        <Link href={root + '/course?view=courses'}>{t.courseAction}</Link>
        <button type="button" onClick={() => setReloadKey(k => k + 1)} disabled={sources.loading}>{t.refresh}</button>
      </div>
    </header>
    <div className={styles.stats} aria-label={t.history}>
      {overview.map(item => <div key={item.key} className={styles.stat}>
        <strong>{item.value}</strong><span>{item.label}</span><small>{item.detail}</small>
      </div>)}
    </div>
    <div className={styles.historyHead}>
      <h2>{t.history}</h2>
      <small>{progress.entries.length}</small>
    </div>
    <nav className={styles.filters} aria-label={t.history}>
      {FILTERS.map(key => <button key={key} type="button" aria-pressed={filter===key}
        className={filter===key ? styles.selected : ''} onClick={() => {setFilter(key);setShown(30)}}>
        {t[key]}
      </button>)}
    </nav>
    {sources.loading && <p className={styles.note} role="status">{t.loading}</p>}
    {!sources.loading && sources.failed > 0 && <p className={styles.warning} role="alert">{t.partial}</p>}
    {filter === 'videos' && <div className={styles.notice}>
      <strong>{t.watchTitle}</strong>
      <p>{t.watchNote}</p>
      <Link href={'/' + lang + '/academy'}>{t.watchAction}</Link>
    </div>}
    {(filter === 'mandalas' || filter === 'all') && <p className={styles.note}>
      {t.mandalaNote} <Link href={root + '/videos'}>{t.mandalaAction}</Link>
    </p>}
    <ol className={styles.timeline}>
      {filtered.slice(0,shown).map(item => <li key={item.id} className={styles.item}>
        <div className={styles.itemTop}>
          <time dateTime={item.at}>{dateLabel(item.at,lang)}</time>
          <Status status={item.status} t={t}/>
        </div>
        <div className={styles.itemRow}>
          <div className={styles.itemBody}>
            <span className={styles.category}>{t[item.category]}</span>
            <h3>{item.title}</h3>
            {item.detail && <p>{item.detail}</p>}
          </div>
          {item.href && <Link className={styles.open} href={item.href} prefetch={false}>{t.open}</Link>}
        </div>
      </li>)}
    </ol>
    {!sources.loading && !filtered.length && <div className={styles.empty}>{t.empty}</div>}
    {filtered.length > shown && <button className={styles.more} type="button"
      onClick={() => setShown(count => count+30)}>{t.more}</button>}
    <footer className={styles.footer}>
      <p>{t.privacy}</p><p>{t.foot}</p>
    </footer>
  </section>
}
