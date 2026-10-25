import Link from 'next/link'
import {redirect} from 'next/navigation'
import {cookies} from 'next/headers'
import {ChevronRight} from 'lucide-react'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {uiLocaleCookie} from '@/lib/ui-locale'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import AdminTelegramAudio from '@/components/admin-telegram-audio'
import folders from '@/components/materials-audio-folders.module.css'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const metadata={title:'Telegram Audio · My Materials · Holistic House',
  robots:{index:false,follow:false,noarchive:true}}
export default async function TelegramAudioMaterials(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const chosen=(await cookies()).get(uiLocaleCookie)?.value
  const locale=['ru','en','es'].includes(chosen)?chosen:'en'
  return <main className="prescription-admin-shell" data-owner-telegram-audio-page>
    <PrescriptionAdminHeader title={{
      en:'My Materials / Telegram audio',ru:'Мои материалы / Аудио из Telegram'}}
      description={{
        en:'Record or forward from Telegram; review privately and choose a folder.',
        ru:'Перешлите голосовое сообщение боту, прослушайте и выберите папку.'}}/>
    <nav className={folders.breadcrumb} aria-label="Breadcrumb">
      <Link href="/admin/materials">{locale==='ru'?'Мои материалы':'My Materials'}</Link>
      <ChevronRight aria-hidden="true"/>
      <span>{locale==='ru'?'Аудио из Telegram':'Telegram audio'}</span>
    </nav>
    <AdminTelegramAudio locale={locale}/>
  </main>
}
