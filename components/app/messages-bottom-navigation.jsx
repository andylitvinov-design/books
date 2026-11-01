import Link from 'next/link'
import {BookOpen,MessageCircle,House,Leaf,UserRound,Sparkles} from 'lucide-react'

// Preserve the existing five destinations and append the shared AI video chat.
// Tests, courses and full reports remain accessible from the Account menu.
const ITEMS=[
  {path:'',Icon:House,en:'Home',ru:'Главная',es:'Inicio'},
  {path:'practice',Icon:Leaf,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'messages',Icon:MessageCircle,en:'Messages',ru:'Сообщения',es:'Mensajes'},
  {path:'materials',Icon:BookOpen,en:'Materials',ru:'Материалы',es:'Materiales'},
  {path:'profile',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
  {path:'video-ai',Icon:Sparkles,en:'AI',ru:'ИИ',es:'IA'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const accountLocale=locale==='es'?'en':locale
  return <nav className="hh-mobile-app-nav"
    aria-label={locale==='ru'?'Быстрая навигация':locale==='es'?'Navegación rápida':'Quick navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const label=locale==='ru'?ru:locale==='es'?es:en
      // Practice is the approved five-tab public dashboard before and after Google sign-in.
      // Private editing still uses /app/practice?panel=...; the dock never opens the old landing.
      const href=path==='practice'?'/'+locale+'/practice':
        path==='messages'?'/'+locale+'/app/messages':
        path==='materials'?'/'+accountLocale+'/app/practice?panel=materials':
        path==='profile'?'/'+accountLocale+'/app/practice?panel=profile':
        path==='video-ai'?'/'+locale+'/holistic-support/mandala#video-director-chat':
        locale==='en'?'/':'/'+locale
      return <Link key={path} href={href} prefetch={false}
        className={path===''?'hh-mobile-app-nav-home':undefined}
        aria-label={label} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </Link>
    })}
  </nav>
}
