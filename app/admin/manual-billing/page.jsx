import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { ManualBillingReview } from '@/components/manual-billing-review'
export const dynamic='force-dynamic'
export const metadata={title:'Manual membership payments | Holistic House',robots:{index:false,follow:false}}
export default async function ManualBillingPage() {
  if(!await requireAdminRequest())redirect('/admin/login')
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'26px 16px'}}>
    <p><Link href="/admin">← Practitioner Cabinet</Link></p>
    <ManualBillingReview/>
  </main>
}
