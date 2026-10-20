import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TopicJourneySelector } from '@/components/topic-journey-selector'
import { TopicGrowthGuide } from '@/components/topic-growth-guide'
import { BusinessWebsiteEnquiry } from '@/components/business-website-enquiry'
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
    <TopicGrowthGuide theme={theme} locale={locale as 'en'|'ru'|'es'}/>
    {theme==='business'&&<section style={{maxWidth:1160,margin:'16px auto 30px',padding:'0 clamp(14px,3.5vw,34px)'}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:18,alignItems:'center',justifyContent:'space-between',padding:'clamp(18px,3vw,30px)',background:'linear-gradient(110deg,#eaf5f0,#fffcf5)',border:'1px solid #c5dfd5',borderRadius:20}}>
        <div style={{maxWidth:650}}>
          <span style={{fontSize:11,fontWeight:800,letterSpacing:'.09em',color:'#368778'}}>
            {locale==='ru'?'БЕСПЛАТНО · ПЕРСОНАЛЬНЫЙ ПЛАН':'FREE · PERSONAL DEVELOPMENT'}
          </span>
          <h2 style={{fontSize:'clamp(22px,3vw,30px)',color:'#194756',fontFamily:'Georgia,serif',margin:'8px 0 10px'}}>
            {locale==='ru'?'Бизнес и карьера: личная программа на 90 дней':'Business & Career: Your 90-day plan'}
          </h2>
          <p style={{margin:0,lineHeight:1.55,color:'#547177'}}>
            {locale==='ru'
              ? 'Авторский опросник, личная цель, короткие ежедневные задания и история реальных результатов в приватном кабинете.'
              : 'A short self-reflection questionnaire, chosen goals, everyday actions and private tracking of real-world results.'}
          </p>
        </div>
        <Link href={`/${locale==='ru'?'ru':'en'}/app/business`} prefetch={false}
          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:46,padding:'12px 17px',background:'#803e55',color:'#fff',borderRadius:11,textDecoration:'none',fontSize:13,fontWeight:800}}>
          {locale==='ru'?'Создать мой план →':'Build my free plan →'}
        </Link>
      </div>
    </section>}
    {theme === 'business' && <div style={{maxWidth:1160,margin:'0 auto',padding:'0 clamp(14px,3.5vw,34px) 44px'}}>
      <BusinessWebsiteEnquiry locale={locale as 'en'|'ru'|'es'} />
    </div>}
  </main>
}
