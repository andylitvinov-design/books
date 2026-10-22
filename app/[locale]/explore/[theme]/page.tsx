import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BriefcaseBusiness, ArrowRight } from 'lucide-react'
import wood from '@/components/business-coaching-promo.module.css'
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
    {theme === 'business' && <div style={{maxWidth:1160,margin:'0 auto',padding:'0 clamp(14px,3.5vw,34px) 18px'}}>
      <BusinessWebsiteEnquiry locale={locale as 'en'|'ru'|'es'} />
    </div>}
    {theme === 'business'
      ? <BusinessTestimonials locale={locale as PublicLocale}/>
      : <TopicGrowthGuide theme={theme} locale={locale as 'en'|'ru'|'es'}/>}
    {theme === 'business' && <aside data-business-free-90-day-plan className={wood.promo} style={{marginBottom:'calc(116px + env(safe-area-inset-bottom))'}}>
      <div className={wood.card}>
        <span className={wood.icon} aria-hidden="true"><BriefcaseBusiness size={26}/></span>
        <div className={wood.copy}>
          <span className={wood.eyebrow}>HOLISTIC HOUSE · BUSINESS & CAREER</span>
          <strong className={wood.title}>
            {locale === 'ru' ? 'Ваш бизнес-план развития на 90 дней' :
              locale === 'es' ? 'Su plan de desarrollo profesional de 90 días' :
              'Your 90-day business development plan'}
          </strong>
          <p className={wood.description}>
            {locale === 'ru'
              ? '12 недель, конкретный результат каждого дня и личный дневник прогресса. Без оплаты.'
              : locale === 'es'
                ? '12 semanas de acciones concretas y progreso privado. Curso disponible en inglés o ruso.'
                : '12 weeks, one concrete outcome each day and a private progress journal. Free to start.'}
          </p>
          <div className={wood.metadata}>
            <span>{locale === 'ru' ? '12 модулей' : locale === 'es' ? '12 módulos' : '12 modules'}</span>
            <span>{locale === 'ru' ? '90 шагов' : locale === 'es' ? '90 acciones' : '90 actions'}</span>
            <span>{locale === 'ru' ? 'Личный кабинет' : locale === 'es' ? 'Área privada' : 'Private account'}</span>
          </div>
        </div>
        <Link prefetch={false} href={'/'+(locale==='ru'?'ru':'en')+'/app/business'} className={wood.link}>
          {locale === 'ru' ? 'Начать бесплатно' : locale === 'es' ? 'Empezar en inglés' : 'Start free plan'}
          <ArrowRight size={16} aria-hidden="true"/>
        </Link>
      </div>
    </aside>}
  </main>
}
