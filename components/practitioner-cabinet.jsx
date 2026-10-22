'use client'

import {Archive, BadgeCheck, ChevronDown, ChevronRight, FileText, Film, Headphones, Images, Inbox, PlusCircle, ReceiptText, Users} from 'lucide-react'
import Link from 'next/link'
import {useEffect, useState} from 'react'
import {PrescriptionAdminHeader} from '@/components/prescription-admin-header'
import {readUiLocale} from '@/lib/ui-locale'
import styles from './practitioner-cabinet.module.css'

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
    reikiAudio:'Аудио · Reiki Practitioner',reikiAudioText:'Материалы → Курсы → Практик Рейки. Пять папок уроков, RU / EN, загрузка и публикация записей.',
    network:'Сеть практиков',networkText:'Проверять профили, credentials и услуги мастеров.',
    acquisition:'Кампании и обращения',acquisitionText:'Счётчики услуг, статус измерений и безопасные ссылки кампаний.',
    seo:'SEO-аналитика',seoText:'Показы, клики, индексация, ошибки сайта и скорость — проверенные данные Google.',
    growth:'Продвижение',growthText:'Редактор публикаций, согласование и календарь для нескольких проектов. Пока без автопостинга.',
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
    reikiAudio:'Audio · Reiki Practitioner',reikiAudioText:'Materials → Courses → Reiki Practitioner. Five lesson folders, RU / EN, audio uploads and publication.',
    network:'Practitioner network',networkText:'Review practitioner profiles, credentials, and services.',
    acquisition:'Campaigns & enquiries',acquisitionText:'Service counters, measurement coverage and safe campaign links.',
    seo:'SEO Analytics',seoText:'Search impressions, clicks, indexing, site errors and speed with verified sources.',
    growth:'Growth Studio',growthText:'Prepare and approve posts, plan your content across brands. No auto-publishing yet.',
  },
}
export function PractitionerCabinet({appRequestsEnabled=false}) {
  const [locale,setLocale]=useState('en')
  const t=copy[locale]
  useEffect(()=>{
    const change=event=>setLocale(event.detail==='ru'?'ru':'en')
    setLocale(readUiLocale(document.cookie))
    window.addEventListener('holistic-house-ui-locale',change)
    return()=>window.removeEventListener('holistic-house-ui-locale',change)
  },[])
  // Legacy routes are reusable, owner-only functions; this is not a second cabinet.
  // Marketing editing/metrics live in the current My Practice → Marketing hub.
  const ru=locale==='ru'
  const groups=[
    {key:'records',title:ru?'Клиенты и документы':'Clients & documents',
      hint:ru?'Клиенты, история, рекомендации и счета':'Clients, history, recommendations and invoices',
      items:[
        {href:'/admin/clients',icon:Users,title:t.clients,body:t.clientsText},
        {href:'/admin/consultations/new',icon:PlusCircle,title:t.newConsultation,body:t.newConsultationText},
        {href:'/admin/reports',icon:FileText,title:t.reports,body:t.reportsText},
        {href:'/admin/prescriptions/new',icon:FileText,title:t.prescription,body:t.prescriptionText},
        {href:'/admin/payments/new',icon:ReceiptText,title:t.invoice,body:t.invoiceText},
        {href:'/admin/clients/legacy',icon:Archive,title:t.legacy,body:t.legacyText},
        {href:'/admin/manual-billing',icon:ReceiptText,title:t.manualBilling,body:t.manualBillingText},
      ]},
    {key:'materials',title:ru?'Материалы и курсы':'Materials & courses',
      hint:ru?'Управление библиотекой без копирования материалов':'Library management without duplicating files',
      items:[
        {href:'/admin/materials',icon:Images,title:t.materials,body:t.materialsText},
        {href:'/admin/materials/courses/reiki-practitioner',icon:Headphones,title:t.reikiAudio,body:t.reikiAudioText},
        {href:'/admin/videos',icon:Film,title:t.videos,body:t.videosText},
        {href:'/admin/youtube-upload',icon:Film,title:ru?'Загрузить видео в YouTube':'Upload video to YouTube',
          body:ru?'Выберите подтверждённый канал и загрузите видео после проверки.':'Choose an authorized channel and upload after video QA.'},
      ]},
    {key:'operations',title:ru?'Администрирование':'Administration',
      hint:ru?'Заявки, модерация и настройки каналов':'Requests, moderation and channel settings',
      items:[
        {href:'/admin/reiki-leads',icon:Inbox,title:t.reikiLeads,body:t.reikiLeadsText},
        ...(appRequestsEnabled?[
          {href:'/admin/app-requests',icon:Inbox,title:t.appRequests,body:t.appRequestsText},
          {href:'/admin/practitioners',icon:BadgeCheck,title:t.network,body:t.networkText},
        ]:[]),
        {href:'/admin/telegram-setup',icon:Inbox,title:ru?'Telegram · настройки':'Telegram · settings',
          body:ru?'Настройка канала, без автоматической отправки.':'Connection setup; no automatic send.'},
      ]},
  ]
  return <main className={"prescription-admin-shell "+styles.page}>
    <PrescriptionAdminHeader
      title={{en:'Additional tools',ru:'Дополнительные инструменты'}}
      description={{en:'Specialized owner functions — without a second practitioner cabinet.',ru:'Специальные функции владельца без второго кабинета мастера.'}}
    />
    <section className={styles.shell} aria-label={ru?'Дополнительные инструменты':'Additional tools'}>
      <div className={styles.intro}>
        <p>{ru?'Всё основное — в «Моей практике». Ниже — только дополнительные инструменты; данные и права остались прежними.':'Your main workspace is My Practice. These are specialized tools; existing data and permissions stay unchanged.'}</p>
        <nav className={styles.navigation} aria-label={ru?'Вернуться в кабинет':'Back to My Practice'}>
          <Link href={'/'+locale+'/app/practice'} prefetch={false}>{ru?'← Моя практика':'← My Practice'}</Link>
          <Link href={'/'+locale+'/app/practice?panel=marketing'} prefetch={false}>{ru?'Маркетинг →':'Marketing →'}</Link>
        </nav>
      </div>
      {groups.map((group,index)=><details className={styles.group} key={group.key} open={index===0}>
        <summary>
          <span className={styles.groupTitle}>
            <strong>{group.title}</strong>
            <small>{group.hint}</small>
          </span>
          <span className={styles.count}>{group.items.length}</span>
          <ChevronDown className={styles.arrow} aria-hidden="true"/>
        </summary>
        <nav className={styles.grid} aria-label={group.title}>
          {group.items.map(({href,icon:Icon,title,body})=><Link key={href} href={href} prefetch={false} className={styles.tool}>
            <span className={styles.icon}><Icon aria-hidden="true"/></span>
            <span className={styles.detail}><b>{title}</b><span>{body}</span></span>
            <ChevronRight className={styles.toolArrow} aria-hidden="true"/>
          </Link>)}
        </nav>
      </details>)}
    </section>
  </main>
}
