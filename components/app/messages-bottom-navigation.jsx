import Link from 'next/link'
import {BarChart3,BookOpen,ClipboardList,House,MessageCircle,UserRound,Users} from 'lucide-react'

// The dedicated Messages route is outside AppWorkspace but preserves its
// fixed seven-item Cabinet navigation without loading the full dashboard.
const ITEMS=[
  {path:'portrait',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
  {path:'tests',Icon:ClipboardList,en:'Tests',ru:'Тесты',es:'Pruebas'},
  {path:'portfolio',Icon:BarChart3,en:'Reports',ru:'Отчёты',es:'Informes'},
  {path:'course?view=courses',Icon:BookOpen,en:'Courses',ru:'Курсы',es:'Cursos'},
  {path:'practice',Icon:Users,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'messages',Icon:MessageCircle,en:'Messages',ru:'Сообщения',es:'Mensajes'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const fallbackLocale=locale==='es'?'en':locale
  const home=locale==='en'?'/':'/'+locale
  return <nav className="hh-mobile-app-nav" aria-label={locale==='ru'?'Меню кабинета':locale==='es'?'Menú de cuenta':'Account navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const name=locale==='ru'?ru:locale==='es'?es:en
      const href='/'+(active?locale:fallbackLocale)+'/app/'+path
      return <Link key={path} href={href} prefetch={false} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{name}</span>
      </Link>
    })}
    <Link href={home} prefetch={false} className="hh-mobile-app-nav-home"
      aria-label={locale==='ru'?'На главную Holistic House':locale==='es'?'Inicio de Holistic House':'Holistic House homepage'}>
      <House aria-hidden="true" size={22}/><span>{locale==='ru'?'Главная':locale==='es'?'Inicio':'Home'}</span>
    </Link>
  </nav>
}
