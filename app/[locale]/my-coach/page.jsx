import { notFound } from 'next/navigation'
import MyCoachCatalog from '@/components/my-coach-catalog'
import { metadataBaseFor } from '@/data/site-metadata'
import styles from './page.module.css'

const locales = ['en', 'ru', 'es']
const metadata = {
  en: { title: 'My Coach · AI coaches & real practitioners | Holistic House',
    description: 'Explore AI coaches and real human practitioners, and request a personal psychotherapy session.' },
  ru: { title: 'My Coach · AI-коучи и реальные специалисты | Holistic House',
    description: 'Выберите AI-коуча или реального терапевта для индивидуальной сессии.' },
  es: { title: 'My Coach · Coaches IA y profesionales reales | Holistic House',
    description: 'Elige un coach de IA o un profesional real y solicita una sesión de terapia individual.' },
}
export function generateStaticParams() { return locales.map(locale => ({ locale })) }
export async function generateMetadata({ params }) {
  const { locale } = await params
  if (!locales.includes(locale)) return { title: 'Not found', robots: { index: false } }
  return {
    metadataBase: metadataBaseFor(), ...metadata[locale],
    alternates: {
      canonical: '/' + locale + '/my-coach',
      languages: { en: '/en/my-coach', ru: '/ru/my-coach', es: '/es/my-coach', 'x-default': '/en/my-coach' },
    },
  }
}
export default async function MyCoachPage({ params }) {
  const { locale } = await params
  if (!locales.includes(locale)) notFound()
  return <div className={styles.page} lang={locale} data-my-coach-page>
    <MyCoachCatalog locale={locale} />
  </div>
}
