'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import styles from './youtube-phone-uploader.module.css'
import {YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READ_SCOPE, isVideoFile, titleFromFilename, uploadMetadata, videoWatchUrl} from '@/lib/youtube/phone-upload-protocol.mjs'
import {beginUpload, getConnectedChannel, probeUpload, putChunk, readUploadedVisibility} from '@/lib/youtube/browser-upload'
import {getYoutubeUploadStateAction, pairEnglishYoutubeChannelAction, saveYoutubeUploadHistoryAction} from '@/app/admin/youtube-upload/actions'

const copy = {
  ru: {
    intro:'Выберите русский или английский канал, затем добавьте видео с iPhone. Файлы передаются прямо в YouTube — без хранения MP4 на сервере.',
    noClient:'Не используйте YouTube для частных клиентских консультаций или видео с персональными медицинскими данными. Unlisted доступен каждому, у кого есть ссылка.',
    config:'Google OAuth ещё не настроен. Загрузка безопасно отключена до подключения YouTube Data API и веб-клиента Google.',
    historyUnavailable:'Хранилище истории временно недоступно. Загрузка отключена, чтобы не потерять ссылки на готовые видео.',
    target:'Куда загрузить?', ru:'Русский YouTube', en:'English YouTube',
    connect:'Выбрать Google / YouTube-аккаунт', reconnect:'Сменить YouTube-аккаунт',
    signing:'Ожидаем разрешения Google…', connected:'Подключён канал', expected:'Выбранное назначение',
    incorrect:'Это другой YouTube-канал. Выберите нужный канал в окне Google и повторите подключение.',
    noEnglish:'Английский канал пока не привязан. Подключите его один раз и подтвердите найденный Google-канал.',
    pairTitle:'Подтвердить English YouTube', pair:'Запомнить этот английский канал',
    pairCheck:'Подтверждаю, что это мой английский YouTube-канал и хочу использовать его для будущих загрузок.',
    channelSaved:'Английский канал сохранён. Теперь его можно выбирать в загрузчике.',
    select:'Выбрать видео с телефона', selected:'Очередь видео', empty:'Видео пока не выбраны.',
    title:'Название', description:'Описание (для выбранных файлов)', unlisted:'Видимость: Unlisted — только по ссылке',
    ai:'В видео присутствует реалистичный ИИ-аватар или синтезированный голос',
    kids:'Видео предназначено детям',
    start:'Загрузить на YouTube', resume:'Продолжить', pause:'Приостановить',
    waiting:'Ожидает', sending:'Загружается', done:'Загружено', failed:'Ошибка', paused:'Приостановлено',
    remove:'Убрать', copy:'Скопировать ссылку', copied:'Скопировано ✓', open:'Открыть YouTube',
    back:'Видео сайта', history:'История загруженных видео', refresh:'Обновить историю', historyEmpty:'Здесь будут ссылки на видео, загруженные через это приложение.',
    all:'Все', historySaved:'Сохранено', historyError:'YouTube загрузил видео, но сохранение ссылки не завершилось. Скопируйте ссылку и повторите сохранение.',
    retrySave:'Повторить сохранение ссылки',
    channelUnlisted:'YouTube подтвердил Unlisted', channelPrivate:'YouTube вернул Private. Ролик может быть недоступен по ссылке — проверьте в Studio.',
    channelPublic:'YouTube вернул Public! Срочно проверьте доступ в Studio.', channelUnknown:'Проверьте фактическую видимость в YouTube Studio.',
    stay:'Оставляйте Safari открытым, а экран активным до завершения передачи. После обновления страницы файлы придётся выбрать заново.',
    more:'Для нового канала сначала завершите или уберите незаконченные файлы из очереди.',
    errors:{
      google_unavailable:'Не удалось открыть Google OAuth. Попробуйте Safari без блокировщиков.',
      youtube_permission:'Разрешения Google отсутствуют или срок входа истёк. Переподключите YouTube.',
      youtube_quota:'Лимит загрузок YouTube исчерпан или действует ограничение канала.',
      wrong_channel:'Авторизован другой канал. Выберите правильный YouTube в окне Google.',
      channel_ambiguous:'Google не смог определить один канал. Выберите нужный YouTube-канал.',
      history_unavailable:'Хранилище ссылок недоступно. Повторите сохранение позже.',
      channel_conflict:'Английский канал уже привязан к другому ID. Загрузка остановлена для защиты.',
      invalid_channel:'Неверный канал YouTube.',
      invalid_file:'Выберите видеофайл ненулевого размера.',
      too_many:'За один раз можно выбрать не более 10 видео.',
      invalid_title:'Название видео должно быть от 1 до 100 символов.',
      invalid_description:'Описание слишком длинное.',
      session_expired:'Google OAuth истёк. Снова подключитесь и нажмите «Продолжить».',
      upload_paused:'Загрузка приостановлена. Её можно продолжить.',
      network_interrupted:'Передача прервалась. Продолжение проверит уже принятую YouTube часть.',
      cors_session_header:'YouTube не выдал доступный адрес сессии. Проверьте Google OAuth и CORS.',
      invalid_session:'Небезопасный адрес сессии загрузки: передача остановлена.',
      invalid_range:'YouTube не подтвердил байты. Повтор без сверки запрещён.',
      unauthorized:'Сессия администратора закончилась. Войдите повторно.',
      unknown:'Ошибка. Проверьте YouTube Studio, прежде чем загружать повторно.',
    },
  },
  en: {
    intro:'Choose the Russian or English YouTube channel, then select videos from your phone. Files go straight to YouTube without Holistic House MP4 storage.',
    noClient:'Do not upload private client consultations or personal health information. Anyone with the link can view an Unlisted video.',
    config:'Google OAuth is not yet configured. Uploads remain safely disabled until the YouTube API and Google web client are connected.',
    historyUnavailable:'Your saved-link archive is unavailable. Uploads are disabled to prevent lost video links.',
    target:'Upload to which channel?', ru:'Russian YouTube', en:'English YouTube',
    connect:'Choose Google / YouTube account', reconnect:'Switch YouTube account',
    signing:'Awaiting Google permission…', connected:'Connected channel', expected:'Selected destination',
    incorrect:'That is a different YouTube channel. Choose the intended channel in Google and reconnect.',
    noEnglish:'English YouTube is not paired yet. Sign in to it once and confirm the channel details.',
    pairTitle:'Confirm English YouTube', pair:'Remember this English channel',
    pairCheck:'I confirm that this is my English YouTube channel and want to use it for future uploads.',
    channelSaved:'English YouTube channel saved. It can now be selected for future uploads.',
    select:'Choose videos from phone', selected:'Upload queue', empty:'No videos selected.',
    title:'Video title', description:'Description (selected files)', unlisted:'Visibility: Unlisted — link only',
    ai:'Video includes a realistic AI avatar or synthetic voice',
    kids:'Video is made for kids',
    start:'Upload to YouTube', resume:'Resume upload', pause:'Pause',
    waiting:'Queued', sending:'Uploading', done:'Uploaded', failed:'Incomplete', paused:'Paused',
    remove:'Remove', copy:'Copy link', copied:'Copied ✓', open:'Open YouTube',
    back:'Website videos', history:'Uploaded video links', refresh:'Refresh history', historyEmpty:'Videos uploaded through this app will appear here.',
    all:'All', historySaved:'Saved', historyError:'YouTube uploaded the video but the link was not archived. Copy it and retry saving.',
    retrySave:'Retry saving the link',
    channelUnlisted:'YouTube confirmed Unlisted', channelPrivate:'YouTube returned Private. The link may not work for viewers. Check Studio.',
    channelPublic:'YouTube returned Public! Review this immediately in Studio.', channelUnknown:'Verify actual visibility in YouTube Studio.',
    stay:'Keep Safari open and the phone awake until transfer finishes. A page reload requires choosing the files again.',
    more:'Finish or remove incomplete uploads before changing channels.',
    errors:{
      google_unavailable:'Google OAuth failed to open. Try Safari without blockers.',
      youtube_permission:'Missing Google permissions or expired sign-in. Reconnect YouTube.',
      youtube_quota:'YouTube upload quota or channel limit reached.',
      wrong_channel:'The wrong channel is authorized. Select the intended YouTube channel in Google.',
      channel_ambiguous:'Google could not resolve a single channel. Select the desired YouTube channel.',
      history_unavailable:'The saved link archive is unavailable. Retry after it recovers.',
      channel_conflict:'English channel is already paired to another ID. Upload is blocked.',
      invalid_channel:'Invalid YouTube channel.',
      invalid_file:'Choose a non-empty video file.',
      too_many:'You can select at most 10 videos in a batch.',
      invalid_title:'Video title must be 1 to 100 characters.',
      invalid_description:'Description is too long.',
      session_expired:'Google authorization expired. Reconnect and select Resume.',
      upload_paused:'Upload paused; it can be resumed.',
      network_interrupted:'Connection interrupted. Resume will check which bytes YouTube received.',
      cors_session_header:'YouTube did not expose the upload session URL. Check OAuth and CORS.',
      invalid_session:'YouTube returned an unsafe session URL. Upload stopped.',
      invalid_range:'YouTube did not confirm bytes; an unsafe retry was blocked.',
      unauthorized:'Your admin session expired. Please sign in again.',
      unknown:'Error. Check YouTube Studio before attempting another upload.',
    },
  },
}
const filesize = size => (size / 1000000).toFixed(1) + ' MB'
function humanError(value, t) {
  const key = typeof value === 'string' ? value : value instanceof Error ? value.message : ''
  return t.errors[key] || t.errors.unknown
}
function visibilityText(value, t) {
  return value === 'unlisted' ? t.channelUnlisted
    : value === 'private' ? t.channelPrivate
    : value === 'public' ? t.channelPublic : t.channelUnknown
}
function mergeHistory(old, record) {
  return [record, ...old.filter(item => item.videoId !== record.videoId)]
    .sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0,200)
}
export function YoutubePhoneUploader({locale='ru', enabled=false, clientId='', initialChannels,
  initialHistory=[], historyReady=false}) {
  const t = copy[locale] || copy.ru
  const [target, setTarget] = useState('ru')
  const [channels, setChannels] = useState(initialChannels || {ru:null,en:null})
  const [connected, setConnected] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [pairConfirmed, setPairConfirmed] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [entries, setEntries] = useState([])
  const [description, setDescription] = useState('')
  const [synthetic, setSynthetic] = useState(true)
  const [madeForKids, setMadeForKids] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pairBusy, setPairBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState(initialHistory)
  const [historyStatus, setHistoryStatus] = useState(Boolean(historyReady))
  const [historyFilter, setHistoryFilter] = useState('all')
  const [copiedId, setCopiedId] = useState('')
  const oauthClient = useRef(null)
  const authToken = useRef(null)
  // Separate volatile credentials for each owner-authorized channel; never persist OAuth tokens.
  const authorizedChannels = useRef(new Map())
  const pendingTarget = useRef(null)
  const targetRef = useRef(target)
  const channelsRef = useRef(channels)
  const entriesRef = useRef(entries)
  const sessions = useRef(new Map())
  const active = useRef(false)
  const abortRef = useRef(null)
  targetRef.current = target
  channelsRef.current = channels

  function alter(change) {
    const updated = change(entriesRef.current)
    entriesRef.current = updated
    setEntries(updated)
  }
  function update(id, partial) {
    alter(all => all.map(item => item.id === id ? {...item,...partial} : item))
  }
  function copyLink(id) {
    const link = videoWatchUrl(id)
    const manualCopy = () => {
      // Useful for restrictive iOS webviews where the Clipboard API is unavailable.
      window.prompt(locale === 'ru' ? 'Скопируйте ссылку:' : 'Copy video link:', link)
    }
    if (!navigator.clipboard?.writeText) {manualCopy(); return}
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id)
      setError('')
    }).catch(manualCopy)
  }

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const init = () => {
      if (!alive || !window.google?.accounts?.oauth2) return
      oauthClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id:clientId,
        scope:YOUTUBE_UPLOAD_SCOPE + ' ' + YOUTUBE_READ_SCOPE,
        callback:async response => {
          if (!alive) return
          setAuthPending(false)
          const requested = pendingTarget.current
          pendingTarget.current = null
          if (!requested || requested !== targetRef.current) return
          if (!response?.access_token || ![YOUTUBE_UPLOAD_SCOPE,YOUTUBE_READ_SCOPE].every(
            scope => String(response.scope || '').split(' ').includes(scope)
          )) {setError(t.errors.youtube_permission); return}
          try {
            const details = await getConnectedChannel(response.access_token)
            if (!alive || requested !== targetRef.current) return
            const expectedId = channelsRef.current[requested]?.id
            const token = {value:response.access_token,
              expiresAt:Date.now() + Math.max(60,Number(response.expires_in || 3600)) * 1000}
            if (expectedId && details.id !== expectedId) throw new Error('wrong_channel')
            authToken.current = token
            if (!expectedId && requested === 'en') {
              setCandidate(details)
              setPairConfirmed(false)
              setConnected(null)
            } else {
              setCandidate(null)
              authorizedChannels.current.set(requested,{details,token})
              setConnected({...details,target:requested})
            }
            setError('')
          } catch (reason) {
            authToken.current = null
            setConnected(null)
            setCandidate(null)
            setError(humanError(reason,t))
          }
        },
        error_callback:() => {
          if (!alive) return
          setAuthPending(false)
          pendingTarget.current = null
          setError(t.errors.google_unavailable)
        },
      })
      setAuthReady(true)
    }
    if (window.google?.accounts?.oauth2) {init(); return () => {alive=false;oauthClient.current=null}}
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    const nonce = document.querySelector('script[nonce]')?.nonce
    if (nonce) script.nonce = nonce
    script.onload = init
    script.onerror = () => {if (alive) setError(t.errors.google_unavailable)}
    document.head.appendChild(script)
    return () => {alive=false;oauthClient.current=null;script.remove()}
  }, [enabled,clientId,locale])

  function chooseTarget(next) {
    if (busy || authPending || entriesRef.current.some(item => item.state !== 'done' && sessions.current.has(item.id))) {
      setError(t.more);return
    }
    if (next === target) return
    setTarget(next)
    setError('')
    setMessage('')
    setCandidate(null)
    setPairConfirmed(false)
    const cached = authorizedChannels.current.get(next)
    if (cached?.details.id === channels[next]?.id && cached.token.expiresAt > Date.now() + 30_000) {
      authToken.current = cached.token
      setConnected({...cached.details,target:next})
    } else if (connected && channels[next]?.id && connected.id === channels[next].id
      && authToken.current?.expiresAt > Date.now() + 30_000) {
      authorizedChannels.current.set(next,{details:connected,token:authToken.current})
      setConnected({...connected,target:next})
    } else {
      authToken.current = null
      setConnected(null)
    }
  }
  function connect() {
    if (!oauthClient.current || busy || authPending) {setError(t.errors.google_unavailable);return}
    setAuthPending(true)
    pendingTarget.current = target
    setError('')
    setMessage('')
    setCandidate(null)
    setConnected(null)
    authToken.current = null
    authorizedChannels.current.delete(target)
    oauthClient.current.requestAccessToken({prompt:'select_account'})
  }
  async function pairEnglish() {
    if (pairBusy || target !== 'en' || !candidate || !pairConfirmed || !historyStatus) return
    setPairBusy(true)
    try {
      const result = await pairEnglishYoutubeChannelAction({...candidate,confirmed:true})
      if (!result.ok) throw new Error(result.error)
      setChannels(previous => ({...previous,en:result.channel}))
      authorizedChannels.current.set('en',{details:candidate,token:authToken.current})
      setConnected({...candidate,target:'en'})
      setCandidate(null)
      setPairConfirmed(false)
      setMessage(t.channelSaved)
      setError('')
    } catch (reason) {setError(humanError(reason,t))}
    finally {setPairBusy(false)}
  }
  function addFiles(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return
    const unfinished = entriesRef.current.filter(item => item.state !== 'done')
    if (unfinished.length + files.length > 10) {setError(t.errors.too_many);return}
    if (files.some(file => !isVideoFile(file))) {setError(t.errors.invalid_file);return}
    const suffix = String(Date.now()) + '-' + Math.random().toString(36).slice(2)
    alter(old => [...old.filter(item => item.state !== 'done'),...files.map((file,index) => ({
      id:suffix+'-'+index, file, title:titleFromFilename(file.name),
      target, state:'waiting', progress:0, videoId:null, privacyStatus:'unknown', saved:false,
    }))])
    setError('')
    setMessage('')
  }
  async function saveLink(entryId, videoId, privacyStatus, title, targetKey, channelId) {
    try {
      const result = await saveYoutubeUploadHistoryAction({
        videoId,title,target:targetKey,channelId,privacyStatus:privacyStatus || 'unknown',
        requestedVisibility:'unlisted',
      })
      if (!result.ok) throw new Error(result.error)
      setHistory(old => mergeHistory(old,result.record))
      update(entryId,{saved:true,saveError:false})
      setHistoryStatus(true)
      return true
    } catch {
      update(entryId,{saved:false,saveError:true})
      // Fail closed: never start another YouTube upload while durable link saving is broken.
      setHistoryStatus(false)
      setError(t.historyError)
      return false
    }
  }
  async function finish(entry, resultId, auth, channelId) {
    const actual = await readUploadedVisibility(resultId,auth.value)
    update(entry.id,{state:'done', progress:100, videoId:resultId, privacyStatus:actual || 'unknown',saved:false})
    await saveLink(entry.id,resultId,actual,entry.title,entry.target,channelId)
  }
  async function runUploads() {
    const desired = channels[target]
    if (!enabled || !historyStatus || !desired?.id || !connected ||
      connected.target !== target || connected.id !== desired.id || active.current) return
    const remaining = entriesRef.current.filter(item => item.state !== 'done')
    if (!remaining.length || remaining.some(item => item.target !== target)) return
    if (!authToken.current || authToken.current.expiresAt < Date.now() + 30_000) {
      setError(t.errors.session_expired);return
    }
    active.current = true
    setBusy(true)
    setError('')
    setMessage('')
    const controller = new AbortController()
    abortRef.current = controller
    let currentId = null
    try {
      for (const entry of remaining) {
        currentId = entry.id
        const auth = authToken.current
        if (!auth || auth.expiresAt < Date.now() + 30_000) throw new Error('session_expired')
        if (!connected || connected.id !== desired.id || entry.target !== targetRef.current) throw new Error('wrong_channel')
        const metadata = uploadMetadata({title:entry.title,description,visibility:'unlisted',language:target,synthetic,madeForKids})
        update(entry.id,{state:'sending'})
        let session = sessions.current.get(entry.id)
        const previousSession = Boolean(session)
        if (!session) {
          session = await beginUpload(entry.file,auth.value,metadata,controller.signal)
          sessions.current.set(entry.id,session)
        }
        let offset = 0
        if (previousSession) {
          const status = await probeUpload(session,auth.value,entry.file.size,controller.signal)
          if (status.done) {
            await finish(entry,status.videoId,auth,desired.id)
            continue
          }
          offset = status.offset
        }
        let completed = false
        while (offset < entry.file.size) {
          if (auth.expiresAt < Date.now() + 30_000) throw new Error('session_expired')
          const step = await putChunk(session,auth.value,entry.file,offset,controller.signal,bytes => {
            update(entry.id,{progress:Math.min(99,Math.floor(bytes / entry.file.size * 100))})
          })
          if (step.done) {
            await finish(entry,step.videoId,auth,desired.id)
            completed = true
            break
          }
          offset = step.offset
          update(entry.id,{progress:Math.floor(offset / entry.file.size * 100)})
        }
        if (!completed) throw new Error('network_interrupted')
      }
    } catch (reason) {
      if (currentId && entriesRef.current.find(item => item.id === currentId)?.state !== 'done') {
        update(currentId,{state:controller.signal.aborted ? 'paused':'failed'})
      }
      setError(humanError(reason,t))
    } finally {
      active.current = false
      setBusy(false)
      abortRef.current = null
    }
  }
  async function refreshHistory() {
    const result = await getYoutubeUploadStateAction()
    if (!result.ok) {setError(humanError(result.error,t));setHistoryStatus(false);return}
    setHistory(result.history)
    setChannels(result.channels)
    setHistoryStatus(true)
    setError('')
  }

  const configured = Boolean(enabled && authReady)
  const selectedConfig = channels[target]
  const connectedCorrectly = Boolean(connected?.id && connected?.id === selectedConfig?.id && connected.target === target)
  const pending = entries.filter(item => item.state !== 'done')
  const canUpload = Boolean(enabled && historyStatus && connectedCorrectly && !busy && !authPending && pending.length &&
    pending.every(item => item.target === target))
  const filteredHistory = historyFilter === 'all' ? history : history.filter(item => item.target === historyFilter)
  return (
    <section className={styles.uploader} aria-label="Holistic House YouTube uploader">
      <div className={styles.lead}>
        <div className={styles.icon} aria-hidden="true">▶</div>
        <div><h2>Phone → YouTube</h2><p>{t.intro}</p></div>
      </div>
      <p className={styles.warning}>{t.noClient}</p>
      {!enabled && <p className={styles.unavailable} role="status">{t.config}</p>}
      {!historyStatus && <p className={styles.unavailable} role="status">{t.historyUnavailable}</p>}
      <fieldset className={styles.targetSelector} disabled={busy || authPending || pairBusy}>
        <legend>{t.target}</legend>
        <div className={styles.targets}>
          {(['ru','en']).map(lang => (
            <button key={lang} type="button" className={target === lang ? styles.targetSelected:styles.target}
              aria-pressed={target === lang} onClick={() => chooseTarget(lang)}>
              <strong>{lang === 'ru' ? '🇷🇺' : '🇬🇧'} {t[lang]}</strong>
              <small>{channels[lang]?.name || (lang === 'en' ? '@aatapro · '+t.noEnglish : '')}</small>
            </button>
          ))}
        </div>
      </fieldset>
      {enabled && <div className={styles.connect}>
        <button type="button" className={styles.secondary} disabled={!authReady || busy || authPending || pairBusy || !historyStatus} onClick={connect}>
          {authPending ? t.signing : connectedCorrectly ? t.reconnect : t.connect}
        </button>
        {connectedCorrectly && <span className={styles.channel}>✓ {t.connected}: <strong>{connected.name}</strong></span>}
        {target === 'en' && !channels.en && !candidate && <p className={styles.muted}>{t.noEnglish}</p>}
      </div>}
      {candidate && target === 'en' && !channels.en && (
        <div className={styles.pairing}>
          <h3>{t.pairTitle}</h3>
          <p><strong>{candidate.name}</strong> {candidate.handle && <span>{candidate.handle}</span>}</p>
          <p className={styles.muted}>Channel ID: {candidate.id}</p>
          <label className={styles.check}><input type="checkbox" checked={pairConfirmed}
            onChange={event => setPairConfirmed(event.target.checked)}/>{t.pairCheck}</label>
          <button className={styles.secondary} type="button" disabled={!pairConfirmed || pairBusy} onClick={pairEnglish}>{t.pair}</button>
        </div>
      )}
      {selectedConfig && connected && !connectedCorrectly && <p className={styles.error}>{t.incorrect}</p>}
      <div className={styles.form}>
        <label className={styles.picker}>
          <span>＋ {t.select}</span>
          <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple
            disabled={!configured || !historyStatus || busy || authPending || pairBusy || !connectedCorrectly}
            onChange={addFiles}/>
        </label>
        <div className={styles.files}>
          <h3>{t.selected} ({entries.filter(item => item.state !== 'done').length})</h3>
          {!entries.length && <p className={styles.muted}>{t.empty}</p>}
          {entries.map(item => (
            <div className={styles.file} key={item.id}>
              <div className={styles.filehead}>
                <span className={styles.filename}>{item.target.toUpperCase()} · {item.file.name} · {filesize(item.file.size)}</span>
                {!busy && item.state !== 'done' && <button type="button" className={styles.remove} onClick={() => {
                  sessions.current.delete(item.id)
                  alter(all => all.filter(row => row.id !== item.id))
                }}>{t.remove}</button>}
              </div>
              <label className={styles.field}><span>{t.title}</span><input value={item.title}
                maxLength={100} disabled={busy || item.state === 'done' || sessions.current.has(item.id)}
                onChange={event => update(item.id,{title:event.target.value})}/></label>
              <div className={styles.progressLine}><span>{t[item.state]}</span><strong>{item.progress}%</strong></div>
              <progress max="100" value={item.progress} aria-label={item.file.name}/>
              {item.videoId && <div className={styles.uploadResult}>
                <span className={item.privacyStatus === 'unlisted' ? styles.ok : styles.caution}>{visibilityText(item.privacyStatus,t)}</span>
                <div className={styles.linkRow}>
                  <a href={videoWatchUrl(item.videoId)} target="_blank" rel="noreferrer">{t.open} ↗</a>
                  <button type="button" onClick={() => copyLink(item.videoId)}>{copiedId === item.videoId ? t.copied : t.copy}</button>
                </div>
                {!item.saved && <div className={styles.caution}>
                  <p>{t.historyError}</p>
                  <button type="button" disabled={busy} onClick={() =>
                    saveLink(item.id,item.videoId,item.privacyStatus,item.title,item.target,
                      channels[item.target]?.id || '')
                  }>{t.retrySave}</button>
                </div>}
              </div>}
            </div>
          ))}
        </div>
        <label className={styles.field}><span>{t.description}</span>
          <textarea rows={2} value={description} maxLength={5000} disabled={busy}
            onChange={event => setDescription(event.target.value)}/>
        </label>
        <div className={styles.visibility}><strong>{t.unlisted}</strong></div>
        <label className={styles.check}><input type="checkbox" checked={synthetic}
          disabled={busy} onChange={event => setSynthetic(event.target.checked)}/>{t.ai}</label>
        <label className={styles.check}><input type="checkbox" checked={madeForKids}
          disabled={busy} onChange={event => setMadeForKids(event.target.checked)}/>{t.kids}</label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={!canUpload} onClick={runUploads}>
            {pending.some(item => ['paused','failed'].includes(item.state)) ? t.resume : t.start}
          </button>
          {busy && <button type="button" className={styles.secondary}
            onClick={() => abortRef.current?.abort()}>{t.pause}</button>}
          <Link href="/admin/videos" className={styles.siteLink}>{t.back} ↗</Link>
        </div>
        <p className={styles.muted}>{t.stay}</p>
      </div>
      <section className={styles.history} aria-label={t.history}>
        <div className={styles.historyHeading}>
          <h3>{t.history} ({history.length})</h3>
          <button type="button" className={styles.refresh} onClick={refreshHistory}>{t.refresh}</button>
        </div>
        <div className={styles.historyFilters} role="group" aria-label={t.target}>
          {(['all','ru','en']).map(option =>
            <button type="button" key={option} aria-pressed={historyFilter === option}
              className={historyFilter === option ? styles.activeFilter : styles.historyFilter}
              onClick={() => setHistoryFilter(option)}>{option === 'all' ? t.all : t[option]}</button>
          )}
        </div>
        {!filteredHistory.length && <p className={styles.muted}>{t.historyEmpty}</p>}
        {filteredHistory.map(item => (
          <div className={styles.historyEntry} key={item.videoId}>
            <div className={styles.historyDetails}>
              <strong>{item.title}</strong>
              <small>{item.target.toUpperCase()} · {new Date(item.uploadedAt).toLocaleString(locale === 'ru' ? 'ru-RU':'en-CA')} · {item.privacyStatus}</small>
            </div>
            <div className={styles.linkRow}>
              <a target="_blank" rel="noreferrer" href={item.url}>{t.open} ↗</a>
              <button type="button" onClick={() => copyLink(item.videoId)}>{copiedId === item.videoId ? t.copied : t.copy}</button>
            </div>
          </div>
        ))}
      </section>
    </section>
  )
}
