import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {pilotPublicStatus} from '@/lib/coaching/live-avatar-pilot.mjs'
import {captureReady} from '@/lib/coaching/caesar-webrtc-capture.mjs'
import CoachLiveAvatarLab from '@/components/coach-live-avatar-lab'
import CaesarWebRtcCaptureLab from '@/components/caesar-webrtc-capture-lab'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Coach Live Avatar Lab',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function CoachLiveAvatarPage({searchParams}){
 if(!await requireAdminRequest())redirect('/admin/login')
 const params=await searchParams
 if(params?.caesar==='1')return <main style={{maxWidth:480,margin:'0 auto',padding:'24px 18px',boxSizing:'border-box',fontFamily:'system-ui'}}><p style={{fontSize:12,letterSpacing:1}}>HOLISTIC HOUSE · OWNER</p><CaesarWebRtcCaptureLab allowed={captureReady()}/></main>
 return <><div style={{maxWidth:680,margin:'16px auto 0',padding:'0 20px'}}><a href="/admin/coach-live-avatar?caesar=1">Записать видео Caesar — простой режим</a></div><CoachLiveAvatarLab status={pilotPublicStatus()}/></>
}
