'use client'
import { BookOpen, House, Leaf, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Locale } from '@/data/remedies'
import { readUiLocale } from '@/lib/ui-locale'
export function MobileBottomNavigation() {
  const pathname = usePathname()
  const pathLocale = pathname.startsWith('/en/') ? 'en' : pathname.startsWith('/ru/') ? 'ru' : /^\/es(?:\/|$)/.test(pathname) ? 'es' : null
  const [preference, setPreference] = useState<Locale>('ru')
  useEffect(() => {
    const syncLocale = (event?: Event) => {
      const custom = event as CustomEvent<Locale> | undefined
      const next = custom?.detail ?? readUiLocale(document.cookie)
      setPreference(next === 'en' ? 'en' : 'ru')
    }
    syncLocale()
    window.addEventListener('ui-locale-change', syncLocale)
    window.addEventListener('holistic-house-ui-locale', syncLocale)
    return () => { window.removeEventListener('ui-locale-change', syncLocale); window.removeEventListener('holistic-house-ui-locale', syncLocale) }
  }, [])
  const locale = pathLocale ?? preference
  const items = locale === 'es' ? [
    { label: 'Inicio', href: '/es', icon: House },
    { label: 'Libros', href: '/es/books', icon: BookOpen },
    { label: 'Remedios', href: '/es/homeopathy', icon: Leaf },
    { label: 'Servicios', href: '/es/services', icon: Sparkles },
    { label: 'Sobre mí', href: '/es/about', icon: UserRound },
  ] : locale === 'ru' ? [
    { label: 'Главная', href: '/', icon: House },
    { label: 'Книга', href: 'https://designrr.page/?id=367554&token=1057485987&h=4958', icon: BookOpen, external: true },
    { label: 'Препараты', href: '/ru/homeopathy', icon: Leaf },
    { label: 'Услуги', href: '/ru/services', icon: Sparkles },
    { label: 'Обо мне', href: '/ru/about', icon: UserRound },
  ] : [
    { label: 'Home', href: '/', icon: House },
    { label: 'Book', href: 'https://designrr.page/?id=377444&token=639498968&h=5264', icon: BookOpen, external: true },
    { label: 'Remedies', href: '/en/homeopathy', icon: Leaf },
    { label: 'Services', href: '/en/services', icon: Sparkles },
    { label: 'About', href: '/en/about', icon: UserRound },
  ]
  if (/^\/(admin|(?:ru|en)\/prescriptions)/.test(pathname)) return null
  return <nav aria-label={locale === 'es' ? 'Navegación móvil' : locale === 'ru' ? 'Мобильная навигация' : 'Mobile navigation'} className="mobile-bottom-navigation">{items.map(({ label, href, icon: Icon, external }) => {
    const home = href === '/' || href === '/es'
    const current = !external && (home ? pathname === href : pathname === href || pathname.startsWith(href + '/'))
    const content = <><Icon aria-hidden="true" /><span>{label}</span></>
    return external ? <a href={href} key={href}>{content}</a> : <Link aria-current={current ? 'page' : undefined} data-home-active={home && current ? 'true' : undefined} href={href} key={href}>{content}</Link>
  })}</nav>
}
