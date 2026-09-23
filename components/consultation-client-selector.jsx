'use client'

import { useState } from 'react'

const copy = {
  ru: {
    client: 'Клиент',
    search: 'Найти клиента',
    searchPlaceholder: 'Найти существующего клиента…',
    create: 'Новый клиент',
    fullName: 'Имя клиента',
    email: 'Email (необязательно)',
    phone: 'Телефон (необязательно)',
    similar: 'Есть клиенты с похожими именами. Выберите существующего или сохраните отдельного человека — автоматически имена не объединяются.',
    selected: 'Выбран',
    language: 'Язык клиента',
    empty: 'Выберите существующего клиента или создайте нового.',
    consultations: 'консультаций',
    none: 'Нет консультаций',
  },
  en: {
    client: 'Client',
    search: 'Search existing client',
    searchPlaceholder: 'Search existing client…',
    create: 'Create new client',
    fullName: 'Full name',
    email: 'Email (optional)',
    phone: 'Phone (optional)',
    similar: 'Similar names exist. Choose an existing client or save a separate person. Names are never merged automatically.',
    selected: 'Selected',
    language: 'Client language',
    empty: 'Select an existing client or create a new client to continue.',
    consultations: 'consultations',
    none: 'No consultations',
  },
}

export function ConsultationClientSelector({ clients, selectedClientId, uiLocale = 'ru' }) {
  const labels = copy[uiLocale] ?? copy.ru
  const initial = clients.find(c => c.id === selectedClientId)
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState(initial?.fullName ?? '')
  const [creating, setCreating] = useState(false)
  const [locale, setLocale] = useState(initial?.preferredLocale ?? 'en')
  const matches = clients.filter(c => c.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 12)

  return <fieldset className="consultation-client-selector">
    <legend>{labels.client}</legend>
    <input type="hidden" name="clientId" value={selected?.id ?? ''} />
    <input type="hidden" name="clientMode" value={creating ? 'new' : 'existing'} />

    <div className="consultation-client-search">
      <label>{labels.search}<input aria-label={labels.search} autoComplete="off" value={query} onChange={e => {
        setQuery(e.target.value)
        setSelected(undefined)
        setCreating(false)
      }} placeholder={labels.searchPlaceholder} /></label>

      {!selected && !creating && matches.length > 0 && <div className="consultation-client-results" aria-label={labels.search}>
        {matches.map(c => <button type="button" key={c.id} onPointerDown={(event) => {
          event.preventDefault()
          setSelected(c)
          setQuery(c.fullName)
          setLocale(c.preferredLocale)
        }} onClick={() => {
          setSelected(c)
          setQuery(c.fullName)
          setLocale(c.preferredLocale)
        }}>
          <strong>{c.fullName}</strong>
          <span>{c.consultationCount} {labels.consultations} · {c.lastConsultation ?? labels.none} · {c.preferredLocale.toUpperCase()}</span>
        </button>)}
      </div>}
    </div>

    {!selected && !creating && <button className="consultation-create-client" type="button" onClick={() => setCreating(true)}>+ {labels.create}{query ? ` “${query}”` : ''}</button>}

    {creating && <div className="consultation-new-client-fields">
      <label>{labels.fullName}<input name="patientName" value={query} onChange={e => setQuery(e.target.value)} required maxLength={200} /></label>
      {matches.length > 0 && <p className="prescription-form-hint">{labels.similar}</p>}
      <label>{labels.email}<input type="email" name="clientEmail" maxLength={254} /></label>
      <label>{labels.phone}<input name="clientPhone" maxLength={80} /></label>
    </div>}

    {selected && <>
      <input type="hidden" name="patientName" value={selected.fullName} />
      <p className="consultation-selected-client"><span>{labels.selected}</span><strong>{selected.fullName}</strong></p>
    </>}

    <label>{labels.language}<select name="languagePreference" value={locale} onChange={e => setLocale(e.target.value)} disabled={Boolean(selected)}><option value="en">English</option><option value="ru">Русский</option></select></label>
    {selected && <input type="hidden" name="languagePreference" value={locale} />}
    {!selected && !creating && <p className="prescription-form-hint">{labels.empty}</p>}
  </fieldset>
}
