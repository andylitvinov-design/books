import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { createClientAction } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clients · Holistic House', robots: { index: false, follow: false } }

const copy = {
  en: {
    title: 'Client database',
    intro: 'Find a person, review their history, prepare documents or send their private cabinet link.',
    search: 'Find a client', placeholder: 'Search by client name', searchButton: 'Search',
    new: 'Create client', newHelp: 'Create the client record now. You can add documents later.',
    name: 'Full name', language: 'Preferred language', email: 'Email (optional)',
    phone: 'Phone (optional)', add: 'Create client record',
    list: 'Clients', consultations: 'Create consultation', count: 'documents',
    none: 'No client matches yet.', clear: 'Clear search', emptyDate: 'No documents yet',
    archived: 'Archived', showing: 'Showing the first 50 matches. Use search to narrow the list.',
    storage: 'Client storage is unavailable. No changes can be saved.',
  },
  ru: {
    title: 'База клиентов',
    intro: 'Найдите клиента, откройте историю, подготовьте документы или передайте ссылку на его кабинет.',
    search: 'Найти клиента', placeholder: 'Поиск по имени клиента', searchButton: 'Найти',
    new: 'Новый клиент', newHelp: 'Сначала создайте карточку. Документы можно добавить позднее.',
    name: 'Имя клиента', language: 'Язык клиента', email: 'Email (необязательно)',
    phone: 'Телефон (необязательно)', add: 'Создать карточку клиента',
    list: 'Клиенты', consultations: 'Новая консультация', count: 'документов',
    none: 'Клиенты не найдены.', clear: 'Очистить поиск', emptyDate: 'Документов пока нет',
    archived: 'Архив', showing: 'Показаны первые 50 совпадений. Уточните поиск.',
    storage: 'Хранилище клиентов недоступно. Сохранение отключено.',
  },
}

export default async function Clients({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  const t = copy[locale]
  const params = await searchParams
  const query = typeof params?.q === 'string' ? params.q.trim().slice(0, 120) : ''
  const store = getPrescriptionStore()
  const clients = store ? await store.listClients() : []
  const matching = clients
    .filter(client => client.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, locale))
  const displayed = matching.slice(0, 50)
  const rows = await Promise.all(displayed.map(async client => {
    const docs = await store.listClientDocuments(client.id)
    const dates = docs.map(document => document.dateIssued).filter(Boolean).sort()
    return { ...client, documentCount: docs.length, latest: dates.at(-1) }
  }))

  return <main className="prescription-admin-shell master-clients-shell">
    <PrescriptionAdminHeader title={{ en: copy.en.title, ru: copy.ru.title }} description={{ en: copy.en.intro, ru: copy.ru.intro }} />
    <section className="master-clients-top">
      <form className="master-client-search" role="search" action="/admin/clients" method="get">
        <label htmlFor="master-client-query">{t.search}</label>
        <div>
          <input id="master-client-query" name="q" type="search" defaultValue={query} placeholder={t.placeholder} maxLength={120} />
          <button type="submit">{t.searchButton}</button>
          {query && <Link href="/admin/clients">{t.clear}</Link>}
        </div>
      </form>
      <Link className="master-clients-quick-consultation" href="/admin/consultations/new">+ {t.consultations}</Link>
    </section>
    {!store && <p role="alert" className="master-clients-error">{t.storage}</p>}
    {store && <details className="master-client-create">
      <summary>+ {t.new}</summary>
      <p>{t.newHelp}</p>
      <form className="prescription-admin-form master-client-create-form" action={createClientAction}>
        <label>{t.name}<input name="fullName" required maxLength={200} autoComplete="off" /></label>
        <label>{t.language}<select name="preferredLocale" defaultValue={locale}><option value="en">English</option><option value="ru">Русский</option></select></label>
        <label>{t.email}<input type="email" name="email" maxLength={254} autoComplete="off" /></label>
        <label>{t.phone}<input name="phone" maxLength={80} autoComplete="off" /></label>
        <button type="submit">{t.add}</button>
      </form>
    </details>}
    <section aria-label={t.list} className="master-client-directory">
      <div className="master-client-directory-heading"><h2>{t.list}</h2><span>{matching.length}</span></div>
      {matching.length > 50 && <p className="master-client-list-note">{t.showing}</p>}
      {!matching.length && <p className="master-client-list-empty">{t.none}</p>}
      <div className="master-client-list">
        {rows.map(client => <Link key={client.id} href={'/admin/clients/' + client.id} className="master-client-row" prefetch={false}>
          <span className="master-client-monogram" aria-hidden="true">{client.fullName.slice(0, 1).toUpperCase()}</span>
          <span className="master-client-row-info"><strong>{client.fullName}</strong><small>{client.preferredLocale.toUpperCase()} · {client.latest ?? t.emptyDate} · {client.documentCount} {t.count}</small></span>
          <span className="master-client-row-end">{client.status === 'archived' ? t.archived : '→'}</span>
        </Link>)}
      </div>
    </section>
  </main>
}
