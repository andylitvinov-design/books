'use client'

import { ArrowRight, ClipboardList, Plus } from 'lucide-react'
import { summarizePracticeRequests } from '@/lib/practitioners/practice-requests.mjs'
import styles from './practice-requests-overview.module.css'

const COPY = {
  en: {
    eyebrow: 'CLIENT ENQUIRIES',
    title: 'My requests',
    subtitle: 'New enquiries about your services, all in one place.',
    new: 'New',
    inProgress: 'Contacted',
    emptyTitle: 'No client requests yet',
    emptyText: 'Your enquiries will appear here when someone contacts you about a service.',
    emptyHandled: 'You are all caught up',
    emptyHandledText: 'There are no requests waiting for a response.',
    add: 'Add my service',
    quota: 'Your Hobby service limit has been reached. You can still edit existing services.',
    all: 'View all requests',
    history: 'View request history',
    details: 'Open request',
    unnamed: 'Client enquiry',
    service: 'Service enquiry',
  },
  ru: {
    eyebrow: 'ОБРАЩЕНИЯ КЛИЕНТОВ',
    title: 'Мои заявки',
    subtitle: 'Новые обращения по вашим услугам в одном месте.',
    new: 'Новые',
    inProgress: 'Связались',
    emptyTitle: 'Пока нет заявок от клиентов',
    emptyText: 'Когда клиент оставит обращение по вашей услуге, оно появится здесь.',
    emptyHandled: 'Все заявки обработаны',
    emptyHandledText: 'Сейчас нет обращений, требующих ответа.',
    add: 'Добавить свою услугу',
    quota: 'Лимит услуг Hobby достигнут. Вы можете редактировать уже созданные услуги.',
    all: 'Все заявки',
    history: 'История заявок',
    details: 'Открыть заявку',
    unnamed: 'Обращение клиента',
    service: 'Заявка на услугу',
  },
  es: {
    eyebrow: 'SOLICITUDES DE CLIENTES',
    title: 'Mis solicitudes',
    subtitle: 'Las consultas sobre tus servicios en un solo lugar.',
    new: 'Nuevas',
    inProgress: 'Contactado',
    emptyTitle: 'Todavía no hay solicitudes',
    emptyText: 'Las consultas de clientes aparecerán aquí.',
    emptyHandled: 'Todo al día',
    emptyHandledText: 'No hay solicitudes pendientes de respuesta.',
    add: 'Añadir mi servicio',
    quota: 'Has alcanzado el límite de servicios Hobby. Puedes editar los existentes.',
    all: 'Ver todas',
    history: 'Ver historial',
    details: 'Abrir solicitud',
    unnamed: 'Consulta del cliente',
    service: 'Consulta de servicio',
  },
}

function serviceTitle(item, services, locale, fallback) {
  const service = services.find(entry => entry.id === item.serviceId)
  if (!service) return item.serviceTitle || fallback
  return service.localizedCopy?.[locale]?.title
    || service.draftCopy?.copy?.[locale]?.title
    || service.localizedCopy?.en?.title
    || service.draftCopy?.copy?.en?.title
    || service.copy?.title
    || fallback
}

function clientLabel(contact, fallback) {
  if (typeof contact === 'string') return contact.trim().slice(0, 120) || fallback
  if (!contact || typeof contact !== 'object') return fallback
  const name = contact.displayName || contact.name || contact.fullName
  const label = typeof name === 'string' && name.trim()
    ? name
    : contact.email || contact.phone
  return typeof label === 'string' ? label.trim().slice(0, 120) || fallback : fallback
}

function requestDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : locale === 'es' ? 'es-ES' : 'en-CA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export default function PracticeRequestsOverview({
  requests = [], services = [], locale = 'en', canAdd = true, onAddService, onViewAll,
}) {
  const c = COPY[locale] || COPY.en
  const summary = summarizePracticeRequests(requests)

  return <section className={styles.root} aria-labelledby="hh-practice-inbox-title">
    <div className={styles.heading}>
      <div className={styles.headingText}>
        <span className={styles.icon}><ClipboardList aria-hidden="true" size={21} /></span>
        <div>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h2 id="hh-practice-inbox-title">{c.title}</h2>
          <p className={styles.subtitle}>{c.subtitle}</p>
        </div>
      </div>
      <span className={styles.newCount} data-has-new={summary.newCount > 0}
        aria-label={c.new + ': ' + summary.newCount}>
        <strong>{summary.newCount}</strong> {c.new.toLowerCase()}
      </span>
    </div>

    {summary.total === 0
      ? <div className={styles.empty}>
          <div className={styles.emptyCopy}>
            <strong>{c.emptyTitle}</strong>
            <p>{c.emptyText}</p>
          </div>
          {canAdd
            ? <button className={styles.addButton} type="button" onClick={onAddService}>
                <Plus size={17} aria-hidden="true" />{c.add}<ArrowRight size={17} aria-hidden="true" />
              </button>
            : <p className={styles.quota}>{c.quota}</p>}
        </div>
      : <>
          <div className={styles.summary} aria-label={c.title}>
            <span><strong>{summary.newCount}</strong> {c.new}</span>
            <span><strong>{summary.inProgressCount}</strong> {c.inProgress}</span>
          </div>
          {summary.openCount === 0
            ? <div className={styles.handled}><strong>{c.emptyHandled}</strong><p>{c.emptyHandledText}</p></div>
            : <ul className={styles.list}>
                {summary.preview.map(item => <li key={item.id} className={styles.item}>
                  <div className={styles.itemCopy}>
                    <div className={styles.meta}>
                      <span className={styles.status} data-status={item.status}>
                        {item.status === 'requested' ? c.new : c.inProgress}
                      </span>
                      {requestDate(item.createdAt, locale) && <time dateTime={item.createdAt}>
                        {requestDate(item.createdAt, locale)}
                      </time>}
                    </div>
                    <strong className={styles.service}>{serviceTitle(item, services, locale, c.service)}</strong>
                    <p className={styles.client}>{clientLabel(item.contact, c.unnamed)}</p>
                    {typeof item.message === 'string' && item.message.trim()
                      && <p className={styles.message}>{item.message.trim().slice(0, 180)}</p>}
                  </div>
                  <button type="button" className={styles.detailButton} onClick={onViewAll}
                    aria-label={c.details + ': ' + serviceTitle(item, services, locale, c.service)}>
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </li>)}
              </ul>}
          <button type="button" className={styles.viewAll} onClick={onViewAll}>
            {summary.openCount ? c.all : c.history}
            <span>({summary.total})</span><ArrowRight size={16} aria-hidden="true" />
          </button>
        </>}
  </section>
}
