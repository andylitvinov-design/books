import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {PractitionerMaterialsCabinet} from '@/components/practitioner-materials-cabinet'
export const dynamic='force-dynamic'
export const metadata={title:'Materials · Holistic House',robots:{index:false,follow:false}}
export default async function MaterialsPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  return <main className="prescription-admin-shell practitioner-materials-shell">
    <PrescriptionAdminHeader title={{ru:'Материалы',en:'Materials'}} description={{
      ru:'Общая библиотека фото, видео и обучающих ссылок для отчетов клиентам.',
      en:'Reusable photos, videos and educational links for client reports.'
    }}/>
    <PractitionerMaterialsCabinet/>
  </main>
}
