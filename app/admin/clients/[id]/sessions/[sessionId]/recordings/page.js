import {cookies} from 'next/headers'
import {notFound,redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {getAppConfig} from '@/lib/app/config'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
import {getOwnerSession} from '@/lib/clients/session-delivery-service'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {SessionAudioRecorder} from '@/components/session-audio-recorder'

export const dynamic='force-dynamic'
export const metadata={title:'Private consultation recordings · Holistic House',robots:{index:false,follow:false}}

export default async function PrivateSessionRecordingsPage({params}){
  if(!await requireAdminRequest())redirect('/admin/login')
  if(!deliveryEnabled())notFound()
  const {id,sessionId}=await params
  const store=getPrescriptionStore()
  const session=await getOwnerSession(getAppConfig(),store,id,sessionId).catch(()=>null)
  if(!session||session.status==='archived')notFound()
  const locale=(await cookies()).get(uiLocaleCookie)?.value==='ru'?'ru':'en'
  return <main className="prescription-admin-shell" style={{minHeight:'100vh'}}>
    <PrescriptionAdminHeader
      title={{ru:'Личные записи консультации',en:'Private session recordings'}}
      description={{ru:'Только персональные аудио, видео и фото этой консультации. Общие учебные материалы добавляются отдельно в библиотеке мастера.',
        en:'Client-specific audio, video and photos only. Reusable educational material belongs in the separate practitioner library.'}}/>
    <div style={{maxWidth:850,margin:'22px auto',padding:'0 16px'}}>
      <a href={'/admin/clients/'+encodeURIComponent(id)+'/sessions/'+encodeURIComponent(sessionId)}
        style={{display:'inline-block',marginBottom:15,color:'#1a567d',fontWeight:700}}>
        {locale==='ru'?'← Вернуться к отчёту':'← Back to report editor'}
      </a>
      <SessionAudioRecorder clientId={id} sessionId={sessionId}
        locale={locale} showYouTubeQuickAdd={false}/>
    </div>
  </main>
}
