import {redirect} from 'next/navigation'
import {PractitionerCabinet} from '@/components/practitioner-cabinet'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {appEnabled} from '@/lib/app/config'
export const dynamic='force-dynamic'
export const metadata={title:'Practitioner Cabinet',robots:{index:false,follow:false}}
export default async function AdminPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  return <PractitionerCabinet appRequestsEnabled={appEnabled()}/>
}
