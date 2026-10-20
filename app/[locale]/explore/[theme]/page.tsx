import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TopicJourneySelector } from '@/components/topic-journey-selector'
import { TopicGrowthGuide } from '@/components/topic-growth-guide'
import { BusinessWebsiteEnquiry } from '@/components/business-website-enquiry'
import { BusinessTestimonials } from '@/components/business-testimonials'
import { growthGuideFor } from '@/data/growth-guides'
import { TOPIC_JOURNEYS, getTopicJourney } from '@/lib/assessments/topic-journeys'
import { buildTopicTestSuggestions } from '@/lib/assessments/topic-test-suggestions'
import type { PublicLocale } from '@/lib/public-locales'

type Props = { params: Promise<{ locale: string; theme: string }> }
export function generateStaticParams() {
  return ['en','ru','es'].flatMap((locale) => TOPIC_JOURNEYS.map((item) => ({locale, theme:item.id})))
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, theme } = await params
  const journey = getTopicJourney(theme)
  if (!journey || !['en','ru','es'].includes(locale)) return {title:'Not found'}
  const language = locale as 'en' | 'ru' | 'es'
  const guide = growthGuideFor(theme,language)
  const title = (guide?.title || journey.title[language]) + ' | Holistic House'
  const description = (guide?.lead || journey.summary[language]).slice(0,180)
  return {
    title,
    description,
    openGraph: {title,description,type:'article'},
    robots: {index:true,follow:true},
    alternates: {canonical: `/${language}/explore/${theme}`,languages:{en:`/en/explore/${theme}`,ru:`/ru/explore/${theme}`,es:`/es/explore/${theme}`}},
  }
}
export default async function TopicJourneyPage({ params }: Props) {
  const { locale, theme } = await params
  if (!['ru','en','es'].includes(locale)) notFound()
  const journey = getTopicJourney(theme)
  if (!journey) notFound()
  return <main lang={locale} style={{maxWidth:'100%',overflowX:'clip',minWidth:0}}>
    <PublicSiteHeader locale={locale as PublicLocale} showAssessmentStrip={false}/>
    <TopicJourneySelector locale={locale as PublicLocale} journey={journey} suggestions={buildTopicTestSuggestions(journey, locale)}/>
    {theme === 'business'
      ? <BusinessTestimonials locale={locale as PublicLocale}/>
      : <TopicGrowthGuide theme={theme} locale={locale as 'en'|'ru'|'es'}/>}
    {theme === 'business' && <div style={{maxWidth:1160,margin:'0 auto',padding:'0 clamp(14px,3.5vw,34px) 44px'}}>
      <BusinessWebsiteEnquiry locale={locale as 'en'|'ru'|'es'} />
    </div>}
  </main>
}
