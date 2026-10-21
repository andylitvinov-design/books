import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { PractitionerAutoEntry } from '@/components/practitioner-auto-entry'
import { practitionerDestination } from '@/lib/app/practitioner-access'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Practitioner Cabinet' }

// Restore practitioner access through the verified Google owner bridge;
// individual admin routes continue to enforce their own private session checks.
export default async function PrescriptionAdminLogin({ searchParams }) {
  const [params, jar] = await Promise.all([searchParams, cookies()])
  // Only named server-owned destinations. Never follow arbitrary query-provided URLs.
  const destination = ['growth', 'seo', 'acquisition'].includes(params?.destination) ? params.destination : 'cabinet'
  if (await requireAdminRequest()) redirect(practitionerDestination[destination])
  const locale = jar.get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  return <PractitionerAutoEntry locale={locale} destination={destination} authFailed={['failed', 'cancelled'].includes(params?.auth)} />
}
