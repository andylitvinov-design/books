'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MobileBottomNavigation() {
  const pathname = usePathname()
  if (/^\/(admin|(?:ru|en)\/prescriptions)/.test(pathname)) return null
  const locale = pathname.startsWith('/en/') ? 'en' : 'ru'
  const labels = locale === 'ru'
    ? [['Главная', `/${locale}/homeopathy`], ['Препараты', `/${locale}/homeopathy/remedies`], ['Книги', '/'], ['Сохранённые', `/${locale}/homeopathy/remedies?saved=1`], ['Ещё', `/${locale}/homeopathy#about`]]
    : [['Home', `/${locale}/homeopathy`], ['Remedies', `/${locale}/homeopathy/remedies`], ['Books', '/'], ['Saved', `/${locale}/homeopathy/remedies?saved=1`], ['More', `/${locale}/homeopathy#about`]]
  return <nav aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Mobile navigation'} className="mobile-bottom-navigation">
    {labels.map(([label, href]) => <Link aria-current={pathname === href ? 'page' : undefined} href={href} key={href}>{label}</Link>)}
  </nav>
}
