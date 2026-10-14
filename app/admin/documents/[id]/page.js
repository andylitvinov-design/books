import Link from 'next/link'
import { ArrowLeft, FileText, Languages, PencilLine } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { ConsultationDocumentActions } from '@/components/consultation-document-actions'
import { AdminDocumentActions } from '@/components/admin-document-panels'
import { PaymentDocument } from '@/components/payment-document'
import { PrescriptionDocument } from '@/components/prescription-document'
import { documentPreviewEditHref } from '@/lib/consultations/document-preview-navigation'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import styles from './document-preview.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Client document preview · Holistic House' }

export default async function AdminDocumentPreview({ params, searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const query = await searchParams
  const locale = query.locale ?? 'en'
  if (!['en', 'ru'].includes(locale)) notFound()

  const store = getPrescriptionStore()
  const record = store ? await store.findById(id) : undefined
  if (!record) notFound()

  const payment = record.kind === 'payment'
  const linkedPayment = !payment && record.paymentDocumentId ? await store.findById(record.paymentDocumentId) : undefined
  const consultationId = payment
    ? record.consultationId
    : linkedPayment?.consultationId === record.id ? record.id : undefined
  const document = payment
    ? getClientPaymentDocument({ ...record, status: 'active' }, locale)
    : getClientPrescription({ ...record, status: 'active' }, locale)
  if (!document) notFound()

  const Document = payment ? PaymentDocument : PrescriptionDocument
  const ru = locale === 'ru'
  const nextLocale = ru ? 'en' : 'ru'
  const backHref = consultationId
    ? `/admin/consultations/${consultationId}`
    : `/admin/${payment ? 'payments' : 'prescriptions'}/${record.id}`
  const editHref = documentPreviewEditHref(record, consultationId)
  const title = payment
    ? record.paymentStatus === 'received'
      ? (ru ? 'Квитанция клиента' : 'Client receipt')
      : (ru ? 'Счёт клиента' : 'Client invoice')
    : (ru ? 'Отчёт клиента' : 'Client report')
  const typeLabel = payment ? (ru ? 'Платёжный документ' : 'Payment document') : (ru ? 'Рекомендации' : 'Recommendations')
  const accessLabel = record.status === 'active'
    ? (ru ? 'Готов к отправке' : 'Ready to share')
    : (ru ? 'Доступ клиента ограничен' : 'Client access paused')

  return <div className={styles.page}>
    <header className={styles.header}>
      <nav className={styles.topLine} aria-label={ru ? 'Навигация по документу' : 'Document navigation'}>
        <Link href={backHref} className={styles.backLink}>
          <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
          {ru ? 'Назад к документам' : 'Back to documents'}
        </Link>
        <div className={styles.languageControl}>
          <Languages size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>{ru ? 'Язык' : 'Language'}</span>
          <Link
            href={`/admin/documents/${record.id}?locale=${nextLocale}`}
            className={styles.languageSwitch}
            aria-label={ru ? 'Switch to English' : 'Переключить на русский'}
          >{nextLocale.toUpperCase()}</Link>
        </div>
      </nav>

      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>HOLISTIC HOUSE <span aria-hidden="true">/</span> {ru ? 'КАБИНЕТ СПЕЦИАЛИСТА' : 'PRACTITIONER CABINET'}</p>
          <h1>{title}</h1>
          <p className={styles.meta}>
            <span>{record.patientName}</span>
            <span aria-hidden="true" className={styles.metaDot}>·</span>
            <span>{record.dateIssued}</span>
            <span aria-hidden="true" className={styles.metaDot}>·</span>
            <span>{typeLabel}</span>
          </p>
        </div>
        <Link href={editHref} className={styles.editButton}>
          <PencilLine size={18} strokeWidth={1.85} aria-hidden="true" />
          {ru ? 'Редактировать отчёт' : payment ? 'Edit document' : 'Edit report'}
        </Link>
      </div>
    </header>

    <section className={styles.actionPanel} aria-label={ru ? 'Действия с отчётом' : 'Report actions'}>
      <div className={styles.panelHeading}>
        <div>
          <h2>{ru ? 'Действия с документом' : 'Document actions'}</h2>
          <p>{ru ? 'Просмотр, печать, PDF и отправка клиенту' : 'Preview, download, print or share with your client'}</p>
        </div>
        <span className={styles.accessStatus}>{accessLabel}</span>
      </div>
      <div className={styles.actionControls}>
        {consultationId
          ? <ConsultationDocumentActions recordId={record.id} locale={locale} active={record.status === 'active'} />
          : <AdminDocumentActions record={record} locale={locale} />}
      </div>
    </section>

    <section id="document-preview" className={styles.previewSection} aria-label={ru ? 'Просмотр готового отчёта' : 'Saved document preview'}>
      <div className={styles.previewCaption}>
        <div><FileText size={18} strokeWidth={1.8} aria-hidden="true" /><h2>{ru ? 'Предпросмотр документа' : 'Document preview'}</h2></div>
        <span>{locale.toUpperCase()} · A4 / PDF</span>
      </div>
      <Document document={document} locale={locale} admin autoPrint={query.print === '1'} />
    </section>
  </div>
}
