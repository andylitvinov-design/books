'use client'

import {Archive, FileText, Film, Inbox, PlusCircle, ReceiptText, Users} from 'lucide-react'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {readUiLocale} from '@/lib/ui-locale'

const copy = {
  ru: {
    title:'Кабинет практика', description:'Клиенты, консультации и документы — в одном рабочем пространстве.', actions:'Основные действия',
    newConsultation:'Новая консультация',newConsultationText:'Создать консультацию и подготовить документы для клиента.',
    clients:'Клиенты',clientsText:'Открыть историю клиента, документы и доступ к кабинету.',
    prescription:'Рецепт / рекомендация',prescriptionText:'Создать отдельную гомеопатическую рекомендацию и PDF для клиента.',
    payment:'Квитанция / счёт',paymentText:'Создать квитанцию об оплате или неоплаченный счёт.',
    legacy:'Старые документы',legacyText:'Разобрать и привязать ранее созданные документы к клиентам.',
    videos:'Видео сайта',videosText:'Добавить видео на страницу, проверить и опубликовать ссылку YouTube.',
    appRequests:'Заявки из приложения',appRequestsText:'Запросы консультаций и только те резюме, которыми пользователь решил поделиться.',
  },
  en: {
    title:'Practitioner Cabinet',description:'Clients, consultations, and documents in one calm workspace.',actions:'Main actions',
    newConsultation:'New consultation',newConsultationText:'Create a consultation and prepare client documents.',
    clients:'Clients',clientsText:'Open client history, documents, and private cabinet access.',
    prescription:'Prescription / recommendation',prescriptionText:'Create a standalone homeopathic recommendation and client PDF.',
    payment:'Receipt / invoice',paymentText:'Create a receipt for payment received or an unpaid invoice.',
    legacy:'Legacy documents',legacyText:'Review and assign previously created documents to clients.',
    videos:'Website videos',videosText:'Add a video to a page, preview it, and publish its YouTube link.',
    appRequests:'App consultation requests',appRequestsText:'Requests and only the summaries users explicitly chose to share.',
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
    {href:'/admin/payments/new',icon:ReceiptText,title:text.payment,body:text.paymentText},
    ...(appRequestsEnabled?[{href:'/admin/app-requests',icon:Inbox,title:text.appRequests,body:text.appRequestsText}]:[]),
    {href:'/admin/clients/legacy',icon:Archive,title:text.legacy,body:text.legacyText},
    {href:'/admin/videos',icon:Film,title:text.videos,body:text.videosText},
  ]
  return (
    <main className="prescription-admin-shell practitioner-cabinet-shell">
      <PrescriptionAdminHeader title={text.title} description={text.description}/>
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
