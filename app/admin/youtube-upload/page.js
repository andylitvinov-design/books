import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {YoutubePhoneUploader} from '@/components/youtube-phone-uploader'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'

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
  const expectedChannelId = process.env.HH_YOUTUBE_UPLOAD_EXPECTED_CHANNEL_ID || ''
  const enabled = process.env.HH_YOUTUBE_PHONE_UPLOAD_ENABLED === 'true'
    && /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)
    && /^UC[A-Za-z0-9_-]{22}$/.test(expectedChannelId)
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader
      title={{en:'Upload videos from phone',ru:'Загрузка видео с телефона'}}
      description={{en:'A secure bridge from your phone to your YouTube channel.',ru:'Прямая передача видео с телефона в ваш YouTube.'}}
    />
    <YoutubePhoneUploader locale={locale} enabled={enabled} clientId={clientId} expectedChannelId={expectedChannelId}/>
  </main>
}
