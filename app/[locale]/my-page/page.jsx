import {notFound} from 'next/navigation'
import {coachOwnerMemoryEnabled} from '@/lib/coaching/coach-owner-memory-availability.mjs'
import MyPageClient from '@/components/app/my-page-client'
import '../app/cabinet-theme.css'
export const dynamic='force-dynamic'
export const revalidate=0
export async function generateMetadata({params}){
 const {locale}=await params
 return {title:(locale==='ru'?'Моя страница':locale==='es'?'Mi página':'My Page')+' | Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'}
}
export default async function UserPageOwner({params}){
 const {locale}=await params
 if(!['ru','en','es'].includes(locale))notFound()
 return <MyPageClient locale={locale} ownerMemorySearch={coachOwnerMemoryEnabled()}
  ownerMemorySelection={process.env.HH_COACH_MEMORY_SELECTION_ENABLED==='true'&&process.env.HH_CLIENT_MEMORY_ENABLED==='true'}/>
}
