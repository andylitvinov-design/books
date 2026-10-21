'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { logout } from '@/app/admin/logout/actions'
import { readUiLocale, saveUiLocale } from '@/lib/ui-locale'

export function PrescriptionAdminHeader({ title, description, initialLocale = 'en', compactMarketing = false }) {
  const [locale, setLocale] = useState(initialLocale === 'ru' ? 'ru' : 'en')
  const labels = locale === 'ru'
    ? { cabinet: 'Кабинет', practice: 'Моя практика', marketing: 'Маркетинг', acquisition: 'Кампании', newConsultation: 'Новая консультация', reports: 'Отчёты', clients: 'Клиенты', legacy: 'Архив', materials: 'Материалы', videos: 'Видео сайта', seo:'SEO', growth:'Продвижение', youtubeUploader: 'Загрузка в YouTube', reikiAudio: 'Курсы', more: 'Ещё', telegram: 'Telegram', logout: 'Выйти', language: 'Язык интерфейса' }
    : { cabinet: 'Cabinet', practice: 'My Practice', marketing: 'Marketing', acquisition: 'Campaigns', newConsultation: 'New consultation', reports: 'Reports', clients: 'Clients', legacy: 'Legacy', materials: 'Materials', videos: 'Website videos', seo:'SEO', growth:'Growth Studio', youtubeUploader: 'YouTube upload', reikiAudio: 'Courses', more: 'More', telegram: 'Telegram', logout: 'Logout', language: 'Interface language' }

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
        <Link className="prescription-admin-wordmark" href={"/"+locale+"/app/practice"}>
          <strong>Holistic House</strong>
          <span>{compactMarketing ? labels.marketing : labels.practice}</span>
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

      {compactMarketing ? <nav aria-label={labels.marketing} className="prescription-admin-navigation prescription-admin-navigation--tabs">
        <Link href={`/${locale}/app/practice?panel=marketing`}>{labels.practice}</Link>
        <Link href="/admin/growth-studio">{labels.growth}</Link>
        <Link href="/admin/seo">{labels.seo}</Link>
        <Link href="/admin/acquisition">{labels.acquisition}</Link>
      </nav> : <div className="prescription-admin-v4-shell-nav" data-admin-unified-nav>
        <nav aria-label={labels.cabinet} className="prescription-admin-navigation prescription-admin-navigation--tabs">
          <Link href={'/'+locale+'/app/practice'}>{labels.practice}</Link>
          <Link href="/admin/clients">{labels.clients}</Link>
          <Link href="/admin/materials">{labels.materials}</Link>
          <Link href="/admin/materials/courses">{labels.reikiAudio}</Link>
          <Link href="/admin/reports">{labels.reports}</Link>
        </nav>
        <details className="prescription-admin-v4-more"><summary>{labels.more} ▾</summary>
          <nav aria-label={labels.more} className="prescription-admin-navigation prescription-admin-navigation--tabs">
            <Link href="/admin/tools">{labels.more}</Link>
            <Link href="/admin/consultations/new">{labels.newConsultation}</Link>
            <Link href="/admin/seo">{labels.seo}</Link>
            <Link href="/admin/growth-studio">{labels.growth}</Link>
            <Link href="/admin/clients/legacy">{labels.legacy}</Link>
            <Link href="/admin/videos">{labels.videos}</Link>
            <Link href="/admin/youtube-upload">{labels.youtubeUploader}</Link>
            <Link href="/admin/telegram-setup">{labels.telegram}</Link>
          </nav>
        </details>
      </div>}
    </header>
  )
}
