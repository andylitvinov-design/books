import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { SharedReportView } from '@/components/app/shared-report-view'
import { appEnabled } from '@/lib/app/config'
import { isClientId } from '@/lib/clients/service'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Private report — Holistic House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function SharedReportPage({ params }) {
  const { locale, assessmentId } = await params
  if (!['en', 'ru'].includes(locale) || !isClientId(assessmentId)) notFound()
  return (
    <main className="client-entry-shell shared-report-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <SharedReportView reportId={assessmentId} locale={locale} appAvailable={appEnabled()} />
    </main>
  )
}
