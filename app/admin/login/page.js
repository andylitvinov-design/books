import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { PractitionerAutoEntry } from '@/components/practitioner-auto-entry'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Practitioner Cabinet' }

// Restore practitioner access through the verified Google owner bridge;
// individual admin routes continue to enforce their own private session checks.
export default async function PrescriptionAdminLogin({ searchParams }) {
  const [params, jar] = await Promise.all([searchParams, cookies()])
  // Only this literal owner route may be restored after Google OAuth.
  const next = params?.next === 'growth-studio' ? 'growth-studio' : null
  if (await requireAdminRequest()) redirect(next ? '/admin/growth-studio' : '/admin')
  const locale = jar.get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  return <PractitionerAutoEntry locale={locale} next={next} authFailed={['failed', 'cancelled'].includes(params?.auth)} />
}
