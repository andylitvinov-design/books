import {notFound} from 'next/navigation'
import MasterInviteContinue from '@/components/app/master-invite-continue'
export const dynamic='force-dynamic'
export const metadata={title:'Complete master invitation | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function InviteContinuePage({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <MasterInviteContinue locale={locale}/>
}
