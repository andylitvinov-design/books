import Link from 'next/link'
import {ArrowLeft,Languages,PencilLine} from 'lucide-react'
import {notFound,redirect} from 'next/navigation'
import {resolveSavedReportLocale} from '@/lib/documents/report-locale'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getClientPaymentDocument} from '@/lib/documents/payment'
import {getClientPrescription} from '@/lib/prescriptions/service'
import {documentPreviewEditHref} from '@/lib/consultations/document-preview-navigation'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
import {getAppConfig} from '@/lib/app/config'
import {listClientSessions,getOwnerSession,getPublishedClientSession} from '@/lib/clients/session-delivery-service'
import {ClientSessionPage} from '@/components/client-session-page'
import {PrescriptionDocument} from '@/components/prescription-document'
import {PaymentDocument} from '@/components/payment-document'
import styles from '../view/viewer.module.css'

export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Full consultation preview · Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'}

// For the practitioner, preview unpublished client-scope attachments too. This
// object is never made available by the session guest/cabinet routes.
function draftProjection(owner,record) {
  const ready=new Map(owner.assets.filter(row=>row.status==='ready'&&row.scope==='client')
    .map(row=>[row.id,row]))
  return {
    id:owner.id,occurredOn:owner.occurredOn,
    title:owner.draft.title,summary:owner.draft.summary,plan:owner.draft.plan,
    report:{id:record.id,kind:record.kind},
    media:(owner.draft.media||[]).filter(item=>item.scope==='client'&&ready.has(item.assetId))
      .map(item=>({...item,kind:ready.get(item.assetId).kind,
        mime:ready.get(item.assetId).mime,durationSeconds:ready.get(item.assetId).durationSeconds})),
  }
}

async function linkedSession(store,record) {
  if(!deliveryEnabled()||!record.clientId||record.status!=='active'||record.kind==='report')
    return {session:null,state:'disabled'}
  try {
    const config=getAppConfig()
    const sourceIds=new Set([record.id,record.consultationId].filter(Boolean))
    const matches=(await listClientSessions(config,store,record.clientId))
      .filter(row=>sourceIds.has(row.sourceConsultationId))
    for(const row of matches) {
      const owner=await getOwnerSession(config,store,record.clientId,row.id)
      if(owner.draft?.reportDocumentId!==record.id&&owner.published?.reportDocumentId!==record.id)
        continue
      if(owner.status==='published'&&owner.published?.reportDocumentId===record.id) {
        // The published revision must still point to this exact verified
        // document. Never label a revised/withdrawn report as client-live.
        const published=await getPublishedClientSession(config,store,record.clientId,row.id)
        if(published.report?.id===record.id)
          return {session:published,state:'published'}
      }
      if(owner.draft?.reportDocumentId===record.id)
        return {session:draftProjection(owner,record),state:'draft'}
    }
    return {session:null,state:'missing'}
  } catch {
    // Owner can still preview the source report without exposing unverified
    // session/media details or implying those materials are published.
    return {session:null,state:'unavailable'}
  }
}

export default async function FullClientSessionPreview({params,searchParams}) {
  if(!await requireAdminRequest())redirect('/admin/login')
  const {id}=await params,query=await searchParams
  const requestedLocale=query.locale
  if(requestedLocale!==undefined&&!['en','ru'].includes(requestedLocale))notFound()
  const store=getPrescriptionStore()
  const record=store?await store.findById(id):null
  if(!record)notFound()
  const locale=requestedLocale??resolveSavedReportLocale(record,'en')
  const payment=record.kind==='payment'
  const document=payment?getClientPaymentDocument({...record,status:'active'},locale):
    getClientPrescription({...record,status:'active'},locale)
  if(!document)notFound()
  const ru=locale==='ru'
  const opened=await linkedSession(store,record)
  const fallback={
    id:record.id,occurredOn:record.dateIssued,title:ru?'Моя консультация':'My consultation',
    summary:'',plan:{focus:'',nextStep:'',takeaways:[],practices:[],additionalRecommendations:'',resources:[]},
    report:{id:record.id,kind:record.kind},media:[],
  }
  const session=opened.session||fallback
  const root='/admin/documents/'+encodeURIComponent(record.id)
  const edit=documentPreviewEditHref(record,payment?record.consultationId:undefined)
  const info=opened.state==='published'
    ?(ru?'Опубликованная версия: ниже показана полная клиентская страница с доступными вложениями.':'Published version: the full client page and authorized attachments appear below.')
    :opened.state==='draft'
      ?(ru?'Предпросмотр черновика: аудио, видео и фотографии появятся у клиента только после публикации сессии.':'Draft preview: attached recordings and photos become visible to the client only after publication.')
      :opened.state==='disabled'
        ?(ru?'Предпросмотр исходного отчёта. Защищённая доставка сессий пока отключена; вложения не могут быть показаны.':'Source report preview. Secure session delivery is disabled, so private attachments cannot be displayed.')
        :(ru?'Предпросмотр исходного отчёта. Опубликованная сессия с вложениями для этого документа не найдена или недоступна.':'Source report preview. No available session with attachments is linked to this document.')
  return <main className={styles.reader} lang={locale}>
    <nav className={styles.toolbar} aria-label={ru?'Действия с отчётом':'Report actions'}>
      <Link href={root+'?locale='+locale} className={styles.back}>
        <ArrowLeft size={18}/>{ru?'К действиям с отчётом':'Back to report actions'}</Link>
      <div className={styles.controls}>
        <Link href={root+'/session-preview?locale='+(ru?'en':'ru')} className={styles.control}>
          <Languages size={16}/>{ru?'EN':'RU'}</Link>
        <Link href={edit} className={styles.edit}><PencilLine size={16}/>{ru?'Редактировать':'Edit'}</Link>
      </div>
    </nav>
    <div className={styles.headline}>
      <span>{ru?'ЗАЩИЩЁННЫЙ ПРЕДПРОСМОТР КЛИЕНТСКОЙ СТРАНИЦЫ':'PRIVATE CLIENT PAGE PREVIEW'}</span>
      <p>{info}</p>
    </div>
    <ClientSessionPage mode="owner" selector={record.clientId||''} locale={locale}
      session={session} clientName={document.patientName||record.patientName||''}
      recommendation={payment?null:document}
      reportContent={payment?
        <PaymentDocument document={document} locale={locale} admin embedded/>:
        <PrescriptionDocument document={document} locale={locale} admin embedded/>}
      appAvailable={false}/>
  </main>
}
