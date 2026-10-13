'use client'

import { FileText, ReceiptText, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PersonalAnalysisPanel } from './app/personal-analysis-panel'
import { ProfileDomains } from './app/profile-domains'
import { ClientAssessments } from './client-assessments'
import { whatsappEnquiryUrl } from '@/lib/whatsapp-enquiry'

export function ClientCabinet({ name, locale, selector, documents, materials = [], assessments = [], homeopathyUpdates = [], view = 'documents' }) {
  const [filter, setFilter] = useState('all')
  const ru = locale === 'ru'
  // A cabinet enquiry must never include the private selector, document IDs or client name.
  const contactUrl = whatsappEnquiryUrl({ locale: ru ? 'ru' : 'en', service: ru ? 'Поддержка личного кабинета Holistic House' : 'Holistic House Client Cabinet support', request: ru ? 'Хочу задать вопрос о работе моего личного кабинета.' : 'I have a question about using my client cabinet.' })
  const consultationUrl = whatsappEnquiryUrl({ locale: ru ? 'ru' : 'en', service: ru ? 'Личная консультация с Андреем' : 'Personal consultation with Andrey', request: ru ? 'Хочу согласовать новую личную консультацию. Подскажите, пожалуйста, доступное время и формат.' : 'I would like to arrange a personal consultation. Please tell me the available times and format.' })
  const copy = ru
    ? { all: 'Все', recommendation: 'Рекомендации', payment: 'Счета / Квитанции', report: 'Отчёты', cabinet: 'Ваш кабинет', welcome: 'Последние материалы от Andy', latest: 'Последняя консультация', documents: 'документов доступно', document: 'документ доступен', view: 'Открыть', pdf: 'PDF', filters: 'Фильтры документов', empty: 'В этом разделе пока ничего не опубликовано.', contact: 'Связаться со специалистом', request: 'Запросить консультацию', signOut: 'Выйти', documentsTab: 'Мои материалы', analysisTab: 'Личный анализ', profileTab: 'Мой профиль (отчёты)', timeline: 'История консультаций', private: 'Приватный кабинет', nextStep: 'Следующий шаг', nextStepDetail: (date, count) => `Проверьте материалы от ${date}: ${count} ${count === 1 ? 'документ доступен' : 'документов доступно'}.` }
    : { all: 'All', recommendation: 'Recommendations', payment: 'Invoices / Receipts', report: 'Reports', cabinet: 'Your private cabinet', welcome: 'Your latest materials from Andy', latest: 'Latest consultation', documents: 'documents available', document: 'document available', view: 'View', pdf: 'PDF', filters: 'Document filters', empty: 'Nothing has been shared in this section yet.', contact: 'Contact practitioner', request: 'Request consultation', signOut: 'Sign out', documentsTab: 'My materials', analysisTab: 'Personal analysis', profileTab: 'My profile (Reports)', timeline: 'Consultation timeline', private: 'Private client cabinet', nextStep: 'Next step', nextStepDetail: (date, count) => `Review the materials from ${date}: ${count} ${count === 1 ? 'document is' : 'documents are'} available.` }

  useEffect(() => {
    const scrub = () => history.replaceState(null, '', location.pathname + location.search)
    scrub()
    window.addEventListener('hashchange', scrub)
    return () => window.removeEventListener('hashchange', scrub)
  }, [])

  const labels = { all: copy.all, recommendation: copy.recommendation, payment: copy.payment, report: copy.report }
  const visible = documents.filter((document) => filter === 'all' || document.type === filter)
  const allGroups = useMemo(() => Object.entries(Object.groupBy(documents, (document) => `${document.date}|${document.consultationId}`)).sort(([left], [right]) => right.localeCompare(left)), [documents])
  const groups = useMemo(() => Object.entries(Object.groupBy(visible, (document) => `${document.date}|${document.consultationId}`)).sort(([left], [right]) => right.localeCompare(left)), [visible])
  const personalReports = assessments.filter(item => item.kind === 'research_result')
  const legacyReports = documents.filter(document => document.type === 'report').map(document => ({
    id: document.id, title: document.title, occurredOn: document.date,
    available: false, legacy: true,
  }))
  const latest = allGroups[0]?.[1]
  const latestDate = latest?.[0]?.date
  const formatDate = (date) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

  async function logout() {
    await fetch('/api/client-access/logout', { method: 'POST', cache: 'no-store', credentials: 'same-origin' })
    location.reload()
  }

  return <main className="client-cabinet">
    <header className="client-cabinet-header"><div><p>{copy.private}</p><h1>Holistic House</h1></div><div className="client-cabinet-header-actions"><a href={`/${ru ? 'en' : 'ru'}/client/${selector}${view === 'documents' ? '' : '?view=' + view}`}>{ru ? 'EN' : 'RU'}</a><button onClick={logout}>{copy.signOut}</button></div></header>
    <nav className="client-cabinet-sections" aria-label={ru ? 'Разделы кабинета' : 'Cabinet sections'}><Link aria-current={view === 'documents' ? 'page' : undefined} href={`/${locale}/client/${selector}`} prefetch={false}>{copy.documentsTab}</Link><Link aria-current={view === 'profile' || view === 'analysis' ? 'page' : undefined} href={`/${locale}/client/${selector}?view=profile`} prefetch={false}>{copy.profileTab}</Link></nav>
    {['profile','analysis'].includes(view) ? <ProfileDomains locale={locale} mode="legacy" assessments={assessments} homeopathyUpdates={homeopathyUpdates} selector={selector} focusReports={view === 'analysis'}
      reportsContent={<PersonalAnalysisPanel locale={locale} reports={personalReports} legacyReports={legacyReports} selector={selector} embedded />} /> : <>
    <section className="client-cabinet-welcome" aria-label={copy.welcome}><p>{copy.cabinet}</p><h2>{ru ? `Здравствуйте, ${name}` : `Welcome, ${name}`}</h2><span>{copy.welcome}</span>{latestDate ? <div className="client-cabinet-latest"><span>{copy.latest}</span><strong>{formatDate(latestDate)}</strong><small>{latest.length} {latest.length === 1 ? copy.document : copy.documents}</small></div> : <p className="client-cabinet-empty-intro">{copy.empty}</p>}</section>
    <section className="client-cabinet-google-bridge"><div><strong>{ru ? 'Хотите сохранить материалы в постоянном кабинете?' : 'Keep selected documents in your Google Cabinet'}</strong><p>{ru ? 'Откройте нужный документ и нажмите «Сохранить в мой кабинет через Google». В аккаунт добавится только выбранный документ — остальные не переносятся автоматически.' : 'Open a document and choose “Save to my Cabinet with Google”. Only the document you confirm will be saved; other private records are not imported automatically.'}</p></div><a href={'/' + locale + '/app'}>{ru ? 'Мой Google-кабинет' : 'My Google Cabinet'} →</a></section>
    {latestDate && <section className="client-cabinet-next-step" aria-label={copy.nextStep}><div><p>{copy.nextStep}</p><h2>{copy.latest}</h2><span>{copy.nextStepDetail(formatDate(latestDate), latest.length)}</span></div><div className="client-cabinet-next-step-actions"><a href={contactUrl} target="_blank" rel="noreferrer">{copy.contact}</a><a href={consultationUrl} target="_blank" rel="noreferrer">{copy.request}</a></div></section>}
    <nav className="client-cabinet-filters" aria-label={copy.filters}>{Object.entries(labels).map(([key, label]) => { const Icon = key === 'payment' ? ReceiptText : key === 'recommendation' ? Sparkles : FileText; return <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}><Icon aria-hidden="true" />{label}</button> })}</nav>
    <section className="client-cabinet-timeline" aria-label={copy.timeline}><h2>{copy.timeline}</h2>{groups.map(([key, group]) => <article className="client-cabinet-consultation" key={key}><h3>{formatDate(group[0].date)}</h3>{group.map((document) => <div className="client-cabinet-document" key={document.id}><div><span>{labels[document.type]}</span><h4>{document.title}</h4></div>{document.type === 'report' ? <span className="client-cabinet-legacy-note">{ru ? 'Старый отчёт · попросите новую ссылку у Andy' : 'Older report · ask Andy for an updated link'}</span> : <div className="client-cabinet-document-actions"><a href={`/${locale}/client/${selector}/documents/${document.id}`}>{copy.view}</a><a href={`/api/client/${selector}/documents/${document.id}/pdf?locale=${locale}`} download>{copy.pdf}</a></div>}</div>)}</article>)}{!groups.length && <p className="client-cabinet-empty">{copy.empty}</p>}</section>
    {materials.length > 0 && <section className="client-cabinet-shared-materials" aria-label={ru ? 'Материалы от специалиста' : 'Materials from practitioner'}><h2>{ru ? 'Материалы от Andy' : 'Study materials from Andy'}</h2><div>{materials.map(material => <a className="client-cabinet-material-row" href={material.url} key={material.id} target="_blank" rel="noopener noreferrer"><span>{material.title}</span><span aria-hidden="true">↗</span></a>)}</div></section>}
    <ClientAssessments records={assessments} locale={locale} selector={selector} />
    {!latestDate && <footer className="client-cabinet-support"><a href={contactUrl} target="_blank" rel="noreferrer">{copy.contact}</a><a href={consultationUrl} target="_blank" rel="noreferrer">{copy.request}</a></footer>}
    </>}
  </main>
}
