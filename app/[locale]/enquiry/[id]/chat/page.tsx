import {notFound} from 'next/navigation'
import PublicEnquiryGuestChat from '@/components/public-enquiry-guest-chat'
import {publicEnquiryGuestChatReady} from '@/lib/practitioners/public-enquiry-chat-policy.mjs'
import type {Metadata} from 'next'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata:Metadata={
  robots:{index:false,follow:false},
  title:'Private enquiry chat · Holistic House',
}
const LOCALE=new Set(['en','ru','es'])
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export default async function PublicEnquiryConversationPage({
  params,
}:{params:Promise<{locale:string,id:string}>}){
  const {locale,id}=await params
  if(!publicEnquiryGuestChatReady()||!LOCALE.has(locale)||!UUID.test(id))notFound()
  return <PublicEnquiryGuestChat locale={locale as 'en'|'ru'|'es'} enquiryId={id}/>
}
