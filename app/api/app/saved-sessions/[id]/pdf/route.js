import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {readSavedSession} from '@/lib/app/client-session-save-flow'
import {getPublishedSessionReport} from '@/lib/clients/session-delivery-service'
import {getClientPrescription} from '@/lib/prescriptions/service'
import {getClientPaymentDocument} from '@/lib/documents/payment'
import {buildPrescriptionPdf,buildPaymentPdf} from '@/lib/prescriptions/pdf'
import {metadataBaseFor} from '@/data/site-metadata'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
  try{
    if(!deliveryEnabled())throw Error('OFF')
    const {id}=await params,locale=new URL(request.url).searchParams.get('locale')||'en'
    if(!['en','ru'].includes(locale))throw Error('locale')
    const config=getAppConfig(),auth=createRequestAuth(request,config),actor=await auth.verified()
    const store=getPrescriptionStore()
    const saved=await readSavedSession(config,store,actor,id,{markOpened:false})
    if(!saved.session.report)throw Error('unavailable')
    const record=await getPublishedSessionReport(config,store,saved.source.clientId,saved.source.sessionId)
    if(!record||record.clientId!==saved.source.clientId||record.status!=='active')throw Error('unavailable')
    const pay=record.kind==='payment',doc=pay?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
    if(!doc)throw Error('unavailable')
    const bytes=pay?buildPaymentPdf(doc,locale,metadataBaseFor().origin):
      buildPrescriptionPdf(doc,locale,metadataBaseFor().origin)
    return auth.apply(new NextResponse(bytes,{headers:{...PRIVATE_HEADERS,
      'Content-Type':'application/pdf',
      'Content-Disposition':(new URL(request.url).searchParams.get('preview')==='1'?'inline':'attachment')+'; filename="holistic-house-saved-session.pdf"'}}))
  }catch{
    return new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
  }
}
