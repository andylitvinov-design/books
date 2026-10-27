import Link from 'next/link'
import {BarChart3,BookOpen,ClipboardList,House,MessageCircle,UserRound,Users} from 'lucide-react'

// Match the authenticated Cabinet's six sections plus Home, in its actual order.
// The same classes and seven-column workspace CSS are used on all private pages.
const ITEMS=[
  {path:'portrait',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
  {path:'tests',Icon:ClipboardList,en:'Tests',ru:'Тесты',es:'Pruebas'},
  {path:'portfolio',Icon:BarChart3,en:'Reports',ru:'Отчёты',es:'Informes'},
  {path:'course?view=courses',Icon:BookOpen,en:'Courses',ru:'Курсы',es:'Cursos'},
  {path:'practice',Icon:Users,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'messages',Icon:MessageCircle,en:'Messages',ru:'Сообщения',es:'Mensajes'},
]
export default function MessagesBottomNavigation({locale='en'}){
  const accountLocale=locale==='es'?'en':locale
  return <nav className="hh-mobile-app-nav"
    aria-label={locale==='ru'?'Быстрая навигация':locale==='es'?'Navegación rápida':'Quick navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path==='messages'
      const label=locale==='ru'?ru:locale==='es'?es:en
      const href='/'+(active?locale:accountLocale)+'/app/'+path
      return <Link key={path} href={href} prefetch={false} aria-label={label} aria-current={active?'page':undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </Link>
    })}
    <Link href={locale==='ru'?'/ru':'/'} className="hh-mobile-app-nav-home" prefetch={false}
      aria-label={locale==='ru'?'На главную страницу Holistic House':locale==='es'?'Ir al inicio de Holistic House':'Go to Holistic House homepage'}>
      <House aria-hidden="true" size={22}/><span>{locale==='ru'?'Главная':locale==='es'?'Inicio':'Home'}</span>
    </Link>
  </nav>
}
