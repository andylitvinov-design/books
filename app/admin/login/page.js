import { login } from './actions'
import { cookies } from 'next/headers'
import { uiLocaleCookie } from '@/lib/ui-locale'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Practitioner Cabinet sign in' }

export default async function PrescriptionAdminLogin({ searchParams }) {
  const { error } = await searchParams
  const ru = (await cookies()).get(uiLocaleCookie)?.value === 'ru'
  const copy = ru
    ? { label: 'Приватный доступ', title: 'Кабинет практика', description: 'Приватный доступ к рабочему кабинету и материалам клиентов.', field: 'Код доступа', error: 'Код доступа не принят. Попробуйте ещё раз позже.', submit: 'Продолжить' }
    : { label: 'Private access', title: 'Practitioner Cabinet', description: 'Private access for practitioner tools and client records.', field: 'Access code', error: 'Access code was not accepted. Please try again later.', submit: 'Continue' }
  return (
    <main className="prescription-admin-shell">
      <form className="prescription-admin-login" action={login}>
        <p>Holistic House · {copy.label}</p>
        <h1>{copy.title}</h1>
        <span>{copy.description}</span>
        <label>{copy.field}<input name="accessCode" type="password" autoComplete="current-password" inputMode="numeric" required /></label>
        {error && <p role="alert">{copy.error}</p>}
        <button type="submit">{copy.submit}</button>
      </form>
    </main>
  )
}
