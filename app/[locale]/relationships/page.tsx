import { notFound, redirect } from 'next/navigation'

// The former tests-only landing is kept as a stable address for existing
// links, but the guided pathway now lives at /explore/relationships.
export default async function RelationshipsPage({ params }: {params: Promise<{locale:string}>}) {
  const {locale} = await params
  if (!['en', 'ru', 'es'].includes(locale)) notFound()
  redirect(`/${locale}/explore/relationships`)
}
