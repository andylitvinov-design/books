import {cookies} from 'next/headers'
import {notFound,redirect} from 'next/navigation'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,appEnabled} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {readSavedSession} from '@/lib/app/session-save-flow'
import {getPublishedSessionReport} from '@/lib/clients/session-delivery-service'
import {deliveryEnabled,guestSessionProjection} from '@/lib/clients/delivery-model'
import {getClientPrescription} from '@/lib/prescriptions/service'
import {ClientSessionPage} from '@/components/client-session-page'
import {SavedSessionManagement} from '@/components/app/saved-session-management'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={
  title:'Private consultation | Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'
}
export default async function GoogleSavedSessionPage({params}){
  const {locale,id}=await params
  if(!['en','ru'].includes(locale)||!deliveryEnabled())notFound()
  let saved,recommendation
  try{
    const config=getAppConfig(),store=getPrescriptionStore()
    const actor=await createRequestAuth({cookies:await cookies()},config).verified()
    saved=await readSavedSession(config,store,actor,id)
    const record=await getPublishedSessionReport(config,store,saved.clientId,saved.session.id)
    recommendation=record && record.kind!=='payment'?getClientPrescription(record,locale):null
  }catch(error){
    if(error instanceof AppError && error.code==='SIGN_IN_REQUIRED')redirect('/'+locale+'/app')
    if(error instanceof AppError &&
      ['NOT_FOUND','SESSION_UNAVAILABLE','DOCUMENT_UNAVAILABLE','ACCOUNT_UNAVAILABLE','CONSENT_REQUIRED'].includes(error.code))
      notFound()
    throw error
  }
  return <div>
    <ClientSessionPage locale={locale} selector="" session={guestSessionProjection(saved.session)}
      mode="saved" savedId={id} recommendation={recommendation}
      clientName={recommendation?.patientName||''} appAvailable={appEnabled()}/>
    <SavedSessionManagement id={id} locale={locale}/>
  </div>
}
