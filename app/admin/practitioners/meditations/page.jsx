import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import PractitionerMeditationsModeration from '@/components/practitioner-meditations-moderation'
export const dynamic='force-dynamic'
export const metadata={title:'Meditation Moderation | Holistic House',robots:{index:false,follow:false}}
export default async function Page(){
  if(!(await requireAdminRequest()))redirect('/admin/login')
  return <PractitionerMeditationsModeration/>
}
