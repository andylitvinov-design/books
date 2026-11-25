'use client'
import {ArrowRight,BriefcaseBusiness,Film,LockKeyhole,Pencil,PlayCircle,UserRound} from 'lucide-react'
import Image from 'next/image'
import PractitionerPresentationVideo from '@/components/practitioner-presentation-video'
import PractitionerVideoGallery from '@/components/practitioner-video-gallery'
import {publicPresentationUrl} from '@/lib/practitioners/presentation-contract'
import styles from './practice-social-profile.module.css'

const COPY={
 ru:{heading:'Профиль мастера',intro:'Обо мне',empty:'Добавьте информацию о себе, чтобы посетители могли познакомиться с вами.',draft:'Профессиональная информация пока доступна только вам.',video:'Моя видеопрезентация',videoMissing:'Добавьте собственную видеопрезентацию в редакторе профиля.',videoUpload:'Загруженная презентация доступна через существующий редактор профиля.',edit:'Редактировать профиль',offers:'Мои услуги',offersMissing:'Опубликованных услуг пока нет. Добавьте услугу и отправьте её на проверку.',services:'Управлять услугами',media:'Мои опубликованные видео',priceAsk:'Цена по запросу',priceFree:'Бесплатно',priceFrom:'от',book:'Управлять записью',status:'Публикация услуг возможна после модерации.'},
 en:{heading:'Practitioner profile',intro:'About me',empty:'Add an introduction so visitors can get to know you.',draft:'Your professional information is visible only to you until approved.',video:'My video introduction',videoMissing:'Add your own video introduction in the practitioner profile editor.',videoUpload:'Your uploaded introduction can be managed from the existing profile editor.',edit:'Edit practitioner profile',offers:'My services',offersMissing:'No published services yet. Submit your first offering for review.',services:'Manage services',media:'My published videos',priceAsk:'Price on request',priceFree:'Free',priceFrom:'from',book:'Manage bookings',status:'Services become public after moderation.'},
 es:{heading:'Perfil profesional',intro:'Sobre mí',empty:'Añade una descripción para presentarte.',draft:'Tu perfil profesional es privado hasta su aprobación.',video:'Mi vídeo de presentación',videoMissing:'Añade tu presentación en vídeo en el editor profesional.',videoUpload:'Gestiona la presentación cargada desde el editor de perfil.',edit:'Editar perfil profesional',offers:'Mis servicios',offersMissing:'Aún no hay servicios publicados. Envía tu primera propuesta a revisión.',services:'Gestionar servicios',media:'Mis vídeos publicados',priceAsk:'Precio a consultar',priceFree:'Gratis',priceFrom:'desde',book:'Gestionar reservas',status:'La publicación requiere moderación.'}
}
function priceFor(service,t){
 if(service.pricingMode==='free')return t.priceFree
 const amount=Number(service.confirmedPrice)
 if((service.pricingMode==='fixed'||service.pricingMode==='from')&&Number.isFinite(amount)&&amount>=0){
  try{
   const formatted=new Intl.NumberFormat('en-CA',{style:'currency',currency:service.currency||'CAD',maximumFractionDigits:0}).format(amount)
   return service.pricingMode==='from'?t.priceFrom+' '+formatted:formatted
  }catch{return t.priceAsk}
 }
 return t.priceAsk
}
export default function PracticeSocialProfile({locale='en',practitioner,services=[],signedIn=false,storageOrigin='',onAction}){
 const language=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[language]
 if(!signedIn)return null
 const approved=practitioner?.profile||null
 const profile=approved||practitioner?.draftProfile||null
 const name=String(profile?.displayName||'').trim()
 const path=profile?.photoPath
 const photo=typeof path==='string'&&(path.startsWith('https://')||(path.startsWith('/')&&!path.startsWith('//')))?path:null
 const description=String(profile?.shortBio||profile?.fullBio||'').trim()
 const published=services.filter(s=>s.status==='published')
 const externalIntro=approved?.videoPresentation?.kind==='external'?approved.videoPresentation:null
 const uploadedIntro=approved?.videoPresentation?.kind==='upload'
 let uploadedUrl=''
 if(uploadedIntro&&storageOrigin){
  try{uploadedUrl=publicPresentationUrl(approved.videoPresentation,storageOrigin)}
  catch{uploadedUrl=''}
 }
 const playableIntro=externalIntro||(uploadedIntro&&uploadedUrl?approved.videoPresentation:null)
 const videos=Array.isArray(approved?.videoMaterials)?approved.videoMaterials:[]
 return <section className={styles.social} data-practitioner-social-profile aria-label={t.heading}>
  <div className={styles.identity}>
   <div className={styles.avatar} aria-hidden="true">{photo?<Image src={photo} alt="" width={85} height={85} unoptimized/>:name?name.slice(0,1).toUpperCase():<UserRound size={32}/>}</div>
   <div className={styles.about}><span className={styles.eyebrow}><BriefcaseBusiness size={15}/>{t.heading}</span>
    <h2>{name||t.heading}</h2>
    {profile?.professionalTitle?<strong>{profile.professionalTitle}</strong>:null}
    <span className={styles.subheading}>{t.intro}</span>
    <p>{description||t.empty}</p>
    {!approved?<p className={styles.draft}><LockKeyhole size={14}/>{t.draft}</p>:null}
   </div>
  </div>
  <div className={styles.topActions}>
   <button type="button" onClick={()=>onAction('profile')} className={styles.primary}><Pencil size={18}/>{t.edit}</button>
   <button type="button" onClick={()=>onAction('requests')} className={styles.secondary}>{t.book}<ArrowRight size={18}/></button>
  </div>
  <section className={styles.block} aria-label={t.video}>
   <h3><PlayCircle size={22} aria-hidden="true"/>{t.video}</h3>
   {playableIntro?<PractitionerPresentationVideo video={playableIntro} locale={language} playbackUrl={uploadedUrl}/>:
    <div className={styles.emptyVideo}><Film size={28} aria-hidden="true"/><p>{uploadedIntro?t.videoUpload:t.videoMissing}</p>
     <button type="button" onClick={()=>onAction('profile')} className={styles.textButton}>{t.edit}<ArrowRight size={16}/></button></div>}
  </section>
  <section className={styles.block} aria-label={t.offers}>
   <header className={styles.blockHeader}><h3><BriefcaseBusiness size={22}/>{t.offers}</h3><button type="button" onClick={()=>onAction('services')} className={styles.textButton}>{t.services}<ArrowRight size={16}/></button></header>
   {published.length?<div className={styles.services}>{published.slice(0,5).map((service,index)=>{
    const details=service.copy?.[language]||service.copy?.en||{}
    return <article className={styles.service} key={service.id||service.slug||index}>
      <div className={styles.servicePhoto+' '+styles['art'+index%3]} aria-hidden="true"/>
      <div className={styles.serviceBody}><strong>{details.title||service.slug}</strong><p>{details.shortDescription||''}</p><small>{priceFor(service,t)}{service.durationMinutes?' · '+service.durationMinutes+' min':''}</small></div>
      <button type="button" className={styles.openService} onClick={()=>onAction('services')} aria-label={t.services}><ArrowRight size={20}/></button>
    </article>
   })}</div>:<p className={styles.placeholder}>{t.offersMissing}</p>}
   <p className={styles.status}>{t.status}</p>
  </section>
  {videos.length?<section className={styles.block} aria-label={t.media}><PractitionerVideoGallery videos={videos} locale={language} variant="compact"/></section>:null}
 </section>
}
