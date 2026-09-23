'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { readUiLocale } from '@/lib/ui-locale'

const copy = {
  ru: {
    title: 'КАБИНЕТ ПРАКТИКА', description: 'Ежедневная работа с клиентами и консультациями.', actions: 'Действия практика', newConsultation: 'Новая консультация', newConsultationText: 'Создать консультацию и документы для клиента.', clients: 'Клиенты', clientsText: 'Открыть историю клиента и управлять доступом к личному кабинету.', legacy: 'Нераспределённые старые документы', legacyText: 'Назначать только после явного решения владельца.',
  },
  en: {
    title: 'PRACTITIONER CABINET', description: 'Daily client and consultation work.', actions: 'Practitioner actions', newConsultation: 'New consultation', newConsultationText: 'Create a consultation and its client documents.', clients: 'Clients', clientsText: 'Open client history and manage private cabinet access.', legacy: 'Unassigned legacy documents', legacyText: 'Assign only after an explicit owner decision.',
  },
}

export function PractitionerCabinet() {
  const [locale, setLocale] = useState('ru')
  const text = copy[locale]

  useEffect(() => {
    const updateLocale = (event) => setLocale(event.detail === 'en' ? 'en' : 'ru')
    setLocale(readUiLocale(document.cookie) === 'en' ? 'en' : 'ru')
    window.addEventListener('holistic-house-ui-locale', updateLocale)
    return () => window.removeEventListener('holistic-house-ui-locale', updateLocale)
  }, [])

  return <main className="prescription-admin-shell"><PrescriptionAdminHeader title={text.title} description={text.description} /><section aria-label={text.actions} className="practitioner-cabinet-actions"><Link href="/admin/consultations/new"><span>01</span><div><h2>{text.newConsultation}</h2><p>{text.newConsultationText}</p></div></Link><Link href="/admin/clients"><span>02</span><div><h2>{text.clients}</h2><p>{text.clientsText}</p></div></Link><Link href="/admin/clients/legacy"><span>03</span><div><h2>{text.legacy}</h2><p>{text.legacyText}</p></div></Link></section></main>
}
