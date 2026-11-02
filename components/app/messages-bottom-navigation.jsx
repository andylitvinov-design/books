'use client'
import {useEffect,useRef} from 'react'
import {mobileVisualBottomGap} from '@/lib/mobile-visual-bottom.mjs'
import Link from 'next/link'
import {BookOpen,MessageCircle,House,Leaf,UserRound} from 'lucide-react'

// The same five compact destinations as the private Cabinet's mobile dock.
// Tests, courses and full reports remain accessible from the Account menu.
const ITEMS=[
  {path:'',Icon:House,en:'Home',ru:'Главная',es:'Inicio'},
  {path:'practice',Icon:Leaf,en:'Practice',ru:'Практика',es:'Práctica'},
  {path:'messages',Icon:MessageCircle,en:'Messages',ru:'Сообщения',es:'Mensajes'},
  {path:'materials',Icon:BookOpen,en:'Materials',ru:'Материалы',es:'Materiales'},
  {path:'profile',Icon:UserRound,en:'Profile',ru:'Профиль',es:'Perfil'},
]
export default function MessagesBottomNavigation({locale='en',activeSection='messages'}){
  const accountLocale=locale==='es'?'en':locale
  const navRef=useRef(null)
  useEffect(()=>{
    const nav=navRef.current
    if(!nav)return
    const viewport=window.visualViewport
    let frame=0
    const update=()=>{
      if(frame)return
      frame=window.requestAnimationFrame(()=>{
        frame=0
        if(!nav.isConnected)return
        const focused=document.activeElement
        const editing=focused?.matches?.('input,textarea,[contenteditable="true"],[role="textbox"]')
        nav.toggleAttribute('data-editor-focused',Boolean(editing))
        if(getComputedStyle(nav).display==='none'||window.innerWidth>760)return
        const inset=mobileVisualBottomGap({
          layoutHeight:window.innerHeight,
          visualHeight:viewport?.height??window.innerHeight,
          visualOffsetTop:viewport?.offsetTop??0,
        })
        document.body.style.setProperty('--hh-app-visual-bottom-inset',inset+'px')
        document.body.style.setProperty('--hh-app-mobile-nav-height',Math.ceil(nav.getBoundingClientRect().height)+'px')
      })
    }
    update()
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(update):null
    observer?.observe(nav)
    window.addEventListener('scroll',update,{passive:true})
    window.addEventListener('resize',update,{passive:true})
    window.addEventListener('orientationchange',update)
    window.addEventListener('pageshow',update)
    document.addEventListener('focusin',update)
    document.addEventListener('focusout',update)
    viewport?.addEventListener('resize',update,{passive:true})
    viewport?.addEventListener('scroll',update,{passive:true})
    return ()=>{
      observer?.disconnect()
      if(frame)window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll',update)
      window.removeEventListener('resize',update)
      window.removeEventListener('orientationchange',update)
      window.removeEventListener('pageshow',update)
      document.removeEventListener('focusin',update)
      document.removeEventListener('focusout',update)
      viewport?.removeEventListener('resize',update)
      viewport?.removeEventListener('scroll',update)
      document.body.style.removeProperty('--hh-app-visual-bottom-inset')
      document.body.style.removeProperty('--hh-app-mobile-nav-height')
      nav.removeAttribute('data-editor-focused')
    }
  },[])
  return <nav ref={navRef} className="hh-mobile-app-nav"
    aria-label={locale==='ru'?'Быстрая навигация':locale==='es'?'Navegación rápida':'Quick navigation'}>
    {ITEMS.map(({path,Icon,en,ru,es})=>{
      const active=path===activeSection
      const label=locale==='ru'?ru:locale==='es'?es:en
      // Practice is the approved five-tab public dashboard before and after Google sign-in.
      // Private editing still uses /app/practice?panel=...; the dock never opens the old landing.
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
