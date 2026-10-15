import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {YoutubePhoneUploader} from '@/components/youtube-phone-uploader'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {RUSSIAN_CHANNEL_ID, normalizeGoogleOauthClientId} from '@/lib/youtube/upload-history-model.mjs'
import {getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store'

export const dynamic = 'force-dynamic'
export const metadata = {
  title:'Phone to YouTube — Holistic House',
  robots:{index:false,follow:false},
  manifest:'/youtube-phone-upload.webmanifest',
}

export default async function YoutubeUploadPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'en' ? 'en' : 'ru'
  const environmentClientId = normalizeGoogleOauthClientId(process.env.HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID || '')
  const explicitlyDisabled = process.env.HH_YOUTUBE_PHONE_UPLOAD_ENABLED === 'false'
  let clientId = environmentClientId || ''
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
      if (!environmentClientId && configuredClientId) clientId = configuredClientId
      initialChannels.en = channels.en
      initialHistory = history
      historyReady = true
    }
  } catch {
    // Connection details stay server-side. Never pretend an in-memory list is durable.
  }
  const enabled = historyReady && !explicitlyDisabled && Boolean(normalizeGoogleOauthClientId(clientId))
  const setupAvailable = historyReady && !environmentClientId && !explicitlyDisabled
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader
      title={{en:'Upload videos from phone',ru:'Загрузка видео с телефона'}}
      description={{en:'Select your YouTube channel and keep a private history of video links.',ru:'Выберите YouTube-канал. Ссылки на загруженные видео сохраняются в кабинете.'}}
    />
    <YoutubePhoneUploader locale={locale} enabled={enabled} clientId={clientId} setupAvailable={setupAvailable}
      initialChannels={initialChannels} initialHistory={initialHistory} historyReady={historyReady}/>
  </main>
}
