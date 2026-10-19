import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { getPublishedClientSession,getPublishedSessionReport } from '@/lib/clients/session-delivery-service'
import { ClientSessionPage,ClientSessionVoiceMessage } from '@/components/client-session-page'
import { sharedGranulesGuideReady } from '@/lib/clients/shared-education-video'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import {PaymentDocument} from '@/components/payment-document'
import {PrescriptionDocument} from '@/components/prescription-document'
export const dynamic='force-dynamic'
export const metadata={title:'Your consultation · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function CabinetSession({params}) {
  const {locale,selector,sessionId}=await params
  if(!deliveryEnabled()||!['en','ru'].includes(locale)) notFound()
  const access=await authorizeCabinetRequest(selector)
  if(!access) notFound()
  let session
  try{session=await getPublishedClientSession(getAppConfig(),access.store,access.client.id,sessionId)}
  catch{notFound()}
  let reportContent=null, recommendation=null
  if(session.report) {
    const record=await getPublishedSessionReport(getAppConfig(),access.store,access.client.id,sessionId).catch(()=>null)
    if(record?.status==='active'&&record.clientId===access.client.id) {
      const payment=record.kind==='payment'
      const projected=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
      if(projected){if(payment)reportContent=<PaymentDocument document={projected} locale={locale} embedded/>
        else {recommendation=projected;reportContent=<PrescriptionDocument document={projected} locale={locale} embedded
          afterCover={<ClientSessionVoiceMessage session={session} selector={selector} locale={locale} mode="cabinet"/>}
          narration={{scope:'cabinet-session',selector,sessionId}}/>}}
    }
  }
  return <ClientSessionPage locale={locale} session={session} selector={selector} audioEmbedded={Boolean(recommendation)}
    mode="cabinet" appAvailable={appEnabled()} clientName={recommendation?.patientName||access.client.fullName||''}
    recommendation={recommendation} reportContent={reportContent}
    sharedGuideReady={sharedGranulesGuideReady()}/>
}

