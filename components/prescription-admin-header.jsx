import { logout } from '@/app/admin/logout/actions'

export function PrescriptionAdminHeader({ title, description }) {
  return (
    <header className="prescription-admin-header">
      <div>
        <p>Prescription admin</p>
        <h1>{title}</h1>
        {description && <p className="prescription-admin-description">{description}</p>}
      </div>
      <form action={logout}><button type="submit">Logout</button></form>
    </header>
  )
}
