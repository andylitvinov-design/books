import { cookies } from 'next/headers'
import { notFound,redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getAppConfig } from '@/lib/app/config'
import { deliveryEnabled } from '@/lib/clients/delivery-model'
import { getOwnerSession } from '@/lib/clients/session-delivery-service'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { AdminSessionStudio } from '@/components/admin-session-studio'
export const dynamic='force-dynamic'
export const metadata={title:'Client session editor · Holistic House',robots:{index:false,follow:false}}
export default async function OwnerSessionPage({params}){
  if(!await requireAdminRequest()) redirect('/admin/login')
  if(!deliveryEnabled()) notFound()
  const {id,sessionId}=await params
  const store=getPrescriptionStore()
  const client=await store?.findClientById(id)
  if(!client||client.status!=='active') notFound()
  const session=await getOwnerSession(getAppConfig(),store,id,sessionId).catch(()=>null)
  if(!session) notFound()
  const all=await store.listClientDocuments(id)
  const documents=all.filter(doc=>doc.status==='active'&&doc.clientId===id&&doc.kind!=='report')
    .map(doc=>({id:doc.id,dateIssued:doc.dateIssued,kind:doc.kind,languagePreference:doc.languagePreference}))
  const locale=(await cookies()).get(uiLocaleCookie)?.value==='ru'?'ru':'en'
  return <main style={{background:'#f7faf9',minHeight:'100vh'}}>
    <div style={{maxWidth:1020,margin:'0 auto',padding:'12px 18px'}}>
      <a style={{color:'#247a86'}} href={'/admin/clients/'+id}>{locale==='ru'?'← Карточка клиента':'← Client profile'}</a>
    </div>
    <AdminSessionStudio clientId={id} initialSession={session} documents={documents} locale={locale}/>
  </main>
}
