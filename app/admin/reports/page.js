import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { documentPreviewEditHref } from '@/lib/consultations/document-preview-navigation'
import { listClientReportDirectory, parseReportDirectoryQuery } from '@/lib/consultations/report-directory'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { uiLocaleCookie } from '@/lib/ui-locale'
import styles from './reports.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Client reports · Holistic House', robots: { index: false, follow: false }, referrer: 'no-referrer' }

const COPY = {
  en: {
    title: 'Client reports', intro: 'Browse saved client reports, preview and edit them in the same report constructor.',
    back: 'Back to My Practice', create: '+ Create a report', search: 'Search by client', placeholder: 'Client name',
    submit: 'Search', clear: 'Clear', list: 'Saved reports', found: 'reports on this page', clients: 'matching clients',
    unavailable: 'Private report storage is temporarily unavailable.',
    empty: 'No saved reports for these clients yet.', emptyHint: 'Search for another client or create a report.',
    date: 'Report date', active: 'Saved', inactive: 'Access paused', view: 'View', edit: 'Edit',
    file: 'Client history', page: 'Page', of: 'of', previous: 'Previous', next: 'Next',
    legacy: 'Older unassigned documents',
  },
  ru: {
    title: 'Отчёты клиентов', intro: 'Просмотр ранее созданных отчётов и редактирование в том же конструкторе.',
    back: 'Назад к Моей практике', create: '+ Создать отчёт', search: 'Поиск по клиенту', placeholder: 'Имя клиента',
    submit: 'Найти', clear: 'Очистить', list: 'Сохранённые отчёты', found: 'отчётов на странице', clients: 'клиентов в поиске',
    unavailable: 'Хранилище приватных отчётов временно недоступно.',
    empty: 'У этих клиентов пока нет сохранённых отчётов.', emptyHint: 'Найдите другого клиента или создайте отчёт.',
    date: 'Дата отчёта', active: 'Сохранён', inactive: 'Доступ закрыт', view: 'Просмотреть', edit: 'Редактировать',
    file: 'История клиента', page: 'Страница', of: 'из', previous: 'Назад', next: 'Вперёд',
    legacy: 'Старые документы без клиента',
  },
}
function dateLabel(value, locale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—'
  const parsed = new Date(value + 'T12:00:00Z')
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-CA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
export default async function ClientReports({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  const t = COPY[locale]
  const { query, page } = parseReportDirectoryQuery(await searchParams)
  const store = getPrescriptionStore()
  const data = await listClientReportDirectory(store, { query, page })
  const pageHref = number => '/admin/reports?' + new URLSearchParams({ ...(query ? { q: query } : {}), page: String(number) }).toString()
  return <main className={'prescription-admin-shell ' + styles.shell}>
    <PrescriptionAdminHeader title={{ en: COPY.en.title, ru: COPY.ru.title }} description={{ en: COPY.en.intro, ru: COPY.ru.intro }} />
    <div className={styles.top}>
      <Link href={'/' + locale + '/app/practice'} prefetch={false}>← {t.back}</Link>
      <Link href="/admin/reports/new" className={styles.primary} prefetch={false}>{t.create}</Link>
    </div>
    <section className={styles.sheet} aria-label={t.list}>
      <form action="/admin/reports" role="search" method="get" className={styles.search}>
        <label htmlFor="saved-report-client">{t.search}</label>
        <div>
          <input id="saved-report-client" type="search" name="q" autoComplete="off" maxLength={120} defaultValue={query} placeholder={t.placeholder} />
          <button type="submit">{t.submit}</button>
          {query && <Link href="/admin/reports" prefetch={false}>{t.clear}</Link>}
        </div>
      </form>
      <div className={styles.heading}>
        <h2>{t.list}</h2>
        <span>{data.rows.length} {t.found} · {data.totalClients} {t.clients}</span>
      </div>
      {!store && <p role="alert" className={styles.empty}>{t.unavailable}</p>}
      {store && !data.rows.length && <div className={styles.empty}><strong>{t.empty}</strong><p>{t.emptyHint}</p></div>}
      {store && data.rows.length > 0 && <div className={styles.list}>
        {data.rows.map(row => <article key={row.id} className={styles.record}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">{row.clientName.slice(0, 1).toUpperCase()}</span>
            <div className={styles.details}>
              <strong>{row.clientName}</strong>
              <div className={styles.meta}>
                <span>{t.date}: {dateLabel(row.dateIssued, locale)}</span>
                <span className={styles.status} data-active={row.status === 'active' ? 'true' : 'false'}>{row.status === 'active' ? t.active : t.inactive}</span>
              </div>
              <Link href={'/admin/clients/' + encodeURIComponent(row.clientId)} prefetch={false}>{t.file} ↗</Link>
            </div>
          </div>
          <div className={styles.actions}>
            <Link className={styles.view} href={'/admin/documents/' + encodeURIComponent(row.id) + '/view?locale=' + row.clientLocale} prefetch={false}>{t.view}</Link>
            <Link className={styles.primary} href={documentPreviewEditHref(row)} prefetch={false}>{t.edit}</Link>
          </div>
        </article>)}
      </div>}
      {store && data.pageCount > 1 && <nav className={styles.pager} aria-label={t.page}>
        {data.page > 1 ? <Link href={pageHref(data.page - 1)} prefetch={false}>← {t.previous}</Link> : <span />}
        <span>{t.page} {data.page} {t.of} {data.pageCount}</span>
        {data.page < data.pageCount ? <Link href={pageHref(data.page + 1)} prefetch={false}>{t.next} →</Link> : <span />}
      </nav>}
      <p className={styles.legacy}><Link href="/admin/clients/legacy" prefetch={false}>{t.legacy} ↗</Link></p>
    </section>
  </main>
}
