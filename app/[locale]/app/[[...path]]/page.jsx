import { notFound, redirect } from 'next/navigation'
import AppWorkspace from '@/components/app/app-workspace'
import './workspace.css'
import './assessment-dashboard.css'
import './insights-compact.css'
import '@/components/app/psi-monitoring.css'
import '@/components/app/refinements.css'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'My tests | Holistic House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  manifest: '/holistic-house.webmanifest',
}
export default async function AppPage({ params }) {
  const { locale, path = [] } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  // Backward-compatible saved-document links now open the exact original
  // report renderer, rather than an abbreviated dashboard item.
  if (path[0] === 'documents') {
    if (path.length === 1) redirect('/' + locale + '/app/portrait#personal-reports')
    if (path.length === 2) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path[1])) notFound()
      redirect('/' + locale + '/app/document-view/' + path[1])
    }
  }
  if (path.length > 2 || (!['portrait','monitoring','tests','runs','results','history','consultations','settings','continue','reports','portfolio','practice','analysis','documents','course'].includes(path[0]) && path.length)) notFound()
  // Existing Analysis bookmarks are permanently useful: open the merged report archive.
  if (path[0] === 'analysis' && path.length === 1) redirect('/' + locale + '/app/portrait#personal-reports')
  return <AppWorkspace locale={locale} path={path} />
}
