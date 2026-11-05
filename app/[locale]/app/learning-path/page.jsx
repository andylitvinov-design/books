import { notFound } from 'next/navigation'
import LearningPathWorkspace from '@/components/learning-path-workspace'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'My Learning Path | My House',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}
export default async function SavedLearningPathPage({ params }) {
  const { locale } = await params
  if (!['ru', 'en', 'es'].includes(locale)) notFound()
  return <LearningPathWorkspace locale={locale} />
}
