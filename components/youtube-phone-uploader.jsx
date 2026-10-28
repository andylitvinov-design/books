'use client'

import {useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import styles from './youtube-phone-uploader.module.css'
import {YOUTUBE_UPLOAD_SCOPE, YOUTUBE_READ_SCOPE, isVideoFile, titleFromFilename, uploadMetadata, videoWatchUrl, validatedOwnerTelegramCut, isOwnerTelegramMp4} from '@/lib/youtube/phone-upload-protocol.mjs'
import {beginUpload, getConnectedChannel, probeUpload, putChunk, readUploadedDetails} from '@/lib/youtube/browser-upload'
import {completeYoutubeUpload, hasUnarchivedCompletedUpload, retainUploadEntry, uploadNeedsRecovery} from '@/lib/youtube/upload-completion.mjs'
import {getYoutubeUploadStateAction, pairEnglishYoutubeChannelAction, saveYoutubeUploadHistoryAction, configureYoutubeWebOauthAction} from '@/app/admin/youtube-upload/actions'

const copy = {
  ru: {
    intro:'Выберите русский или английский канал, затем добавьте видео с iPhone. Файлы передаются прямо в YouTube — без хранения MP4 на сервере.',
    introShort:'RU / EN · Unlisted · прямо в YouTube',
    settingsTitle:'Параметры видео', historyHelp:'Сохранённые ссылки по языкам',
    safetyTitle:'Конфиденциальность и правила загрузки',
    setupGuideTitle:'Инструкция Google Cloud', setupIntro:'Для начала нужен публичный Google OAuth Client ID.',

    noClient:'Не используйте YouTube для частных клиентских консультаций или видео с персональными медицинскими данными. Unlisted доступен каждому, у кого есть ссылка.',
    config:'Для загрузки требуется одноразовое подключение Google OAuth. Сначала настройте Google Cloud ниже.',
    setupTitle:'Первое подключение Google YouTube',
    reusedConfig:'Google OAuth уже настроен для Holistic House. Повторно вводить Client ID не нужно. Выберите Google-аккаунт и подтвердите доступ. Если страница открыта внутри Telegram, используйте Safari.',
    setupHelp:'В Google Cloud включите YouTube Data API v3, создайте OAuth Client (тип Web application) и добавьте разрешённый JavaScript origin: https://holistichouse.vercel.app. Укажите здесь только публичный Client ID, без секрета.',
    setupGoogle:'Открыть Google Cloud OAuth →',setupField:'Google Web OAuth Client ID',
    setupCheck:'Подтверждаю, что OAuth Web Client создан для Holistic House и разрешает этот адрес сайта.',
    setupSave:'Подключить OAuth-клиент',setupSaving:'Сохранение…',setupChange:'Настроить / заменить Google OAuth',

    telegramCutImport:'📥 Взять обрезанный MP4 из Telegram',
    telegramCutLoading:'Получаем приватный MP4…',
    telegramCutImported:'Обрезанный MP4 добавлен. Проверьте запись и только после этого нажмите «Загрузить на YouTube».',
    telegramCutHint:'Возьмите текущую обрезанную версию из закрытого кабинета. Загрузки нет до вашего подтверждения. Только русский канал.',
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
    waiting:'Ожидает', sending:'Загружается', verifying:'Проверка YouTube', done:'Загружено', failed:'Ошибка', paused:'Приостановлено',
    retryVerify:'Повторить проверку YouTube',
    verifyHelp:'Видео уже передано. Повторная проверка использует эту же ссылку и не загружает файл заново.',
    remove:'Убрать', copy:'Скопировать ссылку', copied:'Скопировано ✓', open:'Открыть YouTube',
    back:'Видео сайта', history:'История загруженных видео', refresh:'Обновить историю', historyEmpty:'Здесь будут ссылки на видео, загруженные через это приложение.',
    all:'Все', historySaved:'Сохранено', historyError:'YouTube загрузил видео, но сохранение ссылки не завершилось. Скопируйте ссылку и повторите сохранение.',
    retrySave:'Повторить сохранение ссылки',
    channelUnlisted:'YouTube подтвердил Unlisted', channelPrivate:'YouTube вернул Private. Ролик может быть недоступен по ссылке — проверьте в Studio.',
    channelPublic:'YouTube вернул Public! Срочно проверьте доступ в Studio.', channelUnknown:'Проверьте фактическую видимость в YouTube Studio.',
    wrongResult:'YouTube разместил ролик в другом канале! Загрузка остановлена, ссылка не сохранена в журнал. Проверьте Google-аккаунт и YouTube Studio.',
    stay:'Оставляйте Safari открытым, а экран активным до завершения передачи. После обновления страницы файлы придётся выбрать заново.',
    more:'Для нового канала сначала завершите или уберите незаконченные файлы из очереди.',
    errors:{
      google_unavailable:'Google OAuth не открылся. Откройте страницу в Safari, а не во встроенном браузере Telegram, и повторите.',
      youtube_permission:'Разрешения Google отсутствуют или срок входа истёк. Переподключите YouTube.',
      youtube_quota:'Лимит загрузок YouTube исчерпан или действует ограничение канала.',
      wrong_channel:'Авторизован другой канал. Выберите правильный YouTube в окне Google.',
      readback_unverified:'YouTube пока не подтвердил канал и видимость. Очередь остановлена. Повторите проверку уже загруженного видео.',
      unexpected_visibility:'YouTube не подтвердил Unlisted. Очередь остановлена. Проверьте ограничение в YouTube Studio, затем повторите проверку.',
      channel_ambiguous:'Google не смог определить один канал. Выберите нужный YouTube-канал.',
      history_unavailable:'Хранилище ссылок недоступно. Повторите сохранение позже.',
      channel_conflict:'Английский канал уже привязан к другому ID. Загрузка остановлена для защиты.',
      invalid_channel:'Неверный канал YouTube.',
      invalid_file:'Выберите видеофайл ненулевого размера.',
      telegram_cut_unavailable:'Обрезанный приватный MP4 недоступен или ссылка устарела. Проверьте «Мои материалы».',
      telegram_cut_state:'Сначала подключите русский YouTube и завершите другие загрузки.',
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
      invalid_oauth_client:'Укажите корректный Google Web OAuth Client ID (не Client Secret).',
      unknown:'Ошибка. Проверьте YouTube Studio, прежде чем загружать повторно.',
    },
  },
  en: {
    intro:'Choose the Russian or English YouTube channel, then select videos from your phone. Files go straight to YouTube without Holistic House MP4 storage.',
    introShort:'RU / EN · Unlisted · direct to YouTube',
    settingsTitle:'Video settings', historyHelp:'Saved links grouped by language',
    safetyTitle:'Privacy and upload guidelines',
    setupGuideTitle:'Google Cloud setup instructions', setupIntro:'Connect your public Google OAuth Client ID to get started.',

    noClient:'Do not upload private client consultations or personal health information. Anyone with the link can view an Unlisted video.',
    config:'YouTube OAuth needs a one-time Google Cloud setup before uploading. Configure it below.',
    setupTitle:'Connect Google YouTube once',
    reusedConfig:'Google OAuth is already configured for Holistic House. No Client ID entry is needed. Select your Google account and approve channel access. If this page is inside Telegram, open it in Safari.',
    setupHelp:'In Google Cloud enable YouTube Data API v3, create a Web application OAuth client, and authorize this JavaScript origin: https://holistichouse.vercel.app. Enter the public Client ID only, never a secret.',
    setupGoogle:'Open Google Cloud OAuth →',setupField:'Google Web OAuth Client ID',
    setupCheck:'I confirm this OAuth Web Client belongs to Holistic House and authorizes this website origin.',
    setupSave:'Connect OAuth client',setupSaving:'Saving…',setupChange:'Configure / change Google OAuth',

    telegramCutImport:'📥 Use trimmed Telegram MP4',
    telegramCutLoading:'Reading private MP4…',
    telegramCutImported:'Trimmed MP4 added. Review it, then explicitly press Upload to YouTube.',
    telegramCutHint:'Import your current private cut from the cabinet. Nothing uploads until you approve. Russian channel only.',
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
    waiting:'Queued', sending:'Uploading', verifying:'Verifying YouTube', done:'Uploaded', failed:'Incomplete', paused:'Paused',
    retryVerify:'Retry YouTube verification',
    verifyHelp:'The video was already transferred. Verification reuses this link without uploading the file again.',
    remove:'Remove', copy:'Copy link', copied:'Copied ✓', open:'Open YouTube',
    back:'Website videos', history:'Uploaded video links', refresh:'Refresh history', historyEmpty:'Videos uploaded through this app will appear here.',
    all:'All', historySaved:'Saved', historyError:'YouTube uploaded the video but the link was not archived. Copy it and retry saving.',
    retrySave:'Retry saving the link',
    channelUnlisted:'YouTube confirmed Unlisted', channelPrivate:'YouTube returned Private. The link may not work for viewers. Check Studio.',
    channelPublic:'YouTube returned Public! Review this immediately in Studio.', channelUnknown:'Verify actual visibility in YouTube Studio.',
    wrongResult:'YouTube uploaded the video to a different channel! Upload stopped and link not archived. Check your Google account and YouTube Studio.',
    stay:'Keep Safari open and the phone awake until transfer finishes. A page reload requires choosing the files again.',
    more:'Finish or remove incomplete uploads before changing channels.',
    errors:{
      google_unavailable:'Google OAuth failed to open. Use Safari instead of Telegram’s in-app browser and retry.',
      youtube_permission:'Missing Google permissions or expired sign-in. Reconnect YouTube.',
      youtube_quota:'YouTube upload quota or channel limit reached.',
      wrong_channel:'The wrong channel is authorized. Select the intended YouTube channel in Google.',
      readback_unverified:'YouTube has not confirmed the channel and visibility. The queue is stopped. Retry verification of the existing video.',
      unexpected_visibility:'YouTube did not confirm Unlisted. The queue is stopped. Check the restriction in YouTube Studio, then retry verification.',
      channel_ambiguous:'Google could not resolve a single channel. Select the desired YouTube channel.',
      history_unavailable:'The saved link archive is unavailable. Retry after it recovers.',
      channel_conflict:'English channel is already paired to another ID. Upload is blocked.',
      invalid_channel:'Invalid YouTube channel.',
      invalid_file:'Choose a non-empty video file.',
      telegram_cut_unavailable:'The selected private MP4 is unavailable or out of date. Check My Materials.',
      telegram_cut_state:'Connect the correct Russian channel and finish other uploads first.',
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
      invalid_oauth_client:'Enter a valid Google Web OAuth Client ID, not a client secret.',
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
export function YoutubePhoneUploader({locale='ru', enabled=false, clientId='', setupAvailable=false, oauthSource='missing', initialChannels,
  initialHistory=[], historyReady=false, importTelegramCut=false, approvedMeditation=null}) {
  const t = copy[locale] || copy.ru
  const [target, setTarget] = useState(approvedMeditation?.language==='en'?'en':'ru')
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
  const [importingTelegramCut,setImportingTelegramCut] = useState(false)
  const [importingMeditation,setImportingMeditation] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState(initialHistory)
  const historySync = useRef({revision:0,request:0})
  const [historyStatus, setHistoryStatus] = useState(Boolean(historyReady))
  const [historyFilter, setHistoryFilter] = useState('all')
  const [copiedId, setCopiedId] = useState('')
  const [setupClientId, setSetupClientId] = useState(clientId)
  const [showSetup, setShowSetup] = useState(!enabled)
  const [setupConfirmed, setSetupConfirmed] = useState(false)
  const [setupBusy, setSetupBusy] = useState(false)
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
    if (busy || authPending || importingTelegramCut || entriesRef.current.some(item => uploadNeedsRecovery(item) || (item.state !== 'done' && sessions.current.has(item.id)))) {
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
    if (!oauthClient.current || busy || authPending || importingTelegramCut) {setError(t.errors.google_unavailable);return}
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
  async function setupGoogleOAuth() {
    if (!setupAvailable || !historyStatus || setupBusy || !setupConfirmed) return
    setSetupBusy(true)
    setError('')
    const result = await configureYoutubeWebOauthAction({clientId:setupClientId,confirmed:true})
      .catch(() => ({ok:false,error:'history_unavailable'}))
    if (result.ok) {
      // Re-read the server-trusted OAuth client configuration; no token or secret persisted.
      window.location.reload()
      return
    }
    setError(humanError(result.error,t))
    setSetupBusy(false)
  }
  function addFiles(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    queueFiles(files)
  }
  function queueFiles(files,ownerCut=false,sourceCutUrl=null,meditationId=null) {
    if (files.length === 0) return
    if (entriesRef.current.some(uploadNeedsRecovery)) {setError(t.more);return}
    const unfinished = entriesRef.current.filter(item => item.state !== 'done')
    if (unfinished.length + files.length > 10) {setError(t.errors.too_many);return}
    if (files.some(file => !isVideoFile(file))) {setError(t.errors.invalid_file);return}
    const suffix = String(Date.now()) + '-' + Math.random().toString(36).slice(2)
    alter(old => [...old.filter(retainUploadEntry),...files.map((file,index) => ({
      id:suffix+'-'+index, file, title:titleFromFilename(file.name),
      target, ownerCut, sourceCutUrl, meditationId, state:'waiting', progress:0, videoId:null, privacyStatus:'unknown', saved:false,
    }))])
    setError('')
    setMessage('')
  }
  async function importSelectedTelegramCut() {
    // This reuses the already implemented Phone GIS OAuth rather than
    // implying a persistent server-side Google refresh token was granted.
    // No publication: owner must separately click "Upload to YouTube".
    if (!importTelegramCut || importingTelegramCut || !enabled || !historyStatus ||
        !authReady || busy || authPending || pairBusy || target !== 'ru' ||
        connected?.id !== channels.ru?.id || connected?.target !== 'ru' ||
        entriesRef.current.some(item => item.state !== 'done')) {
      setError(t.errors.telegram_cut_state)
      return
    }
    setImportingTelegramCut(true)
    setError('')
    setMessage('')
    try {
      const response=await fetch('/api/admin/telegram-video/drafts',{
        credentials:'same-origin',redirect:'error',cache:'no-store',
        signal:AbortSignal.timeout(15000)
      })
      if(!response.ok)throw Error('telegram_cut_unavailable')
      const metadata=await response.json()
      const selected=validatedOwnerTelegramCut(metadata?.selected)
      const fileResponse=await fetch(selected.url,{
        credentials:'same-origin',redirect:'error',cache:'no-store',
        signal:AbortSignal.timeout(90000)
      })
      if(!fileResponse.ok||!String(fileResponse.headers.get('content-type')||'').startsWith('video/mp4'))
        throw Error('telegram_cut_unavailable')
      const length=fileResponse.headers.get('content-length')
      if(length!==null&&Number(length)!==selected.bytes)
        throw Error('telegram_cut_unavailable')
      const bytes=new Uint8Array(await fileResponse.arrayBuffer())
      if(!isOwnerTelegramMp4(bytes,selected.bytes))
        throw Error('telegram_cut_unavailable')
      const ruToken=authorizedChannels.current.get('ru')
      if(targetRef.current!=='ru'||ruToken?.details?.id!==channelsRef.current.ru?.id||
        ruToken.token.expiresAt<Date.now()+30_000||
        entriesRef.current.some(item=>item.state!=='done'))
        throw Error('telegram_cut_state')
      queueFiles([new File([bytes],selected.filename,{type:'video/mp4'})],true,selected.url)
      setMessage(t.telegramCutImported)
    }catch(reason){setError(humanError(reason,t))}
    finally{setImportingTelegramCut(false)}
  }
  async function importApprovedMeditation(){
    if(!approvedMeditation||!enabled||!historyStatus||busy||authPending||pairBusy||
      importingTelegramCut||importingMeditation||
      target!==approvedMeditation.language||
      connected?.id!==channels[target]?.id||connected?.target!==target||
      entriesRef.current.some(item=>item.state!=='done')){
      setError(t.more);return
    }
    setImportingMeditation(true);setError('');setMessage('')
    try{
      const base='/api/admin/practitioners/meditations/'+approvedMeditation.id+'/handoff'
      const metadataResponse=await fetch(base,{credentials:'same-origin',redirect:'error',
        cache:'no-store',signal:AbortSignal.timeout(15000)})
      if(!metadataResponse.ok)throw Error('MEDITATION_HANDOFF_UNAVAILABLE')
      const meta=await metadataResponse.json()
      if(meta.id!==approvedMeditation.id||meta.language!==target||meta.mime!=='video/mp4'||
        !Number.isSafeInteger(meta.bytes)||meta.bytes<128||meta.bytes>45000000)
        throw Error('MEDITATION_HANDOFF_MISMATCH')
      const response=await fetch(base+'?download=1',{credentials:'same-origin',redirect:'error',
        cache:'no-store',signal:AbortSignal.timeout(120000)})
      if(!response.ok||(response.headers.get('content-type')||'').split(';')[0]!=='video/mp4')
        throw Error('MEDITATION_HANDOFF_UNAVAILABLE')
      const size=Number(response.headers.get('content-length'))
      if(size!==meta.bytes)throw Error('MEDITATION_HANDOFF_MISMATCH')
      const bytes=new Uint8Array(await response.arrayBuffer())
      if(bytes.byteLength!==meta.bytes||
        String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')throw Error('MEDITATION_HANDOFF_MISMATCH')
      if(targetRef.current!==meta.language||connected?.id!==channelsRef.current[meta.language]?.id||
        entriesRef.current.some(item=>item.state!=='done'))
        throw Error('MEDITATION_HANDOFF_CHANGED')
      const filename=String(meta.title||'Meditation')
        .replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().slice(0,75)||'Meditation'
      queueFiles([new File([bytes],filename+'.mp4',{type:'video/mp4'})],false,null,meta.id)
      setMessage(locale==='ru'
        ?'Одобренная медитация импортирована. Проверьте язык, канал, видео и нажмите «Загрузить на YouTube».'
        :'Approved meditation imported. Check channel and playback, then press Upload to YouTube.')
    }catch(reason){setError(humanError(reason,t)||String(reason?.message||'MEDITATION_HANDOFF_UNAVAILABLE'))}
    finally{setImportingMeditation(false)}
  }
  async function verifyMeditationReceipt(entry,videoId,auth){
    const response=await fetch('/api/admin/practitioners/meditations/youtube-verify',{
      method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},
      body:JSON.stringify({id:entry.meditationId,videoId,accessToken:auth.value})})
    const result=await response.json().catch(()=>({}))
    if(!response.ok)throw Error(result.error||'YOUTUBE_READBACK_UNAVAILABLE')
    if(!result.processed)throw Error('readback_unverified')
  }
  async function saveLink(entryId, videoId, privacyStatus, title, targetKey, channelId) {
    try {
      const result = await saveYoutubeUploadHistoryAction({
        videoId,title,target:targetKey,channelId,privacyStatus:privacyStatus || 'unknown',
        requestedVisibility:'unlisted',
      })
      if (!result.ok) throw new Error(result.error)
      historySync.current.revision += 1
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
    if(entry.meditationId){
      // Remember the provider ID before verification: retries must never upload twice.
      update(entry.id,{videoId:resultId,state:'verifying'})
      await verifyMeditationReceipt(entry,resultId,auth)
    }
    await completeYoutubeUpload({
      videoId:resultId,channelId,
      readDetails:() => readUploadedDetails(resultId,auth.value,undefined,{requireProcessed:entry.ownerCut===true}),
      update:partial => update(entry.id,partial),
      save:details => saveLink(entry.id,resultId,details.privacyStatus,entry.title,entry.target,details.channelId),
    })
  }
  async function runUploads() {
    const desired = channels[target]
    if (!enabled || !historyStatus || !desired?.id || !connected ||
      connected.target !== target || connected.id !== desired.id || active.current) return
    if (hasUnarchivedCompletedUpload(entriesRef.current)) {setError(t.historyError);return}
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
        if (entry.videoId) {
          await finish(entry,entry.videoId,auth,desired.id)
          continue
        }
        // Prevent a selected private cut from silently changing between
        // importing into the browser and pressing the YouTube upload button.
        // If an upload session already started, only resume/probe it.
        if (entry.ownerCut===true && !sessions.current.has(entry.id)) {
          const latest=await fetch('/api/admin/telegram-video/drafts',{
            credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal
          })
          if(!latest.ok)throw Error('telegram_cut_unavailable')
          const selected=validatedOwnerTelegramCut((await latest.json()).selected)
          if(selected.url!==entry.sourceCutUrl||selected.bytes!==entry.file.size)
            throw Error('telegram_cut_unavailable')
        }
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
      setError(reason instanceof Error && reason.message === 'history_unavailable' ? t.historyError : humanError(reason,t))
    } finally {
      active.current = false
      setBusy(false)
      abortRef.current = null
    }
  }
  async function refreshHistory() {
    const revision = historySync.current.revision
    const request = ++historySync.current.request
    const result = await getYoutubeUploadStateAction()
    // A prior snapshot must not hide a link saved while this request was in flight.
    if (request !== historySync.current.request || revision !== historySync.current.revision) return
    if (!result.ok) {setError(humanError(result.error,t));setHistoryStatus(false);return}
    setHistory(result.history)
    setChannels(result.channels)
    setHistoryStatus(true)
    const recovery = entriesRef.current.find(uploadNeedsRecovery)
    setError(recovery ? (recovery.verificationError ? humanError(recovery.verificationError,t) : t.historyError) : '')
  }

  const configured = Boolean(enabled && authReady)
  const selectedConfig = channels[target]
  const connectedCorrectly = Boolean(connected?.id && connected?.id === selectedConfig?.id && connected.target === target)
  const pending = entries.filter(item => item.state !== 'done')
  const unresolvedUpload = entries.some(uploadNeedsRecovery)
  const canUpload = Boolean(enabled && historyStatus && connectedCorrectly && !busy && !authPending && pending.length &&
    !hasUnarchivedCompletedUpload(entries) && !importingTelegramCut &&
    pending.every(item => item.target === target))
  const filteredHistory = historyFilter === 'all' ? history : history.filter(item => item.target === historyFilter)
  return (
    <section className={styles.uploader} aria-label="Holistic House YouTube uploader">
      <div className={styles.lead}>
        <div className={styles.icon} aria-hidden="true">▶</div>
        <div className={styles.leadCopy}>
          <h2>Phone → YouTube</h2>
          <p className={styles.desktopIntro}>{t.intro}</p>
          <p className={styles.mobileIntro}>{t.introShort}</p>
        </div>
      </div>
      {!enabled && !setupAvailable && <p className={styles.unavailable} role="status">{t.config}</p>}
      {enabled && oauthSource === 'owner_video' && <p className={styles.muted} role="status">{t.reusedConfig}</p>}
      {enabled && setupAvailable && !showSetup && <button className={styles.siteLink}
        type="button" disabled={busy} onClick={() => setShowSetup(true)}>{t.setupChange}</button>}
      {setupAvailable && showSetup && <div className={styles.pairing}>
        <h3>{t.setupTitle}</h3>
        <p className={styles.setupIntro}>{t.setupIntro}</p>
        <details className={styles.helpDisclosure}>
          <summary>{t.setupGuideTitle}</summary>
          <p>{t.setupHelp}</p>
          <a className={styles.siteLink} target="_blank" rel="noreferrer" href="https://console.cloud.google.com/apis/credentials">{t.setupGoogle}</a>
        </details>
        <label className={styles.field}><span>{t.setupField}</span><input type="text"
          value={setupClientId} onChange={event => setSetupClientId(event.target.value)}
          placeholder="123456789012-example.apps.googleusercontent.com" spellCheck={false}
          autoComplete="off" maxLength={180} disabled={setupBusy}/></label>
        <label className={styles.check}><input type="checkbox" checked={setupConfirmed}
          disabled={setupBusy} onChange={event => setSetupConfirmed(event.target.checked)}/>{t.setupCheck}</label>
        <button className={styles.secondary} type="button" onClick={setupGoogleOAuth}
          disabled={setupBusy || !setupConfirmed || !setupClientId.trim() || !historyStatus}>
          {setupBusy ? t.setupSaving : t.setupSave}
        </button>
      </div>}
      {!historyStatus && <p className={styles.unavailable} role="status">{t.historyUnavailable}</p>}
      <fieldset className={styles.targetSelector} disabled={busy || authPending || pairBusy || importingTelegramCut}>
        <legend>{t.target}</legend>
        <div className={styles.targets}>
          {(['ru','en']).map(lang => (
            <button key={lang} type="button" className={target === lang ? styles.targetSelected:styles.target}
              aria-pressed={target === lang} onClick={() => chooseTarget(lang)}>
              <strong>{lang === 'ru' ? '🇷🇺' : '🇬🇧'} {t[lang]}</strong>
              <small>{channels[lang]?.name || (lang === 'en' ? t.noEnglish : '')}</small>
            </button>
          ))}
        </div>
      </fieldset>
      {enabled && <div className={styles.connect}>
        <button type="button" className={styles.secondary} disabled={!authReady || busy || authPending || pairBusy || importingTelegramCut || !historyStatus} onClick={connect}>
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
        {approvedMeditation&&<div data-private-meditation-import className={styles.pairing}>
          <h3>{locale==='ru'?'Одобренная медитация':'Approved meditation'}</h3>
          <p>{approvedMeditation.title} · {approvedMeditation.language.toUpperCase()} · Unlisted</p>
          <p className={styles.muted}>{locale==='ru'
            ?'Перед загрузкой обязательно проверьте канал и содержание. Никакой автопубликации без вашего подтверждения.'
            :'Check the channel and content before publishing. Upload requires your explicit confirmation.'}</p>
          <button type="button" className={styles.secondary} onClick={importApprovedMeditation}
            disabled={!enabled||!historyStatus||busy||authPending||pairBusy||
              importingMeditation||importingTelegramCut||!connectedCorrectly||
              target!==approvedMeditation.language||unresolvedUpload||
              entries.some(item=>item.state!=='done')}>
            {importingMeditation?(locale==='ru'?'Загружаем приватный MP4…':'Loading private MP4…'):
              (locale==='ru'?'Добавить одобренную медитацию в очередь':'Add approved meditation to queue')}
          </button>
        </div>}
        {importTelegramCut&&<div data-private-telegram-cut-import>
          <p className={styles.muted}>{t.telegramCutHint}</p>
          <button type="button" className={styles.secondary}
            disabled={importingTelegramCut||!enabled||!historyStatus||busy||authPending||
              pairBusy||!connectedCorrectly||target!=='ru'||unresolvedUpload||
              entries.some(item=>item.state!=='done')}
            onClick={importSelectedTelegramCut}>
            {importingTelegramCut?t.telegramCutLoading:t.telegramCutImport}
          </button>
        </div>}
        <label className={styles.picker}>
          <span>＋ {t.select}</span>
          <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" multiple
            disabled={!configured || !historyStatus || busy || authPending || pairBusy || importingTelegramCut || !connectedCorrectly || unresolvedUpload}
            onChange={addFiles}/>
        </label>
        {entries.length > 0 && <div className={styles.files}>
          <h3>{t.selected} ({entries.filter(item => item.state !== 'done').length})</h3>
          {entries.map(item => (
            <div className={styles.file} key={item.id}>
              <div className={styles.filehead}>
                <span className={styles.filename}>{item.target.toUpperCase()} · {item.file.name} · {filesize(item.file.size)}</span>
                {!busy && item.state !== 'done' && !item.videoId && !sessions.current.has(item.id) && <button type="button" className={styles.remove} onClick={() => {
                  sessions.current.delete(item.id)
                  alter(all => all.filter(row => row.id !== item.id))
                }}>{t.remove}</button>}
              </div>
              <label className={styles.field}><span>{t.title}</span><input value={item.title}
                maxLength={100} disabled={busy || item.state === 'done' || Boolean(item.videoId) || sessions.current.has(item.id)}
                onChange={event => update(item.id,{title:event.target.value})}/></label>
              <div className={styles.progressLine}><span>{t[item.state]}</span><strong>{item.progress}%</strong></div>
              <progress max="100" value={item.progress} aria-label={item.file.name}/>
              {item.videoId && <div className={styles.uploadResult}>
                <span className={item.privacyStatus === 'unlisted' ? styles.ok : styles.caution}>{visibilityText(item.privacyStatus,t)}</span>
                <div className={styles.linkRow}>
                  <a href={videoWatchUrl(item.videoId)} target="_blank" rel="noreferrer">{t.open} ↗</a>
                  <button type="button" onClick={() => copyLink(item.videoId)}>{copiedId === item.videoId ? t.copied : t.copy}</button>
                </div>
                {item.wrongChannel && <p className={styles.error}>{t.wrongResult}</p>}
                {item.verificationError && <p className={styles.caution}>{t.verifyHelp}</p>}
                {item.state === 'done' && !item.saved && !item.verificationError && !item.wrongChannel && <div className={styles.caution}>
                  <p>{t.historyError}</p>
                  <button type="button" disabled={busy} onClick={() =>
                    saveLink(item.id,item.videoId,item.privacyStatus,item.title,item.target,
                      channels[item.target]?.id || '')
                  }>{t.retrySave}</button>
                </div>}
              </div>}
            </div>
          ))}
        </div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={!canUpload} onClick={runUploads}>
            {pending.some(item => item.videoId) ? t.retryVerify : pending.some(item => ['paused','failed'].includes(item.state)) ? t.resume : t.start}
          </button>
          {busy && <button type="button" className={styles.secondary}
            onClick={() => abortRef.current?.abort()}>{t.pause}</button>}
          <Link href="/admin/videos" className={styles.siteLink}>{t.back} ↗</Link>
        </div>
        <details className={styles.advanced}>
          <summary>{t.settingsTitle} <small>{t.unlisted}</small></summary>
          <div className={styles.advancedBody}>
        <label className={styles.field}><span>{t.description}</span>
          <textarea rows={2} value={description} maxLength={5000} disabled={busy}
            onChange={event => setDescription(event.target.value)}/>
        </label>
        <div className={styles.visibility}><strong>{t.unlisted}</strong></div>
        <label className={styles.check}><input type="checkbox" checked={synthetic}
          disabled={busy} onChange={event => setSynthetic(event.target.checked)}/>{t.ai}</label>
        <label className={styles.check}><input type="checkbox" checked={madeForKids}
          disabled={busy} onChange={event => setMadeForKids(event.target.checked)}/>{t.kids}</label>
          </div>
        </details>
        <p className={styles.muted}>{t.stay}</p>
      </div>
      <details className={styles.history} aria-label={t.history}>
        <summary className={styles.historySummary}>{t.history} <span>{history.length}</span></summary>
        <div className={styles.historyBody}>
          <div className={styles.historyHeading}>
            <p>{t.historyHelp}</p>
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
        </div>
      </details>
      <details className={styles.safetyDisclosure}>
        <summary>{t.safetyTitle}</summary>
        <p className={styles.warning}>{t.noClient}</p>
      </details>
    </section>
  )
}
