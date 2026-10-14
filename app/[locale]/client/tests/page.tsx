import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { isSupportedLocale } from '@/data/remedies'
import { normalizeJourneyFocus } from '@/lib/assessments/topic-journeys'
import type { Locale } from '@/data/remedies'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Test Explorer | Holistic House', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function PublicTestExplorerPage({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ focus?: string | string[] }> }) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()
  const query = await searchParams
  const focus = normalizeJourneyFocus(typeof query.focus === 'string' ? query.focus : '')
  const initialPreferences = focus.length ? { focus } : null
  return <main lang={locale} style={{maxWidth:'100%',minWidth:0,overflowX:'clip'}}>
    <PublicSiteHeader locale={locale as Locale} />
    <PublicTestExplorer locale={locale} embedded initialPreferences={initialPreferences} />
  </main>
}
