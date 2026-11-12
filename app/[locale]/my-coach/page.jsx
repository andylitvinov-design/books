import { notFound } from 'next/navigation'
import MyCoachCatalog from '@/components/my-coach-catalog'
import { metadataBaseFor } from '@/data/site-metadata'
import styles from './page.module.css'

const locales = ['en', 'ru', 'es']
const metadata = {
  en: { title: 'My Coach · AI coaching personas | Holistic House',
    description: 'Explore eight fictional AI coach personalities, compare coaching styles and choose how your guided session unfolds.' },
  ru: { title: 'My Coach · Каталог AI-коучей | Holistic House',
    description: 'Выберите AI-персонажа для коучинга: восемь профилей, индивидуальные стили, темы и настройки поведения.' },
  es: { title: 'My Coach · Personajes de coaching con IA | Holistic House',
    description: 'Elige entre ocho personajes de coach con IA y adapta el ritmo, el estilo y las preguntas de seguimiento.' },
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
