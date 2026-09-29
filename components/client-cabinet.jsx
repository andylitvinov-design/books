'use client'

import { FileText, ReceiptText, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const contactUrl = 'https://wa.me/14376066502'

export function ClientCabinet({ name, locale, selector, documents }) {
  const [filter, setFilter] = useState('all')
  const ru = locale === 'ru'
  const copy = ru
    ? { all: 'Все', recommendation: 'Рекомендации', payment: 'Квитанции', report: 'Отчёты', cabinet: 'Ваш кабинет', welcome: 'Последние материалы от Andy', latest: 'Последняя консультация', documents: 'документов доступно', document: 'документ доступен', view: 'Открыть', pdf: 'PDF', filters: 'Фильтры документов', empty: 'В этом разделе пока ничего не опубликовано.', contact: 'Связаться со специалистом', request: 'Запросить консультацию', signOut: 'Выйти', timeline: 'История консультаций', private: 'Приватный кабинет' }
    : { all: 'All', recommendation: 'Recommendations', payment: 'Receipts', report: 'Reports', cabinet: 'Your private cabinet', welcome: 'Your latest materials from Andy', latest: 'Latest consultation', documents: 'documents available', document: 'document available', view: 'View', pdf: 'PDF', filters: 'Document filters', empty: 'Nothing has been shared in this section yet.', contact: 'Contact practitioner', request: 'Request consultation', signOut: 'Sign out', timeline: 'Consultation timeline', private: 'Private client cabinet' }

  useEffect(() => {
    const scrub = () => history.replaceState(null, '', location.pathname + location.search)
    scrub()
    window.addEventListener('hashchange', scrub)
    return () => window.removeEventListener('hashchange', scrub)
  }, [])

  const labels = { all: copy.all, recommendation: copy.recommendation, payment: copy.payment, report: copy.report }
  const visible = documents.filter((document) => filter === 'all' || document.type === filter)
  const groups = useMemo(() => Object.entries(Object.groupBy(visible, (document) => `${document.date}|${document.consultationId}`)).sort(([left], [right]) => right.localeCompare(left)), [visible])
  const latest = groups[0]?.[1]
  const latestDate = latest?.[0]?.date
  const formatDate = (date) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

  async function logout() {
    await fetch('/api/client-access/logout', { method: 'POST', cache: 'no-store', credentials: 'same-origin' })
    location.reload()
  }

  return <main className="client-cabinet">
    <header className="client-cabinet-header"><div><p>{copy.private}</p><h1>Holistic House</h1></div><div className="client-cabinet-header-actions"><a href={`/${ru ? 'en' : 'ru'}/client/${selector}`}>{ru ? 'EN' : 'RU'}</a><button onClick={logout}>{copy.signOut}</button></div></header>
    <section className="client-cabinet-welcome" aria-label={copy.welcome}><p>{copy.cabinet}</p><h2>{ru ? `Здравствуйте, ${name}` : `Welcome, ${name}`}</h2><span>{copy.welcome}</span>{latestDate ? <div className="client-cabinet-latest"><span>{copy.latest}</span><strong>{formatDate(latestDate)}</strong><small>{latest.length} {latest.length === 1 ? copy.document : copy.documents}</small></div> : <p className="client-cabinet-empty-intro">{copy.empty}</p>}</section>
    <nav className="client-cabinet-filters" aria-label={copy.filters}>{Object.entries(labels).map(([key, label]) => { const Icon = key === 'payment' ? ReceiptText : key === 'recommendation' ? Sparkles : FileText; return <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}><Icon aria-hidden="true" />{label}</button> })}</nav>
    <section className="client-cabinet-timeline" aria-label={copy.timeline}><h2>{copy.timeline}</h2>{groups.map(([key, group]) => <article className="client-cabinet-consultation" key={key}><h3>{formatDate(group[0].date)}</h3>{group.map((document) => <div className="client-cabinet-document" key={document.id}><div><span>{labels[document.type]}</span><h4>{document.title}</h4></div><div className="client-cabinet-document-actions"><a href={`/${locale}/client/${selector}/documents/${document.id}`}>{copy.view}</a><a href={`/api/client/${selector}/documents/${document.id}/pdf?locale=${locale}`} download>{copy.pdf}</a></div></div>)}</article>)}{!groups.length && <p className="client-cabinet-empty">{copy.empty}</p>}</section>
    <footer className="client-cabinet-support"><a href={contactUrl} target="_blank" rel="noreferrer">{copy.contact}</a><a href={`${contactUrl}?text=${encodeURIComponent(ru ? 'Здравствуйте! Хочу записаться на консультацию.' : 'Hello! I would like to request a consultation.')}`} target="_blank" rel="noreferrer">{copy.request}</a></footer>
  </main>
}
