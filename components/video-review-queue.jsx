'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Clock3, ExternalLink, Film, RotateCw, ShieldAlert, ThumbsDown, ThumbsUp } from 'lucide-react'
import { reviewCatalogVideoAction, verifyCatalogVideoAction } from '@/app/admin/videos/review-actions'
import { VIDEO_AREAS, videoAreasFromRow, videoTopicsFromRow, videoReviewChecks } from '@/lib/site-videos/review-model.mjs'
import styles from './video-review-queue.module.css'

const copy = {
  en: {
    title: 'Video review feed', intro: 'Watch a candidate, confirm or adjust the suggested categories, then accept or reject. Acceptance does not override technical publication checks.',
    pending: 'To review', accepted: 'Accepted', rejected: 'Rejected', all: 'All', language: 'Language', filter: 'Decision', allLanguages: 'All languages',
    duration: 'Duration', unknown: 'not verified', review: 'Suggested categories', topics: 'Subtopics', note: 'Your note (optional)',
    watch: 'Watch here', close: 'Hide player', open: 'Open on YouTube', source: 'Evidence',
    approve: 'Accept', decline: 'Reject', save: 'Save categories', check: 'Check YouTube listing',
    screened: 'I reviewed the complete video and checked its claims and safety.',
    verified: 'Listing confirmed', unchecked: 'Listing unverified', reviewed: 'Content reviewed', notReviewed: 'Content not reviewed',
    embed: 'Player verified', noEmbed: 'Embed not verified',
    link: 'Client link eligible', private: 'Saved privately', player: 'Player published',
    empty: 'No videos match these filters.', loadMore: 'Show more', processing: 'Saving…',
    conflict: 'This video changed. Refresh the page and try again.',
    unauthorized: 'Owner login expired. Sign in again.',
    oembed_unavailable: 'YouTube did not confirm the listing. The video remains private.',
    unavailable: 'Could not save. Nothing was published.', validation: 'Choose valid categories.',
    saved: 'Decision saved to the existing catalog.', pendingChecks: 'Approved by owner; client visibility still awaits technical checks.',
    overlong: 'Longer than ten minutes', refresh: 'Reload list', status: 'Visibility', minutes: 'min',
  },
  ru: {
    title: 'Лента проверки видео', intro: 'Посмотрите ролик, проверьте предложенные категории и примите или отклоните. Решение владельца не отменяет технические требования к публикации.',
    pending: 'На проверке', accepted: 'Принято', rejected: 'Отклонено', all: 'Все', language: 'Язык', filter: 'Решение', allLanguages: 'Все языки',
    duration: 'Длительность', unknown: 'не подтверждена', review: 'Предложенные категории', topics: 'Подтемы', note: 'Ваш комментарий (необязательно)',
    watch: 'Смотреть здесь', close: 'Скрыть плеер', open: 'Открыть YouTube', source: 'Источник проверки',
    approve: 'Принять', decline: 'Отклонить', save: 'Сохранить категории', check: 'Проверить ссылку',
    screened: 'Я просмотрел видео полностью и проверил содержание и безопасность.',
    verified: 'Страница подтверждена', unchecked: 'Страница не подтверждена', reviewed: 'Содержание проверено', notReviewed: 'Содержание не проверено',
    embed: 'Плеер проверен', noEmbed: 'Встраивание не проверено',
    link: 'Можно предложить ссылку', private: 'Сохранено приватно', player: 'Плеер опубликован',
    empty: 'Для этих фильтров видео нет.', loadMore: 'Показать ещё', processing: 'Сохраняю…',
    conflict: 'Видео изменилось. Обновите страницу и повторите.',
    unauthorized: 'Сессия владельца завершилась. Войдите снова.',
    oembed_unavailable: 'YouTube не подтвердил страницу. Видео остаётся приватным.',
    unavailable: 'Не удалось сохранить. Публикации не было.', validation: 'Уточните категории.',
    saved: 'Решение сохранено в существующей базе.', pendingChecks: 'Владелец принял; до допуска клиентам нужны технические проверки.',
    overlong: 'Дольше десяти минут', refresh: 'Обновить', status: 'Доступность', minutes: 'мин',
  },
  es: {
    title: 'Revisión de vídeos', intro: 'Mira el vídeo, ajusta las categorías y acepta o rechaza. La aprobación no omite las comprobaciones técnicas.',
    pending: 'Pendientes', accepted: 'Aceptados', rejected: 'Rechazados', all: 'Todos', language: 'Idioma', filter: 'Decisión', allLanguages: 'Todos los idiomas',
    duration: 'Duración', unknown: 'sin verificar', review: 'Categorías sugeridas', topics: 'Subtemas', note: 'Tu comentario (opcional)',
    watch: 'Ver aquí', close: 'Ocultar vídeo', open: 'Abrir YouTube', source: 'Fuente',
    approve: 'Aceptar', decline: 'Rechazar', save: 'Guardar categorías', check: 'Verificar enlace',
    screened: 'He visto el vídeo completo y revisado las afirmaciones y la seguridad.',
    verified: 'Página comprobada', unchecked: 'Página sin verificar', reviewed: 'Contenido revisado', notReviewed: 'Contenido sin revisar',
    embed: 'Reproductor comprobado', noEmbed: 'Inserción sin verificar',
    link: 'Enlace apto para clientes', private: 'Guardado en privado', player: 'Reproductor publicado',
    empty: 'No hay vídeos para estos filtros.', loadMore: 'Ver más', processing: 'Guardando…',
    conflict: 'El vídeo ha cambiado. Actualiza la página.',
    unauthorized: 'Sesión caducada. Vuelve a iniciar sesión.',
    oembed_unavailable: 'YouTube no pudo confirmar el vídeo. Sigue privado.',
    unavailable: 'No se pudo guardar. No se publicó nada.', validation: 'Selecciona categorías válidas.',
    saved: 'Decisión guardada en el catálogo.', pendingChecks: 'Aceptado; quedan verificaciones técnicas para mostrarlo a clientes.',
    overlong: 'Más de diez minutos', refresh: 'Actualizar', status: 'Visibilidad', minutes: 'min',
  },
}

function verifiedWatchUrl(id) {
  return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? 'https://www.youtube.com/watch?v=' + id : null
}

function externalEvidence(url) {
  if (typeof url !== 'string') return null
  try {
    const link = new URL(url)
    return link.protocol === 'https:' && !link.username && !link.password ? link.href : null
  } catch { return null }
}

function durationLabel(seconds, t) {
  return Number.isSafeInteger(seconds) && seconds > 0
    ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
    : t.unknown
}

function ReviewCard({ row, locale, onUpdated }) {
  const t = copy[locale]
  const [areas, setAreas] = useState(() => videoAreasFromRow(row))
  const [topics, setTopics] = useState(() => videoTopicsFromRow(row))
  const [note, setNote] = useState(row.owner_review_note || '')
  const [screened, setScreened] = useState(false)
  const [play, setPlay] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const checks = videoReviewChecks(row)
  const watchUrl = verifiedWatchUrl(row.youtube_id)
  const evidence = externalEvidence(row.source_evidence_url)

  useEffect(() => {
    setAreas(videoAreasFromRow(row))
    setTopics(videoTopicsFromRow(row))
    setNote(row.owner_review_note || '')
    setScreened(false)
  }, [row.owner_review_version])

  const canSave = areas.length > 0 && !pending
  function toggleArea(area) {
    setAreas(current => current.includes(area.id) ? current.filter(id => id !== area.id) : [...current, area.id])
    setTopics(current => current.filter(id => {
      if (!area.topics.some(topic => topic.id === id)) return true
      return !areas.includes(area.id)
    }))
  }

  function submit(action) {
    if (!canSave) return
    setMessage('')
    startTransition(async () => {
      const result = await reviewCatalogVideoAction({
        youtubeId: row.youtube_id, revision: row.owner_review_version,
        action, areas, topics, note, screened,
      })
      if (result?.ok) {
        onUpdated(result.record)
        setMessage(action === 'accept' && result.record.discovery_status === 'private_review'
          ? t.pendingChecks : t.saved)
      } else setMessage(t[result?.error] || t.unavailable)
    })
  }

  function checkListing() {
    if (pending) return
    setMessage('')
    startTransition(async () => {
      const result = await verifyCatalogVideoAction({
        youtubeId: row.youtube_id, revision: row.owner_review_version,
      })
      if (result?.ok) {
        onUpdated(result.record)
        setMessage(t.verified)
      } else setMessage(t[result?.error] || t.unavailable)
    })
  }

  const stateLabel = row.editorial_status === 'approved' && checks.embed ? t.player :
    row.discovery_status === 'link_only' && row.owner_review_status === 'accepted' ? t.link : t.private
  return <article className={styles.card} data-review-video-id={row.youtube_id}>
    <div className={styles.poster}>
      {play && watchUrl ? <iframe
        title={row.title} src={'https://www.youtube-nocookie.com/embed/' + row.youtube_id + '?rel=0'}
        loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen /> :
        <img src={'https://i.ytimg.com/vi/' + row.youtube_id + '/hqdefault.jpg'}
          alt="" loading="lazy" width="480" height="270" />}
      {watchUrl && <button className={styles.playButton} type="button"
        onClick={() => setPlay(value => !value)} aria-label={play ? t.close : t.watch}>
        <Film size={17} aria-hidden="true" />{play ? t.close : t.watch}
      </button>}
    </div>

    <div className={styles.body}>
      <div className={styles.meta}>
        <span>{(row.audio_language || '').toUpperCase()}</span>
        <span><Clock3 size={14} aria-hidden="true" />{durationLabel(row.duration_verified_seconds, t)}</span>
        <span className={row.owner_review_status === 'accepted' ? styles.good : ''}>
          {t[row.owner_review_status] || t.pending}</span>
      </div>
      <h3>{row.title}</h3>
      <p className={styles.creator}>{row.creator}</p>
      <div className={styles.links}>
        {watchUrl && <a href={watchUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} aria-hidden="true" />{t.open}</a>}
        {evidence && <a href={evidence} target="_blank" rel="noopener noreferrer">{t.source}</a>}
      </div>

      <div className={styles.checks}>
        <span className={checks.duration ? styles.good : styles.warn}>
          {checks.duration ? <CheckCircle2 size={14}/> : <ShieldAlert size={14}/>}
          {t.duration}: {durationLabel(row.duration_verified_seconds, t)}</span>
        <span className={checks.oembed ? styles.good : styles.warn}>{checks.oembed ? t.verified : t.unchecked}</span>
        <span className={checks.content ? styles.good : styles.warn}>{checks.content ? t.reviewed : t.notReviewed}</span>
        <span className={checks.embed ? styles.good : styles.warn}>{checks.embed ? t.embed : t.noEmbed}</span>
      </div>
      <p className={styles.visibility}><strong>{t.status}: </strong>{stateLabel}</p>

      <fieldset className={styles.categories}>
        <legend>{t.review}</legend>
        <div className={styles.areaGrid}>
          {VIDEO_AREAS.map(area => <label className={areas.includes(area.id) ? styles.activeArea : ''} key={area.id}>
            <input type="checkbox" checked={areas.includes(area.id)} disabled={pending}
              onChange={() => toggleArea(area)}/><span>{area.labels[locale]}</span>
          </label>)}
        </div>
      </fieldset>
      {areas.length > 0 && <fieldset className={styles.topics}>
        <legend>{t.topics}</legend>
        <div className={styles.topicGrid}>
          {VIDEO_AREAS.filter(area => areas.includes(area.id)).flatMap(area => area.topics).map(topic =>
            <label key={topic.id}><input type="checkbox" checked={topics.includes(topic.id)}
              disabled={pending} onChange={() => setTopics(current => current.includes(topic.id)
                ? current.filter(id => id !== topic.id) : [...current, topic.id])}/>
              <span>{topic[locale]}</span></label>)}
        </div>
      </fieldset>}

      <label className={styles.note}>{t.note}
        <textarea rows={2} maxLength={500} disabled={pending} value={note}
          onChange={event => setNote(event.target.value)}/></label>
      <label className={styles.screened}>
        <input type="checkbox" checked={screened} disabled={pending}
          onChange={event => setScreened(event.target.checked)}/><span>{t.screened}</span>
      </label>
      <div className={styles.buttons}>
        <button type="button" onClick={() => submit('accept')} disabled={!canSave} className={styles.accept}>
          <ThumbsUp size={17} aria-hidden="true"/>{t.approve}</button>
        <button type="button" onClick={() => submit('reject')} disabled={pending} className={styles.reject}>
          <ThumbsDown size={17} aria-hidden="true"/>{t.decline}</button>
        <button type="button" onClick={() => submit('save')} disabled={!canSave}>{t.save}</button>
        <button type="button" onClick={checkListing} disabled={pending}>
          <RotateCw size={16} aria-hidden="true"/>{t.check}</button>
      </div>
      <p role="status" aria-live="polite" className={styles.status}>{pending ? t.processing : message}</p>
    </div>
  </article>
}

export function VideoReviewQueue({ initialRows = [], initialLocale = 'en', unavailable = false }) {
  const locale = ['ru', 'en', 'es'].includes(initialLocale) ? initialLocale : 'en'
  const t = copy[locale]
  const [rows, setRows] = useState(initialRows)
  const [state, setState] = useState('pending')
  const [lang, setLang] = useState('all')
  const [visibleCount, setVisibleCount] = useState(8)
  const counts = useMemo(() => ({
    pending: rows.filter(row => row.owner_review_status === 'pending').length,
    accepted: rows.filter(row => row.owner_review_status === 'accepted').length,
    rejected: rows.filter(row => row.owner_review_status === 'rejected').length,
  }), [rows])
  const matching = useMemo(() => rows.filter(row =>
    (state === 'all' || row.owner_review_status === state) &&
    (lang === 'all' || row.audio_language === lang)), [rows, state, lang])
  const onUpdated = record => setRows(current => current.map(row =>
    row.youtube_id === record.youtube_id ? record : row))
  return <section className={styles.shell} data-owner-video-review>
    <header className={styles.heading}>
      <div><h2>{t.title}</h2><p>{t.intro}</p></div>
      <button type="button" onClick={() => window.location.reload()}>
        <RotateCw size={16} aria-hidden="true"/>{t.refresh}</button>
    </header>
    {unavailable && <p role="alert" className={styles.alert}>{t.unavailable}</p>}
    <div className={styles.filters}>
      <div className={styles.tabs} aria-label={t.filter}>
        {['pending', 'accepted', 'rejected', 'all'].map(value => <button key={value}
          aria-pressed={state === value} onClick={() => { setState(value); setVisibleCount(8) }}>
          {t[value]}{value !== 'all' ? ' · ' + counts[value] : ''}</button>)}
      </div>
      <label>{t.language}
        <select value={lang} onChange={event => { setLang(event.target.value); setVisibleCount(8) }}>
          <option value="all">{t.allLanguages}</option>
          <option value="ru">RU</option><option value="en">EN</option><option value="es">ES</option>
        </select>
      </label>
    </div>
    <div className={styles.feed}>
      {matching.slice(0, visibleCount).map(row => <ReviewCard key={row.youtube_id}
        row={row} locale={locale} onUpdated={onUpdated}/>)}
    </div>
    {matching.length === 0 && <p className={styles.empty}>{t.empty}</p>}
    {matching.length > visibleCount && <button className={styles.more} type="button"
      onClick={() => setVisibleCount(v => v + 8)}>{t.loadMore} · {matching.length - visibleCount}</button>}
  </section>
}
