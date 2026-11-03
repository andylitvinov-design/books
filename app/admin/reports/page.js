import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { DeleteReportButton } from '@/components/owner-delete-controls'
import { deleteSavedReportAction } from './actions'
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
    title: 'Client reports', intro: 'Review and edit saved client reports.',
    back: 'My Practice', create: '+ New report', search: 'Search by client', placeholder: 'Client name',
    submit: 'Search', clear: 'Clear', list: 'Saved reports', found: 'Reports on page', clients: 'Clients found',
    unavailable: 'Private report storage is temporarily unavailable.',
    empty: 'No saved reports for these clients yet.', emptyHint: 'Search for another client or create a report.',
    date: 'Report date', active: 'Saved', inactive: 'Access paused', view: 'View', edit: 'Edit',
    file: 'Client history', page: 'Page', of: 'of', previous: 'Previous', next: 'Next',
    legacy: 'Older unassigned documents', sortLabel: 'Sort reports', byDate: 'By report date', byClient: 'By client name',
    delete: 'Delete report', deleteConfirm: 'Permanently delete this report? Its private viewing link will stop working. Client details and invoices are retained.',
    deleted: 'Report deleted.', changed: 'This report changed or was already removed. Reload and try again.',
    storageError: 'The report could not be deleted because storage is unavailable.',
  },
  ru: {
    title: 'Отчёты клиентов', intro: 'Просмотр и редактирование сохранённых отчётов.',
    back: 'Моя практика', create: '+ Новый отчёт', search: 'Поиск по клиенту', placeholder: 'Имя клиента',
    submit: 'Найти', clear: 'Очистить', list: 'Сохранённые отчёты', found: 'Отчётов на странице', clients: 'Найдено клиентов',
    unavailable: 'Хранилище приватных отчётов временно недоступно.',
    empty: 'У этих клиентов пока нет сохранённых отчётов.', emptyHint: 'Найдите другого клиента или создайте отчёт.',
    date: 'Дата отчёта', active: 'Сохранён', inactive: 'Доступ закрыт', view: 'Просмотреть', edit: 'Редактировать',
    file: 'История клиента', page: 'Страница', of: 'из', previous: 'Назад', next: 'Вперёд',
    legacy: 'Старые документы без клиента', sortLabel: 'Сортировка отчётов', byDate: 'По дате отчёта', byClient: 'По имени клиента',
    delete: 'Удалить отчёт', deleteConfirm: 'Удалить этот отчёт без возможности восстановления? Личная ссылка перестанет работать. Клиент и счета сохранятся.',
    deleted: 'Отчёт удалён.', changed: 'Отчёт изменился или уже удалён. Обновите страницу.',
    storageError: 'Не удалось удалить отчёт: хранилище недоступно.',
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
  const { query, sort, page } = parseReportDirectoryQuery(await searchParams)
  const params = await searchParams
  const notice = typeof params?.notice === 'string' ? params.notice : ''
  const store = getPrescriptionStore()
  const data = await listClientReportDirectory(store, { query, sort, page })
  const sortHref = value => '/admin/reports?' + new URLSearchParams({ ...(query ? { q: query } : {}), sort: value }).toString()
  const pageHref = number => '/admin/reports?' + new URLSearchParams({ ...(query ? { q: query } : {}), sort, page: String(number) }).toString()
  return <main className={'prescription-admin-shell ' + styles.shell}>
    <PrescriptionAdminHeader title={{ en: COPY.en.title, ru: COPY.ru.title }} description={{ en: COPY.en.intro, ru: COPY.ru.intro }} />
    <div className={styles.top}>
      <Link href={'/' + locale + '/app/practice'} className={styles.back} prefetch={false}>← {t.back}</Link>
      <Link href="/admin/reports/new" className={styles.primary} prefetch={false}>{t.create}</Link>
    </div>
    <section className={styles.sheet} aria-label={t.list}>
      <div className={styles.heading}>
        <h2>{t.list}</h2>
        <span>{t.found}: {data.rows.length} / {data.totalReports} · {t.clients}: {data.totalClients}</span>
      </div>
      <form action="/admin/reports" role="search" method="get" className={styles.search}>
        <label htmlFor="saved-report-client" className={styles.visuallyHidden}>{t.search}</label>
        <input type="hidden" name="sort" value={sort} />
        <div>
          <input id="saved-report-client" type="search" name="q" autoComplete="off" maxLength={120} defaultValue={query} placeholder={t.placeholder} />
          <button type="submit">{t.submit}</button>
          {query && <Link href={sortHref(sort)} prefetch={false}>{t.clear}</Link>}
        </div>
      </form>
      <nav className={styles.sortToggle} aria-label={t.sortLabel}>
        <span>{t.sortLabel}</span>
        <Link href={sortHref('date')} aria-current={sort === 'date' ? 'true' : undefined} prefetch={false}>{t.byDate}</Link>
        <Link href={sortHref('client')} aria-current={sort === 'client' ? 'true' : undefined} prefetch={false}>{t.byClient}</Link>
      </nav>
      {notice && ['deleted', 'changed', 'unavailable'].includes(notice) && <p className={styles.notice} role="status">{notice === 'deleted' ? t.deleted : notice === 'changed' ? t.changed : t.storageError}</p>}
      {!store && <p role="alert" className={styles.empty}>{t.unavailable}</p>}
      {store && !data.rows.length && <div className={styles.empty}><strong>{t.empty}</strong><p>{t.emptyHint}</p></div>}
      {store && data.rows.length > 0 && <div className={styles.list}>
        {data.rows.map(row => <article key={row.id} className={styles.record}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">{row.clientName.slice(0, 1).toUpperCase()}</span>
            <div className={styles.details}>
              <strong>{row.clientName}</strong>
              <div className={styles.meta}>
                <time dateTime={row.dateIssued || undefined} title={t.date}>{dateLabel(row.dateIssued, locale)}</time>
                <span className={styles.localeTag} aria-label={row.reportLocale === 'ru' ? 'Russian report' : 'English report'}>{row.reportLocale.toUpperCase()}</span>
                {row.status !== 'active' && <span className={styles.status}>{t.inactive}</span>}
              </div>
              <Link href={'/admin/clients/' + encodeURIComponent(row.clientId)} prefetch={false}>{t.file} ↗</Link>
            </div>
          </div>
          <div className={styles.actions}>
            <Link className={styles.view} href={'/admin/documents/' + encodeURIComponent(row.id) + '/view?locale=' + row.reportLocale} prefetch={false}>{t.view}</Link>
            <Link className={styles.primary} href={documentPreviewEditHref(row)} prefetch={false}>{t.edit}</Link>
            <DeleteReportButton label={t.delete} confirmation={t.deleteConfirm}
              action={deleteSavedReportAction.bind(null, row.id, row.updatedAt, { q: query, sort, page: data.page })} />
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
