import Link from 'next/link'
import {BookOpen,ClipboardList,House,Leaf,UserRound} from 'lucide-react'

// The same five compact destinations as the private Cabinet's mobile dock.
// Tests, courses and full reports remain accessible from the Account menu.
const ITEMS=[
  {path:'',Icon:House,en:'Home',ru:'Главная',es:'Inicio'},
  {path:'practice',Icon:Leaf,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'messages',Icon:ClipboardList,en:'Requests',ru:'Заявки',es:'Solicitudes'},
  {path:'materials',Icon:BookOpen,en:'Materials',ru:'Материалы',es:'Materiales'},
  {path:'profile',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const accountLocale=locale==='es'?'en':locale
  return <nav className="hh-mobile-app-nav"
    aria-label={locale==='ru'?'Быстрая навигация':locale==='es'?'Navegación rápida':'Quick navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const label=locale==='ru'?ru:locale==='es'?es:en
      const href=path==='practice'?'/'+locale+'/practice':
        path==='messages'?'/'+locale+'/app/messages':
        path==='materials'?'/'+accountLocale+'/app/practice?panel=materials':
        path==='profile'?'/'+accountLocale+'/app/practice?panel=profile':
        locale==='en'?'/':'/'+locale
      return <Link key={path} href={href} prefetch={false}
        className={path===''?'hh-mobile-app-nav-home':undefined}
        aria-label={label} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </Link>
    })}
  </nav>
}
