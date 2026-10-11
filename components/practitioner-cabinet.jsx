'use client'

import {Archive, BadgeCheck, FileText, Film, Inbox, PlusCircle, ReceiptText, Users} from 'lucide-react'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {readUiLocale} from '@/lib/ui-locale'

const copy = {
  ru: {
    title:'Кабинет практика', description:'Клиенты, консультации и документы — в одном рабочем пространстве.', actions:'Основные действия',
    newConsultation:'Новая консультация',newConsultationText:'Выбрать клиента или создать нового и выписать рецепт вместе со счётом.',
    clients:'Клиенты',clientsText:'Открыть историю клиента, документы и доступ к кабинету.',
    legacy:'Старые документы',legacyText:'Разобрать и привязать ранее созданные документы к клиентам.',
    prescription:'Новый рецепт', prescriptionText:'Отдельный документ. Чтобы показать клиенту, привяжите через архив.', invoice:'Новый счёт', invoiceText:'Отдельный счёт или квитанция. Для передачи привяжите к клиенту.', workflow:'Как передать материалы', step1:'1. Выберите клиента или создайте нового.', step2:'2. Подготовьте рекомендацию и счёт.', step3:'3. Скопируйте приватную ссылку на кабинет клиента.',
    videos:'Видео сайта',videosText:'Добавить видео на страницу, проверить и опубликовать ссылку YouTube.',
    appRequests:'Заявки из приложения',appRequestsText:'Запросы консультаций и только те резюме, которыми пользователь решил поделиться.',
    network:'Сеть практиков',networkText:'Проверять профили, credentials и услуги мастеров.',
  },
  en: {
    title:'Practitioner Cabinet',description:'Clients, consultations, and documents in one calm workspace.',actions:'Main actions',
    newConsultation:'New consultation',newConsultationText:'Choose or create a client and issue a recommendation together with an invoice.',
    clients:'Clients',clientsText:'Open client history, documents, and private cabinet access.',
    legacy:'Legacy documents',legacyText:'Review and assign previously created documents to clients.',
    prescription:'New prescription', prescriptionText:'Standalone document. Assign it to a client through Legacy to share.', invoice:'New invoice', invoiceText:'Standalone invoice or receipt. Assign it to a client before sharing.', workflow:'Send materials in three steps', step1:'1. Choose an existing client or create one.', step2:'2. Prepare the recommendation and invoice.', step3:'3. Copy the client’s private cabinet link.',
    videos:'Website videos',videosText:'Add a video to a page, preview it, and publish its YouTube link.',
    appRequests:'App consultation requests',appRequestsText:'Requests and only the summaries users explicitly chose to share.',
    network:'Practitioner network',networkText:'Review practitioner profiles, credentials, and services.',
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
    {href:'/admin/consultations/new',icon:PlusCircle,title:text.newConsultation,body:text.newConsultationText},
    {href:'/admin/clients',icon:Users,title:text.clients,body:text.clientsText},
    {href:'/admin/prescriptions/new',icon:FileText,title:text.prescription,body:text.prescriptionText},
    {href:'/admin/payments/new',icon:ReceiptText,title:text.invoice,body:text.invoiceText},
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
