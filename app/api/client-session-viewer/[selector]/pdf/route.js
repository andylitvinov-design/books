import { NextResponse } from 'next/server'
import { privateDelivery } from '@/lib/clients/delivery-http'
import { authorizeSessionGuest,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { getPublishedSessionReport } from '@/lib/clients/session-delivery-service'
import { privateHeaders } from '@/lib/clients/session'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { buildPrescriptionPdf, buildPaymentPdf } from '@/lib/prescriptions/pdf'
import { metadataBaseFor } from '@/data/site-metadata'
import { resolveSavedReportLocale } from '@/lib/documents/report-locale'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}) {
  const {selector}=await params
  return privateDelivery(async({config,store})=>{
    const requestedLocale=new URL(request.url).searchParams.get('locale')||'en'
    if(!['ru','en'].includes(requestedLocale)) return new NextResponse(null,{status:404,headers:privateHeaders})
    const access=await authorizeSessionGuest(config,store,selector,readSessionViewerCookie(request.cookies,selector))
    const id=access.session.report?.id
    if(!id) return new NextResponse(null,{status:404,headers:privateHeaders})
    const record=await getPublishedSessionReport(config,store,access.clientId,access.sessionId)
    if(!record||record.clientId!==access.clientId||record.status!=='active'||record.kind==='report')
      return new NextResponse(null,{status:404,headers:privateHeaders})
    const payment=record.kind==='payment'
    const reportLocale=resolveSavedReportLocale(record,requestedLocale)
    const projection=payment?getClientPaymentDocument(record,reportLocale):getClientPrescription(record,reportLocale)
    if(!projection) return new NextResponse(null,{status:404,headers:privateHeaders})
    const pdf=payment?buildPaymentPdf(projection,reportLocale,metadataBaseFor().origin):
      buildPrescriptionPdf(projection,reportLocale,metadataBaseFor().origin)
    return new NextResponse(pdf,{headers:{...privateHeaders,'Content-Type':'application/pdf',
      'Content-Disposition':'attachment; filename="holistic-house-session.pdf"'}})
  })
}

