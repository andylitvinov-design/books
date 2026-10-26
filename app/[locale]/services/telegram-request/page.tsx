import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicSiteHeader } from '@/components/public-site-header'
import { TelegramServiceRequestForm } from '@/components/telegram-service-request'
import { isPublicLocale } from '@/data/academy/catalog'
import { getAppConfig } from '@/lib/app/config'
import { publishedTelegramOffering } from '@/lib/practitioners/telegram-service-offering'

type Props = {
  params: Promise<{locale: string}>
  searchParams: Promise<{service?: string | string[]}>
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Telegram service request | Holistic House',
  robots: {index: false, follow: false},
}

export default async function TelegramServiceRequest({params,searchParams}: Props) {
  const {locale} = await params
  const {service} = await searchParams
  if (!isPublicLocale(locale) || typeof service !== 'string') notFound()
  const offering = await publishedTelegramOffering(getAppConfig(),service,locale)
  if (!offering) notFound()
  const ru = locale === 'ru', es = locale === 'es'
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale}/>
      <section className="services-studio-hero" style={{maxWidth:740,margin:'28px auto',padding:'18px 16px 28px'}}>
        <div className="services-studio-hero-copy">
          <p className="homeopathy-kicker">Holistic House · Telegram</p>
          <h1>{ru ? 'Заявка мастеру' : es ? 'Solicitud al profesional' : 'Request a practitioner service'}</h1>
          <p>{ru ? 'Мастер' : es ? 'Profesional' : 'Practitioner'}: <strong>{offering.practitionerName || offering.practitionerSlug}</strong></p>
          <p>{ru ? 'Услуга' : es ? 'Servicio' : 'Service'}: <strong>{offering.title}</strong></p>
          <TelegramServiceRequestForm
            locale={locale as 'en'|'ru'|'es'}
            serviceId={offering.id}
            serviceTitle={offering.title}
          />
          <p style={{marginTop:18}}>
            <Link href={`/${locale}/masters/${offering.practitionerSlug}`}>
              {ru ? 'Открыть профиль мастера' : es ? 'Ver perfil del profesional' : 'View practitioner profile'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
