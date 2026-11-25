'use client'

import { useId, useState } from 'react'
import { ACQUISITION_SOURCES, campaignLandingLinks } from '@/lib/acquisition/report.js'
import styles from '@/app/admin/acquisition/acquisition.module.css'

const copy = {
  en: {
    title: 'Prepare campaign links', source: 'Public source', campaign: 'Public campaign slug', language: 'Landing language',
    note: 'Use a public campaign name only. Never enter names, contact details, client IDs, symptoms or test answers. Links are prepared in this browser; no campaign is published and no visitor tracking is enabled.',
    create: 'Create links', error: 'Use a public slug of 3–64 lowercase letters, digits, hyphens or underscores, starting with a letter. Remove personal or secret information.',
    review: 'Free written situation review', wuxing: 'Free Wu Xing diagnostic', open: 'Open landing',
  },
  ru: {
    title: 'Ссылки кампании', source: 'Публичный источник', campaign: 'Публичное название кампании латиницей', language: 'Язык страницы',
    note: 'Только публичное название кампании. Не вводите имена, контакты, ID клиентов, симптомы или ответы тестов. Ссылки создаются в браузере; кампания не публикуется, отслеживание посетителей не включается.',
    create: 'Создать ссылки', error: 'Используйте 3–64 строчных латинских символа, цифры, дефис или подчёркивание, начиная с буквы. Уберите личные и секретные данные.',
    review: 'Бесплатный письменный разбор', wuxing: 'Бесплатная диагностика У-Син', open: 'Открыть страницу',
  },
  es: {
    title: 'Preparar enlaces de campaña', source: 'Fuente pública', campaign: 'Nombre público de campaña', language: 'Idioma de la página',
    note: 'Usa solo un nombre público de campaña. No introduzcas nombres, contactos, identificadores de clientes, síntomas ni respuestas. Los enlaces se preparan en este navegador; no se publica una campaña ni se activa el seguimiento.',
    create: 'Crear enlaces', error: 'Usa 3–64 letras minúsculas, números, guiones o guiones bajos, empezando por una letra. Elimina información personal o secreta.',
    review: 'Revisión escrita gratuita', wuxing: 'Diagnóstico gratuito Wu Xing', open: 'Abrir página',
  },
}

export function AdminAcquisitionLinks({ locale = 'en' }) {
  const t = copy[locale] || copy.en
  const id = useId()
  const [source, setSource] = useState('eventbrite')
  const [language, setLanguage] = useState(locale)
  const [campaign, setCampaign] = useState('')
  const [links, setLinks] = useState([])
  const [error, setError] = useState(false)
  function resetOutput() { setLinks([]); setError(false) }
  function create() {
    try { setLinks(campaignLandingLinks({ source, campaign, locale: language })); setError(false) }
    catch { setLinks([]); setError(true) }
  }
  return <section className={styles.panel} aria-labelledby={id + '-title'}>
    <h2 id={id + '-title'}>{t.title}</h2>
    <p id={id + '-note'} className={styles.note}>{t.note}</p>
    <div className={styles.fields}>
      <label>{t.source}<select value={source} onChange={event => { setSource(event.target.value); resetOutput() }}>
        {ACQUISITION_SOURCES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>{t.language}<select value={language} onChange={event => { setLanguage(event.target.value); resetOutput() }}>
        {['en', 'ru', 'es'].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
      </select></label>
      <label className={styles.campaignField}>{t.campaign}<input value={campaign} maxLength={64} autoComplete="off" spellCheck={false}
        aria-describedby={id + '-note'} aria-invalid={error} onChange={event => { setCampaign(event.target.value); resetOutput() }}/></label>
    </div>
    <button type="button" className={styles.primary} onClick={create}>{t.create}</button>
    {error && <p role="alert" className={styles.error}>{t.error}</p>}
    <div aria-live="polite" className={styles.linkResults}>
      {links.map((href, index) => <div key={href} className={styles.linkResult}>
        <label>{index === 0 ? t.review : t.wuxing}<textarea readOnly rows={3} value={href} onFocus={event => event.target.select()}/></label>
        <a href={href} target="_blank" rel="noopener noreferrer" className={styles.button}>{t.open} ↗</a>
      </div>)}
    </div>
  </section>
}
