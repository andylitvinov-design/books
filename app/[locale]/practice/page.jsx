import { notFound } from 'next/navigation'
import PracticeShowcase from '@/components/practice-showcase'

const SUPPORTED_LOCALES = ['en', 'ru', 'es']

export const dynamic = 'force-static'

export async function generateMetadata({ params }) {
  const { locale } = await params
  if (!SUPPORTED_LOCALES.includes(locale)) return {}
  const title = locale === 'ru' ? 'Кабинет практика' : locale === 'es' ? 'Espacio profesional' : 'Practitioner workspace'
  const description = locale === 'ru'
    ? 'Предварительный просмотр кабинета практика Holistic House. Для работы с услугами и заявками войдите через Google.'
    : locale === 'es'
      ? 'Explora tu espacio profesional de Holistic House. Inicia sesión con Google para gestionar tus servicios.'
      : 'Preview your Holistic House practitioner workspace. Sign in with Google to manage your practice.'
  return {
    title: title + ' | Holistic House',
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: '/' + locale + '/practice',
      languages: { en: '/en/practice', ru: '/ru/practice', es: '/es/practice' },
    },
  }
}

export default async function PracticePreviewPage({ params }) {
  const { locale } = await params
  if (!SUPPORTED_LOCALES.includes(locale)) notFound()
  return <PracticeShowcase locale={locale} />
}
