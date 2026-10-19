import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import GrowthStudio from '@/components/growth-studio'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getGrowthStudioStore} from '@/lib/growth-studio/store'
import {uiLocaleCookie} from '@/lib/ui-locale'
export const dynamic = 'force-dynamic'
export const metadata = {title:'Growth Studio · Holistic House',robots:{index:false,follow:false}}

export default async function GrowthStudioPage() {
  if (!await requireAdminRequest()) redirect('/admin/login')
  const locale = (await cookies()).get(uiLocaleCookie)?.value === 'ru' ? 'ru' : 'en'
  let initialRecords = [], storageReady = false
  try {
    const store = getGrowthStudioStore()
    if (store) {initialRecords = await store.list(); storageReady = true}
  } catch {
    // Never present unsaved browser-only data as durable editorial records.
  }
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader initialLocale={locale}
      title={{en:'Growth Studio',ru:'Центр продвижения'}}
      description={{
        en:'Prepare and plan posts across your brands. External publishing is not activated.',
        ru:'Готовьте публикации разных проектов. Автопубликация пока не подключена.',
      }}
    />
    <GrowthStudio initialLocale={locale} initialRecords={initialRecords} storageReady={storageReady}/>
  </main>
}
