import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TopicJourneySelector } from '@/components/topic-journey-selector'
import { TopicGrowthGuide } from '@/components/topic-growth-guide'
import { BusinessWebsiteEnquiry } from '@/components/business-website-enquiry'
import { BusinessTestimonials } from '@/components/business-testimonials'
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
  return ['en','ru','es'].flatMap((locale) => TOPIC_JOURNEYS.map((item) => ({locale, theme:item.id})))
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, theme } = await params
  const journey = getTopicJourney(theme)
  if (!journey || !['en','ru','es'].includes(locale)) return {title:'Not found'}
  const language = locale as 'en' | 'ru' | 'es'
  const guide = growthGuideFor(theme,language)
  const title = (theme === 'business' ? BUSINESS_SEO[language].title : guide?.title || journey.title[language]) + ' | Holistic House'
  const description = (theme === 'business' ? BUSINESS_SEO[language].description : guide?.lead || journey.summary[language]).slice(0,180)
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
    {theme === 'business' && <aside data-business-free-90-day-plan
      style={{maxWidth:1160,margin:'0 auto 16px',padding:'0 clamp(14px,3.5vw,34px)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:'13px 16px',border:'1px solid #c6ded7',borderRadius:14,background:'#f0f7f4'}}>
        <div style={{flex:'1 1 240px'}}>
          <strong style={{color:'#1d5662',fontSize:14}}>
            {locale === 'ru' ? 'Бесплатная программа развития на 90 дней' : locale === 'es' ? 'Plan de desarrollo gratuito de 90 días' : 'Free 90-day business development plan'}
          </strong>
          <p style={{margin:'4px 0 0',fontSize:12,lineHeight:1.45,color:'#607982'}}>
            {locale === 'ru' ? 'Цели, короткие ежедневные шаги и динамика в личном кабинете.' : locale === 'es' ? 'Objetivos, acciones diarias y seguimiento privado.' : 'Set goals, take small daily actions and track your progress privately.'}
          </p>
        </div>
        <Link prefetch={false} href={`/${locale === 'ru' ? 'ru' : 'en'}/app/business`}
          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:44,padding:'9px 13px',background:'#275f68',color:'#fff',borderRadius:10,textDecoration:'none',fontSize:12,fontWeight:800}}>
          {locale === 'ru' ? 'Создать мой план →' : locale === 'es' ? 'Crear mi plan →' : 'Start free plan →'}
        </Link>
      </div>
    </aside>}
    {theme === 'business' && <div style={{maxWidth:1160,margin:'0 auto',padding:'0 clamp(14px,3.5vw,34px) calc(116px + env(safe-area-inset-bottom))'}}>
      <BusinessWebsiteEnquiry locale={locale as 'en'|'ru'|'es'} />
    </div>}
  </main>
}
