import { notFound } from 'next/navigation'
import { sessionPagesEnabled,getGuestClientSession,getPublishedSession } from '@/lib/clients/session-delivery'
import { SessionShareGate } from '@/components/client-session-share-gate'
import { ClientSessionPage } from '@/components/client-session-page'
export const dynamic='force-dynamic'
export const metadata={title:'Your private session · Holistic House',robots:{index:false,follow:false}}
export default async function SessionInvitationPage({params}){
  const {locale,selector}=await params
  if(!['en','ru'].includes(locale)||!sessionPagesEnabled())notFound()
  let grant
  try{grant=await getGuestClientSession(selector)}catch{notFound()}
  if(!grant)return <SessionShareGate selector={selector} locale={locale}/>
  let session
  try{session=await getPublishedSession(grant.clientId,grant.sessionId,locale)}catch{notFound()}
  return <ClientSessionPage locale={locale} session={session}
    playBase={'/api/client-session/'+encodeURIComponent(selector)+'/play'}
    pdfBase={'/api/client-session/'+encodeURIComponent(selector)+'/pdf'}/>
}
