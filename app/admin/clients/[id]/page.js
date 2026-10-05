import { OwnerAssessments } from '@/components/owner-assessments'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { CabinetLinkActions } from '@/components/cabinet-link-actions'
import { ClientAccessDangerActions } from '@/components/client-access-danger-actions'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { getLegacyClientBinding } from '@/lib/app/client-account-binding'

import { editClientAction, revokeClientAction, rotateClientAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Client history', robots: { index: false, follow: false } }

export default async function ClientDetail({ params }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const ru = (await cookies()).get(uiLocaleCookie)?.value === 'ru'
  const copy = ru
    ? { overview: 'Карточка клиента', language: 'Язык', last: 'Последняя консультация', none: 'Консультаций пока нет', access: 'Доступ', primary: 'Основные действия', new: 'Новая консультация', cabinet: 'Кабинет клиента', history: 'История документов', empty: 'Для клиента пока нет документов.', settings: 'Редактировать данные клиента', name: 'Имя', email: 'Email', phone: 'Телефон', notes: 'Заметки только для практика', status: 'Статус', save: 'Сохранить', changes: 'Изменение доступа', rotation: 'Ротация отключит предыдущую ссылку и все сессии кабинета. История сохранится.', rotate: 'Обновить ссылку кабинета', rotateConfirm: 'Обновить ссылку кабинета? Предыдущая ссылка и все сессии будут отключены.', revoke: 'Отозвать доступ', revokeConfirm: 'Отозвать доступ к кабинету? Клиент больше не сможет открыть свои материалы.', receipt: 'Квитанция', invoice: 'Счёт', report: 'Отчёт', recommendation: 'Гомеопатическая рекомендация', googleCabinet: 'Google-кабинет', linked: 'Связан', notLinked: 'Не связан' }
    : { overview: 'Client overview', language: 'Preferred language', last: 'Last consultation', none: 'No consultations yet', access: 'Access', primary: 'Primary client actions', new: 'New consultation', cabinet: 'Client cabinet', history: 'Document history', empty: 'No documents have been created for this client yet.', settings: 'Edit client details', name: 'Name', email: 'Email', phone: 'Phone', notes: 'Owner-only notes', status: 'Status', save: 'Save client', changes: 'Access changes', rotation: 'Rotating invalidates the previous link and all cabinet sessions. History is preserved.', rotate: 'Rotate cabinet link', rotateConfirm: 'Rotate the cabinet link? The previous link and all cabinet sessions will be invalidated.', revoke: 'Revoke cabinet access', revokeConfirm: 'Revoke cabinet access? The client will no longer be able to open their materials.', receipt: 'Receipt', invoice: 'Invoice', report: 'Report', recommendation: 'Homeopathic Recommendation', googleCabinet: 'Google Cabinet', linked: 'Linked', notLinked: 'Not linked' }

  const { id } = await params
  const store = getPrescriptionStore()
  const client = await store?.findClientById(id)
  if (!client) notFound()
  let googleBinding = { linked: false }
  if (appEnabled()) {
    try {
      googleBinding = await getLegacyClientBinding(getAppConfig(), id)
    } catch {
      googleBinding = { linked: false }
    }
  }
  const documents = await store.listClientDocuments(id)
  const groups = Object.entries(Object.groupBy(documents, (document) => `${document.dateIssued}|${document.consultationId ?? document.id}`)).sort(([left], [right]) => right.localeCompare(left))
  const lastConsultation = documents.map((document) => document.dateIssued).sort().at(-1)
  const assessments = (await store.listClientAssessments(id)).sort((left, right) => right.occurredOn.localeCompare(left.occurredOn) || right.id.localeCompare(left.id))

  return <main className="prescription-admin-shell client-detail-shell">
    <PrescriptionAdminHeader title={client.fullName} description={`${client.preferredLocale.toUpperCase()} · ${client.status}`} />

    <section className="client-detail-summary" aria-label={copy.overview}>
      <dl><div><dt>{copy.language}</dt><dd>{client.preferredLocale.toUpperCase()}</dd></div><div><dt>{copy.last}</dt><dd>{lastConsultation ?? copy.none}</dd></div><div><dt>{copy.access}</dt><dd>{client.status}</dd></div><div><dt>{copy.googleCabinet}</dt><dd>{googleBinding.linked ? copy.linked : copy.notLinked}</dd></div></dl>
      {(client.email || client.phone) && <p className="client-detail-contact">{[client.email, client.phone].filter(Boolean).join(' · ')}</p>}
    </section>

    <section className="client-detail-primary-actions" aria-label={copy.primary}><a href={`/admin/consultations/new?clientId=${id}`}>{copy.new}</a><div><p>{copy.cabinet}</p><CabinetLinkActions clientId={id} locale={client.preferredLocale} /></div></section>

    <section className="client-detail-history"><h2>{copy.history}</h2>{groups.map(([key, records]) => <article key={key}><h3>{records[0].dateIssued}</h3>{records.map((document) => <p key={document.id}><a href={`/admin/documents/${document.id}?locale=${client.preferredLocale}`}>{document.kind === 'payment' ? `${document.paymentStatus === 'received' ? copy.receipt : copy.invoice} ${document.currency} ${(document.amount / 100).toFixed(2)}` : document.kind === 'report' ? copy.report : copy.recommendation}</a><span>{document.status}</span></p>)}</article>)}{!groups.length && <p>{copy.empty}</p>}</section>

    <OwnerAssessments records={assessments} clientId={id} locale={client.preferredLocale} temporary={store.assessmentStorage === 'memory'} />

    <details className="client-detail-settings"><summary>{copy.settings}</summary><form action={editClientAction.bind(null, id)} className="prescription-admin-form"><label>{copy.name}<input name="fullName" required maxLength={200} defaultValue={client.fullName} /></label><label>{copy.language}<select name="preferredLocale" defaultValue={client.preferredLocale}><option value="en">EN</option><option value="ru">RU</option></select></label><label>{copy.email}<input name="email" type="email" defaultValue={client.email} /></label><label>{copy.phone}<input name="phone" defaultValue={client.phone} /></label><label>{copy.notes}<textarea name="notes" defaultValue={client.notes} /></label><label>{copy.status}<select name="status" defaultValue={client.status}><option value="active">Active</option><option value="archived">Archived</option></select></label><button>{copy.save}</button></form></details>

    <section className="client-detail-danger-zone" aria-label={copy.changes}><h2>{copy.changes}</h2><p>{copy.rotation}</p><ClientAccessDangerActions copy={copy} revokeAction={revokeClientAction.bind(null, id)} rotateAction={rotateClientAction.bind(null, id)} /></section>
  </main>
}
