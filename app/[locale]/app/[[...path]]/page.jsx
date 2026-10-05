import { notFound } from 'next/navigation'
import AppWorkspace from '@/components/app/app-workspace'
import './workspace.css'
import '@/components/app/refinements.css'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Your portrait | Holistic House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export default async function AppPage({ params }) {
  const { locale, path = [] } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  if (path.length > 2 || (!['tests','runs','results','history','consultations','settings','continue','reports','practice'].includes(path[0]) && path.length)) notFound()
  return <AppWorkspace locale={locale} path={path} />
}
