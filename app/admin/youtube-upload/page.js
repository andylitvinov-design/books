import Link from 'next/link'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {YoutubePhoneUploader} from '@/components/youtube-phone-uploader'
import AdminYoutubePublications from '@/components/admin-youtube-publications'
import HeygenEnYoutubePublisher from '@/components/heygen-en-youtube-publisher'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {ownerVideoOauthConfigured} from '@/lib/practitioners/owner-telegram-video-oauth-config.mjs'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {RUSSIAN_CHANNEL_ID, normalizeGoogleOauthClientId, resolvePhoneYoutubeClientId} from '@/lib/youtube/upload-history-model.mjs'
import {getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store'
import styles from '@/components/youtube-phone-uploader.module.css'

export const dynamic = 'force-dynamic'
export const metadata = {
  title:'Phone to YouTube — Holistic House',
  robots:{index:false,follow:false},
  manifest:'/youtube-phone-upload.webmanifest',
}

export default async function YoutubeUploadPage({searchParams}) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'en' ? 'en' : 'ru'
  const params=await searchParams
  const importTelegramCut=params?.import==='telegramCut'
  const heygenVideoId=/^[a-f0-9]{32}$/i.test(params?.heygen||'')?params.heygen:''
  const initialHeygenTitle=typeof params?.title==='string'?params.title.slice(0,100):''
  const initialHeygenDescription=typeof params?.description==='string'?params.description.slice(0,3000):''
  const telegramVideoConfigured = ownerVideoOauthConfigured()
  const telegramVideoEnabled = process.env.HH_OWNER_VIDEO_ENABLED === 'true'
  let telegramVideoConnected = false
  let telegramVisibilityConnected = false
  let englishServerConnected = false
  if(telegramVideoConfigured)try{
    // Avoid importing the large Telegram/DB/media service into the phone uploader
    // when video OAuth has not been set up; the standalone uploader must work.
    const [{getAppConfig},{ownerVideoYoutubeConnected,ownerVideoVisibilityConnected}] = await Promise.all([
      import('@/lib/app/config'),
      import('@/lib/practitioners/owner-telegram-video-service')
    ])
    const appConfig=getAppConfig()
    ;[telegramVideoConnected,telegramVisibilityConnected,englishServerConnected]=await Promise.all([
      ownerVideoYoutubeConnected(appConfig),
      ownerVideoVisibilityConnected(appConfig),
      ownerVideoYoutubeConnected(appConfig,process.env,'en')
    ])
  }catch{/* Authorisation remains unconfirmed. */}
  // The client ID is public; the separate server-side OAuth secret never
  // reaches the browser. Reuse the validated Web client to avoid double setup.
  const ownerVideoClientId = telegramVideoConfigured ? process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID : null
  const environmentClientId = normalizeGoogleOauthClientId(process.env.HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID || '')
  const explicitlyDisabled = process.env.HH_YOUTUBE_PHONE_UPLOAD_ENABLED === 'false'
  let savedClientId = null
  const initialChannels = {
    ru:{id:RUSSIAN_CHANNEL_ID,name:'Академия Древних Культур',handle:'@shamanic_academy'},
    en:null,
  }
  let initialHistory = []
  let historyReady = false
  try {
    const store = getYoutubeHistoryStore()
    if (store) {
      const [channels,history,configuredClientId] = await Promise.all([
        store.channels(),store.list(),store.oauthConfig(),
      ])
      savedClientId = configuredClientId
      initialChannels.en = channels.en
      initialHistory = history
      historyReady = true
    }
  } catch {
    // Connection details stay server-side. Never pretend an in-memory list is durable.
  }
  const {clientId:configuredClientId,source:oauthSource} = resolvePhoneYoutubeClientId({
    dedicatedId:environmentClientId,savedId:savedClientId,
    ownerVideoId:ownerVideoClientId,ownerVideoConfigured:telegramVideoConfigured,
  })
  const enabled = historyReady && !explicitlyDisabled && Boolean(configuredClientId)
  // Keep self-service available for a missing/stored phone-only client.
  const setupAvailable = historyReady && !environmentClientId && !explicitlyDisabled && oauthSource !== 'owner_video'
  return <main className={'prescription-admin-shell ' + styles.page} data-youtube-upload-page>
    <PrescriptionAdminHeader initialLocale={locale}
      title={{en:'YouTube upload',ru:'Загрузка в YouTube'}}
      description={{en:'Upload from your phone to the right channel.',ru:'Загрузка с телефона на выбранный канал.'}}
    />
    <nav className={styles.mobileLinks} aria-label={locale === 'ru' ? 'Разделы кабинета' : 'Cabinet links'}>
      <Link prefetch={false} href="/admin">{locale === 'ru' ? '← Кабинет' : '← Cabinet'}</Link>
      <Link prefetch={false} href="/admin/videos">{locale === 'ru' ? 'Видео сайта' : 'Website videos'}</Link>
      <Link prefetch={false} href="/admin/youtube-upload?import=telegramCut">{locale === 'ru' ? 'MP4 из Telegram' : 'Telegram MP4'}</Link>
    </nav>
    <section aria-label="Telegram audio and photo videos" style={{margin:'12px 0',padding:12,border:'1px solid #bcae94',borderRadius:12}}>
      <h2 style={{margin:'0 0 6px',fontSize:'1rem'}}>🎬 Telegram → Видео → Русский YouTube</h2>
      {telegramVideoEnabled ? <>
        <p style={{margin:'0 0 8px',fontSize:14}}>
          Отправьте фотографии и аудио боту: он создаст приватный MP4 для проверки.
          Публикация на @shamanic_academy — только после отдельного подтверждения.
        </p>
        <a href="https://t.me/Andydotbot?start=video" target="_blank" rel="noopener noreferrer"
          style={{display:'inline-block',fontSize:14,marginBottom:8}}>
          🎬 Создать видео в Dot
        </a>
      </> : <p style={{margin:'0 0 8px',fontSize:14}}>
        ⏳ Telegram-видео ещё не включено на сервере. Команда <code>/video</code>
        станет доступна после проверки выпуска и подключения владельца.
      </p>}
      <p style={{margin:'0 0 6px',fontSize:13}}>{telegramVideoConnected
        ?'✅ Отдельный токен Telegram-видео для русского канала сохранён приватно.'
        :telegramVideoConfigured
          ?'🔐 Требуется однократное подтверждение канала Google для Telegram-видео.'
          :'🔐 Сначала настройте отдельный Google OAuth Web Client для серверной загрузки Telegram-видео.'}</p>
      {telegramVideoConfigured&&<Link prefetch={false} href="/api/admin/telegram-video/youtube/start" style={{fontSize:14}}>
        {telegramVideoConnected?'Переподключить русский канал':'Подключить русский YouTube'}</Link>}
      {telegramVideoConnected&&<div data-youtube-visibility-permission style={{fontSize:13,marginTop:10,
        padding:10,background:'#f8f1e6',border:'1px solid #c9b89e',borderRadius:9}}>
        <strong>{locale==='ru'?'Доступ к видео: По ссылке / Для всех':'Video visibility: Unlisted / Public'}</strong>
        <p style={{margin:'6px 0'}}>{telegramVisibilityConnected
          ?locale==='ru'?'✅ Право изменения видимости подключено. В Dot: /video_visibility':
            '✅ Visibility permission is connected. In Dot: /video_visibility'
          :locale==='ru'?'Google требует дополнительное разрешение: оно даёт приложению право редактировать и удалять видео. Функция Holistic House использует его ТОЛЬКО для смены видимости конкретного подтверждённого ролика; удаление видео не выполняет.':
            'Google requires an additional permission that can edit and delete videos. This Holistic House feature uses it ONLY to change visibility of one specifically approved video; it never deletes videos.'}</p>
        {!telegramVisibilityConnected&&<Link prefetch={false}
          href="/api/admin/telegram-video/youtube/start?visibility=1">
          {locale==='ru'?'🔐 Однократно разрешить управление видимостью':
            'Authorize visibility management once'}
        </Link>}
      </div>}
    </section>
    <section aria-label="English YouTube server connection" style={{
      margin:'14px 0',padding:12,borderRadius:12,border:'1px solid #bcae94'}}>
      <h2 style={{margin:'0 0 6px',fontSize:'1rem'}}>🇬🇧 AATA Pro · @aatapro</h2>
      <p style={{fontSize:14,margin:'0 0 8px'}}>
        {englishServerConnected
          ?'✅ English YouTube server OAuth connected. HeyGen videos can be uploaded after your per-video approval.'
          :'🔐 English phone pairing and server upload permission are separate. Approve Google server access once to upload HeyGen videos without a phone.'}
      </p>
      {telegramVideoConfigured&&<Link prefetch={false}
        href="/api/admin/telegram-video/youtube/start?target=en">
        {englishServerConnected?'Reconnect AATA Pro server OAuth':
          'Connect AATA Pro · server-side YouTube upload'}
      </Link>}
    </section>
    <HeygenEnYoutubePublisher locale={locale}
      initialVideoId={heygenVideoId}
      initialTitle={initialHeygenTitle}
      initialDescription={initialHeygenDescription}/>
    <AdminYoutubePublications locale={locale}/>
    <YoutubePhoneUploader locale={locale} enabled={enabled} clientId={configuredClientId || ''}
      oauthSource={oauthSource} setupAvailable={setupAvailable} importTelegramCut={importTelegramCut}
      initialChannels={initialChannels} initialHistory={initialHistory} historyReady={historyReady}/>
  </main>
}
