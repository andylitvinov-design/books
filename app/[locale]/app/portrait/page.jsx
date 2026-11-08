import { notFound, redirect } from 'next/navigation'
import { englishCabinetTarget } from '@/lib/app/spanish-cabinet-bridge.mjs'
import { AppWorkspaceNavigator } from '@/components/app/app-workspace'
import ProfileTestEntry from '@/components/app/profile-test-entry'
import '../[[...path]]/workspace.css'
import '../[[...path]]/assessment-dashboard.css'
import '../[[...path]]/insights-compact.css'
import '@/components/app/psi-monitoring.css'
import '@/components/app/refinements.css'

// The public Profile entry does not mount AppWorkspace or request a personal bootstrap.
// Query-driven private bookmarks continue through the original protected workspace.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }) {
  const { locale } = await params
  return {
    title: (locale === 'ru' ? 'Моё пространство · Тесты' : 'My Space · Tests') + ' | Holistic House',
    manifest: locale === 'ru' ? '/holistic-house-app-ru.webmanifest' : '/holistic-house-app.webmanifest',
    icons: { icon: '/icons/holistic-house-teal.svg', apple: '/holistic-house-icon/180' },
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

export default async function ProfilePage({ params, searchParams }) {
  const { locale } = await params
  const query = (await searchParams) || {}
  if (locale === 'es') {
    const target = englishCabinetTarget(['portrait'], query)
    if (!target) notFound()
    redirect(target)
  }
  if (!['en', 'ru'].includes(locale)) notFound()

  // Personal information is loaded ONLY for explicitly requested account views.
  // Keep existing private deep links (including OAuth handoff, paths and reports),
  // but ignore ordinary tracking parameters so they never trigger account reads.
  const hasPrivateIntent = ['today', 'path', 'reports'].includes(query.space) ||
    query.afterSignIn === 'messages' ||
    ['cancelled', 'error', 'denied'].includes(query.auth)
  if (hasPrivateIntent) return <AppWorkspaceNavigator locale={locale} path={['portrait']} />
  return <ProfileTestEntry locale={locale} />
}
