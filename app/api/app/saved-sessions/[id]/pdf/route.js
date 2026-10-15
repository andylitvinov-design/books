import {NextResponse} from 'next/server'
import {privateDelivery} from '@/lib/clients/delivery-http'
import {privateHeaders} from '@/lib/clients/session'
import {createRequestAuth} from '@/lib/app/session'
import {readSavedSession} from '@/lib/app/session-save-flow'
import {getPublishedSessionReport} from '@/lib/clients/session-delivery-service'
import {getClientPrescription} from '@/lib/prescriptions/service'
import {getClientPaymentDocument} from '@/lib/documents/payment'
import {buildPrescriptionPdf,buildPaymentPdf} from '@/lib/prescriptions/pdf'
import {metadataBaseFor} from '@/data/site-metadata'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
  const {id}=await params
  return privateDelivery(async({config,store})=>{
    const locale=new URL(request.url).searchParams.get('locale')||'en'
    if(!['en','ru'].includes(locale))
      return new NextResponse(null,{status:404,headers:privateHeaders})
    const actor=await createRequestAuth(request,config).verified()
    const saved=await readSavedSession(config,store,actor,id,{markOpened:false})
    if(!saved.session.report?.id)
      return new NextResponse(null,{status:404,headers:privateHeaders})
    const doc=await getPublishedSessionReport(config,store,saved.clientId,saved.session.id)
    if(!doc||doc.clientId!==saved.clientId||doc.status!=='active'||doc.kind==='report')
      return new NextResponse(null,{status:404,headers:privateHeaders})
    const payment=doc.kind==='payment'
    const projection=payment?getClientPaymentDocument(doc,locale):getClientPrescription(doc,locale)
    if(!projection)return new NextResponse(null,{status:404,headers:privateHeaders})
    const pdf=payment?buildPaymentPdf(projection,locale,metadataBaseFor().origin):
      buildPrescriptionPdf(projection,locale,metadataBaseFor().origin)
    return new NextResponse(pdf,{headers:{...privateHeaders,'Content-Type':'application/pdf',
      'Content-Disposition':'attachment; filename="holistic-house-saved-session.pdf"'}})
  })
}
