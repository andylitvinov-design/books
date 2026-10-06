import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { isSupportedLocale } from '@/data/remedies'
import type { Locale } from '@/data/remedies'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Test Explorer | Holistic House', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function PublicTestExplorerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()
  return <main lang={locale}><PublicSiteHeader locale={locale as Locale} /><PublicTestExplorer locale={locale} /></main>
}
