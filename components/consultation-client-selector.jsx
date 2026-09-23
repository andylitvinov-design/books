'use client'

import { useState } from 'react'

const copy = {
  ru: {
    search: 'Найти клиента',
    searchPlaceholder: 'Найти клиента…',
    create: 'Новый клиент',
    change: 'Сменить',
    fullName: 'Имя клиента',
    email: 'Email',
    phone: 'Телефон',
    language: 'Язык',
    consultations: 'конс.',
    none: 'нет визитов',
  },
  en: {
    search: 'Find client',
    searchPlaceholder: 'Find client…',
    create: 'New client',
    change: 'Change',
    fullName: 'Client name',
    email: 'Email',
    phone: 'Phone',
    language: 'Language',
    consultations: 'visits',
    none: 'no visits',
  },
}

export function ConsultationClientSelector({ clients, selectedClientId, uiLocale = 'ru' }) {
  const labels = copy[uiLocale] ?? copy.ru
  const initial = clients.find((client) => client.id === selectedClientId)
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState(initial?.fullName ?? '')
  const [creating, setCreating] = useState(false)
  const [locale, setLocale] = useState(initial?.preferredLocale ?? 'en')
  const matches = clients
    .filter((client) => client.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .slice(0, 10)

  function choose(client) {
    setSelected(client)
    setQuery(client.fullName)
    setLocale(client.preferredLocale)
    setCreating(false)
  }

  function reset() {
    setSelected(undefined)
    setQuery('')
    setCreating(false)
  }

  return <fieldset className="consultation-client-selector consultation-client-selector--compact">
    <input type="hidden" name="clientId" value={selected?.id ?? ''} />
    <input type="hidden" name="clientMode" value={creating ? 'new' : 'existing'} />

    {selected ? <div className="consultation-client-selected-row">
      <input type="hidden" name="patientName" value={selected.fullName} />
      <div>
        <strong>{selected.fullName}</strong>
        <span>{selected.consultationCount} {labels.consultations}{selected.lastConsultation ? ' · ' + selected.lastConsultation : ''}</span>
      </div>
      <label className="consultation-client-language"><span>{labels.language}</span><select name="languagePreference" value={locale} onChange={(event) => setLocale(event.target.value)}><option value="en">EN</option><option value="ru">RU</option></select></label>
      <button type="button" className="consultation-client-change" onClick={reset}>{labels.change}</button>
    </div> : <>
      <div className="consultation-client-search consultation-client-search--compact">
        <label><span>{labels.search}</span><input aria-label={labels.search} autoComplete="off" value={query} onChange={(event) => {
          setQuery(event.target.value)
          setCreating(false)
        }} placeholder={labels.searchPlaceholder} /></label>

        {!creating && query && matches.length > 0 && <div className="consultation-client-results" aria-label={labels.search}>
          {matches.map((client) => <button type="button" key={client.id} onPointerDown={(event) => {
            event.preventDefault()
            choose(client)
          }} onClick={() => choose(client)}>
            <strong>{client.fullName}</strong>
            <span>{client.consultationCount} {labels.consultations} · {client.lastConsultation ?? labels.none} · {client.preferredLocale.toUpperCase()}</span>
          </button>)}
        </div>}
      </div>

      {!creating && <button className="consultation-create-client consultation-create-client--compact" type="button" onClick={() => setCreating(true)}>+ {labels.create}{query ? ' “' + query + '”' : ''}</button>}

      {creating && <div className="consultation-new-client-fields consultation-new-client-fields--compact">
        <label>{labels.fullName}<input name="patientName" value={query} onChange={(event) => setQuery(event.target.value)} required maxLength={200} /></label>
        <label>{labels.language}<select name="languagePreference" value={locale} onChange={(event) => setLocale(event.target.value)}><option value="en">English</option><option value="ru">Русский</option></select></label>
        <label>{labels.email}<input type="email" name="clientEmail" maxLength={254} /></label>
        <label>{labels.phone}<input name="clientPhone" maxLength={80} /></label>
      </div>}
    </>}
  </fieldset>
}
