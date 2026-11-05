import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import PublicCoachingDiscovery from '@/components/public-coaching-discovery'
import { getPublicCoachingCatalog } from '@/lib/coaching/public-coaching-catalog'
import styles from './page.module.css'
import { metadataBaseFor } from '@/data/site-metadata'

export const dynamic='force-dynamic'
export const revalidate=0

const metadata={
 en:{title:'Coaching Lounge · Find your session | Holistic House',
   description:'Find free coaching sessions, ancient goal planning and personal coaching by topic, time, format or your own question.'},
 ru:{title:'Гостиная коучинга · Выберите свою сессию | Holistic House',
   description:'Разные коучинг-сессии в одной гостиной: бесплатные модели, авторские курсы, личный коучинг. Фильтры и подбор по вашему запросу.'},
 es:{title:'Salón de coaching · Elige tu sesión | Holistic House',
   description:'Descubre modelos de coaching gratis, cursos simbólicos y sesiones con Andrey filtrados por tema, tiempo o tu propia pregunta.'},
}
const locales=['en','ru','es']
export function generateStaticParams(){return locales.map(locale=>({locale}))}
export async function generateMetadata({params}){
 const {locale}=await params
 if(!locales.includes(locale))return {title:'Not found',robots:{index:false}}
 return {metadataBase:metadataBaseFor(),...metadata[locale],
  alternates:{canonical:'/'+locale+'/coaching',languages:{
    en:'/en/coaching',ru:'/ru/coaching',es:'/es/coaching','x-default':'/en/coaching'}}}
}
export default async function PublicCoachingPage({params}){
 const {locale}=await params
 if(!locales.includes(locale))notFound()
 let catalog=null
 try{
   // Read exactly the same published, reviewed Supabase reference catalog used
   // by the private course. No client identity, answers, CRM or account record.
   catalog=await getPublicCoachingCatalog()
 }catch{
   // Keep booking/help reachable if the backend is temporarily unavailable.
 }
 return <div className={styles.fullWidth} lang={locale} data-coaching-full-width>
   <div className={styles.header}><PublicSiteHeader locale={locale}/></div>
   <PublicCoachingDiscovery locale={locale} catalog={catalog}/>
 </div>
}
