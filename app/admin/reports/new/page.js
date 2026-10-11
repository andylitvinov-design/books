import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { uiLocaleCookie } from '@/lib/ui-locale'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'New client report · Holistic House',
  robots: { index: false, follow: false },
}

const COPY = {
  en: {
    title: 'Create client report',
    intro: 'Choose a client, write a personal report and review it before sharing.',
    choose: '1 · Choose a client',
    search: 'Search clients',
    placeholder: 'Client name',
    submit: 'Search',
    reset: 'Clear',
    empty: 'No matching active clients. Add a client first.',
    newClient: '+ Create a new client',
    create: 'Create report',
    note: 'Reports begin as private drafts. Only your explicit Share action makes a report visible to its recipient. Nothing is emailed or published automatically.',
    back: 'Back to My Practice',
    unavailable: 'The private client database is unavailable. Try again later.',
  },
  ru: {
    title: 'Создать отчёт клиенту',
    intro: 'Выберите клиента, подготовьте персональный отчёт и проверьте его перед отправкой.',
    choose: '1 · Выберите клиента',
    search: 'Найти клиента',
    placeholder: 'Имя клиента',
    submit: 'Поиск',
    reset: 'Очистить',
    empty: 'Активные клиенты не найдены. Сначала добавьте клиента.',
    newClient: '+ Создать нового клиента',
    create: 'Создать отчёт',
    note: 'Отчёт создаётся как приватный черновик. Клиент увидит его только после вашего подтверждения «Открыть доступ». Письма и публичная публикация не отправляются автоматически.',
    back: 'Назад к My Practice',
    unavailable: 'База клиентов временно недоступна. Попробуйте позже.',
  },
}

export default async function NewClientReport({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  const t = COPY[locale]
  const params = await searchParams
  const query = typeof params?.q === 'string' ? params.q.trim().slice(0, 120) : ''
  const store = getPrescriptionStore()
  const clients = store ? (await store.listClients())
    .filter(client => client.status === 'active' && typeof client.fullName === 'string')
    .filter(client => client.fullName.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, locale))
    .slice(0, 80) : []

  return <main className="prescription-admin-shell master-clients-shell">
    <PrescriptionAdminHeader title={{ en: COPY.en.title, ru: COPY.ru.title }}
      description={{ en: COPY.en.intro, ru: COPY.ru.intro }} />
    <p><Link prefetch={false} className="library-back-link" href={`/${locale}/app/practice`}>← {t.back}</Link></p>
    <section className="master-client-directory" aria-labelledby="new-practice-report-clients">
      <div className="master-client-directory-heading"><h2 id="new-practice-report-clients">{t.choose}</h2><span>{clients.length}</span></div>
      <form className="master-client-search" role="search" action="/admin/reports/new" method="get">
        <label htmlFor="report-client-search">{t.search}</label>
        <div>
          <input id="report-client-search" name="q" type="search" autoComplete="off"
            maxLength={120} defaultValue={query} placeholder={t.placeholder} />
          <button type="submit">{t.submit}</button>
          {query && <Link href="/admin/reports/new" prefetch={false}>{t.reset}</Link>}
        </div>
      </form>
      {!store && <p role="alert">{t.unavailable}</p>}
      {store && !clients.length && <p className="master-client-list-empty">{t.empty}</p>}
      <div className="master-client-list">
        {clients.map(client => <Link key={client.id} className="master-client-row" prefetch={false}
          href={`/admin/clients/${client.id}/assessments/new?kind=research_result`}>
          <span className="master-client-monogram" aria-hidden="true">{client.fullName.slice(0,1).toUpperCase()}</span>
          <span className="master-client-row-info"><strong>{client.fullName}</strong><small>{client.preferredLocale?.toUpperCase() || 'EN'}</small></span>
          <span className="master-client-row-end">{t.create} →</span>
        </Link>)}
      </div>
      <Link className="master-clients-quick-consultation" href="/admin/clients" prefetch={false}>{t.newClient}</Link>
      <p className="master-client-list-note">{t.note}</p>
    </section>
  </main>
}
