'use client'

import './report-language-picker.css'

const copy = {
  en: {
    title: 'Report language',
    hint: 'Choose the language of the documents sent to this client.',
    scope: 'Report headings, remedy profiles, supporting guides, invoice and PDF follow this choice. Your typed notes remain as written.',
  },
  ru: {
    title: 'Язык отчёта',
    hint: 'Выберите язык документов, которые получит клиент.',
    scope: 'Заголовки, карточки препаратов, приложения, инвойс и PDF будут на этом языке. Написанные вами заметки сохраняются без автоперевода.',
  },
}

const languages = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ru', label: 'Русский', short: 'RU' },
]

export function ReportLanguagePicker({ locale = 'en', onChange, uiLocale = 'en' }) {
  const labels = copy[uiLocale === 'ru' ? 'ru' : 'en']
  return <fieldset className="report-language-picker">
    <legend>{labels.title}</legend>
    <p className="report-language-picker-hint">{labels.hint}</p>
    <div className="report-language-picker-choices">
      {languages.map(language => <label key={language.code} className="report-language-choice" data-selected={locale === language.code}>
        <input type="radio" name="languagePreference" value={language.code} checked={locale === language.code}
          onChange={() => onChange(language.code)} />
        <span className="report-language-choice-title">{language.label}</span>
        <span className="report-language-choice-code">{language.short}</span>
      </label>)}
    </div>
    <p className="report-language-picker-scope">{labels.scope}</p>
  </fieldset>
}
