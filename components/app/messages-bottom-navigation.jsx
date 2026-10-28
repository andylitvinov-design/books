import Link from 'next/link'
import {BarChart3,House,MessageCircle,Settings2,Users} from 'lucide-react'

// The same five compact destinations as the private Cabinet's mobile dock.
// Tests, courses and full reports remain accessible from the Account menu.
const ITEMS=[
  {path:'',Icon:House,en:'Home',ru:'Главная',es:'Inicio'},
  {path:'practice',Icon:Users,en:'Practices',ru:'Практики',es:'Prácticas'},
  {path:'messages',Icon:MessageCircle,en:'Requests',ru:'Заявки',es:'Solicitudes'},
  {path:'portfolio',Icon:BarChart3,en:'Progress',ru:'Прогресс',es:'Progreso'},
  {path:'settings',Icon:Settings2,en:'Settings',ru:'Настройки',es:'Ajustes'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const accountLocale=locale==='es'?'en':locale
  return <nav className="hh-mobile-app-nav"
    aria-label={locale==='ru'?'Быстрая навигация':locale==='es'?'Navegación rápida':'Quick navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const label=locale==='ru'?ru:locale==='es'?es:en
      const href=path?'/'+(active?locale:accountLocale)+'/app/'+path:(locale==='en'?'/':'/'+locale)
      return <Link key={path} href={href} prefetch={false}
        className={path===''?'hh-mobile-app-nav-home':undefined}
        aria-label={label} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </Link>
    })}
  </nav>
}
