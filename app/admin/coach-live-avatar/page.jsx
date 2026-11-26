import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {pilotPublicStatus} from '@/lib/coaching/live-avatar-pilot.mjs'
import CoachLiveAvatarLab from '@/components/coach-live-avatar-lab'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Coach Live Avatar Lab',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function CoachLiveAvatarPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  return <CoachLiveAvatarLab status={pilotPublicStatus()}/>
}
