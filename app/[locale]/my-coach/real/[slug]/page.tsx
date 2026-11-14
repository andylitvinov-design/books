import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAppConfig } from '@/lib/app/config'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import type { PublicPractitioner } from '@/lib/practitioners/public-types'
import { getPublishedSiteVideos } from '@/lib/site-videos/public'
import { siteVideoWatchUrl, parseSiteVideoSource } from '@/lib/site-videos/model'
import { existingYouTubeMirrors } from '@/lib/site-videos/mirrors'
import { getServiceVideoMedia, englishPsychotherapyLandingVideo } from '@/data/service-video-library'
import { getPublicServiceDetailHref } from '@/lib/practitioners/public-service-links'
import { publicPresentationUrl } from '@/lib/practitioners/presentation-contract'
import HumanSpecialistDialogue, { type SpecialistVideo } from '@/components/my-coach-human-specialist'

type Locale = 'en' | 'ru' | 'es'
type PageProps = { params: Promise<{locale: string;slug: string}> }
type RawVideo = {title: string;description?: string;locale: string;url: string;durationSeconds?: number;file?: boolean}
const languages: Locale[] = ['en','ru','es']
const ownerCopy = {
  en: { name: 'Andrey Litvinov', role: 'Psychotherapy & guided imagery', bio: 'Jung-oriented psychotherapy, guided affective imagery, body-oriented support and systemic constellations.' },
  ru: { name: 'Андрей Литвинов', role: 'Психотерапия и работа с образами', bio: 'Юнгианская психотерапия, направленная работа с образами, телесный подход и системные расстановки.' },
  es: { name: 'Andrey Litvinov', role: 'Psicoterapia e imaginación guiada', bio: 'Psicoterapia de enfoque junguiano, imaginación guiada, trabajo corporal y constelaciones sistémicas.' },
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

function safeVideo(input: RawVideo): SpecialistVideo | null {
  if (!input || typeof input.title !== 'string' || !input.title.trim() || typeof input.url !== 'string') return null
  const title = input.title.trim().slice(0,180)
  const description = String(input.description || '').slice(0,400)
  const language: Locale = languages.includes(input.locale as Locale) ? input.locale as Locale : 'en'
  const durationSeconds = typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
    && input.durationSeconds > 0 ? Math.round(input.durationSeconds) : null
  if (input.file) {
    // Only normalized PUBLIC profile presentations from the existing public bucket.
    try {
      const u = new URL(input.url)
      if (u.protocol !== 'https:' || !u.pathname.startsWith('/storage/v1/object/public/hh-practitioner-presentations/')) return null
      return {id:'file:'+u.pathname,title,description,language,kind:'file',url:u.toString(),poster:'',durationSeconds}
    } catch { return null }
  }
  const parsed = parseSiteVideoSource(input.url)
  if (parsed?.youtubeId) {
    const id = parsed.youtubeId
    return {id:'youtube:'+id,title,description,language,kind:'embed',
      url:'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&playsinline=1&rel=0',
      poster:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',durationSeconds}
  }
  if (parsed?.heygenId) return {id:'heygen:'+parsed.heygenId,title,description,language,kind:'embed',
    url:'https://app.heygen.com/embeds/'+parsed.heygenId,poster:'',durationSeconds}
  try {
    const u = new URL(input.url)
    if (u.protocol !== 'https:' || !['vimeo.com','www.vimeo.com'].includes(u.hostname)) return null
    const match = u.pathname.match(/^\/(\d{6,12})\/?$/)
    if (!match || u.search || u.hash) return null
    return {id:'vimeo:'+match[1],title,description,language,kind:'embed',
      url:'https://player.vimeo.com/video/'+match[1]+'?autoplay=1&dnt=1',poster:'',durationSeconds}
  } catch { return null }
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {locale,slug} = await params
  if (!languages.includes(locale as Locale) || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) return {robots:{index:false}}
  const owner = slug === 'andy-litvinov'
  const label = owner ? ownerCopy[locale as Locale].name : (locale==='ru' ? 'Специалист' : locale==='es' ? 'Profesional' : 'Specialist')
  return {title:label+' · My Coach | Holistic House',robots:{index:false,follow:true}}
}

export default async function HumanSpecialistPage({params}: PageProps) {
  const {locale:rawLocale,slug} = await params
  if (!languages.includes(rawLocale as Locale) || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) notFound()
  const locale = rawLocale as Locale
  const isOwner = slug === 'andy-litvinov'
  // Public education must remain available when optional private CRM/app
  // configuration is missing. Never turn an offline private service into a
  // 500 for the specialist's publicly published recordings.
  let config: ReturnType<typeof getAppConfig> | null = null
  try { config = getAppConfig() } catch { /* Private app not configured here. */ }
  const [profileResult, videosResult] = await Promise.allSettled([
    config ? createPractitionerRepository(config).getPublicPractitioner(slug,locale) : Promise.resolve(null),
    getPublishedSiteVideos(),
  ])
  const practitioner: PublicPractitioner | null = profileResult.status === 'fulfilled'
    ? (profileResult.value as PublicPractitioner | null) : null
  // Andrey already has a separately published real-person My Coach card.
  // The approved, first-party public service recordings remain usable if the
  // optional practitioner directory is temporarily unavailable.
  if (!practitioner && !isOwner) notFound()
  const profile = practitioner?.profile
  const owner = ownerCopy[locale]
  const name = profile?.displayName || profile?.name || (isOwner ? owner.name : slug.replaceAll('-', ' '))
  const role = profile?.professionalTitle || (isOwner ? owner.role : '')
  const bio = profile?.shortBio || profile?.fullBio || (isOwner ? owner.bio : '')
  const photo = profile?.photoPath || (isOwner ? '/images/holistic-house/andy-about.png' : '')
  const sourceVideos: RawVideo[] = []
  if (profile?.videoPresentation && config) {
    try {
      const url = publicPresentationUrl(profile.videoPresentation,config.supabaseUrl)
      if (url) sourceVideos.push({title:locale==='ru'?'Знакомство со специалистом':locale==='es'?'Presentación del profesional':'Meet your specialist',
        locale,url,file:profile.videoPresentation.kind==='upload'})
    } catch { /* An invalid publication is never sent to the client. */ }
  }
  for (const item of profile?.videoMaterials || []) sourceVideos.push({
    title:item.title,description:item.description,locale:item.locale,url:item.url,
  })
  if (videosResult.status === 'fulfilled') {
    for (const video of Object.values(videosResult.value)) {
      if (video.practitionerSlug !== slug) continue
      const url = video.heygenId && existingYouTubeMirrors[video.heygenId]
        ? 'https://www.youtube.com/watch?v='+existingYouTubeMirrors[video.heygenId]
        : siteVideoWatchUrl(video)
      if (url) sourceVideos.push({title:video.title,description:video.description||'',
        locale:video.language,url,durationSeconds:video.durationSeconds})
    }
  }
  if (isOwner) {
    for (const language of ['en','ru'] as const) {
      for (const topic of ['overview','alchemy','hypnotherapy','constellations','constellation-case','homeopathy'] as const) {
        const video = getServiceVideoMedia(topic,language).video
        if (video.practitionerSlug !== slug) continue
        const url = video.heygenId && existingYouTubeMirrors[video.heygenId]
          ? 'https://www.youtube.com/watch?v='+existingYouTubeMirrors[video.heygenId]
          : siteVideoWatchUrl(video)
        if(url) sourceVideos.push({title:video.title,description:video.description||'',locale:video.language,url,durationSeconds:video.durationSeconds})
      }
    }
    const english = englishPsychotherapyLandingVideo.video
    sourceVideos.push({title:english.title,description:english.description||'',locale:english.language,
      url:siteVideoWatchUrl(english),durationSeconds:english.durationSeconds})
  }
  const seen = new Set<string>()
  const videos = sourceVideos.map(safeVideo).filter((entry): entry is SpecialistVideo => {
    if (!entry || seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  }).sort((a,b)=>Number(b.language===locale)-Number(a.language===locale)).slice(0,24)
  const service = practitioner?.services.find(item =>
    item.active && !['course','product'].includes(item.offeringType) &&
    (item.areaKey==='emotional_psychological'||item.areaKey==='personal_development'||item.areaKey==='body_somatic'))
    || practitioner?.services.find(item => item.active && !['course','product'].includes(item.offeringType))
  const bookingHref = isOwner ? '/'+locale+'/services/imagery-therapy'
    : service ? getPublicServiceDetailHref(locale,slug,service.slug)
      : '/'+locale+'/masters/'+slug+'#practitioner-services'
  return <HumanSpecialistDialogue locale={locale} slug={slug} name={name} role={role} bio={bio}
    photo={photo} videos={videos} bookingHref={bookingHref} isOwner={isOwner} canMessage={isOwner || practitioner?.canMessage===true}/>
}
