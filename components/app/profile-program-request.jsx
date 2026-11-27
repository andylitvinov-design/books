'use client'

import {useState} from 'react'
import {ChevronDown} from 'lucide-react'
import {MandatoryMessengerActions} from '@/components/mandatory-messenger-actions'
import {whatsappEnquiryUrl} from '@/lib/whatsapp-enquiry'
import {telegramBusinessServiceTitle,telegramServiceRequestUrl} from '@/lib/assist/telegram-business-request.mjs'
import styles from './profile-program-request.module.css'

const copy = {
  en:{details:'Request Details',book:'Request a consultation',request:'I would like details and to request a consultation.',note:'Send your message to request a consultation.',clarity:'Clarity & Support',goal:'My Goal',business:'My Business'},
  ru:{details:'Запросить детали',book:'Запросить консультацию',request:'Хочу узнать подробности и запросить консультацию.',note:'Отправьте сообщение для запроса консультации.',clarity:'Ясность и поддержка',goal:'Моя цель',business:'Мой бизнес'},
  es:{details:'Solicitar detalles',book:'Solicitar una consulta',request:'Quiero conocer los detalles y solicitar una consulta.',note:'Envía tu mensaje para solicitar una consulta.',clarity:'Claridad y apoyo',goal:'Mi meta',business:'Mi negocio'}
}

export default function ProfileProgramRequest({locale='en',program,open,onOpenChange,request,option}) {
  const lang=Object.hasOwn(copy,locale)?locale:'en'
  const t=copy[lang]
  const [localOpen,setLocalOpen]=useState(false)
  const expanded=open??localOpen
  const toggle=onOpenChange??setLocalOpen
  const service=program==='business'?'business':'coaching'
  const id=program+'-contact-options'
  return <div className={styles.root} data-profile-program-request={program}>
    <button type="button" className={styles.trigger} data-program-request-trigger
      {...(program==='business'?{'data-business-details':true}:{})}
      aria-expanded={expanded} aria-controls={id} onClick={()=>toggle(!expanded)}>
      {t.details}<ChevronDown size={20} aria-hidden="true"/>
    </button>
    <div className={styles.options} id={id} hidden={!expanded} data-program-contact-options>
      {expanded&&<><MandatoryMessengerActions locale={lang} compact label={t.book}
        whatsappUrl={whatsappEnquiryUrl({locale:lang,service:telegramBusinessServiceTitle(service,lang),request:request??t.request,option:option??t[program]})}
        telegramUrl={telegramServiceRequestUrl(service,lang)}/>
        <p className={styles.note}>{t.note}</p></>}
    </div>
  </div>
}
