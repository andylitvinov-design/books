'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  REIKI_INTRO_MAX_BYTES, REIKI_INTRO_MIME, reikiIntroMime,
  reikiIntroPublicUrl, reikiIntroSlot,
} from '@/lib/academy/reiki-intro-audio-model'
import styles from './admin-reiki-audio.module.css'

const lessons = [
  { id: 'flight', en: 'Flight to the Sun', ru: 'Полёт к Солнцу' },
  { id: 'tantra', en: 'Tantra Reiki', ru: 'Тантра Рейки' },
  { id: 'kundalini', en: 'Kundalini Reiki', ru: 'Кундалини Рейки' },
  { id: 'yggdrasil', en: 'Reiki Yggdrasil', ru: 'Рейки Иггдрасиль' },
]
const messages = {
  ru: {
    intro: 'Запишите короткое аудиообъяснение к началу урока. Отдельно выберите язык: русская и английская версии независимы. Загрузка не публикует файл автоматически.',
    steps: 'Выберите запись → прослушайте → загрузите → опубликуйте',
    language: 'Язык аудио',
    published: 'Опубликовано для учеников',
    empty: 'Пока нет опубликованной записи',
    choose: 'Выберите файл презентации',
    upload: 'Загрузить аудио',
    loading: 'Загрузка файла…',
    publish: 'Опубликовать для учеников',
    publishing: 'Публикация…',
    uploaded: 'Загружено, но ещё НЕ опубликовано. Прослушайте и подтвердите.',
    unpublish: 'Снять с публикации',
    unpublishing: 'Снимаем с публикации…',
    confirmUnpublish: 'Убрать эту аудиопрезентацию из курса? Исходный файл сохранится в хранилище.',
    publishedDone: 'Аудиовведение опубликовано. В курсе появится при следующей загрузке страницы (кеш до минуты).',
    removed: 'Запись больше не показывается ученикам.',
    unavailable: 'Хранилище аудио пока недоступно. Проверьте настройки кабинета.',
    failed: 'Не удалось завершить действие. Проверьте файл, авторизацию или подключение хранилища.',
    invalid: 'Поддерживаются MP3, M4A и WAV, от 512 байт до 20 МБ.',
    inspect: 'Прослушать выбранный файл',
    review: 'Прослушать опубликованное',
    fileInfo: 'Рекомендуется короткая запись до 1–2 минут. Максимум 20 МБ. Автозапуска у учеников не будет.',
    viewCourse: 'Посмотреть курс',
    reload: 'Обновить список',
  },
  en: {
    intro: 'Record a short spoken introduction before each lesson meditation. English and Russian files are separate. Uploading never publishes a file automatically.',
    steps: 'Choose recording → listen → upload → publish',
    language: 'Audio language',
    published: 'Published for learners',
    empty: 'No recording published yet',
    choose: 'Select your presentation audio',
    upload: 'Upload audio',
    loading: 'Uploading recording…',
    publish: 'Publish to learners',
    publishing: 'Publishing…',
    uploaded: 'Uploaded but NOT published. Listen, then confirm.',
    unpublish: 'Unpublish',
    unpublishing: 'Unpublishing…',
    confirmUnpublish: 'Remove this audio introduction from the course? The original file remains stored.',
    publishedDone: 'Audio published. It appears on the course slide after the cache refresh (up to a minute).',
    removed: 'The recording is no longer shown to learners.',
    unavailable: 'Audio storage is not available. Check cabinet storage settings.',
    failed: 'Unable to finish this action. Check the file, sign-in or storage connection.',
    invalid: 'Use MP3, M4A or WAV, between 512 bytes and 20 MB.',
    inspect: 'Preview selected file',
    review: 'Listen to published audio',
    fileInfo: 'A concise 1–2 minute recording works well. Maximum 20 MB. Playback never starts automatically.',
    viewCourse: 'Open the course',
    reload: 'Refresh audio list',
  },
}

async function ownerRequest(body) {
  const response = await fetch('/admin/reiki-audio/data', {
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) throw new Error('OWNER_AUDIO_UNAVAILABLE')
  return response.json()
}

function LessonAudioCard({ lesson, locale, origin, current, onPublished, copy }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [staged, setStaged] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const publishedUrl = reikiIntroPublicUrl(origin, current, lesson.id, locale)
  const select = event => {
    const next = event.target.files?.[0] || null
    setError(''); setNotice(''); setStaged(null)
    if (!next) { setFile(null); return }
    if (!reikiIntroMime(next.type, next.name) ||
        next.size < 512 || next.size > REIKI_INTRO_MAX_BYTES) {
      setFile(null); setError(copy.invalid); return
    }
    setFile(next)
  }
  async function upload() {
    if (!file || busy) return
    setBusy('upload'); setError(''); setNotice('')
    try {
      const mime = reikiIntroMime(file.type, file.name)
      const response = await ownerRequest({
        action: 'prepare', lesson: lesson.id, locale, filename: file.name,
        mime, bytes: file.size,
      })
      const intent = response.intent
      if (!intent || intent.lesson !== lesson.id || intent.locale !== locale ||
          intent.bytes !== file.size || !intent.token || !intent.publishableKey)
        throw new Error('INVALID_INTENT')
      const client = createClient(intent.supabaseUrl, intent.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { error: uploadError } = await client.storage.from(intent.bucket)
        .uploadToSignedUrl(intent.path, intent.token, file, {
          contentType: intent.mime, upsert: false,
        })
      if (uploadError) throw uploadError
      setStaged({ path: intent.path, fileName: file.name })
      setNotice(copy.uploaded)
    } catch {
      setError(copy.failed)
    } finally { setBusy('') }
  }
  async function publish() {
    if (!staged || busy) return
    setBusy('publish'); setError(''); setNotice('')
    try {
      await ownerRequest({ action: 'publish', lesson: lesson.id, locale, path: staged.path })
      await onPublished()
      setStaged(null)
      setFile(null)
      setNotice(copy.publishedDone)
    } catch {
      setError(copy.failed)
    } finally { setBusy('') }
  }
  async function unpublish() {
    if (!current || busy || !window.confirm(copy.confirmUnpublish)) return
    setBusy('unpublish'); setError(''); setNotice('')
    try {
      await ownerRequest({ action: 'unpublish', lesson: lesson.id, locale, confirmed: true })
      await onPublished()
      setNotice(copy.removed)
    } catch {
      setError(copy.failed)
    } finally { setBusy('') }
  }

  return <section className={styles.lessonCard} data-reiki-audio-lesson={lesson.id}>
    <header className={styles.lessonHead}>
      <h2>{lesson[locale]}</h2>
      <span className={current ? styles.live : styles.notLive}>{current ? copy.published : copy.empty}</span>
    </header>
    {publishedUrl ? <div className={styles.player}>
      <span>{copy.review}</span>
      <audio controls preload="none" src={publishedUrl} aria-label={copy.review + ' — ' + lesson[locale]} />
    </div> : null}
    <label className={styles.filePicker}>
      <span>{copy.choose}</span>
      <input type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
        onChange={select} disabled={!!busy} />
    </label>
    {preview ? <div className={styles.player}>
      <span>{copy.inspect} · {file.name}</span>
      <audio controls preload="none" src={preview} aria-label={copy.inspect + ' — ' + lesson[locale]} />
    </div> : null}
    <div className={styles.actions}>
      <button type="button" disabled={!file || !!busy || !!staged} onClick={upload}>
        {busy === 'upload' ? copy.loading : copy.upload}
      </button>
      {staged ? <button type="button" className={styles.publish}
        onClick={publish} disabled={!!busy}>
        {busy === 'publish' ? copy.publishing : copy.publish}
      </button> : null}
      {current ? <button type="button" className={styles.unpublish}
        onClick={unpublish} disabled={!!busy}>
        {busy === 'unpublish' ? copy.unpublishing : copy.unpublish}
      </button> : null}
    </div>
    {staged ? <p className={styles.pending}>{copy.uploaded}</p> : null}
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>
}

export default function AdminReikiAudio({ initialLocale = 'ru' }) {
  const [locale, setLocale] = useState(initialLocale)
  const [manifest, setManifest] = useState({ version: 1, slots: {} })
  const [origin, setOrigin] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const copy = messages[locale]

  async function refresh() {
    try {
      const response = await ownerRequest()
      setManifest(response.manifest || { version: 1, slots: {} })
      setOrigin(response.storageOrigin || '')
      setReady(response.configured === true)
      setError('')
    } catch {
      setReady(false)
      setError(messages[locale].unavailable)
      throw new Error('OWNER_AUDIO_UNAVAILABLE')
    }
  }
  useEffect(() => {
    void refresh().catch(() => {}).finally(() => setLoading(false))
    // Load once per authenticated visit; upload/publish refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div className={styles.page} data-reiki-intro-audio-manager>
    <div className={styles.intro}>
      <p>{copy.intro}</p>
      <strong>{copy.steps}</strong>
      <p>{copy.fileInfo}</p>
      <div className={styles.localeLine}>
        <span>{copy.language}</span>
        <div className={styles.localeToggle} role="group" aria-label={copy.language}>
          <button type="button" aria-pressed={locale === 'ru'} onClick={() => setLocale('ru')}>Русский</button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
        </div>
        <a href={'/' + locale + '/academy/principles-of-energywork/learn'} target="_blank" rel="noopener noreferrer">{copy.viewCourse} ↗</a>
        <button type="button" onClick={() => void refresh().catch(() => {})} disabled={loading}>{copy.reload}</button>
      </div>
    </div>
    {loading ? <p role="status">{locale === 'ru' ? 'Проверяем хранилище…' : 'Checking storage…'}</p>
      : !ready ? <p role="alert" className={styles.error}>{error || copy.unavailable}</p>
        : <div className={styles.cards}>
          {lessons.map(lesson => <LessonAudioCard key={lesson.id + ':' + locale}
            lesson={lesson} locale={locale} origin={origin}
            current={manifest.slots?.[reikiIntroSlot(lesson.id, locale)] || null}
            copy={copy} onPublished={refresh} />)}
        </div>}
  </div>
}
