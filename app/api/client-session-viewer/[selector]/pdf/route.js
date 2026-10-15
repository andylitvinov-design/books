import { NextResponse } from 'next/server'
import { privateDelivery } from '@/lib/clients/delivery-http'
import { authorizeSessionGuest,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { privateHeaders } from '@/lib/clients/session'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf, buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { metadataBaseFor } from '@/data/site-metadata'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}) {
  const {selector}=await params
  return privateDelivery(async({config,store})=>{
    const locale=new URL(request.url).searchParams.get('locale')||'en'
    if(!['ru','en'].includes(locale)) return new NextResponse(null,{status:404,headers:privateHeaders})
    const access=await authorizeSessionGuest(config,store,selector,readSessionViewerCookie(request.cookies,selector))
    const id=access.session.report?.id
    if(!id) return new NextResponse(null,{status:404,headers:privateHeaders})
    const record=await store.findById(id)
    if(!record||record.clientId!==access.clientId||record.status!=='active'||record.kind==='report')
      return new NextResponse(null,{status:404,headers:privateHeaders})
    const payment=record.kind==='payment'
    const projection=payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale)
    if(!projection) return new NextResponse(null,{status:404,headers:privateHeaders})
    const pdf=payment?buildPaymentPdf(projection,locale,metadataBaseFor().origin):
      buildPrescriptionPdf(projection,locale,metadataBaseFor().origin)
    return new NextResponse(pdf,{headers:{...privateHeaders,'Content-Type':'application/pdf',
      'Content-Disposition':'attachment; filename="holistic-house-session.pdf"'}})
  })
}
