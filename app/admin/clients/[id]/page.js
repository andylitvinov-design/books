import Link from 'next/link'
import { OwnerAssessments } from '@/components/owner-assessments'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'

import { CabinetLinkActions } from '@/components/cabinet-link-actions'
import { MaterialCopyButton } from '@/components/material-copy-button'
import { ClientAccessDangerActions } from '@/components/client-access-danger-actions'
import { DeleteClientPanel } from '@/components/owner-delete-controls'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { savedReportLocale } from '@/lib/consultations/report-directory'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { appEnabled, getAppConfig } from '@/lib/app/config'
import { getLegacyClientBinding } from '@/lib/app/client-account-binding'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { listClientSessions } from '@/lib/clients/session-delivery-service'
import { OwnerClientSessions } from '@/components/client-session-list'

import { addClientMaterialAction, editClientAction, removeClientMaterialAction, revokeClientAction, rotateClientAction, deleteClientAction } from '../actions'
import '../client-workspace.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Client history', robots: { index: false, follow: false } }

export default async function ClientDetail({ params, searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const ru = (await cookies()).get(uiLocaleCookie)?.value === 'ru'
  const copy = ru
    ? { overview: 'Карточка клиента', language: 'Язык', last: 'Последняя консультация', none: 'Консультаций пока нет', access: 'Доступ', primary: 'Основные действия', new: 'Новая консультация', cabinet: 'Кабинет клиента', history: 'История документов', empty: 'Для клиента пока нет документов.', settings: 'Редактировать данные клиента', name: 'Имя', email: 'Email', phone: 'Телефон', notes: 'Заметки только для практика', status: 'Статус', save: 'Сохранить', changes: 'Изменение доступа', rotation: 'Ротация отключит предыдущую ссылку и все сессии кабинета. История сохранится.', rotate: 'Обновить ссылку кабинета', rotateConfirm: 'Обновить ссылку кабинета? Предыдущая ссылка и все сессии будут отключены.', revoke: 'Отозвать доступ', revokeConfirm: 'Отозвать доступ к кабинету? Клиент больше не сможет открыть свои материалы.', receipt: 'Квитанция', invoice: 'Счёт', report: 'Отчёт', recommendation: 'Гомеопатическая рекомендация', googleCabinet: 'Google-кабинет', linked: 'Связан', notLinked: 'Не связан', materials: 'Материалы для клиента', materialsHelp: 'Ссылки появятся в приватном кабинете клиента и в его Google-кабинете после привязки аккаунта.', addMaterial: 'Добавить ссылку на материал', materialName: 'Название материала', materialUrl: 'Публичная HTTPS-ссылка на материал', saveMaterial: 'Добавить материал', deleteMaterial: 'Убрать', emptyMaterials: 'Материалов пока нет.' }
    : { overview: 'Client overview', language: 'Preferred language', last: 'Last consultation', none: 'No consultations yet', access: 'Access', primary: 'Primary client actions', new: 'New consultation', cabinet: 'Client cabinet', history: 'Document history', empty: 'No documents have been created for this client yet.', settings: 'Edit client details', name: 'Name', email: 'Email', phone: 'Phone', notes: 'Owner-only notes', status: 'Status', save: 'Save client', changes: 'Access changes', rotation: 'Rotating invalidates the previous link and all cabinet sessions. History is preserved.', rotate: 'Rotate cabinet link', rotateConfirm: 'Rotate the cabinet link? The previous link and all cabinet sessions will be invalidated.', revoke: 'Revoke cabinet access', revokeConfirm: 'Revoke cabinet access? The client will no longer be able to open their materials.', receipt: 'Receipt', invoice: 'Invoice', report: 'Report', recommendation: 'Homeopathic Recommendation', googleCabinet: 'Google Cabinet', linked: 'Linked', notLinked: 'Not linked', materials: 'Shared study materials', materialsHelp: 'Links appear in the private client cabinet and in their Google Cabinet after account linking.', addMaterial: 'Add study material link', materialName: 'Material title', materialUrl: 'Public HTTPS material URL', saveMaterial: 'Add material', deleteMaterial: 'Remove', emptyMaterials: 'No study links shared yet.' }

  const labels = ru
    ? {
        back: 'Все клиенты',
        workKicker: 'РАБОЧЕЕ МЕСТО СПЕЦИАЛИСТА',
        workTitle: 'Отчёт и назначения',
        workHint: 'Составьте консультацию, укажите препараты и рекомендации. Готовые документы сохранятся в истории клиента.',
        onlyOwner: 'Карточка специалиста',
        documentCount: 'документов',
        active: 'Активен',
        archived: 'В архиве',
        historyHint: 'Подготовленные для клиента документы',
        noDocumentsHint: 'Начните с консультации — здесь появятся назначения и документы.',
        cabinetHint: 'Отдельная приватная ссылка для клиента. Открывайте этот раздел, когда документы готовы.',
      }
    : {
        back: 'All clients',
        workKicker: 'PRACTITIONER WORKSPACE',
        workTitle: 'Reports & recommendations',
        workHint: 'Prepare a consultation, enter remedies and notes. Saved documents will appear in this client’s history.',
        onlyOwner: 'Practitioner record',
        documentCount: 'documents',
        active: 'Active',
        archived: 'Archived',
        historyHint: 'Documents prepared for this client',
        noDocumentsHint: 'Start a consultation to add recommendations and documents here.',
        cabinetHint: 'A separate private link for the client. Use this section when documents are ready to share.',
      }

  const deletionNotice = (await searchParams)?.delete
  const deleteLabels = ru
    ? {
        deleteClient: 'Удалить клиента и его историю', documents: 'документов', assessments: 'оценок',
        deleteWarning: 'Удаление безвозвратное: исчезнут карточка клиента, отчёты и оценки. При привязанном Google-кабинете, опубликованных материалах или оплаченных счетах удаление блокируется. Вместо этого можно отправить клиента в архив.',
        typeName: 'Для подтверждения точно введите имя клиента',
        deleteForever: 'Удалить клиента навсегда',
        deleteConfirm: 'Точно удалить клиента, все его отчёты и оценки? Отменить действие нельзя.',
      }
    : {
        deleteClient: 'Delete client and history', documents: 'documents', assessments: 'assessments',
        deleteWarning: 'Permanent deletion removes the client, their reports and assessments. Clients with a linked Google account, published sessions or paid invoices cannot be deleted here. You can archive them instead.',
        typeName: 'Type the full client name to confirm',
        deleteForever: 'Delete client permanently',
        deleteConfirm: 'Delete this client and their reports and assessments forever? This cannot be undone.',
      }
  const deleteErrors = ru
    ? { changed: 'Карточка изменена. Обновите страницу и попробуйте снова.', billing: 'Есть оплаченный счёт. Удаление заблокировано; используйте архив.', linked: 'Есть связанные аккаунты или материалы кабинета. Сначала разберите эти связи или отправьте клиента в архив.', unavailable: 'Проверка связанных данных временно недоступна. Удаление отменено.' }
    : { changed: 'This record changed. Reload the page and try again.', billing: 'A paid invoice exists. Deletion is blocked; please archive this client instead.', linked: 'This client has linked accounts or cabinet materials. Review those links or archive the client instead.', unavailable: 'Related records could not be checked. Nothing was deleted.' }
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
  const deliverySessions = deliveryEnabled() && client.status === 'active' ? await listClientSessions(getAppConfig(),store,id).catch(()=>[]) : []
  const groups = Object.entries(Object.groupBy(documents, (document) => `${document.dateIssued}|${document.consultationId ?? document.id}`)).sort(([left], [right]) => right.localeCompare(left))
  const lastConsultation = documents.map((document) => document.dateIssued).sort().at(-1)
  const assessments = (await store.listClientAssessments(id)).sort((left, right) => right.occurredOn.localeCompare(left.occurredOn) || right.id.localeCompare(left.id))

  return <main className="prescription-admin-shell client-detail-shell">
    <PrescriptionAdminHeader
      title={client.fullName}
      description={{ ru: 'Рабочая карточка клиента', en: 'Practitioner client record' }}
    />
    <Link className="client-workspace-back" href="/admin/clients" prefetch={false}>← {labels.back}</Link>
    {Object.hasOwn(deleteErrors, deletionNotice) && <p className="client-delete-notice" role="alert">{deleteErrors[deletionNotice]}</p>}

    <section className="client-detail-primary-actions" aria-label={copy.primary}>
      <div className="client-detail-work-card">
        <div className="client-detail-work-copy">
          <span className="client-detail-work-eyebrow">{labels.workKicker}</span>
          <h2>{labels.workTitle}</h2>
          <p>{labels.workHint}</p>
        </div>
        <div className="client-detail-work-buttons">
          {client.status === 'active'
            ? <>
                <Link className="client-detail-action-primary" href={`/admin/consultations/new?clientId=${id}`} prefetch={false}>
                  + {copy.new} <span aria-hidden="true">→</span>
                </Link>
              </>
            : <span className="client-detail-archived">{labels.archived}</span>}
        </div>
      </div>
    </section>

    <section className="client-detail-summary" aria-label={copy.overview}>
      <div className="client-detail-section-heading">
        <h2>{copy.overview}</h2>
        <span className="client-detail-owner-note">{labels.onlyOwner}</span>
      </div>
      <dl>
        <div><dt>{copy.language}</dt><dd>{client.preferredLocale.toUpperCase()}</dd></div>
        <div><dt>{copy.last}</dt><dd>{lastConsultation ?? copy.none}</dd></div>
        <div><dt>{copy.access}</dt><dd>{client.status === 'active' ? labels.active : labels.archived}</dd></div>
      </dl>
      {(client.email || client.phone) && <p className="client-detail-contact">{[client.email, client.phone].filter(Boolean).join(' · ')}</p>}
    </section>

    {deliveryEnabled() && client.status === 'active' && <OwnerClientSessions clientId={id} sessions={deliverySessions} documents={documents} locale={ru?'ru':'en'} />}

    <section className="client-detail-history" aria-label={copy.history}>
      <div className="client-detail-section-heading">
        <div><h2>{copy.history}</h2><p>{labels.historyHint}</p></div>
        <span className="client-detail-document-count">{documents.length} {labels.documentCount}</span>
      </div>
      <div className="client-detail-history-list">
        {groups.map(([key, records]) => <article key={key}>
          <h3>{records[0].dateIssued}</h3>
          {records.map(document => <p key={document.id}>
            <Link href={`/admin/documents/${document.id}${document.kind === 'report' ? '' : '/view'}?locale=${savedReportLocale(document, client.preferredLocale)}`} prefetch={false}>
              {document.kind === 'payment'
                ? `${document.paymentStatus === 'received' ? copy.receipt : copy.invoice} ${document.currency} ${(document.amount / 100).toFixed(2)}`
                : document.kind === 'report' ? copy.report : copy.recommendation}
            </Link>
            <span>{document.status}</span>
          </p>)}
        </article>)}
        {!groups.length && <div className="client-detail-empty"><p>{labels.noDocumentsHint}</p></div>}
      </div>
    </section>

    <div className="client-detail-assessments">
      <OwnerAssessments records={assessments} clientId={id} locale={client.preferredLocale} temporary={store.assessmentStorage === 'memory'} />
    </div>

    <section className="client-detail-materials" aria-label={copy.materials}>
      <div className="client-detail-materials-heading">
        <h2>{copy.materials}</h2>
        <p>{copy.materialsHelp}</p>
      </div>
      <div className="client-detail-materials-list">
        {(client.sharedMaterials ?? []).map(material => <div className="client-detail-material-row" key={material.id}>
          <a href={material.url} target="_blank" rel="noopener noreferrer">{material.title} ↗</a>
          <MaterialCopyButton url={material.url} locale={ru ? 'ru' : 'en'} />
          <form action={removeClientMaterialAction.bind(null, id)}><button type="submit">{copy.deleteMaterial}</button></form>
        </div>)}
        {!(client.sharedMaterials ?? []).length && <p>{copy.emptyMaterials}</p>}
      </div>
      <details>
        <summary>+ {copy.addMaterial}</summary>
        <form action={addClientMaterialAction.bind(null, id)} className="prescription-admin-form client-detail-material-form">
          <label>{copy.materialName}<input name="title" maxLength={160} required /></label>
          <label>{copy.materialUrl}<input name="url" type="url" pattern="https://.*" placeholder="https://" maxLength={1600} required /></label>
          <button type="submit">{copy.saveMaterial}</button>
        </form>
      </details>
    </section>

    <details className="client-detail-private-access">
      <summary><span>{copy.cabinet}</span><small>{labels.cabinetHint}</small></summary>
      <div className="client-detail-private-body">
        <p>{copy.googleCabinet}: <strong>{googleBinding.linked ? copy.linked : copy.notLinked}</strong></p>
        <CabinetLinkActions clientId={id} locale={client.preferredLocale} />
      </div>
    </details>

    <details className="client-detail-settings">
      <summary>{copy.settings}</summary>
      <form action={editClientAction.bind(null, id)} className="prescription-admin-form">
        <label>{copy.name}<input name="fullName" required maxLength={200} defaultValue={client.fullName} /></label>
        <label>{copy.language}<select name="preferredLocale" defaultValue={client.preferredLocale}><option value="en">EN</option><option value="ru">RU</option></select></label>
        <label>{copy.email}<input name="email" type="email" defaultValue={client.email} /></label>
        <label>{copy.phone}<input name="phone" defaultValue={client.phone} /></label>
        <label>{copy.notes}<textarea name="notes" defaultValue={client.notes} /></label>
        <label>{copy.status}<select name="status" defaultValue={client.status}><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <button type="submit">{copy.save}</button>
      </form>
    </details>

    <details className="client-detail-security">
      <summary>{copy.changes}</summary>
      <section className="client-detail-danger-zone" aria-label={copy.changes}>
        <h2>{copy.changes}</h2>
        <p>{copy.rotation}</p>
        <ClientAccessDangerActions copy={copy} revokeAction={revokeClientAction.bind(null, id)} rotateAction={rotateClientAction.bind(null, id)} />
        <DeleteClientPanel
          labels={deleteLabels} fullName={client.fullName} documentCount={documents.length} assessmentCount={assessments.length}
          action={deleteClientAction.bind(null, id, client.updatedAt, documents.length, assessments.length)}
        />
      </section>
    </details>
  </main>
}
