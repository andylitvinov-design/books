import { notFound, redirect } from 'next/navigation'
import { englishCabinetTarget } from '@/lib/app/spanish-cabinet-bridge.mjs'
import { AppWorkspaceNavigator } from '@/components/app/app-workspace'
import '../[[...path]]/workspace.css'
import '../[[...path]]/assessment-dashboard.css'
import '../[[...path]]/insights-compact.css'
import '@/components/app/psi-monitoring.css'
import '@/components/app/refinements.css'

// Restore the original My Space dashboard as the canonical Profile landing.
// AppWorkspace keeps its existing signed-in Today view and signed-out guest overview;
// free public tests remain available from the guest overview without saving results.
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

  // The Today dashboard is the first Profile screen again. AppWorkspaceNavigator
  // preserves direct ?space=path/reports bookmarks and handles signed-out visitors
  // through its existing guest overview, whose free-test link stays public.
  return <AppWorkspaceNavigator locale={locale} path={['portrait']} />
}
