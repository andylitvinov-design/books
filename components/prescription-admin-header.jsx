'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { logout } from '@/app/admin/logout/actions'
import { readUiLocale, saveUiLocale } from '@/lib/ui-locale'

export function PrescriptionAdminHeader({ title, description }) {
  const [locale, setLocale] = useState('ru')
  const labels = locale === 'ru'
    ? { cabinet: 'Кабинет', newConsultation: 'Новая консультация', clients: 'Клиенты', legacy: 'Архив', logout: 'Выйти', language: 'Язык интерфейса' }
    : { cabinet: 'Cabinet', newConsultation: 'New consultation', clients: 'Clients', legacy: 'Legacy', logout: 'Logout', language: 'Interface language' }

  useEffect(() => setLocale(readUiLocale(document.cookie)), [])

  function selectLocale(nextLocale) {
    setLocale(nextLocale)
    saveUiLocale(nextLocale)
  }

  const localizedTitle = typeof title === 'object' ? (title?.[locale] ?? title?.en ?? title?.ru ?? '') : title
  const localizedDescription = typeof description === 'object' ? (description?.[locale] ?? description?.en ?? description?.ru ?? '') : description

  return (
    <header className="prescription-admin-header prescription-admin-header--refined">
      <div className="prescription-admin-topbar">
        <Link className="prescription-admin-wordmark" href="/">
          <strong>Holistic House</strong>
          <span>{labels.cabinet}</span>
        </Link>
        <div className="prescription-admin-header-actions">
          <span aria-label={labels.language} className="site-language-switch">
            <button aria-pressed={locale === 'ru'} lang="ru" onClick={() => selectLocale('ru')} type="button">RU</button>
            <button aria-pressed={locale === 'en'} lang="en" onClick={() => selectLocale('en')} type="button">EN</button>
          </span>
          <form action={logout}><button className="prescription-admin-logout" type="submit">{labels.logout}</button></form>
        </div>
      </div>

      <div className="prescription-admin-titleblock">
        <h1>{localizedTitle}</h1>
        {localizedDescription && <p className="prescription-admin-description">{localizedDescription}</p>}
      </div>

      <nav aria-label={labels.cabinet} className="prescription-admin-navigation prescription-admin-navigation--tabs">
        <Link href="/admin">{labels.cabinet}</Link>
        <Link href="/admin/consultations/new">{labels.newConsultation}</Link>
        <Link href="/admin/clients">{labels.clients}</Link>
        <Link href="/admin/clients/legacy">{labels.legacy}</Link>
      </nav>
    </header>
  )
}
