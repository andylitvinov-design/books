import { notFound } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { CabinetLinkActions } from '@/components/cabinet-link-actions'
import { editClientAction, rotateClientAction, revokeClientAction } from '../actions'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Client history', robots: { index: false, follow: false } }
export default async function ClientDetail({ params }) {
  if (!await requireAdminRequest()) notFound()
  const { id } = await params, store = getPrescriptionStore(), client = await store?.findClientById(id)
  if (!client) notFound()
  const docs = await store.listClientDocuments(id), groups = Object.groupBy(docs, d => `${d.dateIssued}|${d.consultationId ?? d.id}`)
  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={client.fullName} description={`${client.preferredLocale.toUpperCase()} · ${client.status}`} /><p>{client.email} {client.phone}</p><a href={`/admin/consultations/new?clientId=${id}`}>New consultation</a><CabinetLinkActions clientId={id} locale={client.preferredLocale} /><h2>Document history</h2>{Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([key, records]) => <section className="consultation-result-document" key={key}><h3>{records[0].dateIssued}</h3>{records.map(d => <p key={d.id}><a href={`/admin/documents/${d.id}?locale=${client.preferredLocale}`}>{d.kind === 'payment' ? `${d.paymentStatus === 'received' ? 'Receipt' : 'Invoice'} ${d.currency} ${(d.amount / 100).toFixed(2)}` : 'Homeopathic Recommendation'}</a> · {d.status}</p>)}</section>)}<details><summary>Client settings</summary><form action={editClientAction.bind(null, id)} className="prescription-admin-form"><label>Name<input name="fullName" required maxLength={200} defaultValue={client.fullName} /></label><label>Language<select name="preferredLocale" defaultValue={client.preferredLocale}><option value="en">EN</option><option value="ru">RU</option></select></label><label>Email<input name="email" type="email" defaultValue={client.email} /></label><label>Phone<input name="phone" defaultValue={client.phone} /></label><label>Owner-only notes<textarea name="notes" defaultValue={client.notes} /></label><label>Status<select name="status" defaultValue={client.status}><option value="active">Active</option><option value="archived">Archived</option></select></label><button>Save client</button></form><p>Rotating invalidates the previous link and all cabinet sessions. History is preserved.</p><form action={rotateClientAction.bind(null, id)}><button>Rotate cabinet link</button></form><form action={revokeClientAction.bind(null, id)}><button>Revoke cabinet access</button></form></details></main>
}
