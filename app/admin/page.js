import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'My Practice · Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}

// The historical /admin URL is a private compatibility entry, not a second cabinet.
// Admin actions, client records and historical tools remain on their existing routes.
export default async function AdminPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const locale=(await cookies()).get(uiLocaleCookie)?.value==='ru'?'ru':'en'
  redirect('/'+locale+'/app/practice')
}
