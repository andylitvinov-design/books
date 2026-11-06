import { notFound } from 'next/navigation'
import LearningPathWorkspace from '@/components/learning-path-workspace'
export const metadata = {
  title: 'My Learning Path | Holistic House Academy',
  description: 'Build a personal 4–6 week Reiki learning route with verified Academy materials.',
}
export default async function MyPathPage({ params }) {
  const { locale } = await params
  if (!['ru', 'en', 'es'].includes(locale)) notFound()
  return <LearningPathWorkspace locale={locale} />
}
