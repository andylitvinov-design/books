import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { readSavedDocument } from '@/lib/app/legacy-document-flow'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { PrescriptionDocument } from '@/components/prescription-document'
import { PaymentDocument } from '@/components/payment-document'
import { SavedDocumentManagement } from '@/components/app/saved-document-management'
import { ReportFinalActions } from '@/components/report-final-actions'
import '../../[[...path]]/workspace.css'
import '@/components/app/saved-document-reader.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Personal report | Holistic House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function AuthenticatedSavedDocument({ params }) {
  const { locale, id } = await params
  if (!['en', 'ru'].includes(locale) || !UUID.test(id || '')) notFound()

  let saved
  try {
    const config = getAppConfig()
    const cookieJar = await cookies()
    const actor = await createRequestAuth({ cookies: cookieJar }, config).verified()
    const store = getPrescriptionStore()
    if (!store?.findById) notFound()
    // The same source-ID/hash/status/account gate as the authenticated API.
    // Neither a selector nor a legacy bearer-link grants access here.
    saved = await readSavedDocument(config, store, actor, id, locale)
  } catch (error) {
    if (error instanceof AppError && error.code === 'SIGN_IN_REQUIRED')
      redirect('/' + locale + '/app')
    if (error instanceof AppError && ['NOT_FOUND', 'DOCUMENT_UNAVAILABLE', 'ACCOUNT_UNAVAILABLE', 'CONSENT_REQUIRED'].includes(error.code))
      notFound()
    throw error
  }

  const ru = locale === 'ru'
  const payment = saved.kind === 'invoice' || saved.kind === 'receipt'
  const otherLocale = ru ? 'en' : 'ru'
  const pdfUrl = '/api/app/documents/' + encodeURIComponent(id) + '/pdf?locale=' + locale

  return (
    <main className="hh-app hh-app--document-reader" lang={locale}>
      <article className="hh-saved-document-reader" data-canonical-saved-document>
        <nav className="hh-saved-document-reader__toolbar" aria-label={ru ? 'Действия с отчётом' : 'Report actions'}>
          <Link href={'/' + locale + '/app/portrait#personal-reports'} prefetch={false}>
            {ru ? '← Мои отчёты' : '← My reports'}
          </Link>
          <div className="hh-saved-document-reader__actions">
            <Link href={'/' + otherLocale + '/app/document-view/' + encodeURIComponent(id)} prefetch={false}>
              {otherLocale.toUpperCase()}
            </Link>
            {!payment && <a className="hh-saved-document-reader__pdf-preview" href={pdfUrl + '&preview=1'}>
              {ru ? 'Просмотреть PDF крупно' : 'View large PDF'}
            </a>}
                        <a className="hh-saved-document-reader__pdf" href={pdfUrl} download>
              {ru ? 'Скачать PDF' : 'Download PDF'}
            </a>
          </div>
        </nav>
        {payment
          ? <PaymentDocument document={saved.document} locale={locale} embedded />
          : <PrescriptionDocument document={saved.document} locale={locale} embedded narration={{scope:'saved-document',id}} />}
        {!payment&&<ReportFinalActions locale={locale} mode="saved"/>}
        <details className="hh-saved-document-reader__management">
          <summary>{ru ? 'Управление сохранением' : 'Manage saved copy'}</summary>
          <p>
            {ru ? 'Сохранено в вашем кабинете' : 'Saved in your Cabinet'}:{' '}
            {new Date(saved.savedAt).toLocaleString(ru ? 'ru-RU' : 'en-US')}
          </p>
          <SavedDocumentManagement id={id} locale={locale} />
        </details>
      </article>
    </main>
  )
}
