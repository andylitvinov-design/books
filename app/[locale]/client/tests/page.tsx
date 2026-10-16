import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { PublicTestExplorer } from '@/components/app/public-test-explorer'
import { TestSelectionCourseBanner } from '@/components/sitewide-antistress-banner'
import { isSupportedLocale } from '@/data/remedies'
import { getTopicJourney, journeyFocusForTopics, journeyProblemsForTopics, normalizeJourneyFocus, normalizeJourneyTopicIds } from '@/lib/assessments/topic-journeys'
import type { Locale } from '@/data/remedies'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Test Explorer | Holistic House', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function PublicTestExplorerPage({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ focus?: string | string[]; journey?: string | string[]; topics?: string | string[]; mode?: string | string[]; catalog?: string | string[] }> }) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()
  const query = await searchParams
  // Journey + subtopics are allowlisted editorial keys, never health answers.
  // Preselect the actual Step 2 concern IDs instead of making users choose twice.
  const journey = getTopicJourney(typeof query.journey === 'string' ? query.journey : '')
  const chosenTopics = normalizeJourneyTopicIds(journey, typeof query.topics === 'string' ? query.topics : '')
  const focus = journey
    ? journeyFocusForTopics(journey, chosenTopics)
    : normalizeJourneyFocus(typeof query.focus === 'string' ? query.focus : '')
  const problems = journeyProblemsForTopics(journey, chosenTopics)
  const initialPreferences = focus.length ? { focus, problems } : null
  return <main lang={locale} style={{maxWidth:'100%',minWidth:0,overflowX:'clip'}}>
    <PublicSiteHeader locale={locale as Locale} />
    <PublicTestExplorer locale={locale} embedded initialPreferences={initialPreferences} initialMode={query.mode === 'course' ? 'course' : 'tests'} initialBrowseFull={query.catalog === 'full'} />
    <TestSelectionCourseBanner locale={locale as Locale} />
  </main>
}
