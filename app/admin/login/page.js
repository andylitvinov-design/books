import { login } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Admin sign in' }

export default async function PrescriptionAdminLogin({ searchParams }) {
  const { error } = await searchParams
  return (
    <main className="prescription-admin-shell">
      <form className="prescription-admin-login" action={login}>
        <p>Private practitioner area</p>
        <h1>Prescription admin</h1>
        <label>PIN / Access code<input name="accessCode" type="password" autoComplete="current-password" inputMode="numeric" required /></label>
        {error && <p role="alert">The PIN / access code was not accepted.</p>}
        <button type="submit">Continue</button>
      </form>
    </main>
  )
}
