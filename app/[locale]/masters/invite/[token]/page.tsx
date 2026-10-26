import {notFound} from 'next/navigation'
import MasterInviteClaim from '@/components/app/master-invite-claim'
export const dynamic='force-dynamic'
export const metadata={title:'Master invitation | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function InvitePage({params}:{params:Promise<{locale:string,token:string}>}){
 const {locale,token}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <MasterInviteClaim locale={locale} token={token}/>
}
