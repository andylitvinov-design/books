import {redirect} from 'next/navigation'
import {PractitionerCabinet} from '@/components/practitioner-cabinet'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {appEnabled} from '@/lib/app/config'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Additional practitioner tools · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}

// Owner-only maintenance workspace. Historical endpoints and records are unchanged.
export default async function AdminToolsPage(){
  if(!await requireAdminRequest())redirect('/admin/login?destination=tools')
  return <PractitionerCabinet appRequestsEnabled={appEnabled()}/>
}
