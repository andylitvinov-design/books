import Link from 'next/link'
import {cookies} from 'next/headers'
import {redirect,notFound} from 'next/navigation'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {readSavedSession} from '@/lib/app/client-session-save-flow'
import {getPublishedSessionReport,getPublishedClientSession} from '@/lib/clients/session-delivery-service'
import {getClientPrescription} from '@/lib/prescriptions/service'
import {getClientPaymentDocument} from '@/lib/documents/payment'
import {PaymentDocument} from '@/components/payment-document'
import {PrescriptionDocument} from '@/components/prescription-document'
import {ClientSessionPage,ClientSessionVoiceMessage} from '@/components/client-session-page'
import {sharedGranulesGuideReady} from '@/lib/clients/shared-education-video'
import {SavedSessionManagement} from '@/components/app/saved-session-management'
import {verifyReportGoal} from '@/lib/app/daybook-report-index'
import {normalizeReportPlacement,reportProgramLabel,reportWeekHref} from '@/lib/consultations/report-program.mjs'
import '../../[[...path]]/workspace.css'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Saved consultation · Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'}

const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export default async function SavedSessionPage({params}){
  const {locale,id}=await params
  if(!['en','ru'].includes(locale)||!valid.test(id||''))notFound()
  let saved,record=null,clientName='',verifiedGoalId=null,pdfPlacement=null
  try{
    const config=getAppConfig()
    const actor=await createRequestAuth({cookies:await cookies()},config).verified()
    const store=getPrescriptionStore()
    saved=await readSavedSession(config,store,actor,id)
    if(saved.session.report){
      record=await getPublishedSessionReport(config,store,saved.source.clientId,saved.source.sessionId,{expectedSource:saved.expectedSource})
      if(record?.clientId!==saved.source.clientId||record?.status!=='active')record=null
    }
    if(saved.session.reportFormat==='pdf'){
      const pdfSession=await getPublishedClientSession(config,store,saved.source.clientId,saved.source.sessionId,{expectedSource:saved.expectedSource})
      pdfPlacement=pdfSession.reportFormat==='pdf'?pdfSession.programPlacement:null
    }
    const assigned=normalizeReportPlacement(record?.programPlacement??pdfPlacement)
    if(assigned?.program==='goal'&&assigned.goalId)verifiedGoalId=await verifyReportGoal(config,actor,assigned.goalId)
    const client=await store?.findClientById(saved.source.clientId)
    clientName=client?.fullName||''
  }catch(error){
    if(error instanceof AppError && error.code==='SIGN_IN_REQUIRED')redirect('/'+locale+'/app')
    if(error instanceof AppError && ['SESSION_UNAVAILABLE','SESSION_CHANGED','NOT_FOUND'].includes(error.code)){
      return <main className="hh-app hh-panel" lang={locale}>
        <h1>{locale==='ru'?'Консультация больше недоступна':'Consultation unavailable'}</h1>
        <p>{locale==='ru'?'Исходная консультация была отозвана или обновлена. Попросите специалиста прислать новую ссылку, чтобы повторно сохранить актуальную версию.':
          'This consultation was withdrawn or revised. Request a fresh session invitation to save the approved current version.'}</p>
        <Link className="hh-primary" href={'/'+locale+'/app/portrait#personal-reports'} prefetch={false}>
          {locale==='ru'?'К моим отчётам':'Back to My Reports'}
        </Link>
      </main>
    }
    throw error
  }
  const placement=normalizeReportPlacement(record?.programPlacement??pdfPlacement)
  const payment=record?.kind==='payment'
  const doc=record ? payment?getClientPaymentDocument(record,locale):getClientPrescription(record,locale):null
  return <>
    <nav className="hh-saved-session-topnav" aria-label={locale==='ru'?'Мой кабинет':'My Cabinet'}>
      {placement&&<div><strong>{reportProgramLabel(placement,locale)}</strong><span> · {locale==='ru'?'Неделя':'Week'} {placement.week}</span></div>}
      <Link prefetch={false} href={reportWeekHref(locale,placement,verifiedGoalId)}>
        {placement?.program==='goal'&&!verifiedGoalId?(locale==='ru'?'← К моим целям':'← My goals'):placement?(locale==='ru'?'← К программе':'← Back to program'):(locale==='ru'?'← Мои отчёты':'← My Reports')}
      </Link>
    </nav>
    <ClientSessionPage mode="saved" locale={locale} selector="" savedId={id} audioEmbedded={Boolean(doc&&!payment)}
      session={saved.session} clientName={doc?.patientName||clientName}
      recommendation={!payment?doc:null}
      reportContent={doc?(payment?<PaymentDocument locale={locale} document={doc} embedded/>:
        <PrescriptionDocument locale={locale} document={doc} embedded
          afterCover={<ClientSessionVoiceMessage session={saved.session} selector="" mode="saved" savedId={id} locale={locale}/>}
          narration={{scope:'saved-session',id}}/>):null}
      sharedGuideReady={sharedGranulesGuideReady()}/>
    <SavedSessionManagement locale={locale} savedId={id} savedAt={saved.savedAt}/>
  </>
}
