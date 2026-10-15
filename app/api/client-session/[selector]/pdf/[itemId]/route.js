import { NextResponse } from 'next/server'
import { privateHeaders } from '@/lib/clients/session'
import { getGuestClientSession,getPublishedSession } from '@/lib/clients/session-delivery'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf,buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { metadataBaseFor } from '@/data/site-metadata'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
  try{
    const {selector,itemId}=await params
    const locale=new URL(request.url).searchParams.get('locale')==='ru'?'ru':'en'
    const grant=await getGuestClientSession(selector)
    if(!grant)throw new Error('unavailable')
    const session=await getPublishedSession(grant.clientId,grant.sessionId,locale)
    const item=session.items.find(x=>x.id===itemId&&x.kind==='document')
    if(!item)throw new Error('unavailable')
    const record=await getPrescriptionStore()?.findById(item.refId)
    if(!record||record.clientId!==grant.clientId||record.status!=='active'||record.kind==='report')throw new Error('unavailable')
    const payment=record.kind==='payment'
    const projection=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
    if(!projection)throw new Error('unavailable')
    const buffer=payment?buildPaymentPdf(projection,locale,metadataBaseFor().origin):buildPrescriptionPdf(projection,locale,metadataBaseFor().origin)
    return new NextResponse(buffer,{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="private-session-document.pdf"'}})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
