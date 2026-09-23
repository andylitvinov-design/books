'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { logout } from '@/app/admin/logout/actions'
import { readUiLocale, saveUiLocale } from '@/lib/ui-locale'

export function PrescriptionAdminHeader({ title, description }) {
  const [locale, setLocale] = useState('ru')
  const labels = locale === 'ru'
    ? { cabinet: 'Кабинет', newConsultation: 'Новая консультация', clients: 'Клиенты', legacy: 'Нераспределённые старые документы', logout: 'Выйти', language: 'Язык интерфейса' }
    : { cabinet: 'Cabinet', newConsultation: 'New consultation', clients: 'Clients', legacy: 'Unassigned legacy documents', logout: 'Logout', language: 'Interface language' }

  useEffect(() => setLocale(readUiLocale(document.cookie)), [])

  function selectLocale(nextLocale) {
    setLocale(nextLocale)
    saveUiLocale(nextLocale)
  }

  const localizedTitle = typeof title === 'object' ? (title?.[locale] ?? title?.en ?? title?.ru ?? '') : title
  const localizedDescription = typeof description === 'object' ? (description?.[locale] ?? description?.en ?? description?.ru ?? '') : description

  return (
    <header className="prescription-admin-header">
      <div>
        <p className="prescription-admin-brand"><Link href="/">Holistic House</Link> · <Link href="/admin">{labels.cabinet}</Link></p>
        <nav aria-label={labels.cabinet} className="prescription-admin-navigation"><Link href="/admin/consultations/new">{labels.newConsultation}</Link><Link href="/admin/clients">{labels.clients}</Link><Link href="/admin/clients/legacy">{labels.legacy}</Link></nav>
        <h1>{localizedTitle}</h1>
        {localizedDescription && <p className="prescription-admin-description">{localizedDescription}</p>}
      </div>
      <div className="prescription-admin-header-actions"><span aria-label={labels.language} className="site-language-switch"><button aria-pressed={locale === 'ru'} lang="ru" onClick={() => selectLocale('ru')} type="button">RU</button><button aria-pressed={locale === 'en'} lang="en" onClick={() => selectLocale('en')} type="button">EN</button></span><form action={logout}><button type="submit">{labels.logout}</button></form></div>
    </header>
  )
}
