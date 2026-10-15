import { notFound } from 'next/navigation'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { PrescriptionAccessGate } from '@/components/prescription-access-gate'
import { sessionPagesEnabled,getPublishedSession } from '@/lib/clients/session-delivery'
import { ClientSessionPage } from '@/components/client-session-page'
export const dynamic='force-dynamic'
export const metadata={title:'Private consultation · Holistic House',robots:{index:false,follow:false}}
export default async function CabinetSessionPage({params}){
  const {locale,selector,sessionId}=await params
  if(!['en','ru'].includes(locale)||!sessionPagesEnabled())notFound()
  const access=await authorizeCabinetRequest(selector)
  if(!access)return <PrescriptionAccessGate locale={locale} selector={selector} cabinet/>
  let session
  try{session=await getPublishedSession(access.client.id,sessionId,locale)}catch{notFound()}
  return <ClientSessionPage locale={locale} session={session}
    playBase={'/api/client/'+encodeURIComponent(selector)+'/sessions/'+encodeURIComponent(sessionId)+'/play'}
    pdfBase={'/api/client/'+encodeURIComponent(selector)+'/sessions/'+encodeURIComponent(sessionId)+'/pdf'}
    backHref={'/'+locale+'/client/'+selector}/>
}
