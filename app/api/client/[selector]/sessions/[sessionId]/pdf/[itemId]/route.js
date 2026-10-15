import { NextResponse } from 'next/server'
import { authorizeCabinetRequest,privateHeaders } from '@/lib/clients/session'
import { getPublishedSession } from '@/lib/clients/session-delivery'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf,buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { metadataBaseFor } from '@/data/site-metadata'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
  try{
    const {selector,sessionId,itemId}=await params
    const locale=new URL(request.url).searchParams.get('locale')==='ru'?'ru':'en'
    const access=await authorizeCabinetRequest(selector)
    if(!access)throw new Error('unavailable')
    const session=await getPublishedSession(access.client.id,sessionId,locale)
    const item=session.items.find(x=>x.id===itemId&&x.kind==='document')
    if(!item)throw new Error('unavailable')
    const record=await getPrescriptionStore()?.findById(item.refId)
    if(!record||record.clientId!==access.client.id||record.status!=='active'||record.kind==='report')throw new Error('unavailable')
    const payment=record.kind==='payment'
    const doc=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
    if(!doc)throw new Error('unavailable')
    const pdf=payment?buildPaymentPdf(doc,locale,metadataBaseFor().origin):buildPrescriptionPdf(doc,locale,metadataBaseFor().origin)
    return new NextResponse(pdf,{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="private-session-document.pdf"'}})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
