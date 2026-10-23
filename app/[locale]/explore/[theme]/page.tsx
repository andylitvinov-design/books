import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TopicJourneySelector } from '@/components/topic-journey-selector'
import { DirectionOffers } from '@/components/direction-offers'
import { DirectionExtras } from '@/components/direction-extras'
import { TopicGrowthGuide } from '@/components/topic-growth-guide'
import { growthGuideFor } from '@/data/growth-guides'
import { TOPIC_JOURNEYS, getTopicJourney } from '@/lib/assessments/topic-journeys'
import { buildTopicTestSuggestions } from '@/lib/assessments/topic-test-suggestions'
import type { PublicLocale } from '@/lib/public-locales'

const BUSINESS_SEO = {
  en: {
    title: 'Business Consultations & Founder Coaching',
    description: 'Explore business strategy, income decisions and project goals with Andrey Litvinov. Free written review or personal 30-minute (€50) and 60-minute (€100) consultations.',
  },
  ru: {
    title: 'Бизнес-консультации и коучинг предпринимателей',
    description: 'Разбор бизнес-решений, дохода, целей и собственного дела с Андреем Литвиновым. Бесплатный письменный разбор, консультации 30 минут (€50) и 60 минут (€100).',
  },
  es: {
    title: 'Consultoría de negocios y coaching de emprendedores',
    description: 'Explora decisiones de negocio, ingresos y proyectos con Andrey Litvinov. Revisión escrita gratuita y consultas personales de 30 min (€50) o 60 min (€100).',
  },
} as const

type Props = { params: Promise<{ locale: string; theme: string }> }
export function generateStaticParams() {
  return ['en','ru','es'].flatMap((locale) => [...TOPIC_JOURNEYS.map(item => item.id), 'love'].map((theme) => ({locale, theme})))
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, theme } = await params
  const journey = getTopicJourney(theme)
  if (!journey || !['en','ru','es'].includes(locale)) return {title:'Not found'}
  const language = locale as 'en' | 'ru' | 'es'
  const guide = growthGuideFor(theme === 'love' ? 'relationships' : theme,language)
  const title = (theme === 'business' ? BUSINESS_SEO[language].title : guide?.title || journey.title[language]) + ' | Holistic House'
  const description = (theme === 'business' ? BUSINESS_SEO[language].description : guide?.lead || journey.summary[language]).slice(0,180)
  const canonicalTheme = theme === 'relationships' ? 'love' : theme
  return {
    title,
    description,
    openGraph: {title,description,type:'article'},
    robots: {index:true,follow:true},
    alternates: {canonical: `/${language}/explore/${canonicalTheme}`,languages:{en:`/en/explore/${canonicalTheme}`,ru:`/ru/explore/${canonicalTheme}`,es:`/es/explore/${canonicalTheme}`}},
  }
}
export default async function TopicJourneyPage({ params }: Props) {
  const { locale, theme } = await params
  if (!['ru','en','es'].includes(locale)) notFound()
  if (theme === 'relationships') redirect('/' + locale + '/explore/love')
  const journey = getTopicJourney(theme)
  if (!journey) notFound()
  const isDirection = ['energy','love','business'].includes(theme)
  const suggestions = buildTopicTestSuggestions(journey, locale)
  return <main lang={locale} style={{maxWidth:'100%',overflowX:'clip',minWidth:0}}>
    <PublicSiteHeader locale={locale as PublicLocale} showAssessmentStrip={false}/>
    {isDirection ? <>
      <DirectionOffers locale={locale as PublicLocale} journey={journey} suggestions={suggestions}/>
      <DirectionExtras locale={locale as PublicLocale} direction={theme as 'energy' | 'love' | 'business'}/>
    </> : <>
      <TopicJourneySelector locale={locale as PublicLocale} journey={journey} suggestions={suggestions}/>
      <TopicGrowthGuide theme={theme} locale={locale as 'en' | 'ru' | 'es'}/>
    </>}
  </main>
}
