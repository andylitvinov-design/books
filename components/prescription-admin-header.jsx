import Link from 'next/link'
import { logout } from '@/app/admin/logout/actions'

export function PrescriptionAdminHeader({ title, description }) {
  return (
    <header className="prescription-admin-header">
      <div>
        <p><Link href="/admin/consultations/new">New consultation</Link> · <Link href="/admin/clients">Clients</Link> · <Link href="/admin/clients/legacy">Unassigned legacy documents</Link></p>
        <h1>{title}</h1>
        {description && <p className="prescription-admin-description">{description}</p>}
      </div>
      <form action={logout}><button type="submit">Logout</button></form>
    </header>
  )
}
