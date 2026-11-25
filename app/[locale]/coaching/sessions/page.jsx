import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import PublicCoachingDiscovery from '@/components/public-coaching-discovery'
import { getPublicCoachingCatalog } from '@/lib/coaching/public-coaching-catalog'
import { resolveCoachSelection } from '@/lib/coaching/persona-registry.mjs'
import styles from './page.module.css'
import { metadataBaseFor } from '@/data/site-metadata'

export const dynamic='force-dynamic'
export const revalidate=0

const metadata={
 en:{title:'Self-guided coaching sessions | Holistic House',
   description:'Find free coaching sessions, ancient goal planning and personal coaching by topic, time, format or your own question.'},
 ru:{title:'Самостоятельные коучинг-сессии | Holistic House',
   description:'Разные коучинг-сессии в одной гостиной: бесплатные модели, авторские курсы, личный коучинг. Фильтры и подбор по вашему запросу.'},
 es:{title:'Sesiones de coaching autoguiado | Holistic House',
   description:'Descubre modelos de coaching gratis, cursos simbólicos y sesiones con Andrey filtrados por tema, tiempo o tu propia pregunta.'},
}
const locales=['en','ru','es']
export function generateStaticParams(){return locales.map(locale=>({locale}))}
export async function generateMetadata({params}){
 const {locale}=await params
 if(!locales.includes(locale))return {title:'Not found',robots:{index:false}}
 return {metadataBase:metadataBaseFor(),...metadata[locale],
  alternates:{canonical:'/'+locale+'/coaching/sessions',languages:{
    en:'/en/coaching/sessions',ru:'/ru/coaching/sessions',es:'/es/coaching/sessions','x-default':'/en/coaching'}}}
}
export default async function PublicCoachingPage({params,searchParams}){
 const {locale}=await params
 if(!locales.includes(locale))notFound()
 const personaSelection=resolveCoachSelection(await searchParams)
 let catalog=null
 try{
   // Read exactly the same published, reviewed Supabase reference catalog used
   // by the private course. No client identity, answers, CRM or account record.
   catalog=await getPublicCoachingCatalog()
 }catch{
   // Keep booking/help reachable if the backend is temporarily unavailable.
 }
 return <div className={styles.fullWidth} lang={locale} data-coaching-full-width>
   {!personaSelection&&<div className={styles.header}><PublicSiteHeader locale={locale}/></div>}
   <PublicCoachingDiscovery locale={locale} catalog={catalog} personaSelection={personaSelection}/>
 </div>
}
