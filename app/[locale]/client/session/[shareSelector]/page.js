import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { deliveryEnabled,validSelector } from '@/lib/clients/delivery-model'
import { getAppConfig } from '@/lib/app/config'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { readSessionViewerCookie,authorizeSessionInvitation } from '@/lib/clients/session-delivery-access'
import { ClientSessionShareGate } from '@/components/client-session-share-gate'
export const dynamic='force-dynamic'
export const metadata={title:'Holistic House · Private session',robots:{index:false,follow:false},referrer:'no-referrer'}

// The capability only prepares a save intent; report content is never rendered
// on this route. A verified account opens the existing saved-session route.
export default async function ClientSessionSharePage({params}) {
  const {locale,shareSelector}=await params
  if(!deliveryEnabled()||!['en','ru'].includes(locale)||!validSelector(shareSelector)) notFound()
  let authorized=false
  try {
    const credential=readSessionViewerCookie(await cookies(),shareSelector)
    await authorizeSessionInvitation(getAppConfig(),getPrescriptionStore(),shareSelector,credential)
    authorized=true
  } catch {}
  return <ClientSessionShareGate locale={locale} selector={shareSelector} invitationReady={authorized}/>
}
