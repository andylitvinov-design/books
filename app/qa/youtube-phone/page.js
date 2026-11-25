// Isolated UI fixture for phone-sized Chromium/WebKit testing ONLY.
// Not a login substitute: /admin/youtube-upload continues to use its
// verified owner session and this route has no access to account data.
// This endpoint returns 404 on all Vercel deployments, including previews.
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import Link from 'next/link'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {YoutubePhoneUploader} from '@/components/youtube-phone-uploader'
import {phoneYoutubeQaAllowed} from '@/lib/youtube/mobile-qa-guard.mjs'
import {RUSSIAN_CHANNEL_ID} from '@/lib/youtube/upload-history-model.mjs'
import styles from '@/components/youtube-phone-uploader.module.css'

export const dynamic='force-dynamic'
export const metadata={title:'Isolated YouTube phone layout QA',robots:{index:false,follow:false}}

export default async function YoutubePhoneIsolatedQaPage(){
 const host=(await headers()).get('host')||''
 if(!phoneYoutubeQaAllowed(process.env,host))notFound()
 return <main className={'prescription-admin-shell '+styles.page} data-youtube-upload-page>
   <PrescriptionAdminHeader initialLocale="en"
     title={{en:'YouTube upload',ru:'Загрузка в YouTube'}}
     description={{en:'Upload from your phone to the right channel.',ru:'Загрузка с телефона на выбранный канал.'}}/>
   <nav className={styles.mobileLinks} aria-label="Cabinet links">
     <Link prefetch={false} href="/admin">← Cabinet</Link>
     <Link prefetch={false} href="/admin/videos">Website videos</Link>
   </nav>
   <YoutubePhoneUploader locale="en" enabled clientId="123456789012-isolated-fixture.apps.googleusercontent.com"
     oauthSource="owner_video" setupAvailable={false}
     initialChannels={{ru:{id:RUSSIAN_CHANNEL_ID,name:'Synthetic channel fixture',handle:'@example'},en:null}}
     initialHistory={[]} historyReady/>
 </main>
}
