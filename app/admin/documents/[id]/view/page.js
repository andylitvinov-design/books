import Link from 'next/link'
import { ArrowLeft, Download, Languages, Printer, PencilLine } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { PaymentDocument } from '@/components/payment-document'
import { PrescriptionDocument } from '@/components/prescription-document'
import { getClientPaymentDocument } from '@/lib/documents/payment'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { documentPreviewEditHref } from '@/lib/consultations/document-preview-navigation'
import styles from './viewer.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Report preview | Holistic House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function AdminFullReportView({ params, searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const { id } = await params
  const query = await searchParams
  const locale = query.locale ?? 'en'
  if (!['en', 'ru'].includes(locale)) notFound()
  const store = getPrescriptionStore()
  const record = store ? await store.findById(id) : null
  if (!record) notFound()

  const payment = record.kind === 'payment'
  const doc = payment
    ? getClientPaymentDocument({ ...record, status: 'active' }, locale)
    : getClientPrescription({ ...record, status: 'active' }, locale)
  if (!doc) notFound()

  const ru = locale === 'ru'
  const nextLocale = ru ? 'en' : 'ru'
  const root = '/admin/documents/' + encodeURIComponent(id)
  const reader = root + '/view?locale=' + locale
  const pdf = '/admin/api/documents/' + encodeURIComponent(id) + '/pdf?locale=' + locale
  const edit = documentPreviewEditHref(record, payment ? record.consultationId : undefined)

  return (
    <main className={styles.reader} lang={locale}>
      <nav className={styles.toolbar} aria-label={ru ? 'Управление предпросмотром' : 'Preview actions'}>
        <Link href={root + '?locale=' + locale} className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {ru ? 'К действиям с отчётом' : 'Report actions'}
        </Link>
        <div className={styles.controls}>
          <Link href={root + '/view?locale=' + nextLocale} className={styles.control} aria-label={ru ? 'Switch to English' : 'Переключить на русский'}>
            <Languages size={16} aria-hidden="true" />{nextLocale.toUpperCase()}
          </Link>
          <a href={pdf} download className={styles.control}><Download size={16} aria-hidden="true" />PDF</a>
          <Link href={reader + '&print=1'} className={styles.control}><Printer size={16} aria-hidden="true" />{ru ? 'Печать' : 'Print'}</Link>
          <Link href={edit} className={styles.edit}><PencilLine size={16} aria-hidden="true" />{ru ? 'Редактировать' : 'Edit'}</Link>
        </div>
      </nav>
      <div className={styles.headline}>
        <span>{ru ? 'КОНФИДЕНЦИАЛЬНЫЙ ПРЕДПРОСМОТР' : 'PRIVATE DOCUMENT PREVIEW'}</span>
        <p>{ru ? 'Так отчёт увидит клиент. Данные и рекомендации не изменены.' : 'This is the full client-facing report. No information has been changed.'}</p>
      </div>
      {payment
        ? <PaymentDocument document={doc} locale={locale} admin embedded autoPrint={query.print === '1'} />
        : <PrescriptionDocument document={doc} locale={locale} admin embedded autoPrint={query.print === '1'} />}
    </main>
  )
}
