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
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="Unassigned Legacy Documents" description="Name matches are suggestions only. Choose explicitly; no automatic assignments." />{records.map(d => <section className="consultation-result-document" key={d.id}><h2>{d.patientName} · {d.dateIssued}</h2><p>Suggested by name: {clients.filter(c => c.fullName.toLocaleLowerCase() === d.patientName.toLocaleLowerCase()).map(c => c.fullName).join(', ') || 'None'}</p><form className="prescription-admin-form" action={assignLegacyAction.bind(null, d.id)}><input type="hidden" name="requestId" value={randomUUID()} /><label>Assign to<select name="clientId" defaultValue=""><option value="">Leave unassigned</option>{clients.map(c => <option value={c.id} key={c.id}>{c.fullName}</option>)}<option value="new">Create new client</option></select></label><label>New client name<input name="fullName" defaultValue={d.patientName} /></label><label>New client language<select name="preferredLocale" defaultValue={d.languagePreference ?? 'en'}><option value="en">EN</option><option value="ru">RU</option></select></label><button>Apply selected choice</button></form></section>)}{cursor && cursor !== '0' && <a href={`/admin/clients/legacy?cursor=${encodeURIComponent(cursor)}`}>Next page</a>}</main>
}
