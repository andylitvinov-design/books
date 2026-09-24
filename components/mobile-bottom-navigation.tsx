'use client'

import { BookOpen, House, Leaf, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Locale } from '@/data/remedies'
import { readUiLocale } from '@/lib/ui-locale'

export function MobileBottomNavigation() {
  const pathname = usePathname()
  const pathLocale = pathname.startsWith('/en/') ? 'en' : pathname.startsWith('/ru/') ? 'ru' : null
  const [preference, setPreference] = useState<Locale>('ru')

  useEffect(() => {
    const syncLocale = (event?: Event) => {
      const custom = event as CustomEvent<Locale> | undefined
      const next = custom?.detail ?? readUiLocale(document.cookie)
      setPreference(next === 'en' ? 'en' : 'ru')
    }

    syncLocale()
    window.addEventListener('ui-locale-change', syncLocale)
    return () => window.removeEventListener('ui-locale-change', syncLocale)
  }, [])

  const locale: Locale = (pathLocale ?? preference) as Locale
  const items = locale === 'ru'
    ? [
        { label: 'Главная', href: '/', icon: House },
        { label: 'Книга', href: '/books', icon: BookOpen },
        { label: 'Препараты', href: '/ru/homeopathy', icon: Leaf },
        { label: 'Услуги', href: '/ru/services', icon: Sparkles },
        { label: 'Обо мне', href: '/ru/about', icon: UserRound },
      ]
    : [
        { label: 'Home', href: '/', icon: House },
        { label: 'Book', href: '/books', icon: BookOpen },
        { label: 'Remedies', href: '/en/homeopathy', icon: Leaf },
        { label: 'Services', href: '/en/services', icon: Sparkles },
        { label: 'About', href: '/en/about', icon: UserRound },
      ]

  if (/^\/(admin|(?:ru|en)\/prescriptions)/.test(pathname)) return null

  return (
    <nav aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Mobile navigation'} className="mobile-bottom-navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link aria-current={current ? 'page' : undefined} data-home-active={href === '/' && pathname === '/' ? 'true' : undefined} href={href} key={href}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
