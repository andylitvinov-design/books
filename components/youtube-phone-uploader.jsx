'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import styles from './youtube-phone-uploader.module.css'
import {YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READ_SCOPE, isVideoFile, titleFromFilename, uploadMetadata, videoWatchUrl} from '@/lib/youtube/phone-upload-protocol.mjs'
import {beginUpload, getConnectedChannel, probeUpload, putChunk, readUploadedVisibility} from '@/lib/youtube/browser-upload'

const copy = {
  ru: {
    intro:'Выберите видео из Фотоплёнки. Файл передаётся прямо в YouTube и не сохраняется на сервере Holistic House.',
    configuration:'Загрузка пока не подключена: администратор должен включить YouTube Data API, настроить Google OAuth и подтвердить целевой канал.',
    connecting:'Подключение к Google…',connect:'Подключить мой YouTube',reconnect:'Сменить / переподключить канал',
    connected:'Подключён канал',select:'Выбрать видео с телефона',selected:'Видео для загрузки',empty:'Выберите одно или несколько видео из галереи.',
    description:'Описание ко всем видео',visibility:'Видимость YouTube',unlisted:'Unlisted · доступно по ссылке',private:'Private · только в YouTube',public:'Public · открытая публикация',
    ai:'Есть реалистичные ИИ-изображения или голос (отметить для YouTube)',kids:'Видео предназначено детям',
    publishConfirm:'Подтверждаю, что хочу опубликовать эти видео открыто (Public).',
    start:'Загрузить на YouTube',continue:'Продолжить загрузку',stop:'Приостановить',ready:'Ожидает',sending:'Загружается',done:'Загружено',paused:'Приостановлено',failed:'Не завершено',
    remove:'Убрать',open:'Открыть YouTube',site:'Добавить ссылку на страницу сайта',link:'Ссылка на видео',
    noClient:'Важно: не загружайте персональные консультации, медицинские данные и частные видео клиентов. Даже Unlisted не является приватным хранилищем.',
    stay:'Оставьте эту страницу открытой, а iPhone — разблокированным до окончания передачи. После перезагрузки страницы выбор файлов придётся повторить.',
    default:'Unlisted — по ссылке, без публикации в поиске YouTube.',verified:'Фактический доступ',verifyUnknown:'После завершения проверьте доступ в YouTube Studio.',
    errors:{invalid_file:'Выберите корректный непустой видеофайл.',too_many:'Для одной загрузки можно выбрать не более 10 видео.',wrong_channel:'Выбран другой канал Google. Переподключитесь и выберите нужный аккаунт/канал.',
      channel_ambiguous:'YouTube не смог однозначно определить канал. Выберите канал при подключении Google.',
      youtube_permission:'Недостаточно разрешений Google, API не включён либо токен истёк. Подключите канал повторно.',
      youtube_quota:'YouTube временно ограничил загрузку: проверьте квоту и состояние канала.',
      network_interrupted:'Связь оборвалась. Сохранённую сессию можно проверить и продолжить кнопкой выше.',
      upload_paused:'Передача приостановлена; можно продолжить.',
      session_expired:'Срок входа истёк. Переподключите канал и продолжите, не выбирая файл заново.',
      cors_session_header:'YouTube не вернул адрес продолжения загрузки. Проверьте настройки Google OAuth и CORS.',
      invalid_session:'YouTube вернул неподтверждённый адрес загрузки. Передача остановлена.',
      invalid_range:'YouTube не подтвердил принятые байты. Повторная передача заблокирована для защиты от ошибок.',
      invalid_title:'Название видео должно быть от 1 до 100 символов.',invalid_description:'Описание слишком длинное.',
      google_unavailable:'Не удалось загрузить безопасное окно Google OAuth. Проверьте блокировщики и откройте страницу в Safari.',
      unknown:'Ошибка загрузки. Перед повтором проверьте состояние видео в YouTube Studio.'},
  },
  en: {
    intro:'Choose video files from Photos. Media transfers directly to YouTube without passing through Holistic House storage.',
    configuration:'Uploader is not configured. Enable YouTube Data API, configure Google OAuth, and set the permitted channel.',
    connecting:'Connecting to Google…',connect:'Connect my YouTube',reconnect:'Switch / reconnect channel',
    connected:'Connected channel',select:'Choose videos from phone',selected:'Videos to upload',empty:'Choose one or more videos from Photos.',
    description:'Description for all videos',visibility:'YouTube visibility',unlisted:'Unlisted · anyone with link',private:'Private · YouTube only',public:'Public · discoverable',
    ai:'Includes realistic AI-generated voice or visuals (YouTube disclosure)',kids:'Made for kids',
    publishConfirm:'I confirm these videos should be publicly published on YouTube.',
    start:'Upload to YouTube',continue:'Resume upload',stop:'Pause',ready:'Queued',sending:'Uploading',done:'Uploaded',paused:'Paused',failed:'Incomplete',
    remove:'Remove',open:'Open YouTube',site:'Attach link to site page',link:'Video link',
    noClient:'Important: never upload private consultations, client health information or personal client videos here. Unlisted is not secure private storage.',
    stay:'Keep this page open and your iPhone awake during transfer. If this page reloads, video files must be selected again.',
    default:'Default is Unlisted — not discoverable in YouTube search.',verified:'Actual visibility',verifyUnknown:'Confirm final visibility in YouTube Studio.',
    errors:{invalid_file:'Choose a non-empty video file.',too_many:'Select up to 10 videos per batch.',wrong_channel:'The selected Google account has a different channel. Reconnect and pick the intended channel.',
      channel_ambiguous:'YouTube could not identify one channel. Select your channel in the Google consent flow.',
      youtube_permission:'Google permission missing, API unavailable or token expired. Reconnect the channel.',
      youtube_quota:'YouTube upload quota or account limit reached.',
      network_interrupted:'Connection interrupted. Resume to query the existing YouTube upload session.',
      upload_paused:'Upload paused; you can resume.',
      session_expired:'Google session expired. Reconnect, then resume without selecting the file again.',
      cors_session_header:'YouTube did not expose the session location. Check OAuth/CORS configuration.',
      invalid_session:'YouTube returned an untrusted upload session address. Upload stopped.',
      invalid_range:'YouTube did not confirm received bytes; unsafe automatic retry was blocked.',
      invalid_title:'Video title must be between 1 and 100 characters.', invalid_description:'Description too long.',
      google_unavailable:'Google OAuth could not load. Check browser blockers and use Safari.',
      unknown:'Upload error. Check YouTube Studio before trying again.'},
  },
}

function friendly(error, t) {
  const code = error instanceof Error ? error.message : String(error || '')
  if (t.errors[code]) return t.errors[code]
  if (/^youtube_http_/.test(code)) return t.errors.unknown + ' (' + code + ')'
  return t.errors.unknown
}
const readableSize = n => (n / 1000000).toFixed(1) + ' MB'

export function YoutubePhoneUploader({locale='ru', enabled=false, clientId='', expectedChannelId=''}) {
  const t = copy[locale] || copy.ru
  const oauthClient = useRef(null)
  const token = useRef(null)
  const sessions = useRef(new Map())
  const entriesRef = useRef([])
  const active = useRef(false)
  const abortController = useRef(null)
  const [channel, setChannel] = useState(null)
  const [oauthReady, setOauthReady] = useState(false)
  const [entries, setEntries] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('unlisted')
  const [synthetic, setSynthetic] = useState(false)
  const [madeForKids, setMadeForKids] = useState(false)
  const [confirmedPublic, setConfirmedPublic] = useState(false)

  function alter(changer) {
    const updated = changer(entriesRef.current)
    entriesRef.current = updated
    setEntries(updated)
  }
  function update(id, values) {
    alter(previous => previous.map(item => item.id === id ? {...item, ...values} : item))
  }

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    const initialize = () => {
      if (disposed || !window.google?.accounts?.oauth2) return
      oauthClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: YOUTUBE_UPLOAD_SCOPE + ' ' + YOUTUBE_READ_SCOPE,
        callback: async response => {
          if (disposed) return
          if (!response?.access_token || ![YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READ_SCOPE].every(s => String(response.scope || '').split(' ').includes(s))) {
            setError(t.errors.youtube_permission); return
          }
          try {
            const details = await getConnectedChannel(response.access_token)
            if (disposed) return
            if (details.id !== expectedChannelId) throw new Error('wrong_channel')
            token.current = {value:response.access_token, expiresAt:Date.now() + Math.max(60, Number(response.expires_in || 3600)) * 1000}
            setChannel(details)
            setError('')
          } catch (e) {
            token.current = null
            setChannel(null)
            setError(friendly(e, t))
          }
        },
        error_callback: () => {if (!disposed) setError(t.errors.google_unavailable)},
      })
      setOauthReady(true)
    }
    if (window.google?.accounts?.oauth2) {initialize(); return () => {disposed = true; oauthClient.current = null}}
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    const nonce = document.querySelector('script[nonce]')?.nonce
    if (nonce) script.nonce = nonce
    script.onload = initialize
    script.onerror = () => {if (!disposed) setError(t.errors.google_unavailable)}
    document.head.appendChild(script)
    return () => {disposed = true; oauthClient.current = null; script.remove()}
  }, [enabled, clientId, expectedChannelId, locale])

  function connect() {
    if (active.current) return
    if (!oauthClient.current) {setError(t.errors.google_unavailable); return}
    setError('')
    oauthClient.current.requestAccessToken({prompt:'select_account'})
  }

  function addFiles(event) {
    const chosen = Array.from(event.target.files || [])
    event.target.value = ''
    if (!chosen.length) return
    if (entriesRef.current.length + chosen.length > 10) {setError(t.errors.too_many); return}
    if (chosen.some(file => !isVideoFile(file))) {setError(t.errors.invalid_file); return}
    alter(old => [...old, ...chosen.map((file, index) => ({
      id: String(Date.now()) + '-' + index + '-' + Math.random().toString(36).slice(2),
      file, title:titleFromFilename(file.name), state:'ready', progress:0,
      videoId:null, actualVisibility:null,
    }))])
    setError('')
  }

  async function runUploads() {
    if (!channel || active.current || !entriesRef.current.some(x => x.state !== 'done')) return
    if (visibility === 'public' && !confirmedPublic) return
    active.current = true
    setBusy(true)
    setError('')
    const controller = new AbortController()
    abortController.current = controller
    let currentId = null
    try {
      for (const item of entriesRef.current) {
        if (item.state === 'done') continue
        currentId = item.id
        const auth = token.current
        if (!auth || auth.expiresAt < Date.now() + 30_000) throw new Error('session_expired')
        const metadata = uploadMetadata({title:item.title, description, visibility, synthetic, madeForKids})
        update(item.id, {state:'sending'})
        let session = sessions.current.get(item.id)
        const previousSession = Boolean(session)
        if (!session) {
          session = await beginUpload(item.file, auth.value, metadata, controller.signal)
          sessions.current.set(item.id, session)
        }
        let offset = 0
        if (previousSession) {
          const found = await probeUpload(session, auth.value, item.file.size, controller.signal)
          if (found.done) {
            const actual = await readUploadedVisibility(found.videoId, auth.value, controller.signal)
            update(item.id, {state:'done', progress:100, videoId:found.videoId, actualVisibility:actual})
            continue
          }
          offset = found.offset
        }
        while (offset < item.file.size) {
          if (auth.expiresAt < Date.now() + 30_000) throw new Error('session_expired')
          const result = await putChunk(session, auth.value, item.file, offset, controller.signal, bytes => {
            update(item.id, {progress:Math.min(99, Math.floor(bytes / item.file.size * 100))})
          })
          if (result.done) {
            const actual = await readUploadedVisibility(result.videoId, auth.value, controller.signal)
            update(item.id, {state:'done', progress:100, videoId:result.videoId, actualVisibility:actual})
            break
          }
          offset = result.offset
          update(item.id, {progress:Math.floor(offset / item.file.size * 100)})
        }
        if (entriesRef.current.find(x => x.id === item.id)?.state !== 'done') throw new Error('network_interrupted')
      }
    } catch (e) {
      const message = friendly(e, t)
      if (currentId) update(currentId, {state:controller.signal.aborted ? 'paused' : 'failed'})
      setError(message)
    } finally {
      active.current = false
      setBusy(false)
      abortController.current = null
    }
  }

  const toUpload = entries.some(item => item.state !== 'done')
  const canStart = enabled && channel && toUpload && !busy && (visibility !== 'public' || confirmedPublic)
  return (
    <section className={styles.uploader}>
      <div className={styles.lead}>
        <div className={styles.icon} aria-hidden="true">▶</div>
        <div><h2>Phone → YouTube</h2><p>{t.intro}</p></div>
      </div>
      <div className={styles.warning} role="note">{t.noClient}</div>
      {!enabled ? <div className={styles.unavailable} role="status">{t.configuration}</div> : (
        <div className={styles.connect}>
          <button type="button" className={styles.secondary} disabled={!oauthReady || busy} onClick={connect}>
            {channel ? t.reconnect : oauthReady ? t.connect : t.connecting}
          </button>
          {channel && <span className={styles.channel}>✓ {t.connected}: <strong>{channel.name}</strong></span>}
        </div>
      )}
      <div className={styles.form}>
        <label className={styles.picker}>
          <span>＋ {t.select}</span>
          <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple disabled={busy || !enabled} onChange={addFiles}/>
        </label>
        <div className={styles.files} aria-label={t.selected}>
          <h3>{t.selected} ({entries.length})</h3>
          {!entries.length && <p className={styles.muted}>{t.empty}</p>}
          {entries.map(item => (
            <div className={styles.file} key={item.id}>
              <div className={styles.filehead}>
                <span className={styles.filename}>{item.file.name} · {readableSize(item.file.size)}</span>
                {item.state !== 'done' && !busy && <button className={styles.remove} type="button" onClick={() => {
                  sessions.current.delete(item.id)
                  alter(old => old.filter(x => x.id !== item.id))
                }}>{t.remove}</button>}
              </div>
              <label className={styles.field}><span>{locale === 'en' ? 'Title' : 'Название'}</span><input value={item.title} maxLength={100} disabled={busy || item.state === 'done' || sessions.current.has(item.id)} onChange={e => update(item.id,{title:e.target.value})}/></label>
              <div className={styles.progressLine}><span>{t[item.state] || t.ready}</span><strong>{item.progress}%</strong></div>
              <progress max="100" value={item.progress} aria-label={item.file.name}/>
              {item.videoId && <div className={styles.result}><a target="_blank" rel="noreferrer" href={videoWatchUrl(item.videoId)}>{t.open} ↗</a><span>{t.verified}: {item.actualVisibility || t.verifyUnknown}</span></div>}
            </div>
          ))}
        </div>
        <label className={styles.field}><span>{t.description}</span><textarea rows={2} maxLength={5000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)}/></label>
        <label className={styles.field}><span>{t.visibility}</span>
          <select value={visibility} disabled={busy || entries.some(x => sessions.current.has(x.id) && x.state !== 'done')} onChange={e => {setVisibility(e.target.value); setConfirmedPublic(false)}}>
            <option value="unlisted">{t.unlisted}</option><option value="private">{t.private}</option><option value="public">{t.public}</option>
          </select>
        </label>
        <p className={styles.muted}>{t.default}</p>
        <label className={styles.check}><input type="checkbox" checked={synthetic} disabled={busy} onChange={e => setSynthetic(e.target.checked)}/>{t.ai}</label>
        <label className={styles.check}><input type="checkbox" checked={madeForKids} disabled={busy} onChange={e => setMadeForKids(e.target.checked)}/>{t.kids}</label>
        {visibility === 'public' && <label className={styles.publicConfirm}><input type="checkbox" checked={confirmedPublic} disabled={busy} onChange={e => setConfirmedPublic(e.target.checked)}/>{t.publishConfirm}</label>}
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={!canStart} onClick={runUploads}>
            {entries.some(x => ['paused','failed'].includes(x.state)) ? t.continue : t.start}
          </button>
          {busy && <button className={styles.secondary} type="button" onClick={() => abortController.current?.abort()}>{t.stop}</button>}
          {entries.some(x => x.state === 'done') && <Link className={styles.siteLink} href="/admin/videos">{t.site} ↗</Link>}
        </div>
        <p className={styles.muted}>{t.stay}</p>
      </div>
    </section>
  )
}
