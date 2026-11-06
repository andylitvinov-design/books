import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import WalletReview from '@/components/wallet/wallet-review'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Wallet top-up reconciliation | Holistic House',
  robots: { index: false, follow: false } }

export default async function WalletAdminPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  return <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 18px' }}>
    <p><Link href="/admin">← Practitioner Cabinet</Link></p>
    <WalletReview />
  </main>
}
