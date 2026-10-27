import Link from 'next/link'
import {BookOpen,ClipboardList,MessageCircle,UserRound,Users} from 'lucide-react'

// The standalone Messages workspace has five app destinations, not a
// cramped seven-item website/Cabinet footer. All screens retain one account.
const ITEMS=[
  {path:'messages',Icon:MessageCircle,en:'Messages',ru:'Сообщения',es:'Mensajes'},
  {path:'practice?panel=clients',Icon:Users,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'portrait',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
  {path:'tests',Icon:ClipboardList,en:'Tests',ru:'Тесты',es:'Pruebas'},
  {path:'course?view=courses',Icon:BookOpen,en:'Courses',ru:'Курсы',es:'Cursos'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const accountLocale=locale==='es'?'en':locale
  return <nav className="hh-mobile-app-nav hh-messages-app-dock"
    aria-label={locale==='ru'?'Меню приложения Holistic House':locale==='es'?'Menú de Holistic House':'Holistic House app navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const label=locale==='ru'?ru:locale==='es'?es:en
      const href='/'+(active?locale:accountLocale)+'/app/'+path
      return <Link key={path} href={href} prefetch={false} aria-label={label} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </Link>
    })}
  </nav>
}
