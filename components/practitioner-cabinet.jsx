'use client'

import { Archive, PlusCircle, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PrescriptionAdminHeader } from '@/components/prescription-admin-header'
import { readUiLocale } from '@/lib/ui-locale'

const copy = {
  ru: {
    title: 'Кабинет практика',
    description: 'Клиенты, консультации и документы — в одном рабочем пространстве.',
    actions: 'Основные действия',
    newConsultation: 'Новая консультация',
    newConsultationText: 'Создать консультацию и подготовить документы для клиента.',
    clients: 'Клиенты',
    clientsText: 'Открыть историю клиента, документы и доступ к кабинету.',
    legacy: 'Старые документы',
    legacyText: 'Разобрать и привязать ранее созданные документы к клиентам.',
  },
  en: {
    title: 'Practitioner Cabinet',
    description: 'Clients, consultations, and documents in one calm workspace.',
    actions: 'Main actions',
    newConsultation: 'New consultation',
    newConsultationText: 'Create a consultation and prepare client documents.',
    clients: 'Clients',
    clientsText: 'Open client history, documents, and private cabinet access.',
    legacy: 'Legacy documents',
    legacyText: 'Review and assign previously created documents to clients.',
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

  const actions = [
    { href: '/admin/consultations/new', icon: PlusCircle, title: text.newConsultation, body: text.newConsultationText },
    { href: '/admin/clients', icon: Users, title: text.clients, body: text.clientsText },
    { href: '/admin/clients/legacy', icon: Archive, title: text.legacy, body: text.legacyText },
  ]

  return (
    <main className="prescription-admin-shell practitioner-cabinet-shell">
      <PrescriptionAdminHeader title={text.title} description={text.description} />
      <section aria-label={text.actions} className="practitioner-cabinet-actions practitioner-cabinet-grid">
        {actions.map(({ href, icon: Icon, title, body }) => (
          <Link href={href} key={href}>
            <span className="practitioner-cabinet-icon" aria-hidden="true"><Icon /></span>
            <div><h2>{title}</h2><p>{body}</p><strong aria-hidden="true">→</strong></div>
          </Link>
        ))}
      </section>
    </main>
  )
}
