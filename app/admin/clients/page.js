import { notFound, redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clients', robots: { index: false, follow: false } }
export default async function Clients({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const store = getPrescriptionStore(), q = String((await searchParams).q ?? '').toLocaleLowerCase()
  const clients = store ? await store.listClients() : []
  const rows = await Promise.all(clients.filter(c => c.fullName.toLocaleLowerCase().includes(q)).map(async c => { const docs = await store.listClientDocuments(c.id); return { ...c, count: docs.length, last: docs.map(d => d.dateIssued).sort().at(-1) } }))
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title="Clients" description="Client history and private cabinet access" /><form><label>Search clients<input name="q" defaultValue={q} /></label><button>Search</button></form>{!store && <p>Client storage unavailable.</p>}<div className="client-list">{rows.map(c => <a className="consultation-result-document" href={`/admin/clients/${c.id}`} key={c.id}><h2>{c.fullName}</h2><p>{c.preferredLocale.toUpperCase()} · {c.last ?? 'No consultations'} · {c.count} documents · {c.status}</p></a>)}</div></main>
}
