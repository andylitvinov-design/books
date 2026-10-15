import Link from 'next/link'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
import {configuredVideoUploadStore} from '@/lib/clients/private-video-object-store'
import {uiLocaleCookie} from '@/lib/ui-locale'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const metadata={title:'Private client video storage · Holistic House',robots:{index:false,follow:false}}

export default async function ClientVideoStorageSetup(){
  if(!await requireAdminRequest())redirect('/admin/login')
  const ru=(await cookies()).get(uiLocaleCookie)?.value==='ru'
  const delivery=deliveryEnabled()&&Boolean(process.env.HH_APP_SUPABASE_SECRET_KEY)
  let state='off',provider=null
  try{
    provider=configuredVideoUploadStore()
    if(provider)state='configured'
  }catch{state='incomplete'}
  const backend=provider?.provider||process.env.HH_CLIENT_VIDEO_BACKEND||null
  const isR2=backend==='r2'
  const isCanada=backend==='s3_ca'
  const copy=ru?{
    title:'Хранилище клиентских видео',desc:'Настройка отдельных приватных MP4 без переполнения Supabase.',
    status:'Состояние',base:'Клиентские консультации',on:'Настроено',off:'Требует настройки',
    external:'Внешнее видео',configured:'Серверные параметры заполнены. Приватность и воспроизведение ещё нужно проверить.',
    incomplete:'Данные провайдера неполные или некорректные. Видео блокируется.',
    disconnected:'R2/S3 не подключены. Новые видео не загружаются в Supabase автоматически.',
    choices:'Выберите, где хранить персональные видео',
    r2:'Cloudflare R2 — дешевле, но без гарантии хранения в Канаде. Используйте только после оценки конфиденциальности.',
    s3:'Amazon S3 (Канада) — регион ca-central-1. Предпочтительный вариант, если важна канадская локализация.',
    steps:'Что нужно завершить',intro:'На стороне провайдера создайте приватный bucket без публичной выдачи, проверьте права и CORS для домена сайта.',
    secret:'Затем добавьте серверные переменные в настройках Vercel (не присылайте секреты в чат и не добавляйте в GitHub):',
    safety:'Наличие ключей не доказывает безопасность или корректность реальной загрузки. До теста с синтетическим MP4 и проверки прав клиентов не включайте публикацию реальных записей.',
    done:'После настройки вернитесь в редактор консультации и проверьте статус загрузки. Видеосессии клиентов не отправляются на YouTube.',
    back:'Перейти к клиентам',provider:'Выбранный провайдер'
  }:{
    title:'Private client video storage',desc:'Keep personal MP4 recordings separate from Supabase Free storage.',
    status:'Status',base:'Client delivery',on:'Configured',off:'Needs setup',
    external:'External video',configured:'Server settings are present. Privacy and playback still need independent testing.',
    incomplete:'Provider settings are incomplete or invalid. New video uploads are blocked.',
    disconnected:'R2/S3 is not connected. New client MP4s never silently consume Supabase storage.',
    choices:'Choose where personal videos will be stored',
    r2:'Cloudflare R2 — lower storage cost, but no guarantee of Canadian residency. Requires privacy acceptance.',
    s3:'Amazon S3 Canada — ca-central-1 region. Prefer this when Canadian data location matters.',
    steps:'Finish setup',intro:'Create a private bucket with public access disabled, scoped credentials and CORS restricted to your website.',
    secret:'Configure these server-only keys in Vercel (never place credentials in chat or GitHub):',
    safety:'Environment keys alone do not verify privacy, provider access or working uploads. Test a synthetic MP4 and cross-client authorization before using patient recordings.',
    done:'After setup, return to your session editor to verify readiness. Never upload private client videos to YouTube.',
    back:'Go to clients',provider:'Selected provider'
  }
  const envs=[
    'HH_CLIENT_VIDEO_EXTERNAL_ENABLED=true',
    'HH_CLIENT_VIDEO_BACKEND=r2 | s3_ca',
    'HH_CLIENT_VIDEO_BUCKET',
    'HH_CLIENT_VIDEO_ACCESS_KEY_ID',
    'HH_CLIENT_VIDEO_SECRET_ACCESS_KEY',
    ...(isR2?['HH_CLIENT_R2_ACCOUNT_ID']:[]),
  ]
  return <main className="prescription-admin-shell" style={{minHeight:'100vh',background:'#f7f9fc'}}>
    <PrescriptionAdminHeader title={{en:'Private client video storage',ru:'Хранилище клиентских видео'}}
      description={{en:'Secure phone recordings without filling Supabase',ru:'Видео с телефона без переполнения Supabase'}}/>
    <div style={{maxWidth:900,margin:'0 auto',padding:'16px 20px 48px',color:'#173957'}}>
      <section style={{background:'#fff',border:'1px solid #dce4ed',padding:22,borderRadius:16,marginBottom:18}}>
        <h2 style={{marginTop:0,fontSize:23}}>{copy.title}</h2><p>{copy.desc}</p>
        <p><strong>{copy.base}:</strong> {delivery?copy.on:copy.off}</p>
        <p><strong>{copy.external}:</strong> {state==='configured'?copy.on:copy.off}</p>
        <p>{state==='configured'?copy.configured:state==='incomplete'?copy.incomplete:copy.disconnected}</p>
        {(isR2||isCanada)&&<p><strong>{copy.provider}:</strong> {isR2?'Cloudflare R2':'Amazon S3 Canada'}</p>}
      </section>
      <section style={{background:'#fff',border:'1px solid #dce4ed',padding:22,borderRadius:16,marginBottom:18}}>
        <h2 style={{marginTop:0,fontSize:20}}>{copy.choices}</h2>
        <p><strong>Cloudflare R2:</strong> {copy.r2} <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare <span aria-hidden="true">↗</span></a></p>
        <p><strong>Amazon S3 (ca-central-1):</strong> {copy.s3} <a href="https://console.aws.amazon.com/s3/home?region=ca-central-1" target="_blank" rel="noopener noreferrer">AWS <span aria-hidden="true">↗</span></a></p>
      </section>
      <section style={{background:'#fff',border:'1px solid #dce4ed',padding:22,borderRadius:16,marginBottom:18}}>
        <h2 style={{marginTop:0,fontSize:20}}>{copy.steps}</h2>
        <p>{copy.intro}</p>
        <p>{copy.secret}</p>
        <ul style={{lineHeight:1.9}}>
          {envs.map(key=><li key={key}><code style={{background:'#edf3f8',padding:'2px 5px',borderRadius:4}}>{key}</code></li>)}
        </ul>
        <p><a href="https://vercel.com/super10/codex-public-book-library/settings/environment-variables" target="_blank" rel="noopener noreferrer">Vercel environment settings ↗</a></p>
      </section>
      <section style={{background:'#fff7ef',border:'1px solid #ead3ba',padding:22,borderRadius:16,marginBottom:16}}>
        <p style={{marginTop:0}}>{copy.safety}</p>
        <p style={{marginBottom:0}}>{copy.done}</p>
      </section>
      <Link href="/admin/clients" style={{display:'inline-block',padding:'12px 16px',background:'#173957',borderRadius:10,color:'#fff',textDecoration:'none'}}>{copy.back}</Link>
    </div>
  </main>
}
