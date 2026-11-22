import {notFound} from 'next/navigation'
import DevelopmentVectors from '@/components/app/development-vectors'
export const dynamic='force-dynamic'
export const revalidate=0
export async function generateMetadata({params}){
 const {locale}=await params
 return {title:(locale==='ru'?'Два вектора развития':locale==='es'?'Dos vectores de desarrollo':'Two development vectors')+' | Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'}
}
export default async function DevelopmentVectorsPage({params}){
 const {locale}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 return <DevelopmentVectors locale={locale}/>
}
