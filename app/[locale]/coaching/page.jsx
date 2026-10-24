import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import PublicCoachingDiscovery from '@/components/public-coaching-discovery'
import { readPersonalCoachingCatalog } from '@/lib/app/personal-coaching-catalog'
import { getAppConfig } from '@/lib/app/config'
import { metadataBaseFor } from '@/data/site-metadata'

export const dynamic='force-dynamic'
export const revalidate=0

const metadata={
 en:{title:'Free coaching session & coaching models | Holistic House',
   description:'Explore eight coaching approaches, filter by question and time, start a free self-guided session or request personal coaching.'},
 ru:{title:'Бесплатные коуч-сессии и выбор модели | Holistic House',
   description:'Выберите модель коучинга по теме и времени, пройдите бесплатную сессию или запросите личную консультацию.'},
 es:{title:'Coaching gratis y elección de modelos | Holistic House',
   description:'Elige un modelo de coaching, realiza una sesión autoguiada gratis o solicita coaching personal.'},
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
   const data=await readPersonalCoachingCatalog(getAppConfig(),null,{server:true})
   const reviewed=new Set(data.models.map(model=>model.modelKey))
   catalog={version:data.version,models:data.models,
     schemes:data.schemes.filter(scheme=>reviewed.has(scheme.modelKey)),
     signals:data.signals}
 }catch{
   // Keep booking/help reachable if the backend is temporarily unavailable.
 }
 return <div className="homeopathy-shell remedies-landing" lang={locale}>
   <PublicSiteHeader locale={locale}/>
   <PublicCoachingDiscovery locale={locale} catalog={catalog}/>
 </div>
}
