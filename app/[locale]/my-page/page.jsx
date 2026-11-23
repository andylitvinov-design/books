import {notFound} from 'next/navigation'
import MyPageClient from '@/components/app/my-page-client'
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
 return <MyPageClient locale={locale}/>
}
