import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TopicJourneySelector } from '@/components/topic-journey-selector'
import { TOPIC_JOURNEYS, getTopicJourney } from '@/lib/assessments/topic-journeys'
import type { Locale } from '@/data/remedies'

type Props = { params: Promise<{ locale: string; theme: string }> }
export function generateStaticParams() {
  return ['en','ru'].flatMap((locale) => TOPIC_JOURNEYS.map((item) => ({locale, theme:item.id})))
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, theme } = await params
  const journey = getTopicJourney(theme)
  if (!journey || !['en','ru'].includes(locale)) return {title:'Not found'}
  const language = locale === 'ru' ? 'ru' : 'en'
  return {
    title: `${journey.title[language]} | Holistic House`,
    description: journey.summary[language],
    alternates: {canonical: `/${language}/explore/${theme}`,languages:{en:`/en/explore/${theme}`,ru:`/ru/explore/${theme}`}},
  }
}
export default async function TopicJourneyPage({ params }: Props) {
  const { locale, theme } = await params
  if (locale !== 'ru' && locale !== 'en') notFound()
  const journey = getTopicJourney(theme)
  if (!journey) notFound()
  return <main lang={locale} style={{maxWidth:'100%',overflowX:'clip',minWidth:0}}>
    <PublicSiteHeader locale={locale as Locale} showAssessmentStrip={false}/>
    <TopicJourneySelector locale={locale} journey={journey}/>
  </main>
}
