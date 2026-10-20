import { notFound, redirect } from 'next/navigation'
import AppWorkspace from '@/components/app/app-workspace'
import './workspace.css'
import './assessment-dashboard.css'
import './insights-compact.css'
import '@/components/app/psi-monitoring.css'
import '@/components/app/refinements.css'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function generateMetadata({ params }) {
  const { locale, path = [] } = await params
  const titles = {
    portrait: locale === 'ru' ? 'Мои личные отчёты' : 'My personal reports',
    tests: locale === 'ru' ? 'Мои тесты' : 'My tests',
    portfolio: locale === 'ru' ? 'Мои результаты' : 'My results',
    course: locale === 'ru' ? 'Мои курсы' : 'My courses',
  }
  return {
  title: `${titles[path[0] || 'portrait'] || (locale === 'ru' ? 'Мой кабинет' : 'My cabinet')} | Holistic House`,
  manifest: path[0] === 'course' ? (locale === 'ru' ? '/opora-antistress-ru.webmanifest' : '/opora-antistress-en.webmanifest') : '/holistic-house.webmanifest',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  }
}
export default async function AppPage({ params }) {
  const { locale, path = [] } = await params
  if (!['en', 'ru'].includes(locale)) notFound()
  // Personal reports are the first stop in the signed-in Cabinet.
  if (path.length === 0) redirect('/' + locale + '/app/portrait')
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
  // A tab-specific workspace cannot briefly render full screens with a
  // previous tab's reduced Profile data while the next bootstrap is loading.
  return <AppWorkspace key={path[0]} locale={locale} path={path} />
}
