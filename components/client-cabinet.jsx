'use client'
import { useEffect, useState } from 'react'
export function ClientCabinet({ name, locale, selector, documents }) {
  const [filter, setFilter] = useState('all')
  const ru = locale === 'ru'
  useEffect(() => {
    const scrub = () => history.replaceState(null, '', location.pathname + location.search)
    scrub(); window.addEventListener('hashchange', scrub)
    return () => window.removeEventListener('hashchange', scrub)
  }, [])
  const labels = ru ? { all: 'Все', recommendation: 'Рекомендации', payment: 'Квитанции', report: 'Отчёты' } : { all: 'All', recommendation: 'Recommendations', payment: 'Receipts', report: 'Reports' }
  const groups = Object.groupBy(documents.filter(d => filter === 'all' || d.type === filter), d => `${d.date}|${d.consultationId}`)
  async function logout() { await fetch('/api/client-access/logout', { method: 'POST', cache: 'no-store' }); location.reload() }
  return <main className="prescription-admin-shell client-cabinet"><header className="prescription-admin-header"><div><p>HOLISTIC HOUSE</p><h1>{ru ? 'Ваш кабинет' : 'Your private cabinet'}</h1><h2>{name}</h2></div><div><a href={`/${ru ? 'en' : 'ru'}/client/${selector}`}>{ru ? 'EN' : 'RU'}</a><button onClick={logout}>{ru ? 'Выйти' : 'Sign out'}</button></div></header><nav className="consultation-result-actions" aria-label={ru ? 'Фильтры документов' : 'Document filters'}>{Object.entries(labels).map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</nav><p>{ru ? 'Документы от вашего специалиста' : 'Documents delivered by your practitioner'}</p>{Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([key, group]) => <section className="consultation-result-document" key={key}><h2>{new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(group[0].date + 'T12:00:00Z'))}</h2>{group.map(d => <div className="consultation-result-actions" key={d.id}><a href={`/${locale}/client/${selector}/documents/${d.id}`}>{d.title}</a><a href={`/api/client/${selector}/documents/${d.id}/pdf?locale=${locale}`} download>PDF</a></div>)}</section>)}{!Object.keys(groups).length && <p>{ru ? 'Пока нет документов в этом разделе.' : 'No documents in this section yet.'}</p>}</main>
}
