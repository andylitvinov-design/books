import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { deliveryEnabled,validSelector } from '@/lib/clients/delivery-model'
import { getAppConfig } from '@/lib/app/config'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { readSessionViewerCookie,authorizeSessionGuest } from '@/lib/clients/session-delivery-access'
import { ClientSessionShareGate } from '@/components/client-session-share-gate'
import { ClientSessionPage } from '@/components/client-session-page'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { PrescriptionDocument } from '@/components/prescription-document'
import { PaymentDocument } from '@/components/payment-document'
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
    let reportContent=null
    if(session.report) {
      const record=await store.findById(session.report.id)
      if(record?.status==='active'&&record.clientId===session.clientId) {
        const payment=record.kind==='payment'
        const projected=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
        if(projected) reportContent=payment?<PaymentDocument document={projected} locale={locale}/>:
          <PrescriptionDocument document={projected} locale={locale}/>
      }
    }
    return <ClientSessionPage locale={locale} session={session} selector={shareSelector}
      mode="guest" reportContent={reportContent}/>
  } catch{return <ClientSessionShareGate locale={locale} selector={shareSelector}/>}
}
