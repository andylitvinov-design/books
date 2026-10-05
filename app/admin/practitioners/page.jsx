import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import PractitionerModeration from '@/components/practitioner-moderation'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Practitioner Network | Holistic House',robots:{index:false,follow:false}}
export default async function PractitionerNetworkPage(){if(!(await requireAdminRequest()))redirect('/admin/login');return <PractitionerModeration/>}
