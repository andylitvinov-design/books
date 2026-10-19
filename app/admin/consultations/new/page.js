import Link from 'next/link'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'

import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getConsultationRemedyOptions } from '@/lib/remedies/registry'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { ConsultationForm } from '@/components/consultation-form'
import { NewReportMaterials } from '@/components/new-report-materials'
import { getRecommendedTestOptions } from '@/lib/consultations/recommended-tests'
import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { createConsultationAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New consultation', robots: { index: false, follow: false } }

export default async function NewConsultation({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const store = getPrescriptionStore()
  const clients = store ? await store.listClients() : []
  const options = await Promise.all(clients.filter(c => c.status === 'active').map(async c => {
    const docs = await store.listClientDocuments(c.id)
    return {
      id: c.id,
      fullName: c.fullName,
      preferredLocale: c.preferredLocale,
      consultationCount: new Set(docs.map(d => d.consultationId ?? d.id)).size,
      lastConsultation: docs.map(d => d.dateIssued).sort().at(-1),
    }
  }))
  const params = await searchParams
  const selectedClientId = typeof params?.clientId === 'string' ? params.clientId : undefined
  const createdClient = params?.created === '1'
    ? options.find(client => client.id === selectedClientId)
    : undefined
  const ru = (await cookies()).get(uiLocaleCookie)?.value === 'ru'

  return <main className="prescription-admin-shell consultation-new-shell consultation-studio-shell">
    <PrescriptionAdminHeader
      title={{ ru: 'Новая консультация', en: 'New consultation' }}
      description={{
        ru: 'Клиент → препараты и рекомендации → документы в истории клиента.',
        en: 'Client → remedies and recommendations → documents in the client history.',
      }}
    />
    {createdClient && <section className="consultation-client-created-banner" role="status">
      <div className="consultation-client-created-identity">
        <span className="consultation-client-created-avatar" aria-hidden="true">{createdClient.fullName.slice(0, 1).toUpperCase()}</span>
        <div>
          <span className="consultation-client-created-label">{ru ? 'КЛИЕНТ СОХРАНЁН' : 'CLIENT SAVED'}</span>
          <strong>{createdClient.fullName}</strong>
          <p>{ru
            ? 'Теперь добавьте препараты и рекомендации. Документы будут сохранены в истории этого клиента.'
            : 'Add remedies and recommendations next. Documents will be saved to this client’s history.'}</p>
        </div>
      </div>
      <div className="consultation-client-created-links">
        <Link className="consultation-client-created-history-link" href={`/admin/clients/${createdClient.id}`} prefetch={false}>
          {ru ? 'История клиента' : 'Client history'}
        </Link>
      </div>
    </section>}
    <ConsultationForm
      clients={options}
      selectedClientId={selectedClientId}
      action={createConsultationAction}
      remedies={getConsultationRemedyOptions()}
      recommendedTestOptions={{ en: getRecommendedTestOptions('en'), ru: getRecommendedTestOptions('ru') }}
      requestId={randomUUID()}
    />
    {deliveryEnabled() && <section className="consultation-edit-materials" aria-label={ru ? 'Материалы отчёта' : 'Report materials'}>
      <NewReportMaterials locale={ru ? 'ru' : 'en'} />
    </section>}
  </main>
}
