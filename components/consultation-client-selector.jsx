'use client'
import { useState } from 'react'
export function ConsultationClientSelector({ clients, selectedClientId }) {
  const initial = clients.find(c => c.id === selectedClientId)
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState(initial?.fullName ?? '')
  const [creating, setCreating] = useState(false)
  const [locale, setLocale] = useState(initial?.preferredLocale ?? 'en')
  const matches = clients.filter(c => c.fullName.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 12)
  return <fieldset><legend>Client</legend><input type="hidden" name="clientId" value={selected?.id ?? ''} /><input type="hidden" name="clientMode" value={creating ? 'new' : 'existing'} />
    <label>Search existing client<input aria-label="Search existing client" autoComplete="off" value={query} onChange={e => { setQuery(e.target.value); setSelected(undefined); setCreating(false) }} placeholder="Search existing client…" /></label>
    {!selected && !creating && <div className="prescription-remedy-results">{matches.map(c => <button type="button" key={c.id} onClick={() => { setSelected(c); setQuery(c.fullName); setLocale(c.preferredLocale) }}>{c.fullName} · {c.consultationCount} consultations · {c.lastConsultation ?? 'No consultations'} · {c.preferredLocale.toUpperCase()}</button>)}</div>}
    {!selected && <button type="button" onClick={() => setCreating(true)}>+ Create new client{query ? ` “${query}”` : ''}</button>}
    {creating && <><label>Full name<input name="patientName" value={query} onChange={e => setQuery(e.target.value)} required maxLength={200} /></label>{matches.length > 0 && <p>Similar names exist. Choose an existing client above or save a separate person. Names are never merged automatically.</p>}<label>Email (optional)<input type="email" name="clientEmail" maxLength={254} /></label><label>Phone (optional)<input name="clientPhone" maxLength={80} /></label></>}
    {selected && <><input type="hidden" name="patientName" value={selected.fullName} /><p>Selected: {selected.fullName}</p></>}
    <label>Client language<select name="languagePreference" value={locale} onChange={e => setLocale(e.target.value)} disabled={Boolean(selected)}><option value="en">English</option><option value="ru">Русский</option></select></label>{selected && <input type="hidden" name="languagePreference" value={locale} />}
    {!selected && !creating && <p>Select an existing client or create a new client to continue.</p>}
  </fieldset>
}
