import { randomUUID } from 'node:crypto'
import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { listUnassignedConsultations } from '@/lib/clients/service'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { assignLegacyAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Unassigned legacy documents', robots: { index: false, follow: false } }

export default async function Legacy({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const store = getPrescriptionStore()
  if (!store) notFound()
  const clients = (await store.listClients()).filter(c => c.status === 'active')
  const { records, cursor } = await listUnassignedConsultations(store, { cursor: (await searchParams).cursor ?? '0', limit: 30 })

  return (
    <main className="prescription-admin-shell legacy-admin-shell">
      <PrescriptionAdminHeader
        title={{ ru: 'Старые документы', en: 'Legacy documents' }}
        description={{ ru: 'Проверьте запись и явно выберите клиента. Автоматических назначений нет.', en: 'Review each record and explicitly choose the client. Nothing is assigned automatically.' }}
      />
      <div className="legacy-document-list">
        {records.map(d => {
          const suggestions = clients.filter(c => c.fullName.toLocaleLowerCase() === d.patientName.toLocaleLowerCase()).map(c => c.fullName)
          return (
            <section className="consultation-result-document legacy-document-card" key={d.id}>
              <div className="legacy-document-heading">
                <div><p className="legacy-document-kicker">{d.dateIssued}</p><h2>{d.patientName}</h2></div>
                <p>{suggestions.length ? 'Suggested: ' + suggestions.join(', ') : 'No exact name match'}</p>
              </div>
              <form className="prescription-admin-form legacy-assignment-form" action={assignLegacyAction.bind(null, d.id)}>
                <input type="hidden" name="requestId" value={randomUUID()} />
                <label>Assign to<select name="clientId" defaultValue=""><option value="">Leave unassigned</option>{clients.map(c => <option value={c.id} key={c.id}>{c.fullName}</option>)}<option value="new">Create new client</option></select></label>
                <label>New client name<input name="fullName" defaultValue={d.patientName} /></label>
                <label>Language<select name="preferredLocale" defaultValue={d.languagePreference ?? 'en'}><option value="en">EN</option><option value="ru">RU</option></select></label>
                <button className="legacy-apply-button">Apply choice</button>
              </form>
            </section>
          )
        })}
      </div>
      {cursor && cursor !== '0' && <a className="legacy-next-page" href={"/admin/clients/legacy?cursor=" + encodeURIComponent(cursor)}>Next page →</a>}
    </main>
  )
}
