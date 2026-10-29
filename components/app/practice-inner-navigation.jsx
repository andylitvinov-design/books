'use client'
import Link from 'next/link'
import {Bell,BookOpen,ChevronLeft,ClipboardList,Home,Leaf,UserRound} from 'lucide-react'
import showcaseStyles from '../practice-showcase.module.css'

// One visual navigation shared by the EXISTING protected practice panels.
// All actions reuse the current handlers; this creates no separate client/CRM store.
const WORDS={
 en:{
  home:'Home',practice:'Practice',practiceHome:'Practitioner workspace',requests:'Requests',materials:'Materials',profile:'Profile',
  clientsTitle:'Client records',clientsIntro:'Private requests, history and next actions',
  requestsTitle:'Requests',requestsIntro:'Enquiries and follow-ups in one place',
  materialsTitle:'My materials',materialsIntro:'Lessons, recordings and files for your clients',
  profileTitle:'Practitioner profile',profileIntro:'Manage the details your clients can see',
  analyticsTitle:'Practice insights',analyticsIntro:'Your real activity and service statistics',
  servicesTitle:'My services',servicesIntro:'Create, edit and submit your offerings for review',
  moreTitle:'More practice tools',moreIntro:'Events, reporting and additional options',
  back:'Back to practice',alerts:'Open requests',
 },
 ru:{
  home:'Главная',practice:'Практика',practiceHome:'Кабинет практика',requests:'Заявки',materials:'Материалы',profile:'Профиль',
  clientsTitle:'Карточки клиентов',clientsIntro:'История, обращения и следующие шаги',
  requestsTitle:'Заявки',requestsIntro:'Обращения, заказы и ответы в одном месте',
  materialsTitle:'Мои материалы',materialsIntro:'Уроки, записи и файлы для ваших клиентов',
  profileTitle:'Профиль мастера',profileIntro:'Информация о вашей практике и услугах',
  analyticsTitle:'Аналитика практики',analyticsIntro:'Настоящие показатели работы и услуг',
  servicesTitle:'Мои услуги',servicesIntro:'Создавайте и редактируйте предложения, отправляйте на проверку',
  moreTitle:'Другие инструменты',moreIntro:'Мероприятия, отчёты и дополнительные возможности',
  back:'К практике',alerts:'Открыть заявки',
 },
 es:{
  home:'Inicio',practice:'Práctica',practiceHome:'Espacio profesional',requests:'Solicitudes',materials:'Materiales',profile:'Perfil',
  clientsTitle:'Fichas de clientes',clientsIntro:'Solicitudes privadas, historial y siguientes pasos',
  requestsTitle:'Solicitudes',requestsIntro:'Solicitudes, pedidos y respuestas en un solo lugar',
  materialsTitle:'Mis materiales',materialsIntro:'Lecciones, grabaciones y archivos para tus clientes',
  profileTitle:'Perfil profesional',profileIntro:'La información visible de tu práctica',
  analyticsTitle:'Análisis de práctica',analyticsIntro:'Actividad y estadísticas reales de los servicios',
  servicesTitle:'Mis servicios',servicesIntro:'Crear y editar propuestas antes de su revisión',
  moreTitle:'Más herramientas',moreIntro:'Eventos, informes y otras opciones',
  back:'Volver a la práctica',alerts:'Ver solicitudes',
 },
}
const PANELS=new Set(['requests','clients','materials','profile','analytics','services','more','crm','marketing','events','express-reports'])
const TAB_ITEMS=[
 {key:'home',Icon:Home},{key:'practice',Icon:Leaf},{key:'requests',Icon:ClipboardList},
 {key:'materials',Icon:BookOpen},{key:'profile',Icon:UserRound},
]
export function PracticeInnerHeader({locale='en',panel,requests=[],onBack,onNavigate}){
 if(!PANELS.has(panel))return null
 const t=WORDS[locale]||WORDS.en
 const titles={requests:t.requestsTitle,clients:t.clientsTitle,materials:t.materialsTitle,
  profile:t.profileTitle,analytics:t.analyticsTitle,services:t.servicesTitle,
  more:t.moreTitle,crm:'CRM',marketing:t.moreTitle,events:t.moreTitle,'express-reports':t.moreTitle}
 const intros={requests:t.requestsIntro,clients:t.clientsIntro,materials:t.materialsIntro,
  profile:t.profileIntro,analytics:t.analyticsIntro,services:t.servicesIntro,
  more:t.moreIntro,crm:t.moreIntro,marketing:t.moreIntro,events:t.moreIntro,'express-reports':t.moreIntro}
 const count=requests.filter(item=>item?.status==='requested').length
 return <header className="hh-practice-inner-header" data-practice-inner-header data-panel={panel}>
  <button type="button" className="hh-practice-inner-back" onClick={onBack} aria-label={t.back}>
   <ChevronLeft size={22} aria-hidden="true"/>
  </button>
  <div className="hh-practice-inner-heading">
    <div className={showcaseStyles.eyebrow} data-practice-original-home-link>
     <Link href={'/'+locale+'/practice'} prefetch={false}
       style={{display:'inline-flex',alignItems:'center',gap:5,color:'inherit',textDecoration:'none'}}>
       <Leaf size={15} aria-hidden="true"/>{t.practiceHome}
     </Link>
    </div>
    <h2>{titles[panel]}</h2><p>{intros[panel]}</p>
   </div>
  <button type="button" className="hh-practice-inner-alert" onClick={()=>onNavigate('requests')} aria-label={t.alerts}>
   <Bell size={20} aria-hidden="true"/>
   {count>0&&<span className="hh-practice-inner-unread" aria-hidden="true"/>}
  </button>
 </header>
}
export function PracticeInnerBottomNavigation({locale='en',panel,onBack,onNavigate,onOpenMaterials}){
 if(!PANELS.has(panel))return null
 const t=WORDS[locale]||WORDS.en
 return <nav className="hh-practice-inner-dock" data-practice-inner-dock
  aria-label={locale==='ru'?'Навигация кабинета':locale==='es'?'Navegación de práctica':'Practice navigation'}>
  {TAB_ITEMS.map(({key,Icon})=>{
   const selected=key==='practice'?(!['requests','materials','profile'].includes(panel)):
     key==='requests'?panel==='requests':key==='materials'?panel==='materials':key==='profile'?panel==='profile':false
   const child=<><Icon aria-hidden="true" size={22}/><span>{t[key]}</span></>
   return key==='home'
     ? <Link key={key} href={locale==='en'?'/':'/'+locale} prefetch={false}>{child}</Link>
     : <button key={key} type="button" aria-current={selected?'page':undefined}
         onClick={key==='practice'?onBack:key==='materials'?()=>onOpenMaterials('courses'):()=>onNavigate(key)}>
         {child}
       </button>
  })}
 </nav>
}
