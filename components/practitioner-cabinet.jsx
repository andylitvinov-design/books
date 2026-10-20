'use client'

import {Archive, BadgeCheck, FileText, Film, Headphones, Images, Inbox, PlusCircle, ReceiptText, SearchCheck, Users} from 'lucide-react'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {readUiLocale} from '@/lib/ui-locale'

const copy = {
  ru: {
    title:'Кабинет практика', description:'Клиенты, консультации и документы — в одном рабочем пространстве.', actions:'Основные действия',
    newConsultation:'Новая консультация',newConsultationText:'Выбрать клиента или создать нового и выписать рецепт вместе со счётом.',
    clients:'Клиенты',clientsText:'Открыть историю клиента, документы и доступ к кабинету.',
     reports:'Отчёты клиентов',reportsText:'Просмотр и редактирование ранее созданных отчётов.',
    legacy:'Старые документы',legacyText:'Разобрать и привязать ранее созданные документы к клиентам.',
    prescription:'Новый рецепт', prescriptionText:'Отдельный документ. Чтобы показать клиенту, привяжите через архив.', invoice:'Новый счёт', manualBilling:'Оплаты подписок', manualBillingText:'Заявки Advanced/Premium, счета и проверка поступлений.', invoiceText:'Отдельный счёт или квитанция. Для передачи привяжите к клиенту.', workflow:'Как передать материалы', step1:'1. Выберите клиента или создайте нового.', step2:'2. Подготовьте рекомендацию и счёт.', step3:'3. Скопируйте приватную ссылку на кабинет клиента.',
    videos:'Видео сайта',videosText:'Добавить видео на страницу, проверить и опубликовать ссылку YouTube.',
    materials:'Материалы',materialsText:'Библиотека фото, видео и YouTube-ссылок для выбора в отчетах клиентов.',
    appRequests:'Заявки из приложения',appRequestsText:'Запросы консультаций и только те резюме, которыми пользователь решил поделиться.',
    reikiLeads:'Reiki CRM · ученики и инициация',reikiLeadsText:'Лид 1: начало обучения. Лид 2: письмо-заявка и согласованные материалы курса.',
    reikiAudio:'Аудио · Reiki Practitioner',reikiAudioText:'Материалы → Аудио → Reiki Practitioner. Пять папок уроков, RU / EN, загрузка и публикация записей.',
    network:'Сеть практиков',networkText:'Проверять профили, credentials и услуги мастеров.',
    seo:'SEO-аналитика',seoText:'Показы, клики, индексация, ошибки сайта и скорость — проверенные данные Google.',
  },
  en: {
    title:'Practitioner Cabinet',description:'Clients, consultations, and documents in one calm workspace.',actions:'Main actions',
    newConsultation:'New consultation',newConsultationText:'Choose or create a client and issue a recommendation together with an invoice.',
    clients:'Clients',clientsText:'Open client history, documents, and private cabinet access.',
     reports:'Client reports',reportsText:'Browse, preview and edit saved client reports.',
    legacy:'Legacy documents',legacyText:'Review and assign previously created documents to clients.',
    prescription:'New prescription', prescriptionText:'Standalone document. Assign it to a client through Legacy to share.', invoice:'New invoice', manualBilling:'Membership payments', manualBillingText:'Advanced/Premium requests, invoices and verified receipts.', invoiceText:'Standalone invoice or receipt. Assign it to a client before sharing.', workflow:'Send materials in three steps', step1:'1. Choose an existing client or create one.', step2:'2. Prepare the recommendation and invoice.', step3:'3. Copy the client’s private cabinet link.',
    videos:'Website videos',videosText:'Add a video to a page, preview it, and publish its YouTube link.',
    materials:'Materials',materialsText:'Reusable photo, video and YouTube library for attaching to client reports.',
    appRequests:'App consultation requests',appRequestsText:'Requests and only the summaries users explicitly chose to share.',
    reikiLeads:'Reiki CRM · students & initiation',reikiLeadsText:'Lead 1: course start. Lead 2: initiation letter and consented student materials.',
    reikiAudio:'Audio · Reiki Practitioner',reikiAudioText:'Materials → Audio → Reiki Practitioner. Five lesson folders, RU / EN, audio uploads and publication.',
    network:'Practitioner network',networkText:'Review practitioner profiles, credentials, and services.',
    seo:'SEO Analytics',seoText:'Search impressions, clicks, indexing, site errors and speed with verified sources.',
  },
}
export function PractitionerCabinet({appRequestsEnabled=false}) {
  const [locale,setLocale]=useState('en')
  const text=copy[locale]
  useEffect(()=>{
    const updateLocale=event=>setLocale(event.detail==='ru'?'ru':'en')
    setLocale(readUiLocale(document.cookie))
    window.addEventListener('holistic-house-ui-locale',updateLocale)
    return()=>window.removeEventListener('holistic-house-ui-locale',updateLocale)
  },[])
  const actions=[
    {href:'/admin/seo',icon:SearchCheck,title:text.seo,body:text.seoText},
    {href:'/admin/consultations/new',icon:PlusCircle,title:text.newConsultation,body:text.newConsultationText},
     {href:'/admin/reports',icon:FileText,title:text.reports,body:text.reportsText},
    {href:'/admin/clients',icon:Users,title:text.clients,body:text.clientsText},
    {href:'/admin/reiki-leads',icon:Inbox,title:text.reikiLeads,body:text.reikiLeadsText},
    {href:'/admin/materials/audio/reiki-practitioner',icon:Headphones,title:text.reikiAudio,body:text.reikiAudioText},
    {href:'/admin/materials',icon:Images,title:text.materials,body:text.materialsText},
    {href:'/admin/prescriptions/new',icon:FileText,title:text.prescription,body:text.prescriptionText},
    {href:'/admin/payments/new',icon:ReceiptText,title:text.invoice,body:text.invoiceText},
    {href:'/admin/manual-billing',icon:ReceiptText,title:text.manualBilling,body:text.manualBillingText},
    ...(appRequestsEnabled?[{href:'/admin/app-requests',icon:Inbox,title:text.appRequests,body:text.appRequestsText},{href:'/admin/practitioners',icon:BadgeCheck,title:text.network,body:text.networkText}]:[]),
    {href:'/admin/clients/legacy',icon:Archive,title:text.legacy,body:text.legacyText},
    {href:'/admin/videos',icon:Film,title:text.videos,body:text.videosText},
  ]
  return (
    <main className="prescription-admin-shell practitioner-cabinet-shell">
      <PrescriptionAdminHeader title={text.title} description={text.description}/>
      <section className="master-workflow-strip" aria-label={text.workflow}><strong>{text.workflow}</strong><ol><li>{text.step1}</li><li>{text.step2}</li><li>{text.step3}</li></ol></section>
      <section aria-label={text.actions} className="practitioner-cabinet-actions practitioner-cabinet-grid">
        {actions.map(({href,icon:Icon,title,body})=>(
          <Link href={href} key={href} prefetch={false}>
            <span className="practitioner-cabinet-icon" aria-hidden="true"><Icon/></span>
            <div><h2>{title}</h2><p>{body}</p><strong aria-hidden="true">→</strong></div>
          </Link>
        ))}
      </section>
    </main>
  )
}
