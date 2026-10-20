import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { deliveryEnabled,validSelector,guestSessionProjection } from '@/lib/clients/delivery-model'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { readSessionViewerCookie,authorizeSessionGuest } from '@/lib/clients/session-delivery-access'
import { getPublishedSessionReport } from '@/lib/clients/session-delivery-service'
import { ClientSessionShareGate } from '@/components/client-session-share-gate'
import { ClientSessionPage,ClientSessionVoiceMessage } from '@/components/client-session-page'
import { sharedGranulesGuideReady } from '@/lib/clients/shared-education-video'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { resolveSavedReportLocale } from '@/lib/documents/report-locale'
import {PaymentDocument} from '@/components/payment-document'
import {PrescriptionDocument} from '@/components/prescription-document'
export const dynamic='force-dynamic'
export const metadata={title:'Holistic House · Private session',robots:{index:false,follow:false},
  referrer:'no-referrer'}
export default async function ClientSessionSharePage({params}) {
  const {locale,shareSelector}=await params
  if(!deliveryEnabled()||!['en','ru'].includes(locale)||!validSelector(shareSelector)) notFound()
  const store=getPrescriptionStore()
  try {
    const config=getAppConfig()
    const credential=readSessionViewerCookie(await cookies(),shareSelector)
    const {session}=await authorizeSessionGuest(config,store,shareSelector,credential)
    const viewSession=guestSessionProjection(session)
    let reportContent=null, recommendation=null, reportLocale=locale
    if(session.report) {
      const record=await getPublishedSessionReport(config,store,session.clientId,session.id)
      if(record?.status==='active'&&record.clientId===session.clientId) {
        const payment=record.kind==='payment'
        // The saved document language is authoritative, not the /en or /ru link prefix.
        reportLocale=resolveSavedReportLocale(record,locale)
        const projected=payment?getClientPaymentDocument(record,reportLocale):getClientPrescription(record,reportLocale)
        if(projected){if(payment)reportContent=<PaymentDocument document={projected} locale={reportLocale} embedded/>
          else {recommendation=projected;reportContent=<PrescriptionDocument document={projected} locale={reportLocale} embedded
            afterCover={<ClientSessionVoiceMessage session={viewSession} selector={shareSelector} locale={reportLocale} mode="guest"/>}
            narration={{scope:'guest-session',selector:shareSelector}}/>}}
      }
    }
    const client=await store.findClientById(session.clientId)
    return <ClientSessionPage locale={reportLocale} session={viewSession} selector={shareSelector}
      audioEmbedded={Boolean(recommendation)}
      mode="guest" appAvailable={appEnabled()} clientName={recommendation?.patientName||client?.fullName||''}
      recommendation={recommendation} reportContent={reportContent}
      sharedGuideReady={sharedGranulesGuideReady()}/>
  } catch{return <ClientSessionShareGate locale={locale} selector={shareSelector}/>}
}

