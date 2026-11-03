import Link from 'next/link'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import GrowthStudioContentRadar from '@/components/growth-studio-content-radar'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'

export const dynamic='force-dynamic'
export const metadata={
  title:'Public content radar · Holistic House Growth Studio',
  robots:{index:false,follow:false},
}

export default async function GrowthStudioContentRadarPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const locale=(await cookies()).get(uiLocaleCookie)?.value==='ru'?'ru':'en'
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader initialLocale={locale}
      title={{en:'Public Content Radar',ru:'Радар открытых материалов'}}
      description={{
        en:'Find approved public pages and prepare editorial drafts. Publishing stays manual.',
        ru:'Находите открытые страницы и готовьте черновики. Публикация только после согласования.',
      }}
    />
    <GrowthStudioContentRadar initialLocale={locale}/>
    <p style={{padding:'10px 18px 32px'}}>
      <Link href="/admin/growth-studio">{locale==='ru'?'← Вернуться в Growth Studio':'← Back to Growth Studio'}</Link>
    </p>
  </main>
}
