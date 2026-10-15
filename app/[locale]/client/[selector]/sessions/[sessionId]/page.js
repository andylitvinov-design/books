import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { getAppConfig } from '@/lib/app/config'
import { getPublishedClientSession } from '@/lib/clients/session-delivery-service'
import { ClientSessionPage } from '@/components/client-session-page'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { PrescriptionDocument } from '@/components/prescription-document'
import { PaymentDocument } from '@/components/payment-document'
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
  let reportContent=null
  if(session.report) {
    const record=await access.store.findById(session.report.id)
    if(record?.status==='active'&&record.clientId===access.client.id) {
      const payment=record.kind==='payment'
      const projected=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
      if(projected) reportContent=payment?<PaymentDocument document={projected} locale={locale}/>:
        <PrescriptionDocument document={projected} locale={locale}/>
    }
  }
  return <ClientSessionPage locale={locale} session={session} selector={selector}
    mode="cabinet" reportContent={reportContent}/>
}
