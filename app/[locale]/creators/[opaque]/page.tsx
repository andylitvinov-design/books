import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {isPublicLocale} from '@/data/academy/catalog'
import {metadataBaseFor} from '@/data/site-metadata'
import {PublicSiteHeader} from '@/components/public-site-header'
import CommunityVideoGallery from '@/components/community-video-gallery'
import {getAppConfig} from '@/lib/app/config'
import {listPublicCommunityVideos} from '@/lib/app/community-video-publishing'
import {UUID} from '@/lib/app/community-video-model.mjs'
export const dynamic='force-dynamic'
export const revalidate=0
type Props={params:Promise<{locale:string;opaque:string}>}
async function load(locale:string,opaque:string){
 if(!isPublicLocale(locale)||!UUID.test(opaque))notFound()
 try{
  const videos=await listPublicCommunityVideos(getAppConfig(),{creatorSlug:opaque})
  if(!videos.length)notFound()
  return videos
 }catch{notFound()}
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale,opaque}=await params
 if(!isPublicLocale(locale)||!UUID.test(opaque))return {robots:{index:false}}
 let videos
 try{videos=await listPublicCommunityVideos(getAppConfig(),{creatorSlug:opaque})}catch{return {robots:{index:false}}}
 if(!videos?.length)return {robots:{index:false}}
 return {metadataBase:metadataBaseFor(),title:videos[0].author+' · Holistic House',
  robots:{index:true,follow:true},alternates:{canonical:`/${locale}/creators/${opaque}`}}
}
export default async function CommunityCreatorPage({params}:Props){
 const {locale,opaque}=await params
 const videos=await load(locale,opaque)
 return <main lang={locale} style={{maxWidth:1050,margin:'0 auto',padding:'10px 18px 48px'}}>
  <PublicSiteHeader locale={locale as 'en'|'ru'|'es'}/>
  <h1 style={{fontSize:'1.5rem'}}>{videos[0].author}</h1>
  <p>{locale==='ru'?'Публичные видеоматериалы автора':locale==='es'?'Vídeos públicos de este autor':'Public videos by this creator'}</p>
  <CommunityVideoGallery videos={videos} locale={locale} heading={false}/>
 </main>
}
