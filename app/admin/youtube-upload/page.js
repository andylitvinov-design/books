import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {YoutubePhoneUploader} from '@/components/youtube-phone-uploader'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {RUSSIAN_CHANNEL_ID} from '@/lib/youtube/upload-history-model.mjs'
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
  const clientId = process.env.HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID || ''
  const enabled = process.env.HH_YOUTUBE_PHONE_UPLOAD_ENABLED === 'true'
    && /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)
  const initialChannels = {
    ru:{id:RUSSIAN_CHANNEL_ID,name:'Академия Древних Культур',handle:'@shamanic_academy'},
    en:null,
  }
  let initialHistory = []
  let historyReady = false
  try {
    const store = getYoutubeHistoryStore()
    if (store) {
      const [channels,history] = await Promise.all([store.channels(),store.list()])
      initialChannels.en = channels.en
      initialHistory = history
      historyReady = true
    }
  } catch {
    // Connection details stay server-side. Never pretend an in-memory list is durable.
  }
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader
      title={{en:'Upload videos from phone',ru:'Загрузка видео с телефона'}}
      description={{en:'Select your YouTube channel and keep a private history of video links.',ru:'Выберите YouTube-канал. Ссылки на загруженные видео сохраняются в кабинете.'}}
    />
    <YoutubePhoneUploader locale={locale} enabled={enabled} clientId={clientId}
      initialChannels={initialChannels} initialHistory={initialHistory} historyReady={historyReady}/>
  </main>
}
